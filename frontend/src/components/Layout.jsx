import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "../auth.js";

export default function Layout() {
  const nav = useNavigate();

  async function doLogout() {
    await logout();
    nav("/login");
  }

  return (
    <div className="container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>GearGuard</h2>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/requests">Maintenance</NavLink>
          <NavLink to="/calendar">Calendar</NavLink>
          <NavLink to="/equipment">Equipment</NavLink>
          <NavLink to="/workcenters">Work Centers</NavLink>
          <NavLink to="/teams">Teams</NavLink>
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-danger" onClick={doLogout} style={{ width: "100%" }}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
