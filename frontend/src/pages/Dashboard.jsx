import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api.js";
import Table from "../components/Table.jsx";

export default function Dashboard() {
  const nav = useNavigate();
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const s = await apiGet("/dashboard/summary");
      const r = await apiGet("/dashboard/recent-requests");
      setSummary(s);
      setRows(r);
    })().catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(x =>
      (x.subject || "").toLowerCase().includes(t) ||
      (x.employee || "").toLowerCase().includes(t) ||
      (x.technician || "").toLowerCase().includes(t)
    );
  }, [rows, q]);

  const columns = [
    { key: "subject", label: "Subjects" },
    { key: "employee", label: "Employee" },
    { key: "technician", label: "Technician" },
    { key: "category", label: "Category" },
    { key: "stage", label: "Stage" },
    { key: "company", label: "Company" }
  ];

  return (
    <div>
      <div className="topbar">
        <h2 className="topbar-title">Dashboard</h2>
        <div className="topbar-actions">
          <div className="searchline">
            <input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => nav("/requests")}>New Request</button>
        </div>
      </div>

      <div className="content-wrapper">
        <div className="cards">
          <div className="card red">
            <h3>Critical Equipment</h3>
            <b>{summary ? summary.critical_equipment : 0}</b>
            <div className="small">Health &lt; 30%</div>
          </div>
          <div className="card blue">
            <h3>Technician Load</h3>
            <b>{summary ? summary.technician_load_percent : 0}%</b>
            <div className="small">Assign Carefully</div>
          </div>
          <div className="card green">
            <h3>Open Requests</h3>
            <b>{summary ? summary.open_requests : 0}</b>
            <div className="small">{summary ? summary.overdue_requests : 0} Overdue</div>
          </div>
        </div>

        <Table
          columns={columns}
          rows={filtered}
          onRowClick={(r) => nav(`/requests?open=${r.id}`)}
        />
      </div>
    </div>
  );
}
