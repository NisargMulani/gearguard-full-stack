import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout, getUser } from "../auth.js";
import { canManageEquipment, canManageWorkcenters, canManageTeams } from "../permissions.js";

export default function Layout() {
  const nav = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function loadUser() {
      const u = await getUser();
      setUser(u);
    }
    loadUser();
  }, []);

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
          {canManageEquipment(user) && <NavLink to="/equipment">Equipment</NavLink>}
          {canManageWorkcenters(user) && <NavLink to="/workcenters">Work Centers</NavLink>}
          {canManageTeams(user) && <NavLink to="/teams">Teams</NavLink>}
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
