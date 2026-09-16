import { messages } from "../content/es";
import { View } from "react-native";
import { Profile } from "../types";
import { Choice, Field, Notice, Row, Txt } from "./ui";
import { BirthDatePicker } from "./BirthDatePicker";
export function ProfileFields({
  profile,
  change,
  errors = {},
  showIdentity = true,
}: {
  profile: Profile;
  change: (patch: Partial<Profile>) => void;
  errors?: Record<string, string>;
  showIdentity?: boolean;
}) {
  return (
    <View style={{ gap: 18 }}>
      {showIdentity && <>
        <Field label="Nombre" value={profile.name ?? ""} onChangeText={name => change({ name })} error={errors.name} />
        <Field label="Nombre de usuario (@)" value={profile.handle ?? ""} onChangeText={handle => change({ handle: handle.replace(/^@/, "") })} error={errors.handle} />
        <Txt muted>Tu @ es único en Comunidad y se sincroniza con tu perfil.</Txt>
      </>}
      <Txt weight="600" size={13}>
        {messages.ProfileFields.sexoBiologico}
      </Txt>
      <Row>
        <View style={{ flex: 1 }}>
          <Choice
            title={messages.ProfileFields.hombre}
            selected={profile.sex === "male"}
            onPress={() => change({ sex: "male" })}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Choice
            title={messages.ProfileFields.mujer}
            selected={profile.sex === "female"}
            onPress={() => change({ sex: "female" })}
          />
        </View>
      </Row>
      {errors.sex && <Notice error>{errors.sex}</Notice>}
      <Row style={{ alignItems: "flex-start" }}>
        <BirthDatePicker value={profile.birthDate} error={errors.birthDate} onChange={(birthDate) => change({ birthDate })} />
        <Field
          label={messages.ProfileFields.altura}
          value={profile.height}
          numeric
          suffix={messages.ProfileFields.cm}
          error={errors.height}
          onChangeText={(height) => change({ height })}
        />
      </Row>
      <Field
        label={messages.ProfileFields.pesoCorporal}
        value={profile.weight}
        numeric
        suffix={messages.ProfileFields.kg}
        placeholder={messages.ProfileFields.porEjemplo765}
        error={errors.weight}
        onChangeText={(weight) => change({ weight })}
      />
      <Choice
        multiple
        title="Recordarme actualizar el peso corporal"
        description="Recibirás un recordatorio semanal para registrar tu peso cuando lo actives."
        selected={!!profile.weightReminder}
        onPress={() => change({ weightReminder: !profile.weightReminder })}
      />
    </View>
  );
}
