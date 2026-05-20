# ThreatLens — Threat Intelligence Aggregator

A real-time threat intelligence platform that pulls from **MITRE ATT&CK** and **NIST NVD**
(completely free, no API keys required).

**Live demo:** `https://<your-github-username>.github.io/threat-intel-aggregator/`  
**Backend API:** `https://threat-intel-api.onrender.com`

---

## Stack

| Layer    | Tech                              |
|----------|-----------------------------------|
| Backend  | Python, Flask, SQLite, APScheduler |
| Frontend | React, Recharts, Vite             |
| Hosting  | Render.com (API) + GitHub Pages (UI) |
| Data     | NIST NVD API v2 + MITRE ATT&CK GitHub |

---

## Local Development

### 1. Clone the repo

```bash
git clone https://github.com/<your-username>/threat-intel-aggregator.git
cd threat-intel-aggregator
```

### 2. Start the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Backend runs at **http://localhost:5000**  
On first start it auto-fetches CVEs and ATT&CK data (takes ~30 seconds).

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**

---

## Deploy to Render.com (Backend — Free)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Set **Root Directory** to `backend`
5. Render auto-detects `render.yaml` — just click **Deploy**
6. Copy your Render URL (e.g. `https://threat-intel-api.onrender.com`)

---

## Deploy Frontend to GitHub Pages (Free)

1. In your GitHub repo → **Settings → Pages**
2. Set source to **GitHub Actions**
3. Go to **Settings → Secrets → Actions** → add:
   - `VITE_API_URL` = `https://your-render-url.onrender.com/api`
4. Push to `main` — GitHub Actions auto-builds and deploys

---

## API Reference

| Endpoint                   | Description                          |
|----------------------------|--------------------------------------|
| `GET /api/cves`            | Paginated CVE list (filter: severity, q) |
| `GET /api/cves/stats`      | Severity breakdown counts            |
| `GET /api/attack/heatmap`  | Technique count per tactic           |
| `GET /api/attack/techniques` | Full technique list (filter: tactic) |
| `GET /api/attack/tactics`  | All tactic names                     |
| `GET /api/status`          | DB counts + last refresh timestamps  |
| `POST /api/refresh`        | Trigger manual data refresh          |
| `GET /health`              | Health check                         |

---

## Data Sources

- **NIST NVD**: https://nvd.nist.gov/developers/vulnerabilities  
- **MITRE ATT&CK**: https://github.com/mitre/cti  
Both are 100% free and require no registration.

---

## Features

- Live CVE feed filtered by severity + keyword search
- CVSS score display + CWE classification
- MITRE ATT&CK tactic heatmap with drill-down
- Auto-refresh (NVD every 6h, ATT&CK every 24h)
- Manual refresh trigger from the UI
- Severity breakdown chart
- Fully responsive dark-theme dashboard
