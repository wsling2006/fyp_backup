"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const res = await login(email, password);
    if (res?.requiresOtp) {
      const flow = res?.email ? "lockout" : "mfa";
      router.push(`/verify-otp?email=${encodeURIComponent(email)}&flow=${flow}`);
    } else if (res?.access_token) {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-10">
          {/* Logo and title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
              <span className="text-3xl">🏢</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-blue-200 text-sm">Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="email"
              placeholder="Email address"
              label="Email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              }
              className="bg-white/90 backdrop-blur-sm"
            />
            
            <Input
              type="password"
              placeholder="Enter your password"
              label="Password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              required
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
              className="bg-white/90 backdrop-blur-sm"
            />

            {(error || formError) && (
              <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm font-medium">
                {error || formError}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {loading ? <Loader /> : (
                <span className="flex items-center justify-center space-x-2">
                  <span>Sign In</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              )}
            </Button>

            <div className="text-center mt-6">
              <a
                href="/forgot-password"
                className="text-blue-300 hover:text-blue-100 text-sm font-medium transition-colors duration-200 inline-flex items-center space-x-1 group"
              >
                <span>Forgot your password?</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </form>
        </div>

        {/* Footer text */}
        <p className="text-center text-blue-200 text-sm mt-6">
          © 2024 Company Portal. All rights reserved.
        </p>
      </div>
    </div>
  );
}
