import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiPost } from "../api.js";
import { saveUser } from "../auth.js";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function submit() {
    setMsg("");
    try {
      const res = await apiPost("/auth/login", { email: email.trim(), password });
      await saveUser(res.user);
      // Store session token for authenticated requests
      if (res.session && res.session.access_token) {
        localStorage.setItem("gg_session", JSON.stringify({
          access_token: res.session.access_token,
          refresh_token: res.session.refresh_token
        }));
      }
      nav("/dashboard");
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
          <p className="small" style={{ color: "var(--odoo-text-muted)" }}>Maintenance Management System</p>
        </div>

        <h2 className="center" style={{ marginBottom: "1.5rem" }}>Sign In</h2>

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

        <div className="field">
          <div className="label">Password</div>
          <input 
            className="input" 
            type="password" 
            placeholder="Enter your password"
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && submit()}
          />
        </div>

        <div className="center" style={{ marginTop: "1.5rem" }}>
          <button className="btn btn-primary" onClick={submit} style={{ minWidth: "120px" }}>
            Sign In
          </button>
        </div>

        <div className="center small" style={{ marginTop: "1.5rem" }}>
          <span className="link" onClick={() => alert("Add forgot password later")}>Forgot Password?</span>
          {" "}|{" "}
          <Link className="link" to="/signup">Sign Up</Link>
        </div>

        {msg && <p className="error" style={{ marginTop: "1rem", textAlign: "center" }}>{msg}</p>}
      </div>
    </div>
  );
}
