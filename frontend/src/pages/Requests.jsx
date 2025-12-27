import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiGet, apiPost, apiPut } from "../api.js";
import { getUser } from "../auth.js";

export default function Requests() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    async function loadUser() {
      const u = await getUser();
      setUser(u);
    }
    loadUser();
  }, []);
  const [sp] = useSearchParams();
  const openId = sp.get("open");

  const [meta, setMeta] = useState(null);
  const [currentId, setCurrentId] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [tab, setTab] = useState("notes");
  const [showWorksheet, setShowWorksheet] = useState(false);

  const [details, setDetails] = useState({ request: null, notes: [], instructions: [], worksheet: [] });

  const [form, setForm] = useState({
    subject: "",
    maintenance_for: "EQUIPMENT",
    equipment_id: "",
    workcenter_id: "",
    category_id: "",
    request_date: new Date().toISOString().slice(0, 10),
    maintenance_type: "CORRECTIVE",
    team_id: "",
    technician_id: "",
    scheduled_at: "",
    duration_minutes: 0,
    priority: 2,
    stage: "NEW_REQUEST",
    blocked: 0
  });

  function setVal(k, v) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  useEffect(() => {
    (async () => {
      const m = await apiGet("/requests/meta");
      setMeta(m);

      if (m.equipment?.[0]) setVal("equipment_id", String(m.equipment[0].id));
      if (m.workcenters?.[0]) setVal("workcenter_id", String(m.workcenters[0].id));
      if (m.categories?.[0]) setVal("category_id", String(m.categories[0].id));
      if (m.teams?.[0]) setVal("team_id", String(m.teams[0].id));
      if (m.techs?.[0]) setVal("technician_id", String(m.techs[0].id));

      if (openId) {
        await openExisting(openId);
      }
    })().catch(e => setErr(e.message));
  }, [openId]);

  async function openExisting(id) {
    setErr(""); setMsg("");
    const data = await apiGet(`/requests/${id}/details`);
    setDetails(data);
    setCurrentId(data.request?.id || null);

    const r = data.request;
    if (!r) return;

    setForm(prev => ({
      ...prev,
      subject: r.subject || "",
      maintenance_for: r.maintenance_for,
      equipment_id: r.equipment_id ? String(r.equipment_id) : prev.equipment_id,
      workcenter_id: r.workcenter_id ? String(r.workcenter_id) : prev.workcenter_id,
      category_id: r.category_id ? String(r.category_id) : prev.category_id,
      request_date: r.request_date ? r.request_date.substring(0, 10) : prev.request_date,
      maintenance_type: r.maintenance_type || "CORRECTIVE",
      team_id: r.team_id ? String(r.team_id) : prev.team_id,
      technician_id: r.technician_id ? String(r.technician_id) : prev.technician_id,
      scheduled_at: r.scheduled_at ? r.scheduled_at.replace(" ", "T").substring(0, 16) : "",
      duration_minutes: r.duration_minutes || 0,
      priority: r.priority || 2,
      stage: r.stage || "NEW_REQUEST",
      blocked: r.blocked ? 1 : 0
    }));
  }

  function resetForm() {
    setCurrentId(null);
    setDetails({ request: null, notes: [], instructions: [], worksheet: [] });
    setMsg(""); setErr("");
    setTab("notes");
    setShowWorksheet(false);
    setForm(prev => ({
      ...prev,
      subject: "",
      maintenance_for: "EQUIPMENT",
      request_date: new Date().toISOString().slice(0, 10),
      maintenance_type: "CORRECTIVE",
      scheduled_at: "",
      duration_minutes: 0,
      priority: 2,
      stage: "NEW_REQUEST",
      blocked: 0
    }));
  }

  const stageText = useMemo(() => form.stage.replaceAll("_", " "), [form.stage]);
  const blockText = useMemo(() => (String(form.blocked) === "1" ? "Blocked" : "Ready for next stage"), [form.blocked]);

  async function saveNew() {
    setErr(""); setMsg("");
    if (!form.subject.trim()) { setErr("Subject required"); return; }
    if (!user) { setErr("User not loaded"); return; }

    const body = {
      subject: form.subject.trim(),
      created_by_user_id: user.id,
      maintenance_for: form.maintenance_for,
      equipment_id: form.maintenance_for === "EQUIPMENT" ? Number(form.equipment_id) : null,
      workcenter_id: form.maintenance_for === "WORKCENTER" ? Number(form.workcenter_id) : null,
      category_id: form.category_id ? Number(form.category_id) : null,
      request_date: form.request_date,
      maintenance_type: form.maintenance_type,
      team_id: Number(form.team_id),
      technician_id: form.technician_id || null,
      scheduled_at: form.scheduled_at ? form.scheduled_at.replace("T", " ") + ":00" : null,
      duration_minutes: Number(form.duration_minutes || 0),
      priority: Number(form.priority),
      stage: form.stage,
      blocked: String(form.blocked) === "1"
    };

    try {
      const res = await apiPost("/requests", body);
      setMsg(res.message || "Request created");
    } catch (e) {
      setErr(e.message);
    }
  }

  async function updateStage() {
    if (!currentId) { setErr("Open a request first (from dashboard)"); return; }
    setErr(""); setMsg("");
    try {
      const res = await apiPut(`/requests/${currentId}/stage`, {
        stage: form.stage,
        blocked: String(form.blocked) === "1"
      });
      setMsg(res.message || "Stage updated");
      await openExisting(currentId);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function addItem(type, text) {
    if (!currentId) { setErr("Open a request first"); return; }
    setErr(""); setMsg("");
    const val = text.trim();
    if (!val) return;

    try {
      if (type === "note") await apiPost(`/requests/${currentId}/notes`, { note: val });
      if (type === "instruction") await apiPost(`/requests/${currentId}/instructions`, { instruction: val });
      if (type === "worksheet") await apiPost(`/requests/${currentId}/worksheet`, { comment: val });
      await openExisting(currentId);
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <div className="topbar">
        <h2 className="topbar-title">Maintenance Requests</h2>
        <div className="topbar-actions">
          <button className="btn" onClick={() => setShowWorksheet(s => !s)}>Worksheet</button>
          <button className="btn btn-primary" onClick={resetForm}>New Request</button>
        </div>
      </div>

      <div className="content-wrapper">
        <div className="stagebar">
          <span className="badge">{stageText}</span>
          <span className="badge">{blockText}</span>
        </div>

      <div className="row" style={{ marginBottom: "2rem" }}>
        <div className="col">
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3 style={{ marginTop: 0, marginBottom: "1.5rem", fontSize: "1.1rem", fontWeight: 600 }}>Request Details</h3>
            <div className="field">
              <div className="label">Subject?</div>
              <input className="input" value={form.subject} onChange={(e) => setVal("subject", e.target.value)} />
            </div>

          <div className="field">
            <div className="label">Created By</div>
            <input className="input" value={user?.name || ""} disabled />
          </div>

          <div className="field">
            <div className="label">Maintenance For</div>
            <select value={form.maintenance_for} onChange={(e) => setVal("maintenance_for", e.target.value)}>
              <option value="EQUIPMENT">Equipment</option>
              <option value="WORKCENTER">Work Center</option>
            </select>
          </div>

          {form.maintenance_for === "EQUIPMENT" && (
            <div className="field">
              <div className="label">Equipment</div>
              <select value={form.equipment_id} onChange={(e) => setVal("equipment_id", e.target.value)}>
                {(meta?.equipment || []).map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.name}{eq.serial_number ? " / " + eq.serial_number : ""}</option>
                ))}
              </select>
            </div>
          )}

          {form.maintenance_for === "WORKCENTER" && (
            <div className="field">
              <div className="label">Work Center</div>
              <select value={form.workcenter_id} onChange={(e) => setVal("workcenter_id", e.target.value)}>
                {(meta?.workcenters || []).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          )}

          <div className="field">
            <div className="label">Category</div>
            <select value={form.category_id} onChange={(e) => setVal("category_id", e.target.value)}>
              {(meta?.categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="field">
            <div className="label">Request Date?</div>
            <input className="input" type="date" value={form.request_date} onChange={(e) => setVal("request_date", e.target.value)} />
          </div>

          <div className="field">
            <div className="label">Maintenance Type</div>
            <select value={form.maintenance_type} onChange={(e) => setVal("maintenance_type", e.target.value)}>
              <option value="CORRECTIVE">Corrective</option>
              <option value="PREVENTIVE">Preventive</option>
            </select>
          </div>
        </div>
        </div>

        <div className="col">
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3 style={{ marginTop: 0, marginBottom: "1.5rem", fontSize: "1.1rem", fontWeight: 600 }}>Assignment & Scheduling</h3>
            <div className="field">
              <div className="label">Team</div>
              <select value={form.team_id} onChange={(e) => setVal("team_id", e.target.value)}>
                {(meta?.teams || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

          <div className="field">
            <div className="label">Technician</div>
            <select value={form.technician_id} onChange={(e) => setVal("technician_id", e.target.value)}>
              {(meta?.techs || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="field">
            <div className="label">Scheduled Date?</div>
            <input className="input" type="datetime-local" value={form.scheduled_at} onChange={(e) => setVal("scheduled_at", e.target.value)} />
          </div>

          <div className="field">
            <div className="label">Duration</div>
            <input className="input" type="number" value={form.duration_minutes} onChange={(e) => setVal("duration_minutes", e.target.value)} />
          </div>

          <div className="field">
            <div className="label">Priority</div>
            <select value={form.priority} onChange={(e) => setVal("priority", e.target.value)}>
              <option value={1}>Low</option>
              <option value={2}>Medium</option>
              <option value={3}>High</option>
            </select>
          </div>

          <div className="field">
            <div className="label">Company</div>
            <input className="input" value="My Company" disabled />
          </div>

          <div className="field">
            <div className="label">Stage</div>
            <select value={form.stage} onChange={(e) => setVal("stage", e.target.value)}>
              <option value="NEW_REQUEST">New Request</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="REPAIRED">Repaired</option>
              <option value="SCRAP">Scrap</option>
            </select>
          </div>

          <div className="field">
            <div className="label">Blocked?</div>
            <select value={form.blocked} onChange={(e) => setVal("blocked", e.target.value)}>
              <option value={0}>No</option>
              <option value={1}>Yes</option>
            </select>
          </div>

          <div className="right" style={{ marginTop: "1rem" }}>
            <button className="btn btn-primary" onClick={saveNew}>Save</button>{" "}
            <button className="btn" onClick={updateStage}>Update Stage</button>
          </div>

          {err && <div className="error" style={{ marginTop: "1rem" }}>{err}</div>}
          {msg && <div className="ok" style={{ marginTop: "1rem" }}>{msg}</div>}
          </div>
        </div>
      </div>

        <div className="tabs">
          <button className={"tabbtn " + (tab === "notes" ? "active" : "")} onClick={() => setTab("notes")}>Notes</button>
          <button className={"tabbtn " + (tab === "instructions" ? "active" : "")} onClick={() => setTab("instructions")}>Instructions</button>
        </div>

        <div style={{ padding: "1rem 0" }}>
          {tab === "notes" && (
            <NotesBox
              title="Notes"
              placeholder="write note..."
              items={details.notes}
              itemKey="note"
              onAdd={(t) => addItem("note", t)}
            />
          )}

          {tab === "instructions" && (
            <NotesBox
              title="Instructions"
              placeholder="write instruction..."
              items={details.instructions}
              itemKey="instruction"
              onAdd={(t) => addItem("instruction", t)}
            />
          )}

          {!showWorksheet ? null : (
            <NotesBox
              title="Worksheet Comments"
              placeholder="worksheet comment..."
              items={details.worksheet}
              itemKey="comment"
              onAdd={(t) => addItem("worksheet", t)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function NotesBox({ title, placeholder, items, itemKey, onAdd }) {
  const [text, setText] = useState("");

  return (
    <div className="card" style={{ marginBottom: "1.5rem" }}>
      <h4 style={{ margin: "0 0 1rem 0", color: "var(--odoo-text)" }}>{title}</h4>
      <textarea 
        value={text} 
        onChange={(e) => setText(e.target.value)} 
        placeholder={placeholder}
        style={{ marginBottom: "1rem" }}
      />
      <div className="right" style={{ marginBottom: "1rem" }}>
        <button className="btn btn-primary" onClick={() => { onAdd(text); setText(""); }}>Add</button>
      </div>

      <div style={{ 
        borderTop: "1px solid var(--odoo-border)", 
        paddingTop: "1rem",
        maxHeight: "300px",
        overflowY: "auto"
      }}>
        {(items || []).length === 0 ? (
          <p className="small" style={{ color: "var(--odoo-text-muted)", fontStyle: "italic" }}>
            No items yet. Add one above.
          </p>
        ) : (
          (items || []).map((x) => (
            <div 
              key={x.id} 
              style={{ 
                padding: "0.5rem 0",
                borderBottom: "1px solid var(--odoo-border-light)",
                fontSize: "0.9rem"
              }}
            >
              <div style={{ marginBottom: "0.25rem" }}>{x[itemKey]}</div>
              <div className="small" style={{ color: "var(--odoo-text-muted)" }}>
                {x.created_at}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
