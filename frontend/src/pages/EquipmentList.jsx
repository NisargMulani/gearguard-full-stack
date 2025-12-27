import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api.js";
import Table from "../components/Table.jsx";

export default function EquipmentList() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    apiGet("/equipment").then(setRows).catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(x =>
      (x.name || "").toLowerCase().includes(t) ||
      (x.serial_number || "").toLowerCase().includes(t) ||
      (x.employee || "").toLowerCase().includes(t)
    );
  }, [rows, q]);

  const columns = [
    { key: "name", label: "Equipment Name" },
    { key: "employee", label: "Employee" },
    { key: "department", label: "Department" },
    { key: "serial_number", label: "Serial Number" },
    { key: "technician", label: "Technician" },
    { key: "category", label: "Equipment Category" },
    { key: "company", label: "Company" }
  ];

  return (
    <div>
      <div className="topbar">
        <h2 className="topbar-title">Equipment</h2>
        <div className="topbar-actions">
          <div className="searchline">
            <input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => nav("/equipment/new")}>New Equipment</button>
        </div>
      </div>

      <div className="content-wrapper">
        <Table columns={columns} rows={filtered} onRowClick={(r) => nav(`/equipment/${r.id}`)} />
      </div>
    </div>
  );
}
