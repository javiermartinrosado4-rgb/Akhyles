import { messages } from "../content/es";
import { translate } from "../i18n/translate";
import { Profile, Range } from "../types";
export const number = (value: string) =>
  value.trim() === "" ? NaN : Number(value.replace(",", "."));
export const validWeight = (value: number) =>
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 1000;
export const validRange = (range: Range) =>
  Array.isArray(range) && range.length === 2 &&
  range.every(Number.isInteger) &&
  range[0] >= 1 &&
  range[1] >= range[0] &&
  range[1] <= 30;
export function profileErrors(p: Profile): Record<string, string> {
  const errors: Record<string, string> = {};
  if ((p.name?.trim().length ?? 0) > 60) errors.name = "Usa un nombre de hasta 60 caracteres.";
  if (p.handle && !/^[a-zA-Z0-9_]{3,24}$/.test(p.handle)) errors.handle = "Usa de 3 a 24 letras, números o guiones bajos, sin @.";
  if (
    p.trainingDays !== undefined &&
    (new Set(p.trainingDays).size !== p.days ||
      p.trainingDays.some((day) => !Number.isInteger(day) || day < 1 || day > 7))
  )
    errors.trainingDays = translate("Selecciona exactamente {days} días de la semana.", { days: p.days });
  if (!p.sex) errors.sex = messages.validation.seleccionaUnaOpcion;
  const birthDate = p.birthDate?.trim() ?? "";
  if (birthDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
    const parsed = match ? new Date(`${birthDate}T12:00:00Z`) : undefined;
    const years = parsed ? (Date.now() - parsed.getTime()) / 31_556_952_000 : NaN;
    if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== birthDate || years < 13 || years > 100)
      errors.birthDate = "Introduce una fecha de nacimiento válida (entre 13 y 100 años).";
  } else if (!Number.isInteger(number(p.age)) || number(p.age) < 13 || number(p.age) > 100) {
    errors.birthDate = "Introduce tu fecha de nacimiento.";
  }
  if (
    !Number.isFinite(number(p.height)) ||
    number(p.height) < 100 ||
    number(p.height) > 250
  )
    errors.height = messages.validation.introduceUnaAlturaEntre100Y250;
  if (
    !Number.isFinite(number(p.weight)) ||
    number(p.weight) < 30 ||
    number(p.weight) > 350
  )
    errors.weight = messages.validation.introduceUnPesoEntre30Y350;
  return errors;
}
