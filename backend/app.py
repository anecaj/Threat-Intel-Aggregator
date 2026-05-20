"""
Threat Intelligence Aggregator — Flask API
Pulls from MITRE ATT&CK and NIST NVD (both free, no API keys needed).
"""
import logging
import threading
from flask import Flask, jsonify, request
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler

import database as db
from fetchers.nvd import fetch_recent_cves
from fetchers.mitre import fetch_attack_techniques

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ── Data refresh ───────────────────────────────────────────────────────────────

_refresh_lock = threading.Lock()

def refresh_nvd():
    if not _refresh_lock.acquire(blocking=False):
        logger.info("NVD refresh already running, skipping.")
        return
    try:
        logger.info("Starting NVD refresh...")
        rows = fetch_recent_cves(days_back=14, max_results=500)
        if rows:
            db.upsert_cves(rows)
            db.log_refresh("nvd", len(rows))
            logger.info(f"NVD refresh done: {len(rows)} CVEs stored")
    finally:
        _refresh_lock.release()

def refresh_attack():
    logger.info("Starting MITRE ATT&CK refresh...")
    rows = fetch_attack_techniques()
    if rows:
        db.upsert_techniques(rows)
        db.log_refresh("mitre_attack", len(rows))
        logger.info(f"ATT&CK refresh done: {len(rows)} techniques stored")

def refresh_all():
    refresh_attack()
    refresh_nvd()

# ── Routes: CVE ────────────────────────────────────────────────────────────────

@app.get("/api/cves")
def get_cves():
    severity = request.args.get("severity")
    keyword  = request.args.get("q")
    limit    = min(int(request.args.get("limit", 50)), 200)
    offset   = int(request.args.get("offset", 0))
    rows, total = db.query_cves(severity=severity, keyword=keyword, limit=limit, offset=offset)
    return jsonify({"data": rows, "total": total, "limit": limit, "offset": offset})

@app.get("/api/cves/stats")
def get_cve_stats():
    stats = db.cve_stats()
    total = sum(stats.values())
    return jsonify({"breakdown": stats, "total": total})

@app.get("/api/cves/<cve_id>")
def get_cve(cve_id):
    rows, _ = db.query_cves(keyword=cve_id, limit=1)
    if not rows:
        return jsonify({"error": "Not found"}), 404
    return jsonify(rows[0])

# ── Routes: ATT&CK ─────────────────────────────────────────────────────────────

@app.get("/api/attack/heatmap")
def get_heatmap():
    return jsonify(db.heatmap_data())

@app.get("/api/attack/techniques")
def get_techniques():
    tactic = request.args.get("tactic")
    rows = db.query_techniques(tactic=tactic)
    return jsonify({"data": rows, "total": len(rows)})

@app.get("/api/attack/tactics")
def get_tactics():
    rows = db.query_techniques()
    tactics = sorted(set(
        t.strip()
        for r in rows
        for t in r["tactic"].split(",")
    ))
    return jsonify(tactics)

# ── Routes: Admin ──────────────────────────────────────────────────────────────

@app.post("/api/refresh")
def trigger_refresh():
    source = request.json.get("source", "all") if request.is_json else "all"
    thread = threading.Thread(target=refresh_nvd if source == "nvd"
                              else refresh_attack if source == "attack"
                              else refresh_all)
    thread.daemon = True
    thread.start()
    return jsonify({"status": "refresh started", "source": source})

@app.get("/api/status")
def get_status():
    log = db.get_refresh_log()
    stats = db.cve_stats()
    techniques = db.query_techniques()
    return jsonify({
        "cve_count": sum(stats.values()),
        "technique_count": len(techniques),
        "last_refresh": log,
        "severity_breakdown": stats,
    })

@app.get("/health")
def health():
    return jsonify({"status": "ok"})

# ── Startup — runs under both gunicorn and python app.py ──────────────────────

def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(refresh_nvd,    "interval", hours=6,  id="nvd_refresh")
    scheduler.add_job(refresh_attack, "interval", hours=24, id="attack_refresh")
    scheduler.start()
    logger.info("Scheduler started (NVD every 6h, ATT&CK every 24h)")

# This runs at import time — works with both gunicorn and direct execution
db.init_db()
_initial_status = db.get_refresh_log()
if not _initial_status:
    logger.info("Empty DB detected — running initial data fetch...")
    _thread = threading.Thread(target=refresh_all)
    _thread.daemon = True
    _thread.start()
start_scheduler()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)