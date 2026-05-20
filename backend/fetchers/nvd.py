"""
Fetches recent CVEs from the NIST NVD API v2.0.
No API key required — completely free and public.
Docs: https://nvd.nist.gov/developers/vulnerabilities
"""
import time
import json
import logging
import requests
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

NVD_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0"
PAGE_SIZE = 100  # max allowed without API key
RATE_LIMIT_DELAY = 6  # NVD enforces 5 req/30s without a key

SEVERITY_ORDER = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1, "NONE": 0}


def _get_severity(cve_item: dict) -> tuple[str, float]:
    """Extract severity label and CVSS score from a CVE item."""
    metrics = cve_item.get("metrics", {})
    for key in ("cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
        entries = metrics.get(key, [])
        if entries:
            data = entries[0].get("cvssData", {})
            score = data.get("baseScore", 0.0)
            severity = (
                entries[0].get("baseSeverity")
                or data.get("baseSeverity")
                or _score_to_label(score)
            )
            return severity.upper(), float(score)
    return "UNKNOWN", 0.0


def _score_to_label(score: float) -> str:
    if score >= 9.0:
        return "CRITICAL"
    if score >= 7.0:
        return "HIGH"
    if score >= 4.0:
        return "MEDIUM"
    if score > 0:
        return "LOW"
    return "NONE"


def _parse_cwe(cve_item: dict) -> str:
    try:
        weaknesses = cve_item.get("weaknesses", [])
        cwes = []
        for w in weaknesses:
            for desc in w.get("description", []):
                val = desc.get("value", "")
                if val.startswith("CWE-"):
                    cwes.append(val)
        return ", ".join(cwes) if cwes else "N/A"
    except Exception:
        return "N/A"


def _parse_refs(cve_item: dict) -> str:
    try:
        refs = cve_item.get("references", [])
        urls = [r.get("url", "") for r in refs[:5] if r.get("url")]
        return json.dumps(urls)
    except Exception:
        return "[]"


def _parse_description(cve_item: dict) -> str:
    for desc in cve_item.get("descriptions", []):
        if desc.get("lang") == "en":
            return desc.get("value", "No description available.")
    return "No description available."


def fetch_recent_cves(days_back: int = 7, max_results: int = 500) -> list[dict]:
    """
    Fetch CVEs published in the last `days_back` days.
    Returns a list of dicts ready for DB insertion.
    """
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days_back)
    pub_start = start.strftime("%Y-%m-%dT%H:%M:%S.000")
    pub_end = now.strftime("%Y-%m-%dT%H:%M:%S.000")

    records = []
    start_index = 0

    logger.info(f"Fetching CVEs from {pub_start} to {pub_end}")

    while True:
        params = {
            "pubStartDate": pub_start,
            "pubEndDate": pub_end,
            "resultsPerPage": PAGE_SIZE,
            "startIndex": start_index,
        }

        try:
            resp = requests.get(NVD_BASE, params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException as e:
            logger.error(f"NVD request failed at index {start_index}: {e}")
            break

        total_results = data.get("totalResults", 0)
        vulnerabilities = data.get("vulnerabilities", [])

        for item in vulnerabilities:
            cve = item.get("cve", {})
            cve_id = cve.get("id", "")
            severity, cvss_score = _get_severity(cve)

            records.append({
                "id": cve_id,
                "description": _parse_description(cve),
                "severity": severity,
                "cvss_score": cvss_score,
                "published": cve.get("published", ""),
                "modified": cve.get("lastModified", ""),
                "cwe": _parse_cwe(cve),
                "refs": _parse_refs(cve),
            })

        logger.info(f"  Page {start_index // PAGE_SIZE + 1}: got {len(vulnerabilities)} CVEs (total {total_results})")

        start_index += PAGE_SIZE
        if start_index >= total_results or len(records) >= max_results:
            break

        time.sleep(RATE_LIMIT_DELAY)

    logger.info(f"NVD fetch complete: {len(records)} CVEs collected")
    return records
