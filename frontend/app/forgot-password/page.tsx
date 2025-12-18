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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Forgot Password?</h2>
        <p className="text-gray-600 mb-6 text-sm">
          Enter your email address and we'll send you an OTP to reset your password.
        </p>
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          required
          className="mb-4"
        />
        {error && <div className="text-red-500 mb-4 text-sm">{error}</div>}
        {formError && <div className="text-red-500 mb-4 text-sm">{formError}</div>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? <Loader /> : "Send OTP"}
        </Button>
        <div className="mt-4 text-center">
          <a href="/login" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            Back to Login
          </a>
        </div>
      </form>
    </div>
  );
}
