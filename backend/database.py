import sqlite3
import os

DB_PATH = os.environ.get("DB_PATH", "threat_intel.db")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS cves (
            id TEXT PRIMARY KEY,
            description TEXT,
            severity TEXT,
            cvss_score REAL,
            published TEXT,
            modified TEXT,
            cwe TEXT,
            refs TEXT
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS attack_techniques (
            id TEXT PRIMARY KEY,
            name TEXT,
            tactic TEXT,
            description TEXT,
            detection TEXT,
            platforms TEXT,
            url TEXT
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS refresh_log (
            source TEXT PRIMARY KEY,
            last_run TEXT,
            records_fetched INTEGER
        )
    """)

    conn.commit()
    conn.close()

# ── CVE queries ────────────────────────────────────────────────────────────────

def upsert_cves(rows):
    conn = get_conn()
    conn.executemany("""
        INSERT OR REPLACE INTO cves
            (id, description, severity, cvss_score, published, modified, cwe, refs)
        VALUES (:id, :description, :severity, :cvss_score, :published, :modified, :cwe, :refs)
    """, rows)
    conn.commit()
    conn.close()

def query_cves(severity=None, keyword=None, limit=50, offset=0):
    conn = get_conn()
    sql = "SELECT * FROM cves WHERE 1=1"
    params = []
    if severity:
        sql += " AND severity = ?"
        params.append(severity.upper())
    if keyword:
        sql += " AND (id LIKE ? OR description LIKE ?)"
        params += [f"%{keyword}%", f"%{keyword}%"]
    sql += " ORDER BY published DESC LIMIT ? OFFSET ?"
    params += [limit, offset]
    rows = [dict(r) for r in conn.execute(sql, params).fetchall()]
    total = conn.execute(
        "SELECT COUNT(*) FROM cves WHERE 1=1"
        + (" AND severity=?" if severity else "")
        + (" AND (id LIKE ? OR description LIKE ?)" if keyword else ""),
        params[:-2]
    ).fetchone()[0]
    conn.close()
    return rows, total

def cve_stats():
    conn = get_conn()
    rows = conn.execute("""
        SELECT severity, COUNT(*) as count
        FROM cves GROUP BY severity
    """).fetchall()
    conn.close()
    return {r["severity"]: r["count"] for r in rows}

# ── ATT&CK queries ─────────────────────────────────────────────────────────────

def upsert_techniques(rows):
    conn = get_conn()
    conn.executemany("""
        INSERT OR REPLACE INTO attack_techniques
            (id, name, tactic, description, detection, platforms, url)
        VALUES (:id, :name, :tactic, :description, :detection, :platforms, :url)
    """, rows)
    conn.commit()
    conn.close()

def query_techniques(tactic=None):
    conn = get_conn()
    sql = "SELECT * FROM attack_techniques WHERE 1=1"
    params = []
    if tactic:
        sql += " AND tactic LIKE ?"
        params.append(f"%{tactic}%")
    sql += " ORDER BY tactic, name"
    rows = [dict(r) for r in conn.execute(sql, params).fetchall()]
    conn.close()
    return rows

def heatmap_data():
    conn = get_conn()
    rows = conn.execute("""
        SELECT tactic, COUNT(*) as count
        FROM attack_techniques GROUP BY tactic ORDER BY count DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ── Refresh log ────────────────────────────────────────────────────────────────

def log_refresh(source, count):
    from datetime import datetime, timezone
    conn = get_conn()
    conn.execute("""
        INSERT OR REPLACE INTO refresh_log (source, last_run, records_fetched)
        VALUES (?, ?, ?)
    """, (source, datetime.now(timezone.utc).isoformat(), count))
    conn.commit()
    conn.close()

def get_refresh_log():
    conn = get_conn()
    rows = [dict(r) for r in conn.execute("SELECT * FROM refresh_log").fetchall()]
    conn.close()
    return {r["source"]: r for r in rows}
