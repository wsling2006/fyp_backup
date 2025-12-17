// Auth helpers for login, OTP, JWT decode
export async function loginRequest(email: string, password: string) {
  const res = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return await res.json();
}

export async function verifyOtp(email: string, otp: string) {
  const res = await fetch('http://localhost:3000/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  return await res.json();
}

export function getUserFromToken(token: string) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { id: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

export function logoutRequest() {
  // Optionally call backend logout endpoint if needed
}
