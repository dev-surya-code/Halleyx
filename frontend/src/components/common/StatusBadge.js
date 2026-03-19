import React from "react";

const STATUS_CONFIG = {
  completed: {
    label: "Completed",
    icon: "bi-check-circle-fill",
    color: "#059669",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.2)",
  },
  in_progress: {
    label: "In Progress",
    icon: "bi-arrow-right-circle-fill",
    color: "#2563eb",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.2)",
    pulse: true,
  },
  pending: {
    label: "Pending",
    icon: "bi-clock-fill",
    color: "#b45309",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.2)",
  },
  failed: {
    label: "Failed",
    icon: "bi-x-circle-fill",
    color: "#dc2626",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.2)",
  },
  canceled: {
    label: "Canceled",
    icon: "bi-slash-circle-fill",
    color: "#64748b",
    bg: "rgba(148,163,184,0.1)",
    border: "rgba(148,163,184,0.2)",
  },
  active: {
    label: "Active",
    icon: "bi-lightning-fill",
    color: "#059669",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.2)",
  },
  inactive: {
    label: "Inactive",
    icon: "bi-pause-circle-fill",
    color: "#64748b",
    bg: "rgba(148,163,184,0.1)",
    border: "rgba(148,163,184,0.2)",
  },
  pending_approval: {
    label: "Approval",
    icon: "bi-hourglass-split",
    color: "#b45309",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.2)",
    pulse: true,
  },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || {
    label: status,
    icon: "bi-circle",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.1)",
    border: "rgba(148,163,184,0.2)",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 9999,
        fontSize: 11.5,
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        whiteSpace: "nowrap",
        letterSpacing: 0.2,
      }}
    >
      <i
        className={`bi ${cfg.icon}`}
        style={{
          fontSize: 10,
          ...(cfg.pulse ? { animation: "pulse-dot 1.5s infinite" } : {}),
        }}
      />
      {cfg.label}
      <style>{`@keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </span>
  );
}

const STEP_TYPE_CONFIG = {
  task: { icon: "bi-gear-fill", color: "#4f46e5", bg: "rgba(99,102,241,0.1)" },
  approval: {
    icon: "bi-person-check-fill",
    color: "#b45309",
    bg: "rgba(245,158,11,0.1)",
  },
  notification: {
    icon: "bi-bell-fill",
    color: "#0891b2",
    bg: "rgba(6,182,212,0.1)",
  },
  condition: {
    icon: "bi-diagram-2-fill",
    color: "#7c3aed",
    bg: "rgba(139,92,246,0.1)",
  },
  delay: {
    icon: "bi-clock-fill",
    color: "#475569",
    bg: "rgba(148,163,184,0.1)",
  },
  webhook: {
    icon: "bi-link-45deg",
    color: "#059669",
    bg: "rgba(16,185,129,0.1)",
  },
};

export function StepTypeBadge({ type }) {
  const cfg = STEP_TYPE_CONFIG[type] || {
    icon: "bi-circle",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.1)",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.color,
        textTransform: "capitalize",
      }}
    >
      <i className={`bi ${cfg.icon}`} style={{ fontSize: 10 }} />
      {type}
    </span>
  );
}
