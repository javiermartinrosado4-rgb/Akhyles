import { createContext, createElement, ReactNode, useContext } from "react";
import { useStore } from "../state/Store";
import { palettes } from "./palettes";
const ThemeContext = createContext({ colors: palettes.dark, dark: true });
export function ThemeProvider({ children }: { children: ReactNode }) {
  return createElement(
    ThemeContext.Provider,
    { value: { colors: palettes.dark, dark: true } },
    children,
  );
}
export function useTheme() {
  return useContext(ThemeContext);
}
