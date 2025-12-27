import React from "react";

export default function Table({ columns, rows, onRowClick }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => <th key={c.key}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.id ?? idx} onClick={() => onRowClick && onRowClick(r)}>
              {columns.map((c) => <td key={c.key}>{r[c.key] ?? ""}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
