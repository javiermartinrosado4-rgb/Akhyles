import { useLanguage } from "../i18n";
import { useState } from "react";
import { router } from "expo-router";
import { levelName } from "../data/options";
import { comparisonSample, ComparisonResult } from "../logic/comparison";
import { useStore } from "../state/Store";
import { useCommunity } from "../state/Community";
import { Button, Card, Notice, Txt } from "./ui";

export function ComparisonCard() {
  const { t, locale } = useLanguage();
  const { state } = useStore();
  const { user, request } = useCommunity();
  const [saved, setSaved] = useState<{ result: ComparisonResult; signature: string; userId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [details, setDetails] = useState(false);
  const sample = comparisonSample(state);
  const signature = JSON.stringify(sample);
  const result = saved?.signature === signature && saved.userId === user?.id ? saved.result : null;
  const format = (value: number) => `${value >= 0 ? "+" : ""}${value.toLocaleString(locale, { maximumFractionDigits: 1 })}%`;
  return <Card>
    <Txt weight="600" size={20}>Tu ritmo frente a la comunidad</Txt>
    <Txt muted size={13}>{t("Nivel: {level} · últimos 28 días", { level: t(levelName(state.profile.level)) })}</Txt>
    <Txt size={14}>Comparamos tu mejora con el resto de participantes de tu nivel que tienen registros de los mismos ejercicios.</Txt>
    {result && <>
      <Txt weight="600" size={22}>{({ insufficient: "Aún faltan datos comparables", average: "Progresas en la media", faster: "Progresas más rápido que la media", slower: "Progresas más lento que la media" })[result.status]}</Txt>
      {result.rate !== null && <Txt>{t("Tu ritmo: {rate} por 28 días.", { rate: format(result.rate) })}</Txt>}
      {result.average !== null && <Txt>{t("Media de tu nivel: {rate} por 28 días.", { rate: format(result.average) })}</Txt>}
      <Txt muted size={13}>{t("{n} usuarios comparables · {exercises} ejercicios en común con todos ellos.", { n: result.peers, exercises: result.exercises })}</Txt>
    </>}
    <Button label={details ? "Ocultar método de comparación" : "Cómo se compara"} compact variant="ghost" onPress={() => setDetails(!details)} />
    {details && <Txt muted size={12}>Se necesitan al menos 7 días entre registros, una medición en la última semana y 5 personas comparables. Solo se incluyen sesiones registradas con tu nivel actual; las antiguas sin nivel guardado permanecen en tus gráficas. El ritmo usa fuerza estimada a partir de carga y 1–12 repeticiones. «En la media» significa una diferencia de hasta 1 punto porcentual por 28 días. Es una referencia orientativa basada en registros declarados.</Txt>}
    {user ? <>
      <Txt muted size={12}>{t("Al comparar, compartes con Akhyles las fechas, ejercicios homologados y fuerza estimada de este dispositivo como @{handle}. Los demás solo reciben resultados agregados.", { handle: user.handle })}</Txt>
      <Button label={busy ? "Comparando…" : "Compartir registros y comparar"} disabled={busy} onPress={async () => {
        setBusy(true); setError(""); setMessage("");
        try { setSaved({ result: await request<ComparisonResult>("/comparison", "POST", sample), signature, userId: user.id }); }
        catch (error) { setError((error as Error).message); }
        finally { setBusy(false); }
      }} />
      <Button label="Retirar mis datos de la comparación" compact variant="ghost" disabled={busy} onPress={async () => {
        setBusy(true); setError("");
        try { await request("/comparison", "DELETE"); setSaved(null); setMessage("Tus registros se han retirado de la comparación."); }
        catch (error) { setError((error as Error).message); }
        finally { setBusy(false); }
      }} />
    </> : <Button label="Entrar en Comunidad para comparar" variant="secondary" onPress={() => router.replace("/community")} />}
    {!!error && <Notice error>{error}</Notice>}
    {!!message && <Notice>{message}</Notice>}
  </Card>;
}
