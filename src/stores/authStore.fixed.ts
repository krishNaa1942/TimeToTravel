/**
 * Auth Store - PRODUCTION READY
 * =============================
 * 
 * Single source of truth for authentication state.
 * 
 * CRITICAL: This store does NOT store tokens directly.
 * All token operations go through tokenManager.
 * 
 * Architecture:
 * - tokenManager: Handles all token storage/refresh (SecureStore)
 * - authStore: Handles user state and UI state (Zustand + AsyncStorage for user data only)
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import tokenManager, { TokenPayload } from "@/services/tokenManager.fixed";
import apiService from "@/services/api.fixed";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  travelStyle: "adventure" | "relaxation" | "cultural" | "business";
  budgetPreference: "budget" | "moderate" | "luxury";
  climatePreference: "tropical" | "cold" | "moderate";
  currency?: string;
  language?: string;
}

export interface AuthState {
  // State
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loadAuthState: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  clearError: () => void;
  setUser: (user: User) => void;
}

// ─────────────────────────────────────────────────────────────
// AUTH ERROR CLASS
// ─────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// ─────────────────────────────────────────────────────────────
// AUTH STORE
// ─────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isInitialized: false,
      error: null,

      // ───────────────────────────────────────────────────────
      // LOGIN
      // ───────────────────────────────────────────────────────
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          // Validate inputs
          if (!email || !password) {
            throw new AuthError("Email and password are required", "INVALID_INPUT");
          }

          // Call login API
          const response = await apiService.post<{ 
            access_token: string; 
            refresh_token: string; 
            expires_in: number;
            user: User;
          }>("/auth/login", { email, password });

          // ✅ CRITICAL: Store tokens via tokenManager ONLY
          // DO NOT store tokens in this store
          await tokenManager.storeTokens({
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            expiresIn: response.expires_in,
            userId: response.user.id,
          });

          // Update state
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          console.log("[AuthStore] Login successful for:", response.user.email);
        } catch (error: any) {
          const message = error?.response?.data?.error || error?.message || "Login failed";
          const code = error?.response?.data?.code || "LOGIN_FAILED";
          const status = error?.response?.status;

          console.error("[AuthStore] Login failed:", message);
          
          set({
            isLoading: false,
            error: message,
            isAuthenticated: false,
            user: null,
          });

          throw new AuthError(message, code, status);
        }
      },

      // ───────────────────────────────────────────────────────
      // REGISTER
      // ───────────────────────────────────────────────────────
      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null });

        try {
          // Validate inputs
          if (!email || !password || !name) {
            throw new AuthError("All fields are required", "INVALID_INPUT");
          }

          // Call register API
          const response = await apiService.post<{
            access_token: string;
            refresh_token: string;
            expires_in: number;
            user: User;
          }>("/auth/register", { email, password, name });

          // Store tokens via tokenManager
          await tokenManager.storeTokens({
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            expiresIn: response.expires_in,
            userId: response.user.id,
          });

          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          console.log("[AuthStore] Registration successful for:", response.user.email);
        } catch (error: any) {
          const message = error?.response?.data?.error || error?.message || "Registration failed";
          const code = error?.response?.data?.code || "REGISTER_FAILED";

          set({
            isLoading: false,
            error: message,
          });

          throw new AuthError(message, code);
        }
      },

      // ───────────────────────────────────────────────────────
      // LOGOUT
      // ───────────────────────────────────────────────────────
      logout: async () => {
        set({ isLoading: true });

        try {
          // ✅ CRITICAL: Logout via tokenManager (clears tokens + notifies server)
          await tokenManager.logout();
        } catch (error) {
          console.error("[AuthStore] Logout error:", error);
          // Continue even if server logout fails
        }

        // Clear state
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });

        console.log("[AuthStore] Logout complete");
      },

      // ───────────────────────────────────────────────────────
      // LOAD AUTH STATE (App Start)
      // ───────────────────────────────────────────────────────
      loadAuthState: async () => {
        set({ isLoading: true });

        try {
          // ✅ CRITICAL: Get valid token (refreshes if expired)
          const token = await tokenManager.getValidToken();

          if (!token) {
            // No valid token - clear state
            console.log("[AuthStore] No valid token, user not authenticated");
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
            });
            return;
          }

          // Token is valid - fetch user profile
          try {
            const user = await apiService.get<User>("/auth/me");

            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
            });

            console.log("[AuthStore] Auth restored for:", user.email);
          } catch (error: any) {
            // Token might be valid but user fetch failed
            // This could be a network error - don't logout
            if (error.status === 401) {
              // Token actually invalid - clear everything
              console.log("[AuthStore] Token invalid, clearing");
              await tokenManager.clearTokens();
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                isInitialized: true,
              });
            } else {
              // Network error - user stays logged in
              console.error("[AuthStore] Failed to fetch user profile:", error);
              set({
                isAuthenticated: true,
                isLoading: false,
                isInitialized: true,
              });
            }
          }
        } catch (error) {
          console.error("[AuthStore] Failed to load auth state:", error);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      // ───────────────────────────────────────────────────────
      // UPDATE USER
      // ───────────────────────────────────────────────────────
      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (!currentUser) return;

        set({
          user: { ...currentUser, ...updates },
        });
      },

      // ───────────────────────────────────────────────────────
      // CLEAR ERROR
      // ───────────────────────────────────────────────────────
      clearError: () => {
        set({ error: null });
      },

      // ───────────────────────────────────────────────────────
      // SET USER (for external updates)
      // ───────────────────────────────────────────────────────
      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // ✅ CRITICAL: DO NOT persist token or isAuthenticated
      // Only persist non-sensitive user data
      partialize: (state) => ({
        user: state.user,
        // ❌ DO NOT INCLUDE: token, isAuthenticated
      }),
    }
  )
);

// ─────────────────────────────────────────────────────────────
// TOKEN EVENT SUBSCRIPTIONS
// ─────────────────────────────────────────────────────────────

// Subscribe to token events
tokenManager.on("token_expired", () => {
  console.log("[AuthStore] Token expired event received");
  useAuthStore.getState().logout();
});

tokenManager.on("token_cleared", () => {
  console.log("[AuthStore] Token cleared event received");
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
  });
});

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

export default useAuthStore;

// Selector hooks for performance
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useIsLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useIsInitialized = () => useAuthStore((state) => state.isInitialized);