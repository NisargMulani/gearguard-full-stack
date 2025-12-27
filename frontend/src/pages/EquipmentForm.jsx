import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiDelete, apiGet, apiPost, apiPut } from "../api.js";

export default function EquipmentForm({ mode }) {
  const nav = useNavigate();
  const { id } = useParams();

  const [meta, setMeta] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    name: "",
    serial_number: "",
    category_id: "",
    used_by_type: "EMPLOYEE",
    used_by_user_id: "",
    used_by_department_id: "",
    maintenance_team_id: "",
    default_technician_id: "",
    scrap_date: "",
    location_id: "",
    assigned_date: "",
    purchase_date: "",
    warranty_end_date: "",
    description: ""
  });

  useEffect(() => {
    (async () => {
      const m = await apiGet("/equipment/meta");
      setMeta(m);

      // Defaults
      if (m.categories?.[0]) setForm(f => ({ ...f, category_id: String(m.categories[0].id) }));
      if (m.teams?.[0]) setForm(f => ({ ...f, maintenance_team_id: String(m.teams[0].id) }));
      const emp = (m.users || []).filter(u => ["EMPLOYEE","ADMIN","MANAGER"].includes(u.role));
      const tech = (m.users || []).filter(u => u.role === "TECHNICIAN");
      if (emp?.[0]) setForm(f => ({ ...f, used_by_user_id: String(emp[0].id) }));
      if (tech?.[0]) setForm(f => ({ ...f, default_technician_id: String(tech[0].id) }));
      if (m.departments?.[0]) setForm(f => ({ ...f, used_by_department_id: String(m.departments[0].id) }));
      if (m.locations?.[0]) setForm(f => ({ ...f, location_id: String(m.locations[0].id) }));

      if (mode === "edit" && id) {
        const e = await apiGet(`/equipment/${id}`);
        setForm(f => ({
          ...f,
          name: e.name || "",
          serial_number: e.serial_number || "",
          category_id: e.category_id ? String(e.category_id) : "",
          used_by_type: e.used_by_type || "EMPLOYEE",
          used_by_user_id: e.used_by_user_id ? String(e.used_by_user_id) : "",
          used_by_department_id: e.used_by_department_id ? String(e.used_by_department_id) : "",
          maintenance_team_id: e.maintenance_team_id ? String(e.maintenance_team_id) : "",
          default_technician_id: e.default_technician_id ? String(e.default_technician_id) : "",
          scrap_date: e.scrap_date ? e.scrap_date.substring(0, 10) : "",
          location_id: e.location_id ? String(e.location_id) : "",
          assigned_date: e.assigned_date ? e.assigned_date.substring(0, 10) : "",
          purchase_date: e.purchase_date ? e.purchase_date.substring(0, 10) : "",
          warranty_end_date: e.warranty_end_date ? e.warranty_end_date.substring(0, 10) : "",
          description: e.description || ""
        }));
      }
    })().catch(e => setErr(e.message));
  }, [mode, id]);

  const employees = useMemo(() => {
    if (!meta?.users) return [];
    return meta.users.filter(u => ["EMPLOYEE","ADMIN","MANAGER"].includes(u.role));
  }, [meta]);

  const techs = useMemo(() => {
    if (!meta?.users) return [];
    return meta.users.filter(u => u.role === "TECHNICIAN");
  }, [meta]);

  function setVal(k, v) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function save() {
    setErr(""); setMsg("");
    if (!form.name.trim()) { setErr("Name required"); return; }

    const body = {
      name: form.name.trim(),
      serial_number: form.serial_number.trim() || null,
      category_id: Number(form.category_id),
      maintenance_team_id: Number(form.maintenance_team_id),
      default_technician_id: form.default_technician_id ? Number(form.default_technician_id) : null,
      assigned_date: form.assigned_date || null,
      scrap_date: form.scrap_date || null,
      purchase_date: form.purchase_date || null,
      warranty_end_date: form.warranty_end_date || null,
      location_id: form.location_id ? Number(form.location_id) : null,
      used_by_type: form.used_by_type,
      used_by_user_id: form.used_by_type === "EMPLOYEE" ? Number(form.used_by_user_id) : null,
      used_by_department_id: form.used_by_type === "DEPARTMENT" ? Number(form.used_by_department_id) : null,
      description: form.description.trim() || null
    };

    try {
      if (mode === "edit") {
        const res = await apiPut(`/equipment/${id}`, body);
        setMsg(res.message || "Saved");
      } else {
        const res = await apiPost("/equipment", body);
        setMsg(res.message || "Created");
        setTimeout(() => nav("/equipment"), 600);
      }
    } catch (e) {
      setErr(e.message);
    }
  }

  async function del() {
    if (!id) return;
    if (!confirm("Delete equipment?")) return;
    try {
      const res = await apiDelete(`/equipment/${id}`);
      alert(res.message || "Deleted");
      nav("/equipment");
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div>
      <div className="topbar">
        <h2 className="topbar-title">{mode === "edit" ? "Edit Equipment" : "New Equipment"}</h2>
        <div className="topbar-actions">
          <button className="btn" onClick={() => nav("/equipment")}>Back</button>
          {mode === "edit" && <button className="btn btn-danger" onClick={del}>Delete</button>}
        </div>
      </div>

      <div className="content-wrapper">
        <div className="row" style={{ marginBottom: "2rem" }}>
        <div className="col">
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3 style={{ marginTop: 0, marginBottom: "1.5rem", fontSize: "1.1rem", fontWeight: 600 }}>Basic Information</h3>
            <div className="field">
            <div className="label">Name?</div>
            <input className="input" value={form.name} onChange={(e) => setVal("name", e.target.value)} />
          </div>

          <div className="field">
            <div className="label">Equipment Category?</div>
            <select value={form.category_id} onChange={(e) => setVal("category_id", e.target.value)}>
              {(meta?.categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="field">
            <div className="label">Company?</div>
            <input className="input" value="My Company" disabled />
          </div>

          <div className="field">
            <div className="label">Used By?</div>
            <select value={form.used_by_type} onChange={(e) => setVal("used_by_type", e.target.value)}>
              <option value="EMPLOYEE">Employee</option>
              <option value="DEPARTMENT">Department</option>
            </select>
          </div>

          {form.used_by_type === "EMPLOYEE" && (
            <div className="field">
              <div className="label">Employee?</div>
              <select value={form.used_by_user_id} onChange={(e) => setVal("used_by_user_id", e.target.value)}>
                {employees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}

          {form.used_by_type === "DEPARTMENT" && (
            <div className="field">
              <div className="label">Department?</div>
              <select value={form.used_by_department_id} onChange={(e) => setVal("used_by_department_id", e.target.value)}>
                {(meta?.departments || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}

          <div className="field">
            <div className="label">Maintenance Team?</div>
            <select value={form.maintenance_team_id} onChange={(e) => setVal("maintenance_team_id", e.target.value)}>
              {(meta?.teams || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="field">
            <div className="label">Assigned Date?</div>
            <input className="input" type="date" value={form.assigned_date} onChange={(e) => setVal("assigned_date", e.target.value)} />
          </div>
          </div>
        </div>

        <div className="col">
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3 style={{ marginTop: 0, marginBottom: "1.5rem", fontSize: "1.1rem", fontWeight: 600 }}>Additional Details</h3>
            <div className="field">
              <div className="label">Technician?</div>
              <select value={form.default_technician_id} onChange={(e) => setVal("default_technician_id", e.target.value)}>
                {techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

          <div className="field">
            <div className="label">Serial Number?</div>
            <input className="input" value={form.serial_number} onChange={(e) => setVal("serial_number", e.target.value)} />
          </div>

          <div className="field">
            <div className="label">Scrap Date?</div>
            <input className="input" type="date" value={form.scrap_date} onChange={(e) => setVal("scrap_date", e.target.value)} />
          </div>

          <div className="field">
            <div className="label">Used in location?</div>
            <select value={form.location_id} onChange={(e) => setVal("location_id", e.target.value)}>
              {(meta?.locations || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div className="field">
            <div className="label">Work Center?</div>
            <input className="input" placeholder="optional (link later)" />
          </div>

          <div className="field">
            <div className="label">Purchase Date?</div>
            <input className="input" type="date" value={form.purchase_date} onChange={(e) => setVal("purchase_date", e.target.value)} />
          </div>

          <div className="field">
            <div className="label">Warranty End?</div>
            <input className="input" type="date" value={form.warranty_end_date} onChange={(e) => setVal("warranty_end_date", e.target.value)} />
          </div>
          </div>
        </div>
        </div>

        <div className="card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
          <h3 style={{ marginTop: 0, marginBottom: "1.5rem", fontSize: "1.1rem", fontWeight: 600 }}>Description</h3>
          <div className="field">
            <textarea value={form.description} onChange={(e) => setVal("description", e.target.value)} placeholder="Enter equipment description..." />
          </div>
        </div>

        <div className="right" style={{ marginTop: "1.5rem" }}>
          <button className="btn btn-primary" onClick={save}>Save</button>
        </div>

        {err && <div className="error" style={{ marginTop: "1rem" }}>{err}</div>}
        {msg && <div className="ok" style={{ marginTop: "1rem" }}>{msg}</div>}
      </div>
    </div>
  );
}
