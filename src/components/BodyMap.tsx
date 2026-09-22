import { useLanguage } from "../i18n";
import { useId, useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Pattern, Path, Rect, Stop } from "react-native-svg";
import { useTheme } from "../theme";
import { Muscle } from "../types";
import { anatomicalGroups, hasMuscleScore, muscleAppearance, MuscleScore, strengthBands } from "../logic/bodyMap";
import { presentationPoints } from "../logic/achievements";
import { Card, Icon, Row, Txt } from "./ui";
import { bodyFront } from "./anatomy/bodyFront";
import { bodyBack } from "./anatomy/bodyBack";
import { bodyFemaleFront } from "./anatomy/bodyFemaleFront";
import { bodyFemaleBack } from "./anatomy/bodyFemaleBack";
import MusclePath from "./anatomy/MusclePath";

type MaterialKind = "neutral" | "stone" | "white-marble" | "bronze" | "green-marble" | "silver" | "kintsugi" | "gold";

function materialKind(label: string): MaterialKind {
  if (label === "Iniciado") return "stone";
  if (label === "Atleta") return "white-marble";
  if (label === "Guerrero") return "bronze";
  if (label === "Competidor") return "green-marble";
  if (label === "Héroe") return "silver";
  if (label === "Semidiós") return "kintsugi";
  if (label === "Olimpian") return "gold";
  return "neutral";
}

function MaterialPattern({ id, kind, dark, compact = false }: { id: string; kind: MaterialKind; dark: boolean; compact?: boolean }) {
  const base = `${id}-base`;
  const stops = kind === "neutral" ? (dark
    ? [["0", "#52635B"], ["0.55", "#34453D"], ["1", "#202E28"]]
    : [["0", "#F1F3EF"], ["0.55", "#D7DDD8"], ["1", "#BBC5BE"]])
    : kind === "stone" ? [["0", "#E2E2DC"], ["0.48", "#B5B6B0"], ["1", "#858984"]]
      : kind === "white-marble" ? [["0", "#FFFEF8"], ["0.5", "#ECEAE1"], ["1", "#C8CBC7"]]
        : kind === "bronze" ? [["0", "#6F351C"], ["0.18", "#B86132"], ["0.43", "#F0A266"], ["0.58", "#B95D30"], ["0.78", "#7B3A20"], ["1", "#D17B45"]]
          : kind === "green-marble" ? [["0", "#0D3428"], ["0.38", "#25694F"], ["0.62", "#347C5D"], ["1", "#102F26"]]
            : kind === "silver" ? [["0", "#596568"], ["0.2", "#AAB5B6"], ["0.45", "#F5F8F5"], ["0.62", "#C4CDCD"], ["0.82", "#778487"], ["1", "#DCE3E1"]]
              : kind === "kintsugi" ? [["0", "#303333"], ["0.48", "#111514"], ["1", "#050706"]]
                : [["0", "#725025"], ["0.18", "#9F7134"], ["0.43", "#EED49C"], ["0.58", "#C39850"], ["0.8", "#8E632D"], ["1", "#D4B06E"]];
  const metal = kind === "bronze" || kind === "silver" || kind === "gold";
  return <>
    <LinearGradient id={base} x1="0" y1="0" x2={metal ? "1" : "0.82"} y2="1">
      {stops.map(([offset, stopColor]) => <Stop key={offset} offset={offset} stopColor={stopColor} />)}
    </LinearGradient>
    <Pattern id={id} width="240" height="300" patternUnits="userSpaceOnUse" patternTransform={compact ? "scale(0.16 0.1333)" : undefined}>
      <Rect width="240" height="300" fill={`url(#${base})`} />
      {kind === "stone" && <>
        <Ellipse cx="50" cy="68" rx="42" ry="30" fill="#FFFFFF" opacity={0.09} />
        <Ellipse cx="184" cy="210" rx="56" ry="42" fill="#5E625E" opacity={0.1} />
        <Path d="M-18 235C38 205 68 252 119 218S201 157 268 188" stroke="#676C68" strokeOpacity={0.18} strokeWidth={5} fill="none" />
      </>}
      {kind === "white-marble" && <>
        <Path d="M-25 244C25 206 35 155 91 149s70-83 174-107" stroke="#737C7A" strokeOpacity={0.28} strokeWidth={4} fill="none" />
        <Path d="M-30 251C28 213 43 169 96 160s74-79 170-105" stroke="#FFFFFF" strokeOpacity={0.52} strokeWidth={8} fill="none" />
        <Path d="M11 30c53 22 81 14 120-9s77-18 124 8" stroke="#A7AAA4" strokeOpacity={0.16} strokeWidth={3} fill="none" />
      </>}
      {kind === "green-marble" && <>
        <Ellipse cx="182" cy="74" rx="72" ry="46" fill="#72A98C" opacity={0.12} />
        <Path d="M-24 249C22 198 64 217 91 165s74-74 174-96" stroke="#B6D7C4" strokeOpacity={0.3} strokeWidth={4} fill="none" />
        <Path d="M-19 258C31 211 66 231 100 177s78-69 161-88" stroke="#081E18" strokeOpacity={0.23} strokeWidth={8} fill="none" />
        <Path d="M3 71c55 25 96 19 132-10s75-36 123-17" stroke="#D8E9DD" strokeOpacity={0.16} strokeWidth={3} fill="none" />
      </>}
      {metal && <>
        <Path d="M-44 272L167 -16h54L10 300z" fill="#FFFFFF" opacity={kind === "gold" ? 0.18 : 0.14} />
        <Path d="M52 300L240 44v55L92 300z" fill="#2A1705" opacity={kind === "bronze" || kind === "gold" ? 0.1 : 0.06} />
        <Ellipse cx="70" cy="78" rx="78" ry="46" fill="#FFFFFF" opacity={0.08} />
      </>}
      {kind === "kintsugi" && <>
        <Path d="M-8 237l55-42 24 17 35-70 31 22 33-81 77-51M105 143l-25-41 18-55M170 84l35 33-12 57 43 27" stroke="#C39850" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M-8 237l55-42 24 17 35-70 31 22 33-81 77-51M105 143l-25-41 18-55M170 84l35 33-12 57 43 27" stroke="#EED49C" strokeOpacity={0.68} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>}
    </Pattern>
  </>;
}

function MaterialSwatch({ label, size = 28 }: { label: string; size?: number }) {
  const { dark } = useTheme();
  const id = `material-swatch-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return <Svg width={size} height={size} viewBox="0 0 40 40">
    <Defs><MaterialPattern id={id} kind={materialKind(label)} dark={dark} compact /></Defs>
    <Circle cx="20" cy="20" r="18" fill={`url(#${id})`} stroke={label === "Semidiós" ? "#C39850" : dark ? "#49675A" : "#C8D0CA"} strokeWidth="1.3" />
    <Circle cx="15" cy="13" r="7" fill="#FFFFFF" opacity={0.11} />
  </Svg>;
}



function Anatomy({ side, female, categories, selected, excluded, onSelect }: {
  side: "front" | "back"; female: boolean; categories: MuscleScore[];
  selected: Muscle | null; excluded: ReadonlySet<Muscle>; onSelect: (muscle: Muscle) => void;
}) {
  const { t } = useLanguage();
  const { colors, dark } = useTheme();
  const prefix = `anatomy-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const parts = female ? side === "front" ? bodyFemaleFront : bodyFemaleBack : side === "front" ? bodyFront : bodyBack;
  const viewBox = female ? side === "front" ? "-35 0 720 1450" : "785 0 720 1450" : side === "front" ? "25 85 680 1300" : "745 85 680 1300";
  return <Svg width="100%" height="100%" viewBox={viewBox} accessibilityLabel={t(side === "front" ? "Anatomía frontal. Toca un músculo para consultar su fuerza." : "Anatomía posterior. Toca un músculo para consultar su fuerza.")}>
    <Defs>
      {parts.map(part => {
        const group = anatomicalGroups[part.slug];
        const value = categories.find(item => item.id === group)?.value;
        const appearance = muscleAppearance(value, dark);
        return <MaterialPattern key={part.slug} id={`${prefix}-${part.slug}`} kind={materialKind(appearance.label)} dark={dark} />;
      })}
    </Defs>
    {parts.map(part => {
      const group = anatomicalGroups[part.slug];
      const isSelected = !!group && !excluded.has(group) && selected === group;
      const appearance = muscleAppearance(categories.find(item => item.id === group)?.value, dark);
      return <G key={part.slug} opacity={group && excluded.has(group) ? 0.16 : 1}>
        {Object.values(part.path).flat().map((d, i) => <MusclePath key={i} d={d!}
          fill={`url(#${prefix}-${part.slug})`} stroke={isSelected ? colors.text : appearance.label === "Semidiós" ? "#C39850" : dark ? "#142219" : "#E7EDE6"}
          strokeWidth={isSelected ? 3.5 : 1.2}
          onSelect={group ? () => onSelect(group) : undefined}
        />)}
      </G>;
    })}
  </Svg>;
}

export function BodyMap({ categories, sex }: { categories: MuscleScore[]; sex?: string }) {
  const { t, locale } = useLanguage();
  const number = (value: number) => (presentationPoints(value) ?? 0).toLocaleString(locale, { maximumFractionDigits: 1 });
  const { colors, dark } = useTheme();
  const [selected, setSelected] = useState<Muscle | null>(null);
  // An exclusion set means every group starts selected, including newly valued groups.
  const [excluded, setExcluded] = useState<Set<Muscle>>(() => new Set());
  const [width, setWidth] = useState(0);
  const [bodySide, setBodySide] = useState<"front" | "back">("front");
  const scored = categories.filter(item => hasMuscleScore(item.value));
  const current = categories.find(item => item.id === selected);
  const appearance = muscleAppearance(current?.value, dark);
  const wide = width >= 740;
  // Two anatomical figures need substantially more than a narrow phone card.
  const singleBody = width > 0 && width < 620;
  const stage = dark ? "#111D18" : "#F4F6F1";
  const bands = strengthBands;
  const activeCount = categories.filter(category => !excluded.has(category.id)).length;
  const select = (id: Muscle) => {
    setExcluded(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setSelected(id);
  };

  return <Card style={{ padding: 0, overflow: "hidden" }}>
    <View testID="body-map" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ width: "100%", maxWidth: 1080, alignSelf: "center", padding: wide ? 28 : 18, gap: 20 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Txt size={10} muted weight="600" style={{ letterSpacing: 1.5 }}>MAPA MUSCULAR</Txt>
        <View style={{ backgroundColor: colors.accentSoft, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 10 }}>
          <Txt size={11} weight="600">{t("{n}/{total} grupos", { n: scored.length, total: categories.length })}</Txt>
        </View>
      </Row>
      <Txt size={24} weight="600" style={{ letterSpacing: -0.8, marginTop: -12 }}>Tu mapa de fuerza</Txt>
      <Txt size={13} muted>Tus mejores marcas, representadas por materiales de fuerza.</Txt>
      <Row style={{ flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
        <Txt size={12} muted accessibilityLiveRegion="polite">{t("{n}/{total} grupos seleccionados", { n: activeCount, total: categories.length })}</Txt>
        <Row style={{ gap: 8 }}>
          {([{ label: "Todos", all: true }, { label: "Ninguno", all: false }] as const).map(action => <Pressable key={action.label} accessibilityRole="button" accessibilityLabel={t(action.all ? "Seleccionar todos los grupos" : "Deseleccionar todos los grupos")} onPress={() => { setExcluded(new Set(action.all ? [] : categories.map(category => category.id))); setSelected(null); }} style={{ minHeight: 44, paddingHorizontal: 10, justifyContent: "center", borderRadius: 10, backgroundColor: colors.accentSoft }}><Txt size={12} weight="600">{action.label}</Txt></Pressable>)}
        </Row>
      </Row>
      <View style={{ flexDirection: wide ? "row" : "column", gap: 24 }}>
        <View style={{ flex: wide ? 1 : undefined, backgroundColor: stage, borderRadius: 18, padding: 12, gap: 8 }}>
          {singleBody && <Row style={{ justifyContent: "center", gap: 8 }}>
            {(["front", "back"] as const).map(side => <Pressable key={side} accessibilityRole="button" accessibilityLabel={t(side === "front" ? "Ver cuerpo frontal" : "Ver cuerpo posterior")} accessibilityState={{ selected: bodySide === side }} onPress={() => setBodySide(side)} style={{ minHeight: 44, paddingHorizontal: 10, justifyContent: "center", borderBottomWidth: 2, borderBottomColor: bodySide === side ? colors.accent : "transparent" }}>
              <Txt size={11} weight="600" muted={bodySide !== side}>{side === "front" ? "Frontal" : "Posterior"}</Txt>
            </Pressable>)}
          </Row>}
          <Row style={{ gap: 4, justifyContent: "center" }}>
            {(singleBody ? [bodySide] : ["front", "back"] as const).map(side => <View key={side} style={{ flex: 1, alignItems: "center", gap: 8 }}>
              {!singleBody && <Txt size={10} muted weight="600" style={{ letterSpacing: 1.8 }}>{side === "front" ? "FRONTAL" : "POSTERIOR"}</Txt>}
              <View style={{ width: "100%", height: singleBody ? Math.min(480, Math.max(380, (width - 40) * 1.14)) : wide ? 400 : Math.min(410, Math.max(250, (width - 66) * 0.98)) }}>
                <Anatomy side={side} female={sex === "female"} categories={categories} selected={selected} excluded={excluded} onSelect={select} />
              </View>
            </View>)}
          </Row>
          <Row style={{ justifyContent: "center", gap: 6, paddingVertical: 4 }}><Icon name="mouse-pointer" size={12} color={colors.muted} /><Txt size={11} muted>{current ? `${t(current.name)} · ${hasMuscleScore(current.value) ? number(current.value) + " pts" : "—"} · ${t(appearance.label)}` : "Selecciona un músculo"}</Txt></Row>
          {!wide && <View style={{ gap: 8, paddingTop: 8 }}>
            <View accessibilityLabel="Escala de materiales de A-Points" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              {bands.map(band => <View key={band.label} style={{ flex: 1, alignItems: "center", gap: 4 }}><MaterialSwatch label={band.label} size={24} /><Txt size={8} muted style={{ textAlign: "center" }}>{band.label}</Txt></View>)}
            </View>
            <Txt size={10} muted style={{ textAlign: "center" }}>Selecciona un músculo para ver su nivel</Txt>
          </View>}
        </View>
        <View style={{ width: wide ? 280 : undefined, gap: 16 }}>
          <View accessibilityLiveRegion="polite" testID="muscle-detail" style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 18, gap: 10, minHeight: 144 }}>
            {current ? <>
              <Row style={{ justifyContent: "space-between" }}><Txt weight="600" size={19}>{current.name}</Txt><Pressable accessibilityRole="button" accessibilityLabel={t("Cerrar detalle muscular")} onPress={() => setSelected(null)} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}><Icon name="x" size={17} /></Pressable></Row>
              {excluded.has(current.id) && <Txt size={12} muted>Desactivado en el mapa. Vuelve a tocarlo para seleccionarlo.</Txt>}
              <Row><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: appearance.color }} /><Txt size={13} weight="600">{appearance.label}</Txt></Row>
              {!!appearance.material && <Txt size={11} muted>{appearance.material}</Txt>}
              <Txt size={28} weight="600">{hasMuscleScore(current.value) ? `${number(current.value)} pts` : "Sin valorar"}</Txt>
              {current.exerciseName && current.load !== undefined && current.maximum !== undefined ? <>
                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 2 }} />
                <Txt size={12} muted>MARCA DE REFERENCIA</Txt>
                <Txt translate={false} size={14} weight="600">{current.exerciseName}</Txt>
                <Txt size={14}>{current.load.toLocaleString(locale, { maximumFractionDigits: 1 })} kg × {current.reps} rep</Txt>
                <Txt size={12} muted>{t(current.body ? current.body === "subtract" ? "Carga de cálculo (incluye peso corporal menos asistencia)." : "Carga de cálculo (incluye peso corporal y lastre)." : "Carga de cálculo (incluye barra, si corresponde).")}</Txt>
                <Txt size={12} muted>{t("1RM estimado: {weight} kg{date}", { weight: current.maximum.toLocaleString(locale, { maximumFractionDigits: 1 }), date: current.date ? " · " + new Date(current.date).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) : "" })}</Txt>
                {current.reps !== undefined && current.reps > 10 && <Txt size={11} muted>Estimación limitada a 10 repeticiones.</Txt>}
                {current.kind === "analogy" && <Txt size={11} muted>≈ Equivalencia estimada de Akhyles.</Txt>}
              </> : <Txt muted size={12}>{hasMuscleScore(current.value) ? "Basado en tu mejor puntuación histórica." : "Completa un ejercicio de este grupo con carga y repeticiones, registrando también tu sexo y peso corporal en la sesión."}</Txt>}
            </> : <>
              <Icon name={scored.length ? "activity" : "crosshair"} size={22} />
              <Txt weight="600" size={17}>{scored.length ? "Cada material cuenta una marca" : "Tu mapa empieza contigo"}</Txt>
              <Txt muted size={13}>{scored.length ? "Selecciona un grupo para ver sus puntos y el peso levantado que los respalda." : "Las zonas se colorearán al registrar marcas válidas. Para calcularlas necesitamos el sexo y el peso corporal de esa sesión; el historial sin esos datos no se puede valorar."}</Txt>
            </>}
          </View>
          {wide && <View style={{ gap: 10 }}>
            <Txt size={10} muted weight="600" style={{ letterSpacing: 1.5 }}>ESCALA DE A-POINTS</Txt>
            {bands.map(band => <Row key={band.label} style={{ justifyContent: "space-between", gap: 8 }}><Row style={{ gap: 10 }}><MaterialSwatch label={band.label} size={34} /><View><Txt size={12}>{band.label}</Txt><Txt size={10} muted>{band.material}</Txt></View></Row><Txt size={11} muted>{band.range}</Txt></Row>)}
          </View>}
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: colors.border }} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {categories.map(category => {
          const look = muscleAppearance(category.value, dark);
          return <Pressable key={category.id} accessibilityRole="checkbox" accessibilityLabel={t("{name}: {score}. {level}", { name: t(category.name), score: hasMuscleScore(category.value) ? t("{n} puntos", { n: number(category.value) }) : t("Sin datos"), level: t(look.label) })} accessibilityState={{ checked: !excluded.has(category.id) }} aria-checked={!excluded.has(category.id)} onPress={() => select(category.id)}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 7, minHeight: 44, paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, borderColor: !excluded.has(category.id) ? colors.accent : colors.border, backgroundColor: !excluded.has(category.id) ? colors.accentSoft : "transparent", opacity: pressed ? 0.65 : 1 })}>
            <Icon name={!excluded.has(category.id) ? "check-square" : "square"} size={14} color={colors.muted} />
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: look.color }} />
            <Txt size={12} weight={!excluded.has(category.id) ? "600" : "400"}>{category.name}</Txt>
            <Txt size={11} muted>{hasMuscleScore(category.value) ? number(category.value) : "—"}</Txt>
          </Pressable>;
        })}
      </View>
      <Txt muted size={11}>Nivel orientativo de Akhyles, ajustado por sexo y peso corporal. Equivalencias beta; no son percentiles. Ambos lados muestran la misma valoración del grupo.</Txt>
    </View>
  </Card>;
}
