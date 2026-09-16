import { Redirect } from "expo-router";

/** Keep old preview links inside the real app, with profile settings and navigation. */
export default function BodyMapPreview() {
  return <Redirect href="/progress" />;
}
