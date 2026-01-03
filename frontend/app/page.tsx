"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user, token, loading, isInitialized } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && isInitialized) {
      if (token && user) {
        // Already logged in, redirect to appropriate dashboard
        router.replace("/dashboard");
      } else {
        // Not logged in, go to login page
        router.replace("/login");
      }
    }
  }, [user, token, loading, isInitialized, router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
