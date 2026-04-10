/**
 * Authentication Service (Production-Ready)
 * Handles login, register, and auth-related API calls
 * 
 * The Flask backend uses SESSION-based auth (Flask-Login), not JWT.
 * We track login state locally via the auth store.
 */

import { apiService, ApiError } from "./api";
import { useAuthStore, User } from "@/stores/authStore";

// ─────────────────────────────────────────────────────────────
// DEBUG LOGGING
// ─────────────────────────────────────────────────────────────
const DEBUG_AUTH = true;

function log(...args: any[]) {
  if (DEBUG_AUTH) {
    console.log("🔐 [AUTH]", ...args);
  }
}

function logError(...args: any[]) {
  console.error("🔐❌ [AUTH ERROR]", ...args);
}

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

/** Flask returns { message, user } on success */
interface FlaskAuthResponse {
  message: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

// ─────────────────────────────────────────────────────────────
// RETRY LOGIC
// ─────────────────────────────────────────────────────────────
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 500
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on client errors (4xx) - they won't succeed
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        log(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 1.5; // Exponential backoff
      }
    }
  }
  
  throw lastError;
}

// ─────────────────────────────────────────────────────────────
// AUTH SERVICE
// ─────────────────────────────────────────────────────────────
export const authService = {
  /**
   * Login user with email and password.
   * Flask-Login sets a session cookie; we store a marker token locally.
   */
  async login(payload: LoginPayload): Promise<void> {
    log("Login attempt started");
    log("📧 Email:", payload.email);
    log("🔑 Password length:", payload.password?.length || 0);
    
    // Validate payload before API call
    if (!payload.email?.trim()) {
      const error = new ApiError("Email is required", 400, "VALIDATION_ERROR");
      logError("Validation failed: missing email");
      throw error;
    }
    if (!payload.password?.trim()) {
      const error = new ApiError("Password is required", 400, "VALIDATION_ERROR");
      logError("Validation failed: missing password");
      throw error;
    }
    
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(payload.email.trim().toLowerCase())) {
      const error = new ApiError("Invalid email format", 400, "VALIDATION_ERROR");
      logError("Validation failed: invalid email format");
      throw error;
    }

    try {
      log("Sending login request to /api/auth/login");
      
      const response = await withRetry(() => 
        apiService.post<FlaskAuthResponse>("/auth/login", {
          email: payload.email.trim().toLowerCase(),
          password: payload.password,
        })
      );
      
      log("✅ Login response received:", JSON.stringify(response, null, 2));

      // Flask returns { message, user } — session cookie handles auth
      if (!response.user) {
        logError("Response missing user object:", response);
        throw new ApiError("Invalid server response - missing user data", 500);
      }
      
      const { setToken, setUser } = useAuthStore.getState();
      const user: User = {
        id: String(response.user.id),
        name: response.user.name,  // Bug A2 fix: was `username` which doesn't exist on User type
        email: response.user.email,
      };
      
      log("💾 Storing auth state for user:", user.name);
      
      // Store a marker token so our RootNavigator knows we're logged in
      await setToken("session-active");
      setUser(user);
      
      log("✅ Login completed successfully for:", user.email);
    } catch (error) {
      logError("Login failed:", error);
      
      if (error instanceof ApiError) {
        // Add more context to the error message
        if (error.status === 401) {
          throw new ApiError("Invalid email or password. Please check your credentials.", 401, "AUTH_FAILED");
        }
        if (error.status === 0 || error.code === "NETWORK_ERROR") {
          throw new ApiError("Unable to connect to server. Please check your internet connection.", 0, "NETWORK_ERROR");
        }
        if (error.code === "TIMEOUT") {
          throw new ApiError("Request timed out. Please try again.", 408, "TIMEOUT");
        }
        throw error;
      }
      
      throw new ApiError(
        error instanceof Error ? error.message : "Login failed. Please try again.",
        500
      );
    }
  },

  /**
   * Register new user.
   * Flask expects { name, email, password }.
   */
  async register(payload: RegisterPayload): Promise<void> {
    log("Registration attempt started");
    log("📝 Name:", payload.name);
    log("📧 Email:", payload.email);
    
    // Validate payload before API call
    const errors: string[] = [];
    
    if (!payload.name?.trim()) {
      errors.push("Name is required");
    } else if (payload.name.trim().length > 100) {
      errors.push("Name is too long (max 100 characters)");
    }
    
    if (!payload.email?.trim()) {
      errors.push("Email is required");
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(payload.email.trim().toLowerCase())) {
        errors.push("Invalid email format");
      }
    }
    
    if (!payload.password) {
      errors.push("Password is required");
    } else {
      // Backend password requirements
      if (payload.password.length < 8) {
        errors.push("Password must be at least 8 characters");
      }
      if (!/[A-Z]/.test(payload.password)) {
        errors.push("Password must contain an uppercase letter");
      }
      if (!/[a-z]/.test(payload.password)) {
        errors.push("Password must contain a lowercase letter");
      }
      if (!/[0-9]/.test(payload.password)) {
        errors.push("Password must contain a digit");
      }
    }
    
    if (errors.length > 0) {
      const errorMessage = errors.join(". ");
      logError("Validation failed:", errorMessage);
      throw new ApiError(errorMessage, 400, "VALIDATION_ERROR");
    }

    try {
      log("Sending registration request to /api/auth/register");
      
      const response = await withRetry(() =>
        apiService.post<FlaskAuthResponse>("/auth/register", {
          name: payload.name.trim(),
          email: payload.email.trim().toLowerCase(),
          password: payload.password,
        })
      );
      
      log("✅ Registration response received:", JSON.stringify(response, null, 2));

      if (!response.user) {
        logError("Response missing user object:", response);
        throw new ApiError("Invalid server response - missing user data", 500);
      }
      
      const { setToken, setUser } = useAuthStore.getState();
      const user: User = {
        id: String(response.user.id),
        name: response.user.name,  // Bug A2 fix: was `username`
        email: response.user.email,
      };
      
      log("💾 Storing auth state for new user:", user.name);
      
      await setToken("session-active");
      setUser(user);
      
      log("✅ Registration completed successfully for:", user.email);
    } catch (error) {
      logError("Registration failed:", error);
      
      if (error instanceof ApiError) {
        if (error.status === 409) {
          throw new ApiError("An account with this email already exists. Please log in instead.", 409, "EMAIL_EXISTS");
        }
        if (error.status === 422) {
          // Validation error from backend - pass through the message
          throw error;
        }
        if (error.status === 0 || error.code === "NETWORK_ERROR") {
          throw new ApiError("Unable to connect to server. Please check your internet connection.", 0, "NETWORK_ERROR");
        }
        throw error;
      }
      
      throw new ApiError(
        error instanceof Error ? error.message : "Registration failed. Please try again.",
        500
      );
    }
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    log("Logout initiated");
    
    try {
      await apiService.post("/auth/logout", {});
      log("✅ Server logout successful");
    } catch (error) {
      logError("Logout API call failed (non-critical):", error);
      // Continue with local logout even if API fails
    }
    
    const { logout } = useAuthStore.getState();
    await logout();
    log("✅ Local logout completed");
  },

  /**
   * Check if user is currently authenticated
   */
  async checkAuth(): Promise<boolean> {
    log("Checking authentication status");
    
    try {
      const response = await apiService.get<{
        authenticated: boolean;
        user?: { id: number; name: string; email: string };
      }>("/auth/me");
      
      log("Auth check response:", JSON.stringify(response, null, 2));

      if (response.authenticated && response.user) {
        const { setToken, setUser } = useAuthStore.getState();
        const user: User = {
          id: String(response.user.id),
          name: response.user.name,  // Bug A2 fix: was `username`
          email: response.user.email,
        };
        await setToken("session-active");
        setUser(user);
        log("✅ User is authenticated:", user.email);
        return true;
      }
      
      log("ℹ️ User is not authenticated");
      return false;
    } catch (error) {
      logError("Auth check failed:", error);
      return false;
    }
  },
};

export default authService;