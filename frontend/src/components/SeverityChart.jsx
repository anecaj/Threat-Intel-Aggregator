import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from "recharts";

const SEVERITY_CONFIG = {
  CRITICAL: { color: "#ff4d4d", order: 1 },
  HIGH:     { color: "#ff8c42", order: 2 },
  MEDIUM:   { color: "#fbbf24", order: 3 },
  LOW:      { color: "#4ade80", order: 4 },
  NONE:     { color: "#484f58", order: 5 },
  UNKNOWN:  { color: "#30363d", order: 6 },
};

export default function SeverityChart({ stats }) {
  if (!stats?.breakdown) return null;

  const total = stats.total || 1;
  const data = Object.entries(stats.breakdown)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => (SEVERITY_CONFIG[a]?.order ?? 9) - (SEVERITY_CONFIG[b]?.order ?? 9))
    .map(([severity, count]) => ({
      name: severity,
      count,
      pct: Math.round((count / total) * 100),
      fill: SEVERITY_CONFIG[severity]?.color ?? "#8b949e",
    }));

  return (
    <div>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%" data={data} startAngle={180} endAngle={-180}>
            <RadialBar dataKey="pct" cornerRadius={4} background={{ fill: "#161b22" }} />
            <Tooltip
              contentStyle={{ background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, fontSize: 12 }}
              formatter={(val, name, props) => [`${props.payload.count} (${val}%)`, props.payload.name]}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        {data.map((d) => (
          <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: d.fill, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#8b949e", flex: 1, fontFamily: "'IBM Plex Mono', monospace" }}>{d.name}</span>
            <span style={{ fontSize: 12, color: d.fill, fontFamily: "'IBM Plex Mono', monospace" }}>{d.count.toLocaleString()}</span>
            <span style={{ fontSize: 11, color: "#484f58" }}>{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
