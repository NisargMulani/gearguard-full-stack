import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { apiPost } from "../api.js";

export default function VerifyEmail() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    async function verifyEmail() {
      // Supabase sends tokens in URL hash or query params
      const token = searchParams.get("token") || searchParams.get("token_hash");
      const type = searchParams.get("type");
      
      // Also check hash fragment (Supabase often uses hash)
      const hash = window.location.hash;
      let hashToken = null;
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        hashToken = hashParams.get("access_token") || hashParams.get("token");
      }
      
      const finalToken = token || hashToken;
      
      if (!finalToken) {
        setStatus("error");
        setMessage("Invalid verification link. No token provided.");
        return;
      }

      try {
        const res = await apiPost("/auth/verify-email", { 
          token: finalToken,
          type: type || "signup"
        });
        
        setStatus("success");
        setMessage(res.message || "Email verified successfully! You can now login.");
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          nav("/login");
        }, 3000);
      } catch (error) {
        setStatus("error");
        setMessage(error.message || "Verification failed. The link may have expired.");
      }
    }

    verifyEmail();
  }, [searchParams, nav]);

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "linear-gradient(135deg, var(--odoo-primary) 0%, var(--odoo-primary-dark) 100%)"
    }}>
      <div className="formbox">
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ color: "var(--odoo-primary)", marginBottom: "0.5rem" }}>GearGuard</h1>
          <p className="small" style={{ color: "var(--odoo-text-muted)" }}>Email Verification</p>
        </div>

        <div style={{ textAlign: "center", padding: "2rem 0" }}>
          {status === "verifying" && (
            <>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
              <h2 style={{ marginBottom: "1rem" }}>Verifying...</h2>
              <p>{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
              <h2 style={{ marginBottom: "1rem", color: "var(--odoo-success)" }}>Email Verified!</h2>
              <p style={{ marginBottom: "1.5rem" }}>{message}</p>
              <p className="small" style={{ color: "var(--odoo-text-muted)" }}>
                Redirecting to login page...
              </p>
              <Link to="/login" className="btn btn-primary" style={{ marginTop: "1rem" }}>
                Go to Login
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>❌</div>
              <h2 style={{ marginBottom: "1rem", color: "var(--odoo-danger)" }}>Verification Failed</h2>
              <p style={{ marginBottom: "1.5rem" }}>{message}</p>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                <Link to="/signup" className="btn">Sign Up Again</Link>
                <Link to="/login" className="btn btn-primary">Go to Login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

