import React from "react";
import { Navigate, Link } from "react-router-dom";
import { FiShield } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import AdminLayout from "./AdminLayout";
import PageSkeleton from "./PageSkeleton";

const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();

  // Sidebar/top bar render immediately regardless of auth state, same
  // reasoning as ProtectedRoute.jsx — only the content area shows a
  // skeleton instead of the whole screen going blank while Firebase resolves.
  if (loading) {
    return (
      <AdminLayout>
        <PageSkeleton />
      </AdminLayout>
    );
  }

  // Not signed in at all — send to the normal login screen.
  if (!user) return <Navigate to="/login" replace />;

  // Signed in, but this account doesn't carry the admin custom claim.
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="card-flat p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <FiShield size={22} className="text-red-400" />
          </div>
          <h1 className="font-syne font-bold text-ink text-lg mb-2">Access denied</h1>
          <p className="text-ink/40 font-dm text-sm mb-6">
            This account doesn't have admin access. If you believe this is a mistake, ask an
            existing admin to grant your account access.
          </p>
          <Link
            to="/dashboard"
            className="btn-iris inline-flex items-center justify-center gap-2 !w-auto px-6"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

export default AdminRoute;
