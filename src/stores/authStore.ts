/**
 * Authentication Store (Zustand)
 * Manages user authentication state with enhanced features
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  avatar_url?: string;
  preferences?: Record<string, any>;
}

export interface AuthStore {
  // State
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Actions
  setToken: (token: string) => Promise<void>;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearUser: () => void;
  logout: () => Promise<void>;
  loadAuthState: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      token: null,
      user: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      // Action: Set token and persist
      setToken: async (token: string) => {
        try {
          await AsyncStorage.setItem("authToken", token);
          set({ token, isAuthenticated: true });
        } catch (error) {
          console.error("Failed to save auth token:", error);
          throw error;
        }
      },

      // Action: Set user
      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      // Action: Set loading state
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // Action: Set error
      setError: (error: string | null) => {
        set({ error });
      },

      // Action: Clear user (for logout)
      clearUser: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      // Action: Logout
      logout: async () => {
        try {
          await AsyncStorage.removeItem("authToken");
          set({ token: null, user: null, isAuthenticated: false });
        } catch (error) {
          console.error("Failed to logout:", error);
          throw error;
        }
      },

      // Action: Load auth state from storage
      loadAuthState: async () => {
        try {
          set({ isLoading: true });
          const token = await AsyncStorage.getItem("authToken");
          if (token) {
            set({ token, isLoading: false, isAuthenticated: true });
          } else {
            set({ isLoading: false, isAuthenticated: false });
          }
        } catch (error) {
          console.error("Failed to load auth state:", error);
          set({ isLoading: false, isAuthenticated: false });
        }
      },

      // Action: Update user profile
      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
