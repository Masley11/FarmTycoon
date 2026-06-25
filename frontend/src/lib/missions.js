import { api } from "@/lib/api";

export const fetchMissions = () => api.get("/missions").then((r) => r.data);
export const claimMission = (instanceId) =>
  api.post(`/missions/${instanceId}/claim`).then((r) => r.data);
