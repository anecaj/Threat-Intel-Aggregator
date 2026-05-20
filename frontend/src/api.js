import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({ baseURL: BASE });

export const getCVEs = (params = {}) =>
  api.get("/cves", { params }).then((r) => r.data);

export const getCVEStats = () =>
  api.get("/cves/stats").then((r) => r.data);

export const getHeatmap = () =>
  api.get("/attack/heatmap").then((r) => r.data);

export const getTechniques = (tactic) =>
  api.get("/attack/techniques", { params: tactic ? { tactic } : {} }).then((r) => r.data);

export const getTactics = () =>
  api.get("/attack/tactics").then((r) => r.data);

export const getStatus = () =>
  api.get("/status").then((r) => r.data);

export const triggerRefresh = (source = "all") =>
  api.post("/refresh", { source }).then((r) => r.data);
