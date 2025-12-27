import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiPost } from "../api.js";

function strongPassword(p) {
  if (p.length < 8) return false;
  const hasLower = /[a-z]/.test(p);
  const hasUpper = /[A-Z]/.test(p);
  const hasSpecial = /[^A-Za-z0-9]/.test(p);
  return hasLower && hasUpper && hasSpecial;
}

export default function Signup() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");

  async function submit() {
    setMsg("");
    setOk("");
    if (!name.trim() || !email.trim() || !p1 || !p2) { setMsg("Fill all fields"); return; }
    if (p1 !== p2) { setMsg("Passwords do not match"); return; }
    if (!strongPassword(p1)) { setMsg("Password must have small+capital+special and length >= 8"); return; }

    try {
      const res = await apiPost("/auth/signup", { 
        name: name.trim(), 
        email: email.trim(), 
        password: p1,
        role: role
      });
      setOk(res.message || "Signup successful! Please check your email to verify your account.");
      // Don't redirect immediately - let user see the message
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
          <p className="small" style={{ color: "var(--odoo-text-muted)" }}>Create Your Account</p>
        </div>

        <h2 className="center" style={{ marginBottom: "1.5rem" }}>Sign Up</h2>

        <div className="field">
          <div className="label">Full Name</div>
          <input 
            className="input" 
            placeholder="Enter your full name"
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
        </div>

        <div className="field">
          <div className="label">Email</div>
          <input 
            className="input" 
            type="email"
            placeholder="Enter your email"
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
          />
        </div>

        <div className="field">
          <div className="label">Role</div>
          <select 
            className="input" 
            value={role} 
            onChange={(e) => setRole(e.target.value)}
            style={{ padding: "0.5rem" }}
          >
            <option value="EMPLOYEE">Employee</option>
            <option value="TECHNICIAN">Technician</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <div className="field">
          <div className="label">Password</div>
          <input 
            className="input" 
            type="password" 
            placeholder="Enter password (min 8 chars, mixed case, special)"
            value={p1} 
            onChange={(e) => setP1(e.target.value)} 
          />
        </div>

        <div className="field">
          <div className="label">Confirm Password</div>
          <input 
            className="input" 
            type="password" 
            placeholder="Re-enter your password"
            value={p2} 
            onChange={(e) => setP2(e.target.value)} 
          />
        </div>

        <div className="center" style={{ marginTop: "1.5rem" }}>
          <button className="btn btn-primary" onClick={submit} style={{ minWidth: "120px" }}>
            Sign Up
          </button>
        </div>

        <div className="center small" style={{ marginTop: "1.5rem" }}>
          <Link className="link" to="/login">Back to Login</Link>
        </div>

        {msg && <p className="error" style={{ marginTop: "1rem", textAlign: "center" }}>{msg}</p>}
        {ok && (
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <p className="ok">{ok}</p>
            <p className="small" style={{ marginTop: "0.5rem", color: "var(--odoo-text-muted)" }}>
              Click the verification link in the email to activate your account.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-block" }}>
              Go to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
