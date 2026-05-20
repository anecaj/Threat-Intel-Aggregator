import { useState, useEffect } from "react";
import { getCVEStats, getStatus, triggerRefresh } from "./api";
import StatsBar from "./components/StatsBar";
import CVEFeed from "./components/CVEFeed";
import AttackHeatmap from "./components/AttackHeatmap";
import SeverityChart from "./components/SeverityChart";

const NAV = ["CVE Feed", "ATT&CK Matrix"];

export default function App() {
  const [tab, setTab] = useState("CVE Feed");
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshMsg, setLastRefreshMsg] = useState("");

  useEffect(() => {
    Promise.all([getCVEStats(), getStatus()])
      .then(([s, st]) => { setStats(s); setStatus(st); })
      .catch(console.error);
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await triggerRefresh("all");
      setLastRefreshMsg("Refresh started — data updates in ~2 min");
      setTimeout(() => setLastRefreshMsg(""), 5000);
    } catch { setLastRefreshMsg("Refresh failed"); }
    finally { setRefreshing(false); }
  }

  const formatTime = (iso) => {
    if (!iso) return "Never";
    return new Date(iso).toLocaleString();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#010409", color: "#c9d1d9", fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Header */}
      <header style={{ borderBottom: "1px solid #21262d", padding: "0 32px", display: "flex", alignItems: "center", height: 56, gap: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #00ff9f, #00b4d8)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 14 }}>⬡</span>
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 15, color: "#f0f6fc" }}>
            ThreatLens
          </span>
          <span style={{ fontSize: 11, color: "#484f58", fontFamily: "'IBM Plex Mono', monospace" }}>v1.0</span>
        </div>

        <nav style={{ display: "flex", gap: 2 }}>
          {NAV.map((n) => (
            <button key={n} onClick={() => setTab(n)} style={{
              background: "none", border: "none",
              padding: "6px 14px", borderRadius: 6, cursor: "pointer",
              fontSize: 13, color: tab === n ? "#f0f6fc" : "#8b949e",
              background: tab === n ? "#21262d" : "transparent",
            }}>
              {n}
            </button>
          ))}
        </nav>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {lastRefreshMsg && (
            <span style={{ fontSize: 12, color: "#4ade80", fontFamily: "'IBM Plex Mono', monospace" }}>
              {lastRefreshMsg}
            </span>
          )}
          {status?.last_refresh?.nvd && (
            <span style={{ fontSize: 11, color: "#484f58" }}>
              NVD: {formatTime(status.last_refresh.nvd?.last_run)}
            </span>
          )}
          <button onClick={handleRefresh} disabled={refreshing} style={{
            background: "#21262d", border: "1px solid #30363d",
            borderRadius: 6, padding: "6px 14px", cursor: refreshing ? "wait" : "pointer",
            color: refreshing ? "#484f58" : "#c9d1d9", fontSize: 12,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            {refreshing ? "↻ Refreshing..." : "↻ Refresh"}
          </button>
        </div>
      </header>

      {/* Main */}
      <main style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
        <StatsBar stats={stats} status={status} />

        {tab === "CVE Feed" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 20 }}>
            <CVEFeed />
            <div>
              <div style={{ fontSize: 11, color: "#8b949e", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 12 }}>
                SEVERITY BREAKDOWN
              </div>
              <div style={{ background: "#161b22", border: "1px solid #21262d", borderRadius: 8, padding: 16 }}>
                <SeverityChart stats={stats} />
              </div>
            </div>
          </div>
        )}

        {tab === "ATT&CK Matrix" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, color: "#f0f6fc", margin: 0, fontWeight: 500 }}>
                MITRE ATT&CK Enterprise Matrix
              </h2>
              <p style={{ fontSize: 13, color: "#8b949e", margin: "4px 0 0" }}>
                {status?.technique_count ?? "—"} techniques across {(status?.last_refresh?.mitre_attack?.records_fetched ?? 0) > 0 ? "all" : "—"} tactics
              </p>
            </div>
            <AttackHeatmap />
          </div>
        )}
      </main>
    </div>
  );
}
