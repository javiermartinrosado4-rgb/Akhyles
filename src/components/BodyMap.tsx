import { useLanguage } from "../i18n";
import { useId, useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Defs, G, RadialGradient, Stop } from "react-native-svg";
import { useTheme } from "../theme";
import { Muscle } from "../types";
import { anatomicalGroups, hasMuscleScore, muscleAppearance, MuscleScore, strengthBands } from "../logic/bodyMap";
import { Card, Icon, Row, Txt } from "./ui";
import { bodyFront } from "./anatomy/bodyFront";
import { bodyBack } from "./anatomy/bodyBack";
import { bodyFemaleFront } from "./anatomy/bodyFemaleFront";
import { bodyFemaleBack } from "./anatomy/bodyFemaleBack";
import MusclePath from "./anatomy/MusclePath";



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
        const color = muscleAppearance(value, dark).color;
        return <RadialGradient key={part.slug} id={`${prefix}-${part.slug}`} cx="38%" cy="28%" rx="80%" ry="85%">
          <Stop offset="0" stopColor={color} />
          <Stop offset="0.55" stopColor={color} />
          <Stop offset="1" stopColor={color} stopOpacity={dark ? 0.55 : 0.7} />
        </RadialGradient>;
      })}
    </Defs>
    {parts.map(part => {
      const group = anatomicalGroups[part.slug];
      const isSelected = !!group && !excluded.has(group) && selected === group;
      return <G key={part.slug} opacity={group && excluded.has(group) ? 0.16 : 1}>
        {Object.values(part.path).flat().map((d, i) => <MusclePath key={i} d={d!}
          fill={`url(#${prefix}-${part.slug})`} stroke={isSelected ? colors.text : dark ? "#192A22" : "#F6F8F3"}
          strokeWidth={isSelected ? 3.5 : 1.8}
          onSelect={group ? () => onSelect(group) : undefined}
        />)}
      </G>;
    })}
  </Svg>;
}

export function BodyMap({ categories, sex }: { categories: MuscleScore[]; sex?: string }) {
  const { t, locale } = useLanguage();
  const number = (value: number) => value.toLocaleString(locale, { maximumFractionDigits: 1 });
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
  const compact = width > 0 && width < 340;
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
      <Txt size={13} muted>Tus mejores marcas, convertidas en un nivel de fuerza. Amarillo: menor nivel; morado: mayor nivel.</Txt>
      <Row style={{ flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
        <Txt size={12} muted accessibilityLiveRegion="polite">{t("{n}/{total} grupos seleccionados", { n: activeCount, total: categories.length })}</Txt>
        <Row style={{ gap: 8 }}>
          {([{ label: "Todos", all: true }, { label: "Ninguno", all: false }] as const).map(action => <Pressable key={action.label} accessibilityRole="button" accessibilityLabel={t(action.all ? "Seleccionar todos los grupos" : "Deseleccionar todos los grupos")} onPress={() => { setExcluded(new Set(action.all ? [] : categories.map(category => category.id))); setSelected(null); }} style={{ minHeight: 44, paddingHorizontal: 10, justifyContent: "center", borderRadius: 10, backgroundColor: colors.accentSoft }}><Txt size={12} weight="600">{action.label}</Txt></Pressable>)}
        </Row>
      </Row>
      <Txt size={12} muted>Toca el cuerpo o las casillas para activar o desactivar varios grupos. El nivel no cambia al filtrar.</Txt>
      <View style={{ flexDirection: wide ? "row" : "column", gap: 24 }}>
        <View style={{ flex: wide ? 1 : undefined, backgroundColor: stage, borderRadius: 18, padding: 12, gap: 8 }}>
          {compact && <Row style={{ justifyContent: "center", gap: 8 }}>
            {(["front", "back"] as const).map(side => <Pressable key={side} accessibilityRole="button" accessibilityLabel={t(side === "front" ? "Ver cuerpo frontal" : "Ver cuerpo posterior")} accessibilityState={{ selected: bodySide === side }} onPress={() => setBodySide(side)} style={{ minHeight: 44, paddingHorizontal: 10, justifyContent: "center", borderBottomWidth: 2, borderBottomColor: bodySide === side ? colors.accent : "transparent" }}>
              <Txt size={11} weight="600" muted={bodySide !== side}>{side === "front" ? "Frontal" : "Posterior"}</Txt>
            </Pressable>)}
          </Row>}
          <Row style={{ gap: 4, justifyContent: "center" }}>
            {(compact ? [bodySide] : ["front", "back"] as const).map(side => <View key={side} style={{ flex: 1, alignItems: "center", gap: 8 }}>
              {!compact && <Txt size={10} muted weight="600" style={{ letterSpacing: 1.8 }}>{side === "front" ? "FRONTAL" : "POSTERIOR"}</Txt>}
              <View style={{ width: "100%", height: compact ? 340 : wide ? 400 : Math.min(410, Math.max(250, (width - 66) * 0.98)) }}>
                <Anatomy side={side} female={sex === "female"} categories={categories} selected={selected} excluded={excluded} onSelect={select} />
              </View>
            </View>)}
          </Row>
          <Row style={{ justifyContent: "center", gap: 6, paddingVertical: 4 }}><Icon name="mouse-pointer" size={12} color={colors.muted} /><Txt size={11} muted>{current ? `${t(current.name)} · ${hasMuscleScore(current.value) ? number(current.value) + " pts" : t("Sin datos")} · ${t(appearance.label)}` : "Toca un músculo para explorarlo"}</Txt></Row>
          {!wide && <View style={{ gap: 8, paddingTop: 8 }}>
            <Row style={{ gap: 4, alignItems: "flex-start", flexWrap: "wrap" }}>
              {bands.map(band => <View key={band.label} style={{ flex: width < 270 ? undefined : 1, width: width < 270 ? "30%" : undefined, gap: 5, alignItems: "center" }}>
                <View style={{ height: 5, borderRadius: 3, backgroundColor: band.color, width: "100%" }} />
                <Txt size={9} muted>{band.label}</Txt>
                <Txt size={9} muted>{band.min === 1000 ? `${band.min.toLocaleString(locale)}+` : band.range}</Txt>
              </View>)}
            </Row>
            <Txt size={10} muted style={{ textAlign: "center" }}>A-Points · Gris: sin valoración</Txt>
          </View>}
        </View>
        <View style={{ width: wide ? 280 : undefined, gap: 16 }}>
          <View accessibilityLiveRegion="polite" testID="muscle-detail" style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 18, gap: 10, minHeight: 144 }}>
            {current ? <>
              <Row style={{ justifyContent: "space-between" }}><Txt weight="600" size={19}>{current.name}</Txt><Pressable accessibilityRole="button" accessibilityLabel={t("Cerrar detalle muscular")} onPress={() => setSelected(null)} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}><Icon name="x" size={17} /></Pressable></Row>
              {excluded.has(current.id) && <Txt size={12} muted>Desactivado en el mapa. Vuelve a tocarlo para seleccionarlo.</Txt>}
              <Row><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: appearance.color }} /><Txt size={13} weight="600">{appearance.label}</Txt></Row>
              <Txt size={28} weight="600">{hasMuscleScore(current.value) ? `${number(current.value)} pts` : "Sin valorar"}</Txt>
              {current.exerciseName && current.load !== undefined && current.maximum !== undefined ? <>
                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 2 }} />
                <Txt size={12} muted>MARCA DE REFERENCIA</Txt>
                <Txt translate={false} size={14} weight="600">{current.exerciseName}</Txt>
                <Txt size={14}>{number(current.load)} kg × {current.reps} rep</Txt>
                <Txt size={12} muted>{t(current.body ? current.body === "subtract" ? "Carga de cálculo (incluye peso corporal menos asistencia)." : "Carga de cálculo (incluye peso corporal y lastre)." : "Carga de cálculo (incluye barra, si corresponde).")}</Txt>
                <Txt size={12} muted>{t("1RM estimado: {weight} kg{date}", { weight: number(current.maximum), date: current.date ? " · " + new Date(current.date).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) : "" })}</Txt>
                {current.reps !== undefined && current.reps > 10 && <Txt size={11} muted>Estimación limitada a 10 repeticiones.</Txt>}
                {current.kind === "analogy" && <Txt size={11} muted>≈ Equivalencia estimada de Akhyles.</Txt>}
              </> : <Txt muted size={12}>{hasMuscleScore(current.value) ? "Basado en tu mejor puntuación histórica." : "Completa un ejercicio de este grupo con carga y repeticiones, registrando también tu sexo y peso corporal en la sesión."}</Txt>}
            </> : <>
              <Icon name={scored.length ? "activity" : "crosshair"} size={22} />
              <Txt weight="600" size={17}>{scored.length ? "Cada color cuenta una marca" : "Tu mapa empieza contigo"}</Txt>
              <Txt muted size={13}>{scored.length ? "Selecciona un grupo para ver sus puntos y el peso levantado que los respalda." : "Las zonas se colorearán al registrar marcas válidas. Para calcularlas necesitamos el sexo y el peso corporal de esa sesión; el historial sin esos datos no se puede valorar."}</Txt>
            </>}
          </View>
          {wide && <View style={{ gap: 10 }}>
            <Txt size={10} muted weight="600" style={{ letterSpacing: 1.5 }}>ESCALA DE A-POINTS</Txt>
            <Row style={{ gap: 3 }}>{bands.map(band => <View key={band.label} style={{ flex: 1, height: 6, backgroundColor: band.color, borderRadius: 3 }} />)}</Row>
            {bands.map(band => <Row key={band.label} style={{ justifyContent: "space-between", gap: 8 }}><Row style={{ gap: 8 }}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: band.color }} /><Txt size={12}>{band.label}</Txt></Row><Txt size={11} muted>{band.min === 1000 ? `${band.min.toLocaleString(locale)}+` : band.range}</Txt></Row>)}
            <Row style={{ gap: 8 }}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: muscleAppearance(undefined, dark).color }} /><Txt size={11} muted>Gris · sin valoración</Txt></Row>
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
