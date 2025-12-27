import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "../api.js";
import Table from "../components/Table.jsx";

export default function WorkCenters() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
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
          <button className="btn btn-primary" onClick={() => alert("Work Center form add later")}>
            New Work Center
          </button>
        </div>
      </div>

      <div className="content-wrapper">
        {err && <div className="error" style={{ marginBottom: "1rem" }}>{err}</div>}

        <Table
          columns={columns}
          rows={filtered}
          onRowClick={(r) => alert(`Clicked: ${r.name}`)}
        />
      </div>
    </div>
  );
}
