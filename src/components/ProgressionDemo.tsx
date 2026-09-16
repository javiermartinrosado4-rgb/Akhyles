import { useLanguage } from "../i18n";
import { messages } from "../content/es";
import { useState } from "react";
import { Button, Card, Field, Notice, Pill, Row, Txt } from "./ui";
import { progression } from "../logic/progression";
import { number, validWeight } from "../logic/validation";
import { confirmWeight } from "../logic/workout";
import { useStore } from "../state/Store";
export function ProgressionDemo() {
  const { t, locale } = useLanguage();
  const { update } = useStore();
  const [reps, setReps] = useState("7");
  const [next, setNext] = useState("42");
  const [saved, setSaved] = useState(false);
  const result = progression(
    "compound",
    [6, 8],
    [
      { weight: 40, reps: 8 },
      { weight: 40, reps: number(reps) },
    ],
  );
  return (
    <Card>
      <Pill>{messages.ProgressionDemo.ejemploInteractivoDatosSimulados}</Pill>
      <Txt weight="600">
        {messages.ProgressionDemo.asiFuncionaLaDobleProgresion}
      </Txt>
      <Txt muted size={13}>
        {messages.ProgressionDemo.pressTumbadoEnMaquina26840}
      </Txt>
      <Row>
        <Txt style={{ flex: 1 }}>{messages.ProgressionDemo.serie18Rep}</Txt>
        <Field
          label={messages.ProgressionDemo.repeticionesDeLaSerie2}
          value={reps}
          onChangeText={(v) => {
            setReps(v);
            setSaved(false);
          }}
          numeric
        />
      </Row>
      <Notice>{result.increase ? t("Máximo alcanzado en todas las series. Próxima sesión: {weight} kg (+{percent}%). Se prepara automáticamente; puedes modificar el peso dentro de cada serie.", { weight: result.suggested.toLocaleString(locale), percent: result.percent.toLocaleString(locale) }) : t(result.message)}</Notice>
      {result.increase && (
        <>
          <Txt weight="600">
            {t("Sugerencia: {weight} kg", { weight: result.suggested.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}
          </Txt>
          <Field
            label={messages.ProgressionDemo.pesoQueQuieresConfirmar}
            value={next}
            onChangeText={(v) => {
              setNext(v);
              setSaved(false);
            }}
            numeric
            suffix={messages.ProgressionDemo.kg2}
          />
          <Txt size={12} muted>
            {messages.ProgressionDemo.puedesUsarOtraCargaDisponibleEnTu}
          </Txt>
          <Button
            label={
              saved
                ? messages.ProgressionDemo.pesoDeReferenciaGuardado
                : messages.ProgressionDemo.confirmarPesoDeEjemplo
            }
            disabled={saved || !validWeight(number(next))}
            variant="secondary"
            onPress={() => {
              update((s) => confirmWeight(s, "chest-press", number(next)));
              setSaved(true);
            }}
          />
        </>
      )}
      <Txt size={12} muted>
        {messages.ProgressionDemo.prueba8Y7MantenerPrueba8}
      </Txt>
    </Card>
  );
}
