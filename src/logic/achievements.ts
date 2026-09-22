export interface PointsTier { id: string; name: string; minimum: number }
/** The scoring engine retains its historic 0–1000 reference; the product scale is 0–150+. */
export const A_POINTS_PRESENTATION_SCALE = 150 / 1000;
export function presentationPoints(value: number | undefined) {
  if (!Number.isFinite(value)) return undefined;
  return Math.round(Math.max(0, value!) * A_POINTS_PRESENTATION_SCALE * 10) / 10;
}

/** Converts a change in the historic score without forcing losses to zero. */
export function presentationPointsDelta(value: number | undefined) {
  if (!Number.isFinite(value)) return undefined;
  return Math.round(value! * A_POINTS_PRESENTATION_SCALE * 10) / 10;
}

/** Product milestones for Akhyles Points, not competitive strength standards. */
export const pointsTiers: PointsTier[] = [
  { id: "initiated", name: "Iniciado", minimum: 0 },
  { id: "athlete", name: "Atleta", minimum: 25 },
  { id: "warrior", name: "Guerrero", minimum: 50 },
  { id: "competitor", name: "Competidor", minimum: 70 },
  { id: "hero", name: "Héroe", minimum: 90 },
  { id: "demigod", name: "Semidiós", minimum: 110 },
  { id: "olympian", name: "Olimpian", minimum: 150 },
];

export function pointsTierById(id: string | undefined) {
  const milestone = /^points-(\d+)$/.exec(id ?? "");
  if (milestone) return pointsTier(Number(milestone[1]));
  return pointsTiers.find(tier => tier.id === id) ?? pointsTiers.find(tier => tier.id === "olympian" && id === "olympian") ?? pointsTiers[0];
}

export function pointsTier(value: number | undefined) {
  const points = presentationPoints(value) ?? 0;
  return pointsTiers.findLast(tier => points >= tier.minimum) ?? pointsTiers[0];
}

export function nextPointsGoal(value: number | undefined, step = 25) {
  const points = presentationPoints(value) ?? 0;
  if (points >= pointsTiers.at(-1)!.minimum) return points;
  return Math.floor(points / step + 1) * step;
}

export function nextPointsTier(value: number | undefined) {
  const points = presentationPoints(value) ?? 0;
  return pointsTiers.find(tier => tier.minimum > points) ?? null;
}
