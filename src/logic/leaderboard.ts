export type RankingScope = "friends" | "global" | "gym" | "city";
export interface RankingEntry {
  id: string; handle: string; name: string; avatar?: string;
  points: number; coverage: number; reliability: number; rank: number; projected?: boolean;
}
export interface RankingBoard {
  scope: RankingScope; location: string; needsLocation: boolean;
  entries: RankingEntry[]; total: number; next: number | null;
  me: RankingEntry | null; nextRival: RankingEntry | null; gap: number | null;
}
export function normalizeLocation(value = "") {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}
/** Rank the complete cohort before paging; equal scores share a position. */
export function rankCohort(rows: (Omit<RankingEntry, "rank" | "reliability"> & { reliability?: number })[], viewer: string, offset = 0) {
  const sorted = rows.map(row => ({ ...row, reliability: row.reliability ?? 0 })).sort((a, b) => b.points - a.points || a.handle.localeCompare(b.handle));
  let rank = 0;
  const entries = sorted.map((row, index) => {
    if (!index || row.points !== sorted[index - 1].points) rank = index + 1;
    return { ...row, rank };
  });
  const me = entries.find(row => row.id === viewer) ?? null;
  const nextRival = me ? entries.findLast(row => row.points > me.points) ?? null : null;
  return { entries: entries.slice(offset, offset + 20), total: entries.length,
    next: offset + 20 < entries.length ? offset + 20 : null, me, nextRival,
    gap: me && nextRival ? Math.round((nextRival.points - me.points) * 10) / 10 : null };
}
