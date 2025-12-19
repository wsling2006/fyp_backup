"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
export const dynamic = 'force-dynamic';

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain a special character.";
  return null;
}

function ResetPasswordContent() {
  const { resetPassword, loading, error } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Real-time password requirement checks
  const hasLen = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const allRequirementsMet = hasLen && hasUpper && hasLower && hasDigit && hasSpecial && passwordsMatch;

  // Ensure OTP is present even on page refresh
  // SSR-safe: only access sessionStorage in browser
  useEffect(() => {
    const queryEmail = searchParams.get("email");
    let queryOtpReset = searchParams.get("otp_reset");
    
    // Fallback to sessionStorage only in browser
    if (!queryOtpReset && typeof window !== 'undefined') {
      queryOtpReset = sessionStorage.getItem("resetOtp");
    }

    if (!queryEmail || !queryOtpReset) {
      setFormError("OTP not requested. Please retry the process.");
      return;
    }

    setEmail(queryEmail);
    setOtp(queryOtpReset);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!otp) {
      setFormError("OTP missing. Cannot reset password.");
      return;
    }

    const validation = validatePassword(newPassword);
    if (validation) {
      setFormError(validation);
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    const success = await resetPassword(email, otp, newPassword, confirmPassword);
    if (success) {
      // Clear OTP from sessionStorage (browser only)
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem("resetOtp");
      }
      router.push("/login?reset=success");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow w-full max-w-md">
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Reset Password</h2>
        <p className="text-sm text-gray-600 mb-4">Your new password must meet all the following requirements:</p>
        <ul className="text-sm mb-6 list-disc list-inside space-y-1">
          <li className={`flex items-center ${hasLen ? 'text-green-600' : 'text-gray-600'}`}>
            <span className="mr-2">{hasLen ? '✓' : '✗'}</span> At least 8 characters
          </li>
          <li className={`flex items-center ${hasUpper ? 'text-green-600' : 'text-gray-600'}`}>
            <span className="mr-2">{hasUpper ? '✓' : '✗'}</span> At least 1 uppercase letter (A-Z)
          </li>
          <li className={`flex items-center ${hasLower ? 'text-green-600' : 'text-gray-600'}`}>
            <span className="mr-2">{hasLower ? '✓' : '✗'}</span> At least 1 lowercase letter (a-z)
          </li>
          <li className={`flex items-center ${hasDigit ? 'text-green-600' : 'text-gray-600'}`}>
            <span className="mr-2">{hasDigit ? '✓' : '✗'}</span> At least 1 number (0-9)
          </li>
          <li className={`flex items-center ${hasSpecial ? 'text-green-600' : 'text-gray-600'}`}>
            <span className="mr-2">{hasSpecial ? '✓' : '✗'}</span> At least 1 special character (!@#$%^&* etc.)
          </li>
          <li className={`flex items-center ${passwordsMatch ? 'text-green-600' : 'text-gray-600'}`}>
            <span className="mr-2">{passwordsMatch ? '✓' : '✗'}</span> Passwords match
          </li>
        </ul>
        {formError && <div className="text-red-500 mb-4">{formError}</div>}
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <Input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
          required
          className="mb-2"
        />
        <Input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
          required
          className="mb-4"
        />
        <Button type="submit" disabled={loading || !allRequirementsMet} className="w-full">
          {loading ? <Loader /> : "Reset Password"}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
