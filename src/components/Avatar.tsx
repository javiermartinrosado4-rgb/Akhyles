import { Image, View } from "react-native";
import { useState } from "react";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import { avatars, validAvatarPhoto } from "../data/avatars";
import { Notice } from "./ui";
import { CommunityPhoto } from "./CommunityPhoto";
import { useLanguage } from '../i18n';

export function Avatar({ id, size = 68 }: { id?: string; size?: number }) {
  const { t } = useLanguage();
  if (validAvatarPhoto(id)) return <Image source={{ uri: id }} accessibilityLabel={t('Foto de perfil')} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  const avatar = avatars.find(a => a.id === id) ?? avatars[0];
  return <Svg width={size} height={size} viewBox="0 0 80 80" accessibilityRole="image" accessibilityLabel={`Avatar ${t(avatar.name)}`}>
    <Circle cx={40} cy={40} r={40} fill={avatar.color} />
    <Circle cx={40} cy={40} r={31} fill="none" stroke="#FFFFFF" strokeOpacity={0.3} />
    <SvgText x={40} y={53} fontSize={39} fill="#FFFFFF" textAnchor="middle">{avatar.symbol}</SvgText>
  </Svg>;
}
export function AvatarPhotoPicker({ onChange, children }: { onChange: (id: string) => void; children: React.ReactNode }) {
  const [error, setError] = useState("");
  return <View style={{ gap: 6 }}>
    <CommunityPhoto label="Cambiar foto de perfil" renderTrigger={children} onError={setError} onSelect={photo => {
      if (!validAvatarPhoto(photo)) { setError("La foto de perfil debe ocupar menos de 2 MB tras optimizarla."); return; }
      setError(""); onChange(photo);
    }} />
    {!!error && <Notice error>{error}</Notice>}
  </View>;
}
