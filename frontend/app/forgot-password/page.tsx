"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  const { forgotPassword, loading, error } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email.trim()) {
      setFormError("Email is required");
      return;
    }

    const success = await forgotPassword(email);
    if (success) {
      router.push(`/verify-otp?email=${encodeURIComponent(email)}&flow=forgot`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-10">
          {/* Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Forgot Password?</h1>
            <p className="text-blue-200 text-sm">
              Don't worry! Enter your email and we'll send you an OTP to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="email"
              placeholder="Enter your email address"
              label="Email Address"
              labelClassName="block text-sm font-semibold text-white mb-2"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
              className="w-full mt-6"
            >
              {loading ? <Loader /> : (
                <span className="flex items-center justify-center space-x-2">
                  <span>Send OTP</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
              )}
            </Button>

            <div className="text-center mt-6">
              <a
                href="/login"
                className="text-blue-300 hover:text-blue-100 text-sm font-medium transition-colors duration-200 inline-flex items-center space-x-1 group"
              >
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Login</span>
              </a>
            </div>
          </form>
        </div>

        <p className="text-center text-blue-200 text-sm mt-6">
          © 2024 Company Portal. Secure password recovery.
        </p>
      </div>
    </div>
  );
}
