import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { dashboardAPI } from "../services/api";
import { useWebSocket } from "../hooks/useWebSocket";
import StatusBadge from "../components/common/StatusBadge";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useAuth } from "../context/AuthContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const C = {
  primary: "#6366f1",
  success: "#10b981",
  danger: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
  cyan: "#06b6d4",
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState([]);
  const [topWorkflows, setTopWorkflows] = useState([]);
  const [recentExec, setRecentExec] = useState([]);
  const [statusDist, setStatusDist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendDays, setTrendDays] = useState(7);
  const [refreshing, setRefreshing] = useState(false);
  const [wsEvents, setWsEvents] = useState(0);

  const fetchAll = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setRefreshing(true);
      try {
        const [s, t, tw, re, sd] = await Promise.all([
          dashboardAPI.getStats(),
          dashboardAPI.getTrend(trendDays),
          dashboardAPI.getTopWorkflows(),
          dashboardAPI.getRecentExecutions(),
          dashboardAPI.getStatusDistribution(),
        ]);
        setStats(s.data.data);
        setTrend(t.data.data);
        setTopWorkflows(tw.data.data);
        setRecentExec(re.data.data);
        setStatusDist(sd.data.data);
      } catch {
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [trendDays],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useWebSocket(
    useCallback(
      (msg) => {
        if (
          [
            "execution:completed",
            "execution:failed",
            "execution:started",
          ].includes(msg.type)
        ) {
          setWsEvents((n) => n + 1);
          fetchAll();
        }
      },
      [fetchAll],
    ),
  );

  if (loading) return <LoadingSpinner />;

  // Chart data
  const trendLabels = trend.map((d) =>
    new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  );

  const lineData = {
    labels: trendLabels,
    datasets: [
      {
        label: "Completed",
        data: trend.map((d) => d.completed),
        borderColor: C.success,
        backgroundColor: "rgba(16,185,129,0.08)",
        fill: true,
        tension: 0.45,
        pointRadius: 4,
        pointHoverRadius: 7,
        borderWidth: 2.5,
        pointBackgroundColor: C.success,
      },
      {
        label: "Failed",
        data: trend.map((d) => d.failed),
        borderColor: C.danger,
        backgroundColor: "rgba(239,68,68,0.06)",
        fill: true,
        tension: 0.45,
        pointRadius: 4,
        pointHoverRadius: 7,
        borderWidth: 2.5,
        pointBackgroundColor: C.danger,
      },
    ],
  };

  const donutData = {
    labels: statusDist.map((s) => s._id),
    datasets: [
      {
        data: statusDist.map((s) => s.count),
        backgroundColor: [C.success, C.danger, C.warning, C.info, "#94a3b8"],
        borderWidth: 3,
        borderColor: "var(--bg-card)",
        hoverOffset: 8,
      },
    ],
  };

  const barData = {
    labels: topWorkflows.map((w) =>
      w.name.length > 16 ? w.name.slice(0, 16) + "…" : w.name,
    ),
    datasets: [
      {
        label: "Executions",
        data: topWorkflows.map((w) => w.execution_count),
        backgroundColor: "rgba(99,102,241,0.75)",
        borderRadius: 6,
        borderSkipped: false,
        hoverBackgroundColor: C.primary,
      },
    ],
  };

  const chartBase = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#f1f5f9",
        bodyColor: "#94a3b8",
        borderColor: "#334155",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(148,163,184,0.08)", drawBorder: false },
        ticks: { color: "var(--text-muted)", font: { size: 11 } },
      },
      y: {
        grid: { color: "rgba(148,163,184,0.08)", drawBorder: false },
        ticks: { color: "var(--text-muted)", font: { size: 11 } },
        beginAtZero: true,
      },
    },
  };

  const donutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "72%",
    plugins: {
      legend: {
        position: "right",
        labels: {
          color: "var(--text-secondary)",
          font: { size: 12 },
          padding: 14,
          usePointStyle: true,
          pointStyleWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#f1f5f9",
        bodyColor: "#94a3b8",
        borderColor: "#334155",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
  };

  const successRate = stats?.executions?.success_rate ?? 0;
  const statCards = [
    {
      label: "Total Workflows",
      value: stats?.workflows?.total ?? 0,
      icon: "bi-diagram-3-fill",
      color: "primary",
      bg: "rgba(99,102,241,0.12)",
      iconColor: C.primary,
      sub: `${stats?.workflows?.active ?? 0} active`,
    },
    {
      label: "Executions",
      value: stats?.executions?.total ?? 0,
      icon: "bi-play-circle-fill",
      color: "info",
      bg: "rgba(59,130,246,0.12)",
      iconColor: C.info,
      sub: `${stats?.executions?.in_progress ?? 0} running`,
    },
    {
      label: "Completed",
      value: stats?.executions?.completed ?? 0,
      icon: "bi-check-circle-fill",
      color: "success",
      bg: "rgba(16,185,129,0.12)",
      iconColor: C.success,
      sub: `${successRate}% success rate`,
    },
    {
      label: "Failed",
      value: stats?.executions?.failed ?? 0,
      icon: "bi-x-circle-fill",
      color: "danger",
      bg: "rgba(239,68,68,0.12)",
      iconColor: C.danger,
      sub: "Need attention",
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 22 }}>👋</span>
            <h1 className="page-title">
              {greeting()}, {user?.name?.split(" ")[0]}!
            </h1>
          </div>
          <p className="page-subtitle">
            Platform overview ·{" "}
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            {wsEvents > 0 && (
              <span
                style={{
                  marginLeft: 10,
                  fontSize: 12,
                  color: "var(--emerald-500)",
                  fontWeight: 600,
                }}
              >
                · {wsEvents} live update{wsEvents > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="page-header-actions">
          <div className="live-indicator">
            <div className="live-dot" />
            WebSocket
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fetchAll(true)}
            disabled={refreshing}
          >
            <i
              className={`bi bi-arrow-clockwise ${refreshing ? "spin" : ""}`}
              style={{
                animation: refreshing ? "spin 0.8s linear infinite" : "none",
              }}
            />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate("/workflows/new")}
          >
            <i className="bi bi-plus-lg" /> New Workflow
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid-4 mb-4" style={{ marginBottom: 24 }}>
        {statCards.map((s, i) => (
          <div
            key={i}
            className={`stat-card ${s.color} stagger-${i + 1} animate-fade-in`}
          >
            <div className="stat-icon" style={{ background: s.bg }}>
              <i className={`bi ${s.icon}`} style={{ color: s.iconColor }} />
            </div>
            <div className="stat-value">{s.value.toLocaleString()}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-change" style={{ color: "var(--text-muted)" }}>
              <i className="bi bi-info-circle" style={{ fontSize: 10 }} />
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div
        className="grid-2 mb-4"
        style={{ marginBottom: 24, gridTemplateColumns: "1fr 1fr" }}
      >
        {/* Execution Trend */}
        <div style={{ gridColumn: "1 / 3" }} className="d-block d-lg-none" />
        <div className="card" style={{ gridColumn: "span 2" }}>
          <div style={{ display: "none" }} />
        </div>
        <div
          className="card p-4"
          style={{
            gridColumn: "span 2",
            display: "grid",
            gridTemplateColumns: "1fr auto",
          }}
        >
          <div />
        </div>
      </div>

      {/* Execution Trend + Donut side-by-side */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: 20,
          marginBottom: 24,
        }}
      >
        <div className="card p-4">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <div>
              <h6 style={{ fontWeight: 700, margin: 0, fontSize: 14 }}>
                Execution Trend
              </h6>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  margin: 0,
                  marginTop: 2,
                }}
              >
                Completed vs Failed over time
              </p>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setTrendDays(d)}
                  style={{
                    padding: "4px 11px",
                    border: `1px solid ${trendDays === d ? "var(--brand-500)" : "var(--border)"}`,
                    borderRadius: 6,
                    background:
                      trendDays === d ? "var(--brand-500)" : "transparent",
                    color: trendDays === d ? "#fff" : "var(--text-muted)",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    transition: "all 0.2s",
                  }}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: 230 }}>
            <Line
              data={lineData}
              options={{
                ...chartBase,
                plugins: {
                  ...chartBase.plugins,
                  legend: {
                    display: true,
                    labels: {
                      color: "var(--text-secondary)",
                      font: { size: 11 },
                      usePointStyle: true,
                      padding: 16,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="card p-4">
          <h6 style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>
            Status Distribution
          </h6>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginBottom: 16,
            }}
          >
            All time execution results
          </p>
          {statusDist.length > 0 ? (
            <>
              <div style={{ height: 180 }}>
                <Doughnut data={donutData} options={donutOpts} />
              </div>
              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {statusDist.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: [
                          C.success,
                          C.danger,
                          C.warning,
                          C.info,
                          "#94a3b8",
                        ][i],
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        color: "var(--text-secondary)",
                        textTransform: "capitalize",
                      }}
                    >
                      {s._id}
                    </span>
                    <span
                      style={{ fontWeight: 700, color: "var(--text-primary)" }}
                    >
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ padding: "32px 0" }}>
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-desc">
                No execution data yet. Run your first workflow!
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div
        style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}
      >
        {/* Top Workflows bar chart */}
        <div className="card p-4">
          <h6 style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>
            Top Workflows
          </h6>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginBottom: 16,
            }}
          >
            By execution count
          </p>
          {topWorkflows.length > 0 ? (
            <div style={{ height: 220 }}>
              <Bar
                data={barData}
                options={{
                  ...chartBase,
                  indexAxis: "y",
                  plugins: { ...chartBase.plugins, legend: { display: false } },
                }}
              />
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "32px 0" }}>
              <div className="empty-state-icon">⚡</div>
              <div className="empty-state-desc">No workflows yet</div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate("/workflows/new")}
              >
                Create First
              </button>
            </div>
          )}
        </div>

        {/* Recent Executions */}
        <div className="card">
          <div className="card-header">
            <h6 className="card-title">Recent Executions</h6>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate("/executions")}
            >
              View all <i className="bi bi-arrow-right ms-1" />
            </button>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Workflow</th>
                <th>Status</th>
                <th>Started</th>
                <th>Duration</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentExec.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      textAlign: "center",
                      color: "var(--text-muted)",
                      padding: "32px",
                    }}
                  >
                    No executions yet — run a workflow to get started
                  </td>
                </tr>
              ) : (
                recentExec.slice(0, 7).map((ex) => {
                  const dur =
                    ex.completed_at && ex.created_at
                      ? Math.round(
                          (new Date(ex.completed_at) -
                            new Date(ex.created_at)) /
                            1000,
                        )
                      : null;
                  return (
                    <tr
                      key={ex._id}
                      className="table-row-link"
                      onClick={() => navigate(`/executions/${ex._id}`)}
                    >
                      <td>
                        <div
                          style={{
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            fontSize: 13,
                          }}
                        >
                          {ex.workflow_name}
                        </div>
                        <div
                          style={{ fontSize: 11, color: "var(--text-muted)" }}
                        >
                          v{ex.workflow_version}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={ex.status} />
                      </td>
                      <td
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {new Date(ex.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {dur != null
                          ? `${dur < 60 ? dur + "s" : Math.round(dur / 60) + "m"}`
                          : "—"}
                      </td>
                      <td>
                        <i
                          className="bi bi-chevron-right"
                          style={{ color: "var(--text-muted)", fontSize: 12 }}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
