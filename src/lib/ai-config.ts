"use client";

import { useEffect, useState } from "react";
import { AIConfig, AIConfigSchema } from "./types";

const CONFIG_KEY = "aiConfig";

const defaultConfig: AIConfig = {
  provider: 'google',
  google: {
    apiKey: undefined,
    model: 'gemini-1.5-flash-latest',
  },
};

/**
 * Custom hook for managing AI configuration in localStorage.
 * This hook is client-side only.
 */
export function useAIConfig() {
  const [config, setConfig] = useState<AIConfig>(() => {
    if (typeof window === "undefined") {
      return defaultConfig;
    }
    try {
      const storedConfig = window.localStorage.getItem(CONFIG_KEY);
      if (storedConfig) {
        const parsed = AIConfigSchema.safeParse(JSON.parse(storedConfig));
        if (parsed.success) {
          return parsed.data;
        }
      }
    } catch (error) {
      console.error("Failed to parse AI config from localStorage", error);
    }
    return defaultConfig;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      } catch (error) {
        console.error("Failed to save AI config to localStorage", error);
      }
    }
  }, [config]);

  return [config, setConfig] as const;
}
