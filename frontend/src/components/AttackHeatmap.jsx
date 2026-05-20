import { useState, useEffect } from "react";
import { getHeatmap, getTechniques } from "../api";

const TACTIC_COLORS = [
  "#ff4d4d", "#ff6b6b", "#ff8c42", "#fbbf24",
  "#a3e635", "#4ade80", "#34d399", "#2dd4bf",
  "#38bdf8", "#818cf8", "#a78bfa", "#c084fc",
  "#f472b6", "#fb7185",
];

export default function AttackHeatmap() {
  const [heatmap, setHeatmap] = useState([]);
  const [selected, setSelected] = useState(null);
  const [techniques, setTechniques] = useState([]);
  const [techLoading, setTechLoading] = useState(false);

  useEffect(() => {
    getHeatmap().then(setHeatmap).catch(console.error);
  }, []);

  const maxCount = Math.max(...heatmap.map((h) => h.count), 1);

  async function handleTacticClick(tactic) {
    if (selected === tactic) { setSelected(null); setTechniques([]); return; }
    setSelected(tactic);
    setTechLoading(true);
    try {
      const res = await getTechniques(tactic);
      setTechniques(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setTechLoading(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: "#8b949e", fontFamily: "'IBM Plex Mono', monospace" }}>
          CLICK A TACTIC TO EXPLORE TECHNIQUES
        </span>
      </div>

      {/* Heatmap grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8, marginBottom: 20 }}>
        {heatmap.map((item, i) => {
          const intensity = item.count / maxCount;
          const color = TACTIC_COLORS[i % TACTIC_COLORS.length];
          const isSelected = selected === item.tactic;

          return (
            <div
              key={item.tactic}
              onClick={() => handleTacticClick(item.tactic)}
              style={{
                background: isSelected ? "#161b22" : `rgba(${hexToRgb(color)}, ${0.05 + intensity * 0.25})`,
                border: `1px solid ${isSelected ? color : `rgba(${hexToRgb(color)}, ${0.2 + intensity * 0.4})`}`,
                borderRadius: 8,
                padding: "14px 12px",
                cursor: "pointer",
                transition: "all 0.15s",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* intensity bar */}
              <div style={{
                position: "absolute", bottom: 0, left: 0,
                height: 3, width: `${intensity * 100}%`,
                background: color, borderRadius: "0 2px 0 0",
              }} />
              <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>
                {item.count}
              </div>
              <div style={{ fontSize: 11, color: "#c9d1d9", marginTop: 6, lineHeight: 1.3 }}>
                {item.tactic}
              </div>
            </div>
          );
        })}
      </div>

      {/* Technique drill-down */}
      {selected && (
        <div style={{ border: "1px solid #21262d", borderRadius: 8, background: "#161b22" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #21262d", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#c9d1d9", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
              {selected.toUpperCase()} — {techniques.length} techniques
            </span>
            <button onClick={() => { setSelected(null); setTechniques([]); }} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer" }}>✕</button>
          </div>

          {techLoading ? (
            <div style={{ padding: 24, textAlign: "center", color: "#8b949e", fontSize: 13 }}>Loading...</div>
          ) : (
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {techniques.map((t) => (
                <div key={t.id} style={{ padding: "10px 16px", borderBottom: "1px solid #21262d" }}>
                  <div style={{ display: "flex", gap: 10, marginBottom: 4, alignItems: "baseline" }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#58a6ff", minWidth: 70 }}>
                      {t.id}
                    </span>
                    <span style={{ fontSize: 13, color: "#c9d1d9", fontWeight: 500 }}>{t.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#484f58" }}>{t.platforms}</div>
                  {t.description && (
                    <p style={{ fontSize: 12, color: "#8b949e", margin: "6px 0 0", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {t.description}
                    </p>
                  )}
                  {t.url && (
                    <a href={t.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#388bfd", display: "block", marginTop: 4 }}>
                      View on ATT&CK ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "255,255,255";
}
