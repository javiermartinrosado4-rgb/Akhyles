export interface MotivationalQuote {
  text: string;
  author?: string;
}

// A small, varied rotation: effort, consistency and growth without turning the
// training screen into a wall of slogans.
export const motivationalQuotes: MotivationalQuote[] = [
  { text: "Cuando el fracaso es una opción, eventualmente se convierte en consecuencia.", author: "Javi" },
  { text: "El caer no quita la gloria de haber subido." },
  { text: "Si solo haces lo que sabes hacer, jamás serás más de lo que eres hoy." },
  { text: "No temes a fallar. Temes que vean tus fallos." },
  { text: "El paso más importante que puede dar un hombre es el siguiente.", author: "Dalinar Kholin" },
  { text: "Envy no man. For whatever you see, a price was paid." },
  { text: "Cuando uno hace todo lo que puede, no está obligado a más." },
  { text: "La comodidad es la peor adicción.", author: "Marco Aurelio" },
  { text: "Structure is way better than discipline" },
  { text: "Don't be sorry, be better." },
  { text: "You can't control the wind, but you can adjust your sails" },
  { text: "Lo que hoy pesa, mañana será parte de tu base." },
  { text: "Do or do not, there is no try.", author: "Yoda" },
  { text: "Practice like you've never won, perform like you've ever lost" },
  { text: "Until death, all defeat is psychological" },
  { text: "You already know what to do, you're just negotiating with comfort" },
  { text: "Quotes don't work, until you work" },
  { text: "The curse of Discipline is that everyday looks the same. The curse of indiscipline is that every year does" },
  { text: "The path to heaven feels like hell and the path to hell feels like heaven" },
  { text: "A pawn can become anything if it never stops moving forward." },
  { text: "A man who waits for perfect shot dies with full magazine" },
];

/** A deterministic daily choice keeps the phrase steady while navigating. */
export const motivationalQuoteForDate = (date = new Date()) => {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  // Seeded by the day: it feels random, changes every day, and remains stable
  // while the user navigates or receives the training reminder.
  const seed = [...key].reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 7);
  const index = seed % motivationalQuotes.length;
  return motivationalQuotes[index];
};
