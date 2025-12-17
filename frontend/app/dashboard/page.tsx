"use client";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  if (!user && !loading) {
    router.replace("/login");
    return null;
  }

  if (user && user.role === "super_admin") {
    router.replace("/dashboard/superadmin");
    return null;
  }

  if (user && user.role === "accountant") {
    router.replace("/dashboard/accountant");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow w-full max-w-md text-center">
        {loading ? (
          <Loader />
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Welcome {user?.email}</h2>
            <Button onClick={logout} className="w-full">Logout</Button>
          </>
        )}
      </div>
    </div>
  );
}
