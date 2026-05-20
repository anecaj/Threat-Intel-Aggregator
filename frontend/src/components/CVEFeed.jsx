import { useState, useEffect, useCallback } from "react";
import { getCVEs } from "../api";
import { formatDistanceToNow, parseISO } from "date-fns";

const SEVERITY_COLOR = {
  CRITICAL: { bg: "#2d0f0f", text: "#ff4d4d", border: "#7f1d1d" },
  HIGH:     { bg: "#2d1a0f", text: "#ff8c42", border: "#7c3009" },
  MEDIUM:   { bg: "#2d250f", text: "#fbbf24", border: "#78400a" },
  LOW:      { bg: "#0f2215", text: "#4ade80", border: "#14532d" },
  UNKNOWN:  { bg: "#1a1f27", text: "#8b949e", border: "#30363d" },
};

function SeverityBadge({ severity }) {
  const s = SEVERITY_COLOR[severity] || SEVERITY_COLOR.UNKNOWN;
  return (
    <span style={{
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
      borderRadius: 4, padding: "2px 8px", fontSize: 10,
      fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, letterSpacing: "0.05em",
    }}>
      {severity}
    </span>
  );
}

function CVERow({ cve, onClick, active }) {
  const published = cve.published ? formatDistanceToNow(parseISO(cve.published), { addSuffix: true }) : "unknown";
  return (
    <div
      onClick={() => onClick(cve)}
      style={{
        padding: "12px 16px",
        borderBottom: "1px solid #21262d",
        cursor: "pointer",
        background: active ? "#161b22" : "transparent",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#0d1117"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: "#58a6ff" }}>
          {cve.id}
        </span>
        <SeverityBadge severity={cve.severity} />
        {cve.cvss_score > 0 && (
          <span style={{ fontSize: 11, color: "#8b949e" }}>CVSS {cve.cvss_score.toFixed(1)}</span>
        )}
        <span style={{ fontSize: 11, color: "#484f58", marginLeft: "auto" }}>{published}</span>
      </div>
      <div style={{ fontSize: 12, color: "#8b949e", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {cve.description}
      </div>
      {cve.cwe && cve.cwe !== "N/A" && (
        <div style={{ fontSize: 10, color: "#484f58", marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
          {cve.cwe}
        </div>
      )}
    </div>
  );
}

function CVEDetail({ cve, onClose }) {
  const refs = JSON.parse(cve.refs || "[]");
  return (
    <div style={{
      background: "#0d1117", border: "1px solid #30363d", borderRadius: 8,
      padding: 20, marginTop: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, fontWeight: 600, color: "#58a6ff", marginBottom: 6 }}>
            {cve.id}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <SeverityBadge severity={cve.severity} />
            {cve.cvss_score > 0 && <span style={{ fontSize: 12, color: "#8b949e" }}>CVSS {cve.cvss_score.toFixed(1)}</span>}
            {cve.cwe !== "N/A" && <span style={{ fontSize: 12, color: "#8b949e", fontFamily: "'IBM Plex Mono', monospace" }}>{cve.cwe}</span>}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer", fontSize: 18 }}>✕</button>
      </div>
      <p style={{ fontSize: 13, color: "#c9d1d9", lineHeight: 1.7, marginBottom: 16 }}>{cve.description}</p>
      {refs.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "#8b949e", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 8 }}>REFERENCES</div>
          {refs.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{
              display: "block", fontSize: 12, color: "#58a6ff", marginBottom: 4,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{url}</a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CVEFeed() {
  const [cves, setCves] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [severity, setSeverity] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(null);
  const LIMIT = 25;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCVEs({ severity: severity || undefined, q: debouncedQ || undefined, limit: LIMIT, offset });
      setCves(res.data);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [severity, debouncedQ, offset]);

  useEffect(() => { setOffset(0); }, [severity, debouncedQ]);
  useEffect(() => { load(); }, [load]);

  const SEVERITIES = ["", "CRITICAL", "HIGH", "MEDIUM", "LOW"];

  return (
    <div>
      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search CVEs..."
          style={{
            flex: 1, background: "#0d1117", border: "1px solid #30363d", borderRadius: 6,
            padding: "8px 12px", color: "#c9d1d9", fontSize: 13,
            fontFamily: "'IBM Plex Sans', sans-serif", outline: "none",
          }}
        />
        {SEVERITIES.map((s) => (
          <button key={s || "ALL"} onClick={() => setSeverity(s)} style={{
            background: severity === s ? "#21262d" : "transparent",
            border: `1px solid ${severity === s ? "#30363d" : "#21262d"}`,
            borderRadius: 6, padding: "7px 12px", cursor: "pointer",
            color: s ? (SEVERITY_COLOR[s]?.text || "#c9d1d9") : "#c9d1d9",
            fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
          }}>
            {s || "ALL"}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ border: "1px solid #21262d", borderRadius: 8, background: "#161b22" }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #21262d", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "#8b949e", fontFamily: "'IBM Plex Mono', monospace" }}>
            {loading ? "LOADING..." : `${total.toLocaleString()} RESULTS`}
          </span>
          <span style={{ fontSize: 11, color: "#484f58" }}>
            {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
          </span>
        </div>

        {cves.map((cve) => (
          <CVERow
            key={cve.id}
            cve={cve}
            active={selected?.id === cve.id}
            onClick={(c) => setSelected(selected?.id === c.id ? null : c)}
          />
        ))}

        {selected && <CVEDetail cve={selected} onClose={() => setSelected(null)} />}

        {/* Pagination */}
        <div style={{ padding: "10px 16px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            style={{
              background: "transparent", border: "1px solid #30363d", borderRadius: 6,
              padding: "5px 12px", color: offset === 0 ? "#484f58" : "#c9d1d9",
              cursor: offset === 0 ? "not-allowed" : "pointer", fontSize: 12,
            }}
          >← Prev</button>
          <button
            disabled={offset + LIMIT >= total}
            onClick={() => setOffset(offset + LIMIT)}
            style={{
              background: "transparent", border: "1px solid #30363d", borderRadius: 6,
              padding: "5px 12px", color: offset + LIMIT >= total ? "#484f58" : "#c9d1d9",
              cursor: offset + LIMIT >= total ? "not-allowed" : "pointer", fontSize: 12,
            }}
          >Next →</button>
        </div>
      </div>
    </div>
  );
}
