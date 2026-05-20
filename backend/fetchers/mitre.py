"""
Fetches MITRE ATT&CK Enterprise techniques from the public STIX JSON on GitHub.
Completely free, no API key or account required.
Source: https://github.com/mitre/cti
"""
import json
import logging
import requests

logger = logging.getLogger(__name__)

ATTACK_URL = (
    "https://raw.githubusercontent.com/mitre/cti/master/"
    "enterprise-attack/enterprise-attack.json"
)

# Canonical tactic short-names → display labels
TACTIC_LABELS = {
    "reconnaissance": "Reconnaissance",
    "resource-development": "Resource Development",
    "initial-access": "Initial Access",
    "execution": "Execution",
    "persistence": "Persistence",
    "privilege-escalation": "Privilege Escalation",
    "defense-evasion": "Defense Evasion",
    "credential-access": "Credential Access",
    "discovery": "Discovery",
    "lateral-movement": "Lateral Movement",
    "collection": "Collection",
    "command-and-control": "Command & Control",
    "exfiltration": "Exfiltration",
    "impact": "Impact",
}


def _extract_tactics(obj: dict) -> str:
    """Return comma-separated tactic display names from a technique STIX object."""
    kill_chain = obj.get("kill_chain_phases", [])
    labels = []
    for phase in kill_chain:
        if phase.get("kill_chain_name") == "mitre-attack":
            slug = phase.get("phase_name", "")
            labels.append(TACTIC_LABELS.get(slug, slug.replace("-", " ").title()))
    return ", ".join(labels) if labels else "Uncategorized"


def _clean_description(text: str) -> str:
    """Strip MITRE citation markers like (Citation: ...) from descriptions."""
    import re
    text = re.sub(r"\(Citation:[^)]+\)", "", text)
    return text.strip()


def fetch_attack_techniques() -> list[dict]:
    """
    Download and parse MITRE ATT&CK Enterprise STIX bundle.
    Returns a list of technique dicts ready for DB insertion.
    """
    logger.info("Fetching MITRE ATT&CK Enterprise JSON...")

    try:
        resp = requests.get(ATTACK_URL, timeout=60)
        resp.raise_for_status()
        bundle = resp.json()
    except requests.RequestException as e:
        logger.error(f"Failed to fetch ATT&CK data: {e}")
        return []

    objects = bundle.get("objects", [])
    techniques = []

    for obj in objects:
        if obj.get("type") != "attack-pattern":
            continue
        if obj.get("x_mitre_deprecated", False) or obj.get("revoked", False):
            continue

        # Resolve ATT&CK ID (e.g. T1059)
        attack_id = ""
        for ref in obj.get("external_references", []):
            if ref.get("source_name") == "mitre-attack":
                attack_id = ref.get("external_id", "")
                url = ref.get("url", "")
                break
        else:
            url = ""

        if not attack_id:
            continue

        # Skip sub-techniques for heatmap clarity (keep T1059, not T1059.001)
        # Comment this out if you want full sub-technique detail
        # if "." in attack_id:
        #     continue

        platforms = obj.get("x_mitre_platforms", [])
        detection = obj.get("x_mitre_detection", "")
        description = _clean_description(obj.get("description", ""))

        techniques.append({
            "id": attack_id,
            "name": obj.get("name", ""),
            "tactic": _extract_tactics(obj),
            "description": description[:1000],  # trim for DB
            "detection": detection[:500],
            "platforms": ", ".join(platforms),
            "url": url,
        })

    logger.info(f"ATT&CK fetch complete: {len(techniques)} techniques parsed")
    return techniques
