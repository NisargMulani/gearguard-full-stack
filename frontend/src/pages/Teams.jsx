import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../api.js";
import { getUser } from "../auth.js";
import { canManageTeams } from "../permissions.js";
import Table from "../components/Table.jsx";
import Modal from "../components/Modal.jsx";

export default function Teams() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [meta, setMeta] = useState(null);
  const [form, setForm] = useState({
    name: "",
    company: "My Company",
    member_ids: []
  });
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const u = await getUser();
      setUser(u);
    }
    loadUser();
    apiGet("/teams").then(setRows).catch(console.error);
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      apiGet("/teams/meta")
        .then(setMeta)
        .catch(console.error);
    }
  }, [isModalOpen]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(x =>
      (x.name || "").toLowerCase().includes(t) ||
      (x.members || "").toLowerCase().includes(t)
    );
  }, [rows, q]);

  const columns = [
    { key: "name", label: "Team Name" },
    { key: "members", label: "Team Members" },
    { key: "company", label: "Company" }
  ];

  function setVal(k, v) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function handleMemberToggle(userId) {
    setForm(prev => {
      const memberIds = prev.member_ids || [];
      const isSelected = memberIds.includes(userId);
      return {
        ...prev,
        member_ids: isSelected
          ? memberIds.filter(id => id !== userId)
          : [...memberIds, userId]
      };
    });
  }

  async function handleSubmit() {
    setErr("");
    setMsg("");
    
    if (!form.name.trim()) {
      setErr("Team name is required");
      return;
    }

    setIsLoading(true);
    try {
      const body = {
        name: form.name.trim(),
        company: form.company.trim() || "My Company",
        member_ids: form.member_ids || []
      };

      const res = await apiPost("/teams", body);
      setMsg(res.message || "Team created successfully");
      
      // Refresh teams list
      const updatedTeams = await apiGet("/teams");
      setRows(updatedTeams);
      
      // Close modal after a short delay
      setTimeout(() => {
        setIsModalOpen(false);
        setForm({ name: "", company: "My Company", member_ids: [] });
        setMsg("");
      }, 1000);
    } catch (e) {
      setErr(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setForm({ name: "", company: "My Company", member_ids: [] });
    setErr("");
    setMsg("");
  }

  return (
    <div>
      <div className="topbar">
        <h2 className="topbar-title">Teams</h2>
        <div className="topbar-actions">
          <div className="searchline">
            <input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {canManageTeams(user) && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>New Team</button>
          )}
        </div>
      </div>
      <div className="content-wrapper">
        <Table columns={columns} rows={filtered} />
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Create New Team">
        <div className="card" style={{ padding: "1.5rem" }}>
          <div className="field">
            <div className="label">Team Name *</div>
            <input 
              className="input" 
              value={form.name} 
              onChange={(e) => setVal("name", e.target.value)}
              placeholder="Enter team name"
            />
          </div>

          <div className="field">
            <div className="label">Company</div>
            <input 
              className="input" 
              value={form.company} 
              onChange={(e) => setVal("company", e.target.value)}
              placeholder="Enter company name"
            />
          </div>

          <div className="field">
            <div className="label">Team Members</div>
            <div style={{ 
              maxHeight: "200px", 
              overflowY: "auto", 
              border: "1px solid #d1d5db", 
              borderRadius: "0.375rem",
              padding: "0.5rem"
            }}>
              {(meta?.users || []).map(user => (
                <label 
                  key={user.id} 
                  style={{ 
                    display: "block", 
                    padding: "0.5rem",
                    cursor: "pointer"
                  }}
                >
                  <input
                    type="checkbox"
                    checked={(form.member_ids || []).includes(user.id)}
                    onChange={() => handleMemberToggle(user.id)}
                    style={{ marginRight: "0.5rem" }}
                  />
                  {user.name} {user.role && `(${user.role})`}
                </label>
              ))}
              {(!meta?.users || meta.users.length === 0) && (
                <div style={{ padding: "0.5rem", color: "#6b7280" }}>No users available</div>
              )}
            </div>
          </div>

          {err && <div className="error" style={{ marginTop: "1rem" }}>{err}</div>}
          {msg && <div className="ok" style={{ marginTop: "1rem" }}>{msg}</div>}

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
            <button 
              className="btn" 
              onClick={handleCloseModal}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Create Team"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
