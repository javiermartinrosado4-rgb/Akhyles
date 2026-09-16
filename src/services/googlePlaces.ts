/**
 * Small, opt-in Google Places client used only while choosing a gym.
 *
 * The key is intentionally read from the local Expo environment. Production
 * should use a restricted key (Android package/SHA and web referrer) or a
 * server-side proxy; do not commit a key to the app.
 */
const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY?.trim();

export interface GoogleGymPrediction {
  placeId: string;
  name: string;
  address: string;
}

export interface GoogleGymPlace extends GoogleGymPrediction {
  city: string;
  latitude?: number;
  longitude?: number;
}

export const googlePlacesEnabled = () => !!apiKey;

async function google<T>(path: string, init: RequestInit, fields: string): Promise<T> {
  if (!apiKey) throw new Error("La búsqueda de Google Maps todavía no está configurada en esta compilación.");
  const response = await fetch(`https://places.googleapis.com/v1/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fields,
      ...init.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error?.message || "Google Maps no ha podido buscar gimnasios.");
  return result as T;
}

export async function searchGoogleGyms(input: string, languageCode: "es" | "en"): Promise<GoogleGymPrediction[]> {
  const query = input.trim();
  if (query.length < 2) return [];
  const result = await google<{ suggestions?: Array<{ placePrediction?: { placeId?: string; text?: { text?: string }; structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } } } }> }>(
    "places:autocomplete",
    {
      method: "POST",
      body: JSON.stringify({
        input: query,
        includedPrimaryTypes: ["gym"],
        includedRegionCodes: ["es"],
        languageCode,
        includeQueryPredictions: false,
      }),
    },
    "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
  );
  return (result.suggestions ?? []).flatMap(item => {
    const prediction = item.placePrediction;
    const placeId = prediction?.placeId;
    if (!placeId) return [];
    return [{
      placeId,
      name: prediction.structuredFormat?.mainText?.text || prediction.text?.text || "Gimnasio",
      address: prediction.structuredFormat?.secondaryText?.text || "",
    }];
  });
}

export async function googleGymDetails(prediction: GoogleGymPrediction, languageCode: "es" | "en"): Promise<GoogleGymPlace> {
  const place = await google<{
    displayName?: { text?: string };
    formattedAddress?: string;
    addressComponents?: Array<{ types?: string[]; longText?: string }>;
    location?: { latitude?: number; longitude?: number };
  }>(
    `places/${encodeURIComponent(prediction.placeId)}`,
    { method: "GET", headers: { "Accept-Language": languageCode } },
    "displayName,formattedAddress,addressComponents,location",
  );
  const city = place.addressComponents?.find(component => component.types?.includes("locality") || component.types?.includes("postal_town"))?.longText ?? "";
  return {
    placeId: prediction.placeId,
    name: place.displayName?.text || prediction.name,
    address: place.formattedAddress || prediction.address,
    city,
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
  };
}
