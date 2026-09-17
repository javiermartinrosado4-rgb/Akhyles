export interface PointsTier { id: string; name: string; minimum: number }

/** Product milestones for Akhyles Points, not competitive strength standards. */
export const pointsTiers: PointsTier[] = [
  { id: "base", name: "Base", minimum: 0 },
  { id: "progress", name: "En progreso", minimum: 100 },
  { id: "athlete", name: "Atleta", minimum: 200 },
  { id: "competitor", name: "Competidor", minimum: 300 },
  { id: "advanced", name: "Avanzado", minimum: 400 },
  { id: "elite", name: "Élite", minimum: 500 },
  { id: "titan", name: "Titán", minimum: 600 },
  { id: "legend", name: "Leyenda", minimum: 700 },
  { id: "mythic", name: "Mítico", minimum: 800 },
  { id: "greek-god", name: "Greek God", minimum: 900 },
  { id: "olympian", name: "Olympian", minimum: 1000 },
];

export function pointsTierById(id: string | undefined) {
  const milestone = /^points-(\d+)$/.exec(id ?? "");
  if (milestone) return pointsTiers.find(tier => tier.minimum === Number(milestone[1])) ?? pointsTiers[0];
  return pointsTiers.find(tier => tier.id === id) ?? pointsTiers[0];
}

export function pointsTier(value: number | undefined) {
  const points = Number.isFinite(value) ? Math.max(0, value!) : 0;
  return pointsTiers.findLast(tier => points >= tier.minimum) ?? pointsTiers[0];
}

export function nextPointsGoal(value: number | undefined, step = 25) {
  const points = Number.isFinite(value) ? Math.max(0, value!) : 0;
  return Math.floor(points / step + 1) * step;
}

export function nextPointsTier(value: number | undefined) {
  const points = Number.isFinite(value) ? Math.max(0, value!) : 0;
  return pointsTiers.find(tier => tier.minimum > points) ?? null;
}
