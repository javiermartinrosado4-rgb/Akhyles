import { messages } from "../content/es";
import { useState } from "react";
import { Redirect, router } from "expo-router";
import { View } from "react-native";
import { Button, Heading, Notice, Page, Row, Txt } from "../components/ui";
import { ProfileFields } from "../components/ProfileFields";
import { TrainingPreferences } from "../components/TrainingPreferences";
import {
  DaysSelect,
  LevelSelect,
  PrioritySelect,
} from "../components/Selections";
import { useStore } from "../state/Store";
import { useTheme } from "../theme";
import { Profile } from "../types";
import { profileErrors } from "../logic/validation";
import { generateRoutine } from "../logic/routine";
import { demoProfile } from "../data/options";
import { LanguageSelector } from "../components/LanguageSelector";
import { StrengthReferences } from "../components/StrengthReferences";
import { number } from "../logic/validation";
const steps = [
  [
    messages.Onboarding.empecemosPorTi,
    messages.Onboarding.estosDatosCompletanTuPerfilElPorcentaje,
  ],
  [
    messages.Onboarding.tuPuntoDePartida,
    messages.Onboarding.eligeLoQueMejorDescribeTuExperiencia,
  ],
  [
    messages.Onboarding.hazleEspacioATuRutina,
    messages.Onboarding.cuantosDiasPuedesEntrenarNormalmenteCadaSemana,
  ],
  [
    messages.Onboarding.unPocoMasDeAtencion,
    messages.Onboarding.daremosUnProtagonismoModeradoAEsteMusculo,
  ],
];
export default function Onboarding() {
  const { state, update } = useStore();
  const { colors } = useTheme();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const step = Math.min(3, state.onboardingStep);
  const profile = state.profile;
  const change = (patch: Partial<Profile>) => {
    update((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
    setErrors({});
  };
  if (state.completed) return <Redirect href="/routine" />;
  const next = () => {
    const found = profileErrors(profile);
    if (Object.keys(found).length) {
      setErrors(found);
      const personalFields = ["sex", "birthDate", "height", "weight", "name", "handle"];
      if (step !== 0 && Object.keys(found).some((key) => personalFields.includes(key)))
        update((s) => ({ ...s, onboardingStep: 0 }));
      return;
    }
    if (step < 3) update((s) => ({ ...s, onboardingStep: step + 1 }));
    else {
      update((s) => ({
        ...s,
        completed: true,
        programRevision: 6,
        routine: generateRoutine(s.profile, s.preferences),
      }));
      router.replace("/today");
    }
  };
  return (
    <Page>
      <Row style={{ justifyContent: "space-between" }}>
        <Button
          label={messages.Onboarding.atras}
          compact
          variant="ghost"
          icon="arrow-left"
          onPress={() =>
            step
              ? update((s) => ({ ...s, onboardingStep: step - 1 }))
              : router.replace("/")
          }
        />
        <Txt muted size={12}>
          {messages.Onboarding.tuPlan}
          {step + 1}
          {messages.Onboarding.de4}
        </Txt>
      </Row>
      <Row>
        {steps.map((_, i) => (
          <View
            key={i}
            style={{
              height: 4,
              borderRadius: 2,
              flex: 1,
              backgroundColor: i <= step ? colors.accent : colors.border,
            }}
          />
        ))}
      </Row>
      <Heading title={steps[step][0]} subtitle={steps[step][1]} />
      {step === 0 && (
        <>
          <LanguageSelector />
          <ProfileFields profile={profile} change={change} errors={errors} />
          <Button
            label={messages.Onboarding.rellenarConDatosDeEjemplo}
            variant="ghost"
            compact
            onPress={() => change(demoProfile)}
          />
        </>
      )}
      {step === 1 && <LevelSelect profile={profile} change={change} />}
      {step === 2 && <DaysSelect profile={profile} change={change} />}
      {step === 2 && errors.trainingDays && <Notice error>{errors.trainingDays}</Notice>}
      {step === 3 && <><PrioritySelect profile={profile} change={change} /><TrainingPreferences profile={profile} change={change} />
        {profile.level === "advanced" && <>
          <Heading title="Haz tus estadísticas más precisas" subtitle="Como atleta avanzado, te recomendamos configurar tus referencias de fuerza. Así tus A-Points reflejarán también básicos que quizá no estén en tu rutina actual." />
          <StrengthReferences value={state.strengthReferences ?? []} bodyWeight={number(profile.weight)} sex={profile.sex} onChange={strengthReferences => update(s => ({ ...s, strengthReferences }))} />
          <Txt muted size={12}>Es opcional: puedes continuar sin añadirlas y configurarlas más tarde desde Perfil.</Txt>
        </>}
      </>}
      {!!Object.keys(errors).length && (
        <Notice error>
          {messages.Onboarding.revisaLosCamposIndicadosParaContinuar}
        </Notice>
      )}
      <Button
        label={
          step === 3
            ? messages.Onboarding.generarMiRutina
            : messages.Onboarding.continuar
        }
        icon="arrow-right"
        onPress={next}
      />
      <Txt size={12} muted style={{ textAlign: "center" }}>
        {messages.Onboarding.puedesVolverAtrasTusRespuestasSeConservan}
      </Txt>
    </Page>
  );
}
