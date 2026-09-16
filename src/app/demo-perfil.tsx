import React, { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Loading, Notice, Page } from "../components/ui";
import { useStore } from "../state/Store";
import { useCommunity } from "../state/Community";
import { createAdvancedMachineDemoScenario, createDemoScenario } from "../data/demoScenarios";
import { archiveState } from "../storage/repository";

/** Development-only demo. Previous local data is archived before replacing it. */
export default function DemoProfile() {
  const { ready, persist, getState } = useStore();
  const { ready: socialReady, authenticate } = useCommunity();
  const { scenario, social } = useLocalSearchParams<{ scenario?: string; social?: string }>();
  const seeded = useRef(false);
  const [error, setError] = useState("");
  const allowed = __DEV__ && Platform.OS === "web" && typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  useEffect(() => {
    if (!allowed || !ready || !socialReady || seeded.current) return;
    seeded.current = true;
    const female = scenario === "female";
    const advancedMachines = scenario === "advanced-machines";
    void (async () => {
      const previous = getState();
      if (previous.completed || previous.history.length) await archiveState(previous);
      const demo = advancedMachines ? createAdvancedMachineDemoScenario() : createDemoScenario(female);
      await persist(() => demo);
      if (social === "1") await authenticate(false, { handle: demo.profile.handle, password: "Akhyles-demo-local-2026" });
      router.replace(social === "1" ? "/community" : "/progress");
    })().catch(error => setError(error.message));
  }, [allowed, ready, socialReady, persist, getState, scenario, social, authenticate]);
  if (!allowed || error) return <Page><Notice error>{error || "Los perfiles de prueba solo están disponibles en desarrollo local."}</Notice><Button label="Volver" onPress={() => router.replace("/")} /></Page>;
  return <Loading />;
}
