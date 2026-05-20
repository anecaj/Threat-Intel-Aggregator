export default function StatsBar({ stats, status }) {
  const cards = [
    {
      label: "Total CVEs",
      value: stats?.total ?? "—",
      sub: "last 14 days",
      accent: "#00ff9f",
    },
    {
      label: "Critical",
      value: stats?.breakdown?.CRITICAL ?? 0,
      sub: "highest severity",
      accent: "#ff4d4d",
    },
    {
      label: "High",
      value: stats?.breakdown?.HIGH ?? 0,
      sub: "needs attention",
      accent: "#ff8c42",
    },
    {
      label: "ATT&CK Techniques",
      value: status?.technique_count ?? "—",
      sub: "enterprise matrix",
      accent: "#7c6aff",
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
      {cards.map((c) => (
        <div key={c.label} style={{
          background: "#0d1117",
          border: "1px solid #21262d",
          borderRadius: 8,
          padding: "16px 20px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 2,
            background: c.accent,
          }} />
          <div style={{ fontSize: 11, color: "#8b949e", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 6 }}>
            {c.label.toUpperCase()}
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, color: c.accent, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>
            {typeof c.value === "number" ? c.value.toLocaleString() : c.value}
          </div>
          <div style={{ fontSize: 11, color: "#484f58", marginTop: 4 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
