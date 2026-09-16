export const avatars = [
  { id: "mountain", name: "Montaña", color: "#346B62", symbol: "▲" },
  { id: "sun", name: "Sol", color: "#A35C24", symbol: "☀" },
  { id: "wave", name: "Ola", color: "#2864A5", symbol: "≈" },
  { id: "star", name: "Estrella", color: "#8249A1", symbol: "★" },
  { id: "bolt", name: "Rayo", color: "#9E385B", symbol: "ϟ" },
  { id: "moon", name: "Luna", color: "#525C91", symbol: "☾" },
] as const;
export const validAvatar = (id: unknown): id is string => typeof id === "string" && avatars.some(a => a.id === id);
// The server stores this as a 256px JPEG after upload, so the source can be
// comfortably larger without making the stored profile data heavy.
export const validAvatarPhoto = (value: unknown): value is string => typeof value === "string" && value.length <= 2_000_000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
