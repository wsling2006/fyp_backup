"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Sign In</h2>
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          required
          className="mb-4"
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          required
          className="mb-4"
        />
        {error && <div className="text-red-500 mb-2">{error}</div>}
        {formError && <div className="text-red-500 mb-2">{formError}</div>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? <Loader /> : "Login"}
        </Button>
        <div className="mt-4 text-center">
          <a
            href="/forgot-password"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Forgot Password?
          </a>
        </div>
      </form>
    </div>
  );
}
