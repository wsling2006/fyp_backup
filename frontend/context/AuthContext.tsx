"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "../lib/api";
import { useRouter } from "next/navigation";

interface User {
  email: string;
  [key: string]: any;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  isInitialized: boolean; // NEW: Track if initial load from localStorage is complete
  login: (email: string, password: string) => Promise<LoginResult>;
  forgotPassword: (email: string) => Promise<boolean>;
  verifyOtp: (email: string, otp: string) => Promise<{ otp_reset?: string } | false>;
  logout: () => void;
  resetPassword: (
    email: string,
    otp_reset: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<boolean>;
}

interface LoginResult {
  requiresOtp?: boolean;
  access_token?: string;
  user?: any;
  email?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false); // NEW: Track initialization
  const router = useRouter();

  // Load token and user from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (storedToken) setToken(storedToken);
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Normalize user object: ensure userId exists
      if (parsedUser && !parsedUser.userId && parsedUser.id) {
        parsedUser.userId = parsedUser.id;
      }
      setUser(parsedUser);
    }
    // Mark as initialized after attempting to load from localStorage
    setIsInitialized(true);
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<LoginResult> => {
    setLoading(true);
    setError(null);
    const trimmedEmail = email.trim();
    const trimmedPassword = password;

    try {
      const res = await api.post("/auth/login", {
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (res.data.requiresOtp) {
        return { requiresOtp: true };
      } else if (res.data.access_token && res.data.user) {
        // Normalize user object: backend returns {id, email, role}, frontend expects {userId, id, email, role}
        const normalizedUser = {
          ...res.data.user,
          userId: res.data.user.id, // Add userId for backward compatibility
        };
        setToken(res.data.access_token);
        setUser(normalizedUser);
        localStorage.setItem("token", res.data.access_token);
        localStorage.setItem("user", JSON.stringify(normalizedUser));
        return { access_token: res.data.access_token, user: normalizedUser };
      } else {
        setError("Invalid response from server.");
        return {};
      }
    } catch (err: any) {
      console.log("[Auth] Login error status:", err.response?.status);
      console.log("[Auth] Login error data:", err.response?.data);

      // Detect account locked / OTP required
      if (err.response?.data?.locked === true && err.response?.data?.email) {
        console.log("[Auth] OTP required (account locked)");
        return { requiresOtp: true, email: err.response.data.email };
      }

      // Detect suspended account
      if (err.response?.data?.suspended === true) {
        setError(err.response?.data?.message || "Your account has been suspended. Please contact an administrator.");
        return {};
      }

      setError(err.response?.data?.message || "Login failed");
      return {};
    } finally {
      setLoading(false);
    }
  };

  // Forgot password function
  const forgotPassword = async (email: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    console.log("[Auth] Requesting OTP for forgot password:", email);
    try {
      const res = await api.post("/auth/forgot-password", { email });
      console.log("[Auth] Forgot password response:", res.data);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to request password reset OTP");
      console.error("[Auth] Forgot password error:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // OTP verification function
  const verifyOtp = async (email: string, otp: string): Promise<any> => {
    setLoading(true);
    setError(null);
    console.log("[Auth] Attempting OTP verification for email:", email);
    try {
      const res = await api.post("/auth/verify-otp", { email, otp });
      console.log("[Auth] Response from /auth/verify-otp:", res.data);
      // Return the full response so the page can decide what to do
      if (res.data.otp_reset) {
        console.log("[Auth] OTP verified, got otp_reset:", res.data.otp_reset);
        return { otp_reset: res.data.otp_reset, type: "reset" };
      } else if (res.data.access_token && res.data.user) {
        // Normalize user object: backend returns {id, email, role}, frontend expects {userId, id, email, role}
        const normalizedUser = {
          ...res.data.user,
          userId: res.data.user.id, // Add userId for backward compatibility
        };
        setToken(res.data.access_token);
        setUser(normalizedUser);
        localStorage.setItem("token", res.data.access_token);
        localStorage.setItem("user", JSON.stringify(normalizedUser));
        return { access_token: res.data.access_token, user: normalizedUser, type: "mfa" };
      } else {
        setError("Invalid OTP or response.");
        return false;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "OTP verification failed");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Password reset function
  const resetPassword = async (
    email: string,
    otp_reset: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/auth/reset-password", {
        email,
        otp_reset,
        newPassword,
        confirmPassword,
      });
      console.log("[Auth] Password reset response:", res.data);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || "Password reset failed");
      console.error("[Auth] Password reset error:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    console.log("[Auth] Logging out user");
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, error, isInitialized, login, forgotPassword, verifyOtp, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
