export interface PointsTier { id: string; name: string; minimum: number }

/** Product milestones for Akhyles Points, not competitive strength standards. */
export const pointsTiers: PointsTier[] = [
  { id: "base", name: "Base", minimum: 0 },
  { id: "progress", name: "En progreso", minimum: 100 },
  { id: "athlete", name: "Atleta", minimum: 200 },
  { id: "advanced", name: "Avanzado", minimum: 350 },
  { id: "elite", name: "Élite", minimum: 500 },
  { id: "titan", name: "Titán", minimum: 650 },
  { id: "greek-god", name: "Greek God", minimum: 800 },
  { id: "olympian", name: "Olympian", minimum: 1000 },
];

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
