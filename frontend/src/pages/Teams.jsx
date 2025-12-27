import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "../api.js";
import Table from "../components/Table.jsx";

export default function Teams() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    apiGet("/teams").then(setRows).catch(console.error);
  }, []);

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

  return (
    <div>
      <div className="topbar">
        <h2 className="topbar-title">Teams</h2>
        <div className="topbar-actions">
          <div className="searchline">
            <input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => alert("Team create form later")}>New Team</button>
        </div>
      </div>
      <div className="content-wrapper">
        <Table columns={columns} rows={filtered} />
      </div>
    </div>
  );
}
