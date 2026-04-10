/**
 * Secure Token Manager
 * Handles JWT tokens with secure storage and auto-refresh
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiService from "./api";

// Token keys
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const TOKEN_EXPIRY_KEY = "token_expiry";

// Web fallback (SecureStore not available on web)
const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

class TokenManager {
  private refreshPromise: Promise<string | null> | null = null;
  private isRefreshing = false;

  /**
   * Store both access and refresh tokens
   */
  async storeTokens(accessToken: string, refreshToken: string, expiresIn?: number): Promise<void> {
    await Promise.all([
      secureStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
      secureStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
    ]);
    
    // Store expiry time if provided
    if (expiresIn) {
      const expiryTime = Date.now() + expiresIn * 1000;
      await secureStorage.setItem(TOKEN_EXPIRY_KEY, String(expiryTime));
    }
  }

  /**
   * Get the current access token
   */
  async getAccessToken(): Promise<string | null> {
    return secureStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /**
   * Get the current refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    return secureStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Check if token is expired or about to expire (within 5 minutes)
   */
  async isTokenExpired(): Promise<boolean> {
    const expiryTime = await secureStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiryTime) return false;
    
    const expiry = parseInt(expiryTime, 10);
    const buffer = 5 * 60 * 1000; // 5 minutes buffer
    
    return Date.now() + buffer >= expiry;
  }

  /**
   * Refresh the access token using refresh token
   * Uses mutex to prevent multiple refresh calls
   */
  async refreshAccessToken(): Promise<string | null> {
    // If already refreshing, return the existing promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this._doRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async _doRefresh(): Promise<string | null> {
    const refreshToken = await this.getRefreshToken();
    
    if (!refreshToken) {
      console.log("🔐 No refresh token available");
      await this.clearTokens();
      return null;
    }

    try {
      console.log("🔐 Refreshing access token...");
      
      const response = await fetch(`${apiService.getBaseUrl()}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        console.log("🔐 Token refresh failed:", response.status);
        await this.clearTokens();
        return null;
      }

      const data = await response.json();
      
      await this.storeTokens(
        data.access_token,
        data.refresh_token,
        data.expires_in
      );
      
      console.log("🔐 Token refreshed successfully");
      return data.access_token;
    } catch (error) {
      console.error("🔐 Token refresh error:", error);
      await this.clearTokens();
      return null;
    }
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getValidToken(): Promise<string | null> {
    const token = await this.getAccessToken();
    
    if (!token) {
      return null;
    }

    // Check if token needs refresh
    if (await this.isTokenExpired()) {
      console.log("🔐 Token expired, refreshing...");
      return this.refreshAccessToken();
    }

    return token;
  }

  /**
   * Clear all stored tokens
   */
  async clearTokens(): Promise<void> {
    await Promise.all([
      secureStorage.deleteItem(ACCESS_TOKEN_KEY),
      secureStorage.deleteItem(REFRESH_TOKEN_KEY),
      secureStorage.deleteItem(TOKEN_EXPIRY_KEY),
    ]);
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  }
}

// Singleton instance
export const tokenManager = new TokenManager();
export default tokenManager;