import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getUser } from "../auth.js";

export default function ProtectedRoute() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const u = await getUser();
      setUser(u);
      setLoading(false);
    }
    checkUser();
  }, []);

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
