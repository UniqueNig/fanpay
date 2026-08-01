import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "./DashboardLayout";
import PageSkeleton from "./PageSkeleton";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Sidebar/top bar render immediately regardless of auth state (see
  // Sidebar.jsx's own loading-aware skeleton for the user-info block) —
  // only the actual page content is swapped for a skeleton, instead of the
  // whole screen going blank/dark while Firebase resolves on every refresh.
  if (loading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default ProtectedRoute;
