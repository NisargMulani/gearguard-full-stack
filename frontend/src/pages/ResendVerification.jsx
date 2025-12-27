import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiPost } from "../api.js";

export default function ResendVerification() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");

  async function submit() {
    setMsg("");
    setOk("");
    
    if (!email.trim()) {
      setMsg("Please enter your email address");
      return;
    }

    try {
      const res = await apiPost("/auth/resend-verification", { email: email.trim() });
      setOk(res.message || "Verification email sent! Please check your inbox.");
    } catch (e) {
      setMsg(e.message);
    }
  }

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
          <p className="small" style={{ color: "var(--odoo-text-muted)" }}>Resend Verification Email</p>
        </div>

        <h2 className="center" style={{ marginBottom: "1.5rem" }}>Resend Verification</h2>

        <p className="small" style={{ marginBottom: "1.5rem", textAlign: "center", color: "var(--odoo-text-muted)" }}>
          Enter your email address and we'll send you a new verification link.
        </p>

        <div className="field">
          <div className="label">Email</div>
          <input 
            className="input" 
            type="email"
            placeholder="Enter your email"
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            onKeyPress={(e) => e.key === "Enter" && submit()}
          />
        </div>

        <div className="center" style={{ marginTop: "1.5rem" }}>
          <button className="btn btn-primary" onClick={submit} style={{ minWidth: "120px" }}>
            Send Email
          </button>
        </div>

        <div className="center small" style={{ marginTop: "1.5rem" }}>
          <Link className="link" to="/login">Back to Login</Link>
        </div>

        {msg && <p className="error" style={{ marginTop: "1rem", textAlign: "center" }}>{msg}</p>}
        {ok && (
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <p className="ok">{ok}</p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-block" }}>
              Go to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

