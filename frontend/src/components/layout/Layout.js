import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const navItems = [
  { to: "/", icon: "bi-grid-1x2-fill", label: "Dashboard", exact: true },
  { to: "/workflows", icon: "bi-diagram-3-fill", label: "Workflows" },
  { to: "/executions", icon: "bi-play-circle-fill", label: "Executions" },
  { to: "/logs", icon: "bi-journal-text", label: "Audit Logs" },
];

const BREADCRUMB_MAP = {
  "/": "Dashboard",
  "/workflows": "Workflows",
  "/executions": "Executions",
  "/logs": "Audit Logs",
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  // Session timer
  useEffect(() => {
    const t = setInterval(() => setSessionTime((s) => s + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const formatSessionTime = () => {
    if (sessionTime < 60) return `${sessionTime}m`;
    return `${Math.floor(sessionTime / 60)}h ${sessionTime % 60}m`;
  };

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path.startsWith("/workflows/") && path !== "/workflows/new")
      return "Workflow Editor";
    if (path.startsWith("/executions/")) return "Execution Detail";
    return BREADCRUMB_MAP[path] || "FlowForge";
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const roleColors = { admin: "#ef4444", manager: "#f59e0b", user: "#10b981" };
  const roleColor = roleColors[user?.role] || "#94a3b8";

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 199,
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`app-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <NavLink
            to="/"
            className="sidebar-logo"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="sidebar-logo-text">ORBINEX</span>
          </NavLink>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main</div>
          {navItems.map((item, i) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `sidebar-nav-item stagger-${i + 1} animate-fade-in ${isActive ? "active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <i className={`nav-icon bi ${item.icon}`} />
              {item.label}
            </NavLink>
          ))}

          <div className="sidebar-section-label">Actions</div>
          <button
            className="sidebar-nav-item"
            onClick={() => {
              navigate("/workflows/new");
              setSidebarOpen(false);
            }}
          >
            <i
              className="nav-icon bi bi-plus-circle-fill"
              style={{ color: "var(--brand-400)" }}
            />
            New Workflow
          </button>
          <button
            className="sidebar-nav-item"
            onClick={() => {
              navigate("/executions");
              setSidebarOpen(false);
            }}
          >
            <i
              className="nav-icon bi bi-lightning-charge-fill"
              style={{ color: "var(--amber-400)" }}
            />
            Quick Execute
          </button>
        </nav>

        <div className="sidebar-footer">
          <div
            className="sidebar-user"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className={`user-avatar user-avatar-online`}>{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div
                className="user-role"
                style={{ color: roleColor, opacity: 0.9 }}
              >
                {user?.role}
              </div>
            </div>
            <button
              className="btn btn-icon btn-ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              title="Logout"
              style={{
                color: "rgba(255,255,255,0.35)",
                padding: "4px 6px",
                marginLeft: "auto",
              }}
            >
              <i className="bi bi-box-arrow-right" />
            </button>
          </div>
          {sessionTime > 0 && (
            <div
              style={{
                textAlign: "center",
                fontSize: 10,
                color: "rgba(255,255,255,0.2)",
                marginTop: 6,
              }}
            >
              Session: {formatSessionTime()}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="app-main">
        {/* Topbar */}
        <header className="app-topbar">
          <button
            className="btn btn-icon btn-ghost d-md-none"
            onClick={() => setSidebarOpen(true)}
            style={{ marginRight: 4 }}
          >
            <i className="bi bi-list" style={{ fontSize: 20 }} />
          </button>

          {/* Breadcrumb */}
          <div className="topbar-breadcrumb d-none d-md-flex">
            <span>FlowForge</span>
            <span className="topbar-breadcrumb-sep">
              <i className="bi bi-chevron-right" style={{ fontSize: 10 }} />
            </span>
            <span className="topbar-breadcrumb-current">{getBreadcrumb()}</span>
          </div>

          <div className="topbar-spacer" />

          {/* Search bar */}
          <div
            style={{ flex: 1, maxWidth: 320, margin: "0 8px" }}
            className="d-none d-lg-block"
          >
            <div className="input-group">
              <i className="bi bi-search input-icon-left" />
              <input
                type="text"
                className="form-control"
                placeholder="Search workflows, executions…"
                style={{
                  borderRadius: "var(--radius-full)",
                  fontSize: 13,
                  height: 36,
                  paddingLeft: 34,
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="live-indicator d-none d-sm-flex">
              <div className="live-dot" />
              Live
            </div>

            <button
              className="topbar-action-btn"
              onClick={toggleTheme}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              <i
                className={`bi ${theme === "dark" ? "bi-sun-fill" : "bi-moon-fill"}`}
                style={{ fontSize: 14 }}
              />
            </button>

            <button className="topbar-action-btn" title="Notifications">
              <i className="bi bi-bell-fill" style={{ fontSize: 13 }} />
              <span className="notification-dot" />
            </button>

            <button
              className="topbar-action-btn"
              title={`Logged in as ${user?.role}`}
              style={{
                background:
                  "linear-gradient(135deg,var(--brand-500),var(--cyan-500))",
                color: "#fff",
                border: "none",
                fontWeight: 800,
                fontSize: 12,
              }}
            >
              {initials}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
