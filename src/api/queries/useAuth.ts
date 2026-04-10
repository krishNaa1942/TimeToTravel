/**
 * Authentication Hooks with React Query
 * Handles login, register, logout, and session management
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import tokenManager from "@/services/tokenManager";
import apiService from "@/services/api";
import { queryKeys } from "@/api/queryClient";
import { useAuthStore, User } from "@/stores/authStore";

// Types
interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  name: string;
}

interface AuthResponse {
  message: string;
  user: {
    id: number | string;
    email: string;
    name: string;
    avatar_url?: string;
    created_at: string;
  };
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

/**
 * Hook for login mutation
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<AuthResponse> => {
      const response = await apiService.post<AuthResponse>(
        "/auth/login",
        credentials
      );
      return response;
    },
    onSuccess: async (data) => {
      // Store tokens if provided
      if (data.access_token && data.refresh_token) {
        await tokenManager.storeTokens(
          data.access_token,
          data.refresh_token,
          data.expires_in
        );
      }

      // Update auth store
      if (data.user) {
        setUser({
          id: String(data.user.id),
          email: data.user.email,
          name: data.user.name,
          avatar_url: data.user.avatar_url,
        });
      }

      // Invalidate and refetch user queries
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
    },
    onError: (error: any) => {
      const message = error?.message || "Login failed. Please try again.";
      console.error("Login error:", message);
    },
  });
}

/**
 * Hook for register mutation
 */
export function useRegister() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async (data: RegisterData): Promise<AuthResponse> => {
      const response = await apiService.post<AuthResponse>(
        "/auth/register",
        data
      );
      return response;
    },
    onSuccess: async (data) => {
      // Store tokens if provided
      if (data.access_token && data.refresh_token) {
        await tokenManager.storeTokens(
          data.access_token,
          data.refresh_token,
          data.expires_in
        );
      }

      // Update auth store
      if (data.user) {
        setUser({
          id: String(data.user.id),
          email: data.user.email,
          name: data.user.name,
          avatar_url: data.user.avatar_url,
        });
      }

      // Invalidate auth queries
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
    },
  });
}

/**
 * Hook for logout
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const clearUser = useAuthStore((state) => state.clearUser);

  return useMutation({
    mutationFn: async () => {
      try {
        // Call logout endpoint to invalidate token on server
        await apiService.post("/auth/logout", {});
      } catch (error) {
        // Ignore errors on logout - proceed to clear local state
        console.log("Logout API call failed, clearing local state");
      }
    },
    onSuccess: async () => {
      // Clear tokens from secure storage
      await tokenManager.clearTokens();
      
      // Clear user from store
      clearUser();
      
      // Clear all cached queries
      queryClient.clear();
    },
  });
}

/**
 * Hook for current user session
 */
export function useSession() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: async (): Promise<User | null> => {
      // Check if we have a valid token
      const hasToken = await tokenManager.isAuthenticated();
      
      if (!hasToken) {
        return null;
      }

      // If we already have user in store, return it
      if (user) {
        return user;
      }

      // Otherwise fetch from server
      try {
        const response = await apiService.get<User>("/auth/me");
        return response;
      } catch (error) {
        // Token might be expired, try refresh
        const newToken = await tokenManager.refreshAccessToken();
        if (newToken) {
          try {
            const response = await apiService.get<User>("/auth/me");
            return response;
          } catch (retryError) {
            return null;
          }
        }
        return null;
      }
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to check if user is authenticated
 * Note: This is a synchronous check - use useSession for full validation
 */
export function useIsAuthenticated() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated;
}

/**
 * Hook for async auth check (validates token with storage)
 */
export function useAuthGuard() {
  const storeAuth = useAuthStore((state) => state.isAuthenticated);
  
  return useQuery({
    queryKey: ["auth", "guard"],
    queryFn: async () => {
      return tokenManager.isAuthenticated();
    },
    enabled: storeAuth,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook for password reset request
 */
export function usePasswordReset() {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await apiService.post<{ message: string }>(
        "/auth/forgot-password",
        { email }
      );
      return response;
    },
    onSuccess: (data) => {
      Alert.alert(
        "Password Reset",
        "If an account with that email exists, you'll receive a password reset link."
      );
    },
  });
}

/**
 * Hook for updating profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async (updates: Partial<User>) => {
      const response = await apiService.put<User>("/auth/profile", updates);
      return response;
    },
    onSuccess: (updatedUser) => {
      // Update store
      setUser({
        ...user,
        ...updatedUser,
      });

      // Invalidate user queries
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
    },
  });
}