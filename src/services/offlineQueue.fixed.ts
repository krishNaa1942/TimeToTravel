/**
 * Offline Mutation Queue - PRODUCTION READY
 * ==========================================
 * 
 * Handles offline mutations with:
 * - Queue persistence (survives app restart)
 * - Automatic retry with exponential backoff
 * - Conflict resolution strategies
 * - Entity versioning for optimistic locking
 * - Sync status tracking
 * - Merge callbacks for conflict handling
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventEmitter } from 'events';
import apiService from './api.fixed';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type MutationStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed'
  | 'conflict';

export type ConflictStrategy = 
  | 'server_wins'      // Always use server version
  | 'client_wins'      // Always use client version
  | 'merge'            // Use custom merge function
  | 'manual';          // Ask user to resolve

export interface ConflictContext {
  mutation: QueuedMutation;
  serverData: any;
  clientData: any;
  baseVersion: number;
}

export interface ConflictResolution {
  strategy: ConflictStrategy;
  mergedData?: any;
}

export interface QueuedMutation {
  id: string;
  type: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  payload: Record<string, unknown>;
  timestamp: number;
  status: MutationStatus;
  retries: number;
  maxRetries: number;
  error?: string;
  
  // ✅ CONFLICT RESOLUTION FIELDS
  entityId?: string;           // ID of the entity being modified
  entityVersion?: number;      // Version for optimistic locking
  baseData?: any;              // Original data before changes
  conflictResolution?: ConflictResolution;
}

export interface OfflineQueueState {
  mutations: QueuedMutation[];
  isOnline: boolean;
  isProcessing: boolean;
  lastSyncTime: number | null;
  syncProgress: number;
}

export type OfflineQueueEvent = 
  | 'mutation_added'
  | 'mutation_completed'
  | 'mutation_failed'
  | 'mutation_conflict'
  | 'sync_started'
  | 'sync_completed'
  | 'online'
  | 'offline';

// ─────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────

const CONFIG = {
  STORAGE_KEY: 'offline_mutation_queue_v2',
  MAX_RETRIES: 3,
  BASE_RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 30000,
  PROCESSING_INTERVAL_MS: 5000,
  CONFLICT_TIMEOUT_MS: 60000, // 1 minute to resolve conflict
};

// ─────────────────────────────────────────────────────────────
// NETWORK STATE MANAGER
// ─────────────────────────────────────────────────────────────

class NetworkManager {
  private isOnline: boolean = true;
  private listeners: Set<(online: boolean) => void> = new Set();

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.setOnline(true));
      window.addEventListener('offline', () => this.setOnline(false));
      this.isOnline = navigator.onLine;
    }
  }

  private setOnline(online: boolean): void {
    if (this.isOnline !== online) {
      this.isOnline = online;
      this.listeners.forEach(l => l(online));
    }
  }

  getState(): boolean {
    return this.isOnline;
  }

  subscribe(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

const networkManager = new NetworkManager();

// ─────────────────────────────────────────────────────────────
// OFFLINE QUEUE MANAGER
// ─────────────────────────────────────────────────────────────

class OfflineQueueManager extends EventEmitter {
  private state: OfflineQueueState = {
    mutations: [],
    isOnline: true,
    isProcessing: false,
    lastSyncTime: null,
    syncProgress: 0,
  };
  
  private stateListeners: Set<(state: OfflineQueueState) => void> = new Set();
  private processingInterval: ReturnType<typeof setInterval> | null = null;
  private networkUnsubscribe: (() => void) | null = null;
  
  // Conflict resolution callbacks
  private conflictResolvers: Map<string, (context: ConflictContext) => Promise<ConflictResolution>> = new Map();

  constructor() {
    super();
  }

  /**
   * Initialize the offline queue
   */
  async initialize(): Promise<void> {
    // Load persisted mutations
    await this.loadQueue();
    
    // Setup network listener
    this.networkUnsubscribe = networkManager.subscribe((online) => {
      this.handleNetworkChange(online);
    });
    
    // Get initial network state
    this.state.isOnline = networkManager.getState();
    
    // Start processing if online
    if (this.state.isOnline) {
      this.startProcessing();
    }
    
    console.log('[OfflineQueue] Initialized with', this.state.mutations.length, 'pending mutations');
  }

  /**
   * Register a conflict resolver for a specific mutation type
   */
  registerConflictResolver(
    mutationType: string,
    resolver: (context: ConflictContext) => Promise<ConflictResolution>
  ): void {
    this.conflictResolvers.set(mutationType, resolver);
    console.log('[OfflineQueue] Registered conflict resolver for:', mutationType);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
    }
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    this.stateListeners.clear();
    this.removeAllListeners();
  }

  /**
   * Subscribe to queue state changes
   */
  subscribe(listener: (state: OfflineQueueState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  /**
   * Get current state
   */
  getState(): OfflineQueueState {
    return { ...this.state };
  }

  // ───────────────────────────────────────────────────────────
  // MUTATION QUEUE API
  // ───────────────────────────────────────────────────────────

  /**
   * Add mutation to queue with conflict tracking
   */
  async queueMutation(
    type: string,
    endpoint: string,
    method: QueuedMutation['method'],
    payload: Record<string, unknown>,
    options?: {
      entityId?: string;
      entityVersion?: number;
      baseData?: any;
    }
  ): Promise<string> {
    const mutation: QueuedMutation = {
      id: `mutation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      endpoint,
      method,
      payload,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
      maxRetries: CONFIG.MAX_RETRIES,
      entityId: options?.entityId,
      entityVersion: options?.entityVersion,
      baseData: options?.baseData,
    };

    // Check for duplicate
    const isDuplicate = this.state.mutations.some(
      m => m.type === type && 
           m.entityId === mutation.entityId &&
           JSON.stringify(m.payload) === JSON.stringify(payload) &&
           m.status === 'pending'
    );

    if (isDuplicate) {
      console.log('[OfflineQueue] Skipping duplicate mutation:', type);
      return '';
    }

    this.state.mutations.push(mutation);
    await this.persistQueue();
    this.notifyListeners();
    this.emit('mutation_added', mutation);

    console.log('[OfflineQueue] Queued mutation:', type, mutation.id);

    // Process immediately if online
    if (this.state.isOnline && !this.state.isProcessing) {
      this.processQueue();
    }

    return mutation.id;
  }

  /**
   * Resolve a conflict manually
   */
  async resolveConflict(
    mutationId: string,
    resolution: ConflictResolution
  ): Promise<void> {
    const mutation = this.state.mutations.find(m => m.id === mutationId);
    
    if (!mutation || mutation.status !== 'conflict') {
      console.warn('[OfflineQueue] Cannot resolve: mutation not found or not in conflict');
      return;
    }

    mutation.conflictResolution = resolution;
    mutation.status = 'pending';
    mutation.retries = 0;
    
    await this.persistQueue();
    this.notifyListeners();
    
    console.log('[OfflineQueue] Conflict resolved for:', mutationId);
    
    if (this.state.isOnline) {
      this.processQueue();
    }
  }

  /**
   * Remove mutation from queue
   */
  async removeMutation(id: string): Promise<void> {
    this.state.mutations = this.state.mutations.filter(m => m.id !== id);
    await this.persistQueue();
    this.notifyListeners();
  }

  /**
   * Clear all mutations
   */
  async clearQueue(): Promise<void> {
    this.state.mutations = [];
    await this.persistQueue();
    this.notifyListeners();
  }

  /**
   * Retry failed mutations
   */
  async retryFailed(): Promise<void> {
    this.state.mutations
      .filter(m => m.status === 'failed' || m.status === 'conflict')
      .forEach(m => {
        m.status = 'pending';
        m.retries = 0;
        m.error = undefined;
      });
    
    await this.persistQueue();
    this.notifyListeners();
    
    if (this.state.isOnline) {
      this.processQueue();
    }
  }

  // ───────────────────────────────────────────────────────────
  // PROCESSING LOGIC
  // ───────────────────────────────────────────────────────────

  private handleNetworkChange = (online: boolean): void => {
    const wasOffline = !this.state.isOnline;
    this.state.isOnline = online;

    if (online && wasOffline) {
      console.log('[OfflineQueue] Back online, processing queue');
      this.emit('online');
      this.startProcessing();
    } else if (!online) {
      console.log('[OfflineQueue] Gone offline, pausing processing');
      this.emit('offline');
      this.stopProcessing();
    }

    this.notifyListeners();
  };

  private startProcessing(): void {
    if (this.processingInterval) return;
    
    this.processQueue(); // Immediate process
    
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, CONFIG.PROCESSING_INTERVAL_MS);
  }

  private stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  private async processQueue(): Promise<void> {
    if (this.state.isProcessing || !this.state.isOnline) return;

    const pendingMutations = this.state.mutations.filter(
      m => m.status === 'pending'
    );

    if (pendingMutations.length === 0) return;

    this.state.isProcessing = true;
    this.state.syncProgress = 0;
    this.emit('sync_started');
    this.notifyListeners();

    const total = pendingMutations.length;
    let processed = 0;

    for (const mutation of pendingMutations) {
      try {
        mutation.status = 'processing';
        this.notifyListeners();

        await this.executeMutation(mutation);
        
        mutation.status = 'completed';
        this.emit('mutation_completed', mutation);
        console.log('[OfflineQueue] Mutation completed:', mutation.id);
      } catch (error: any) {
        await this.handleMutationError(mutation, error);
      }

      processed++;
      this.state.syncProgress = (processed / total) * 100;
      this.notifyListeners();
    }

    // Remove completed mutations
    this.state.mutations = this.state.mutations.filter(
      m => m.status !== 'completed'
    );

    this.state.lastSyncTime = Date.now();
    await this.persistQueue();
    this.state.isProcessing = false;
    this.emit('sync_completed');
    this.notifyListeners();
  }

  private async handleMutationError(mutation: QueuedMutation, error: any): Promise<void> {
    const status = error?.status || error?.response?.status;
    const serverData = error?.response?.data;

    // ─────────────────────────────────────────────────────
    // HANDLE CONFLICT (409)
    // ─────────────────────────────────────────────────────
    if (status === 409) {
      mutation.status = 'conflict';
      mutation.error = 'Conflict: Data was modified by another user';
      
      console.warn('[OfflineQueue] Conflict detected for:', mutation.id);
      this.emit('mutation_conflict', {
        mutation,
        serverData: serverData?.data,
        clientData: mutation.payload,
        baseVersion: mutation.entityVersion,
      } as ConflictContext);

      // Try automatic conflict resolution
      await this.attemptAutoConflictResolution(mutation, serverData?.data);
      return;
    }

    // ─────────────────────────────────────────────────────
    // HANDLE VALIDATION ERROR (400)
    // ─────────────────────────────────────────────────────
    if (status === 400) {
      mutation.status = 'failed';
      mutation.error = serverData?.error || 'Validation error';
      this.emit('mutation_failed', { mutation, error: mutation.error });
      console.error('[OfflineQueue] Validation failed:', mutation.id, mutation.error);
      return;
    }

    // ─────────────────────────────────────────────────────
    // HANDLE AUTH ERROR (401)
    // ─────────────────────────────────────────────────────
    if (status === 401) {
      mutation.status = 'failed';
      mutation.error = 'Authentication required';
      this.emit('mutation_failed', { mutation, error: mutation.error });
      console.error('[OfflineQueue] Auth error for:', mutation.id);
      return;
    }

    // ─────────────────────────────────────────────────────
    // HANDLE RETRYABLE ERRORS
    // ─────────────────────────────────────────────────────
    mutation.retries++;
    mutation.error = error?.message || 'Unknown error';

    if (mutation.retries >= mutation.maxRetries) {
      mutation.status = 'failed';
      this.emit('mutation_failed', { mutation, error: mutation.error });
      console.error('[OfflineQueue] Mutation failed after max retries:', mutation.id);
    } else {
      mutation.status = 'pending';
      
      // Exponential backoff
      const delay = Math.min(
        CONFIG.BASE_RETRY_DELAY_MS * Math.pow(2, mutation.retries - 1),
        CONFIG.MAX_RETRY_DELAY_MS
      );
      
      console.warn(
        '[OfflineQueue] Mutation will retry in', delay, 'ms:', mutation.id,
        'Attempt:', mutation.retries
      );
      
      // Delay next retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  private async attemptAutoConflictResolution(
    mutation: QueuedMutation,
    serverData: any
  ): Promise<void> {
    // Check for registered resolver
    const resolver = this.conflictResolvers.get(mutation.type);
    
    if (!resolver) {
      console.log('[OfflineQueue] No auto-resolver for type:', mutation.type);
      return;
    }

    try {
      const resolution = await resolver({
        mutation,
        serverData,
        clientData: mutation.payload,
        baseVersion: mutation.entityVersion || 0,
      });

      if (resolution.strategy === 'server_wins') {
        // Accept server version, mark as completed
        mutation.status = 'completed';
        console.log('[OfflineQueue] Conflict resolved: server wins');
      } else if (resolution.strategy === 'client_wins') {
        // Retry with client data (force update)
        mutation.status = 'pending';
        mutation.entityVersion = serverData?.version;
        console.log('[OfflineQueue] Conflict resolved: client wins');
      } else if (resolution.strategy === 'merge' && resolution.mergedData) {
        // Use merged data
        mutation.payload = resolution.mergedData;
        mutation.status = 'pending';
        mutation.entityVersion = serverData?.version;
        console.log('[OfflineQueue] Conflict resolved: merged');
      }
      // 'manual' strategy: keep in conflict state for user resolution

      await this.persistQueue();
      this.notifyListeners();

      if (mutation.status === 'pending') {
        this.processQueue();
      }
    } catch (error) {
      console.error('[OfflineQueue] Auto-resolution failed:', error);
    }
  }

  private async executeMutation(mutation: QueuedMutation): Promise<void> {
    const { endpoint, method, payload, conflictResolution } = mutation;

    // Add version header for optimistic locking
    const headers: Record<string, string> = {};
    if (mutation.entityVersion !== undefined) {
      headers['X-Entity-Version'] = String(mutation.entityVersion);
    }
    if (conflictResolution?.strategy === 'client_wins') {
      headers['X-Force-Update'] = 'true';
    }

    switch (method) {
      case 'POST':
        await apiService.post(endpoint, payload, { headers });
        break;
      case 'PUT':
        await apiService.put(endpoint, payload, { headers });
        break;
      case 'PATCH':
        await apiService.patch(endpoint, payload, { headers });
        break;
      case 'DELETE':
        await apiService.delete(endpoint, { headers });
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  // ───────────────────────────────────────────────────────────
  // PERSISTENCE
  // ───────────────────────────────────────────────────────────

  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(CONFIG.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state.mutations = parsed.mutations || [];
        this.state.lastSyncTime = parsed.lastSyncTime || null;
        
        // Reset processing state on load
        this.state.mutations.forEach(m => {
          if (m.status === 'processing') {
            m.status = 'pending';
          }
          // Expire old conflicts
          if (m.status === 'conflict' && 
              Date.now() - m.timestamp > CONFIG.CONFLICT_TIMEOUT_MS) {
            m.status = 'failed';
            m.error = 'Conflict resolution timeout';
          }
        });

        console.log('[OfflineQueue] Loaded', this.state.mutations.length, 'mutations from storage');
      }
    } catch (error) {
      console.error('[OfflineQueue] Failed to load queue:', error);
    }
  }

  private async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        CONFIG.STORAGE_KEY,
        JSON.stringify({
          mutations: this.state.mutations,
          lastSyncTime: this.state.lastSyncTime,
        })
      );
    } catch (error) {
      console.error('[OfflineQueue] Failed to persist queue:', error);
    }
  }

  private notifyListeners(): void {
    this.stateListeners.forEach(listener => listener(this.getState()));
  }
}

// ─────────────────────────────────────────────────────────────
// SINGLETON EXPORT
// ─────────────────────────────────────────────────────────────

export const offlineQueue = new OfflineQueueManager();

// ─────────────────────────────────────────────────────────────
// REACT HOOK
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';

export const useOfflineQueue = () => {
  const [state, setState] = useState<OfflineQueueState>(offlineQueue.getState());

  useEffect(() => {
    return offlineQueue.subscribe(setState);
  }, []);

  const queueMutation = useCallback(
    (
      type: string,
      endpoint: string,
      method: QueuedMutation['method'],
      payload: Record<string, unknown>,
      options?: {
        entityId?: string;
        entityVersion?: number;
        baseData?: any;
      }
    ) => offlineQueue.queueMutation(type, endpoint, method, payload, options),
    []
  );

  const resolveConflict = useCallback(
    (mutationId: string, resolution: ConflictResolution) =>
      offlineQueue.resolveConflict(mutationId, resolution),
    []
  );

  const removeMutation = useCallback(
    (id: string) => offlineQueue.removeMutation(id),
    []
  );

  const retryFailed = useCallback(
    () => offlineQueue.retryFailed(),
    []
  );

  const clearQueue = useCallback(
    () => offlineQueue.clearQueue(),
    []
  );

  const registerConflictResolver = useCallback(
    (type: string, resolver: (context: ConflictContext) => Promise<ConflictResolution>) =>
      offlineQueue.registerConflictResolver(type, resolver),
    []
  );

  return {
    ...state,
    queueMutation,
    resolveConflict,
    removeMutation,
    retryFailed,
    clearQueue,
    registerConflictResolver,
    pendingCount: state.mutations.filter(m => m.status === 'pending').length,
    failedCount: state.mutations.filter(m => m.status === 'failed').length,
    conflictCount: state.mutations.filter(m => m.status === 'conflict').length,
    hasPending: state.mutations.some(m => m.status === 'pending'),
    hasConflicts: state.mutations.some(m => m.status === 'conflict'),
  };
};

// ─────────────────────────────────────────────────────────────
// DEFAULT CONFLICT RESOLVERS
// ─────────────────────────────────────────────────────────────

/**
 * Default conflict resolver for itinerary updates
 * Merges changes, preferring client for activities, server for structure
 */
export const itineraryConflictResolver = async (
  context: ConflictContext
): Promise<ConflictResolution> => {
  const { serverData, clientData } = context;

  // Merge activities (client wins for activities)
  const mergedActivities = [
    ...(clientData.activities || []),
    ...(serverData.activities || []).filter(
      (a: any) => !clientData.activities?.some((ca: any) => ca.id === a.id)
    ),
  ];

  return {
    strategy: 'merge',
    mergedData: {
      ...serverData,
      activities: mergedActivities,
      notes: clientData.notes || serverData.notes, // Client notes win
    },
  };
};

/**
 * Default conflict resolver for budget updates
 * Server wins for accuracy
 */
export const budgetConflictResolver = async (
  context: ConflictContext
): Promise<ConflictResolution> => {
  return { strategy: 'server_wins' };
};

export default offlineQueue;