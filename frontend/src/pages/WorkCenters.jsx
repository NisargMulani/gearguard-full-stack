import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../api.js";
import { getUser } from "../auth.js";
import { canManageWorkcenters } from "../permissions.js";
import Table from "../components/Table.jsx";
import Modal from "../components/Modal.jsx";

export default function WorkCenters() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    tag: "",
    alternative_workcenters: "",
    cost_per_hour: "",
    capacity: "",
    time_efficiency: "",
    oee_target: ""
  });
  const [formErr, setFormErr] = useState("");
  const [formMsg, setFormMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const u = await getUser();
      setUser(u);
    }
    loadUser();
    (async () => {
      try {
        const data = await apiGet("/workcenters");
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;

    return rows.filter((x) => {
      const a = (x.name || "").toLowerCase();
      const b = (x.code || "").toLowerCase();
      const c = (x.tag || "").toLowerCase();
      return a.includes(t) || b.includes(t) || c.includes(t);
    });
  }, [rows, q]);

  function setVal(k, v) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handleSubmit() {
    setFormErr("");
    setFormMsg("");
    
    if (!form.name.trim()) {
      setFormErr("Work center name is required");
      return;
    }

    setIsLoading(true);
    try {
      const body = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        tag: form.tag.trim() || null,
        alternative_workcenters: form.alternative_workcenters.trim() || null,
        cost_per_hour: form.cost_per_hour ? Number(form.cost_per_hour) : null,
        capacity: form.capacity ? Number(form.capacity) : null,
        time_efficiency: form.time_efficiency ? Number(form.time_efficiency) : null,
        oee_target: form.oee_target ? Number(form.oee_target) : null
      };

      const res = await apiPost("/workcenters", body);
      setFormMsg(res.message || "Work center created successfully");
      
      // Refresh workcenters list
      const updatedWorkcenters = await apiGet("/workcenters");
      setRows(updatedWorkcenters);
      
      // Close modal after a short delay
      setTimeout(() => {
        setIsModalOpen(false);
        setForm({
          name: "",
          code: "",
          tag: "",
          alternative_workcenters: "",
          cost_per_hour: "",
          capacity: "",
          time_efficiency: "",
          oee_target: ""
        });
        setFormMsg("");
      }, 1000);
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setForm({
      name: "",
      code: "",
      tag: "",
      alternative_workcenters: "",
      cost_per_hour: "",
      capacity: "",
      time_efficiency: "",
      oee_target: ""
    });
    setFormErr("");
    setFormMsg("");
  }

  const columns = [
    { key: "name", label: "Work Center" },
    { key: "code", label: "Code" },
    { key: "tag", label: "Tag" },
    { key: "alternative_workcenters", label: "Alternative Workcenters" },
    { key: "cost_per_hour", label: "Cost per hour" },
    { key: "capacity", label: "Capacity" },
    { key: "time_efficiency", label: "Time Efficiency" },
    { key: "oee_target", label: "OEE Target" }
  ];

  return (
    <div>
      <div className="topbar">
        <h2 className="topbar-title">Work Centers</h2>
        <div className="topbar-actions">
          <div className="searchline">
            <input
              placeholder="Search..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {canManageWorkcenters(user) && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              New Work Center
            </button>
          )}
        </div>
      </div>

      <div className="content-wrapper">
        {err && <div className="error" style={{ marginBottom: "1rem" }}>{err}</div>}

        <Table
          columns={columns}
          rows={filtered}
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Create New Work Center">
        <div className="card" style={{ padding: "1.5rem" }}>
          <div className="field">
            <div className="label">Work Center Name *</div>
            <input 
              className="input" 
              value={form.name} 
              onChange={(e) => setVal("name", e.target.value)}
              placeholder="Enter work center name"
            />
          </div>

          <div className="field">
            <div className="label">Code</div>
            <input 
              className="input" 
              value={form.code} 
              onChange={(e) => setVal("code", e.target.value)}
              placeholder="Enter code (optional)"
            />
          </div>

          <div className="field">
            <div className="label">Tag</div>
            <input 
              className="input" 
              value={form.tag} 
              onChange={(e) => setVal("tag", e.target.value)}
              placeholder="Enter tag (optional)"
            />
          </div>

          <div className="field">
            <div className="label">Alternative Workcenters</div>
            <input 
              className="input" 
              value={form.alternative_workcenters} 
              onChange={(e) => setVal("alternative_workcenters", e.target.value)}
              placeholder="Enter alternative workcenters (optional)"
            />
          </div>

          <div className="field">
            <div className="label">Cost per Hour</div>
            <input 
              className="input" 
              type="number"
              step="0.01"
              value={form.cost_per_hour} 
              onChange={(e) => setVal("cost_per_hour", e.target.value)}
              placeholder="Enter cost per hour (optional)"
            />
          </div>

          <div className="field">
            <div className="label">Capacity</div>
            <input 
              className="input" 
              type="number"
              value={form.capacity} 
              onChange={(e) => setVal("capacity", e.target.value)}
              placeholder="Enter capacity (optional)"
            />
          </div>

          <div className="field">
            <div className="label">Time Efficiency (%)</div>
            <input 
              className="input" 
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.time_efficiency} 
              onChange={(e) => setVal("time_efficiency", e.target.value)}
              placeholder="Enter time efficiency (optional)"
            />
          </div>

          <div className="field">
            <div className="label">OEE Target (%)</div>
            <input 
              className="input" 
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.oee_target} 
              onChange={(e) => setVal("oee_target", e.target.value)}
              placeholder="Enter OEE target (optional)"
            />
          </div>

          {formErr && <div className="error" style={{ marginTop: "1rem" }}>{formErr}</div>}
          {formMsg && <div className="ok" style={{ marginTop: "1rem" }}>{formMsg}</div>}

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
              {isLoading ? "Creating..." : "Create Work Center"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
