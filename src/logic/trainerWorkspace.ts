import type { SharedProgress } from "./sharing";

export type TrainerAttention = "on-track" | "routine-pending" | "inactive" | "needs-review";

export interface TrainerClientSummary {
  relationshipId: string;
  id: string;
  name: string;
  handle: string;
  avatar?: string;
  level?: string;
  activeSince?: string;
  lastActivity?: string;
  scheduled?: number;
  completed?: number;
  adherence?: number | null;
  strengthPercent?: number | null;
  points?: number | null;
  /** Active collaborations always include the complete training record. */
  progress?: SharedProgress | null;
  routineStatus?: "applied" | "sent" | "draft" | "none";
  attention: TrainerAttention;
}

export interface TrainerDashboard {
  activeClients: number;
  pendingRequests: number;
  routinesPending: number;
  needsAttention: number;
  medianAdherence: number | null;
  medianStrengthChange: number | null;
  eligibleClients: number;
  sampleSufficient: boolean;
  clients: TrainerClientSummary[];
}

export interface TrainerImpact {
  adherence: number | null;
  strength: number | null;
  consistency: number | null;
  eligibleClients: number;
  activeClients: number;
  sampleSufficient: boolean;
  badges: { id: string; title: string; detail: string; earned: boolean }[];
}

export interface TrainerPublicStats {
  clientsActive: number;
  eligibleClients: number;
  sampleSufficient: boolean;
  adherenceMedian?: number;
  strengthMedian?: number;
  consistencyRate?: number;
  periodDays: number;
  calculatedAt?: string;
  methodology: string;
}

export const median = (values: Array<number | null | undefined>) => {
  const sorted = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round(((sorted[middle - 1] + sorted[middle]) / 2) * 10) / 10;
};

export const attentionForClient = (client: Pick<TrainerClientSummary, "adherence" | "lastActivity" | "routineStatus">): TrainerAttention => {
  if (client.routineStatus === "sent" || client.routineStatus === "draft") return "routine-pending";
  if (client.adherence !== null && client.adherence !== undefined && client.adherence < 55) return "needs-review";
  if (client.lastActivity && Date.now() - Date.parse(client.lastActivity) > 7 * 24 * 60 * 60 * 1000) return "inactive";
  return "on-track";
};

/** Public-facing results are aggregates: never a ranking of individual clients. */
export const trainerImpact = (dashboard: TrainerDashboard): TrainerImpact => {
  const eligible = dashboard.clients.filter(client => client.adherence !== null && client.adherence !== undefined && client.strengthPercent !== null && client.strengthPercent !== undefined);
  const adherence = median(eligible.map(client => client.adherence));
  const strength = median(eligible.map(client => client.strengthPercent));
  const consistency = eligible.length ? Math.round(eligible.filter(client => (client.adherence ?? 0) >= 75).length * 1000 / eligible.length) / 10 : null;
  const active = dashboard.activeClients;
  return {
    adherence, strength, consistency, eligibleClients: eligible.length, activeClients: active, sampleSufficient: eligible.length >= 5,
    badges: [
      { id: "first-client", title: "Primer acompañamiento", detail: "Has activado tu primera colaboración.", earned: active >= 1 },
      { id: "steady-follow-up", title: "Seguimiento constante", detail: "La muestra mantiene una adherencia mediana de al menos 75%.", earned: eligible.length >= 5 && (adherence ?? 0) >= 75 },
      { id: "progress-builder", title: "Progreso medible", detail: "La mejora mediana de fuerza es positiva en una muestra suficiente.", earned: eligible.length >= 5 && (strength ?? 0) > 0 },
      { id: "trusted-coach", title: "Confianza demostrable", detail: "Diez deportistas activos acompañados desde Akhyles.", earned: active >= 10 },
    ],
  };
};

/** A calm, deterministic order for the coach's daily queue. */
export const priorityClients = (clients: TrainerClientSummary[]) => [...clients].sort((left, right) => {
  const rank: Record<TrainerAttention, number> = { "needs-review": 0, inactive: 1, "routine-pending": 2, "on-track": 3 };
  return rank[left.attention] - rank[right.attention] || left.name.localeCompare(right.name);
});

/** This workspace is deliberately opt-in outside local development. */
export const trainerWorkspaceEnabled = (enabled = false) => __DEV__ || enabled;
