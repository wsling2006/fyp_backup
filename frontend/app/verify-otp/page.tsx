"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";

export default function VerifyOtpPage() {
  const { verifyOtp, loading: authLoading, error: authError } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "";
  const flow = searchParams.get("flow") || "mfa"; // default to MFA when not specified

  const [otpInput, setOtpInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await verifyOtp(email, otpInput);
    console.log("[VerifyOtpPage] Result from verifyOtp:", result);
    setLoading(false);

    if (result && (result as any).type === "reset") {
      // Redirect to reset-password page with email and otp_reset
      router.push(
        `/reset-password?email=${encodeURIComponent(email)}&otp_reset=${encodeURIComponent((result as any).otp_reset || "")}`
      );
    } else if (result && (result as any).type === "mfa") {
      // MFA login flow: redirect to dashboard
      router.push("/dashboard");
    } else {
      setError("Invalid OTP or failed to generate reset OTP.");
    }
  };

  const flowDescription =
    flow === "forgot"
      ? "We've sent an OTP to your email. Please enter it below to reset your password."
      : flow === "lockout"
      ? "Your account has been locked. We've sent an OTP to your email. Enter it below to unlock your account and reset your password."
      : "An OTP has been sent to your email to complete login. Please enter it below.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Enter OTP</h2>
        <p className="text-gray-600 mb-6 text-sm">{flowDescription}</p>
        {error && (
          <div className="text-red-500 mb-4 text-sm">{error}</div>
        )}
        {authError && (
          <div className="text-red-500 mb-4 text-sm">{authError}</div>
        )}
        <Input
          type="text"
          placeholder="Enter OTP"
          value={otpInput}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtpInput(e.target.value)}
          required
          className="mb-4"
        />
        <Button
          type="submit"
          disabled={loading || authLoading}
          className="w-full"
        >
          {loading || authLoading ? <Loader /> : "Verify OTP"}
        </Button>
        <div className="mt-4 text-center">
          <a
            href="/login"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Back to Login
          </a>
        </div>
      </form>
    </div>
  );
}
