"use client";

import { useEffect, useState, useCallback } from "react";
import { AIConfig, AIConfigSchema } from "./types";

const CONFIG_KEY = "aiConfig";

const defaultConfig: AIConfig = {
  provider: 'google',
  google: {
    apiKey: undefined,
    model: 'gemini-1.5-flash-latest',
  },
  openai: {
    apiKey: undefined,
    model: 'gpt-4o',
  }
};

/**
 * Custom hook for managing AI configuration in localStorage.
 * This hook is client-side only.
 */
export function useAIConfig(): [AIConfig, (config: AIConfig | ((prev: AIConfig) => AIConfig)) => void] {
  const [config, setConfig] = useState<AIConfig>(() => {
    if (typeof window === "undefined") {
      return defaultConfig;
    }
    try {
      const storedConfig = window.localStorage.getItem(CONFIG_KEY);
      if (storedConfig) {
        const parsed = AIConfigSchema.safeParse(JSON.parse(storedConfig));
        if (parsed.success) {
          // Merge with default to ensure all keys are present
          return { 
            ...defaultConfig, 
            ...parsed.data,
            google: { ...defaultConfig.google, ...parsed.data.google },
            openai: { ...defaultConfig.openai, ...parsed.data.openai },
          };
        }
      }
    } catch (error) {
      console.error("Failed to parse AI config from localStorage", error);
    }
    return defaultConfig;
  });

  const saveConfig = useCallback((newConfig: AIConfig | ((prev: AIConfig) => AIConfig)) => {
    setConfig(prevConfig => {
      const updatedConfig = typeof newConfig === 'function' ? newConfig(prevConfig) : newConfig;
      if (typeof window !== "undefined") {
        try {
          // Before saving, ensure the config is valid
          const validatedConfig = AIConfigSchema.parse(updatedConfig);
          window.localStorage.setItem(CONFIG_KEY, JSON.stringify(validatedConfig));
        } catch (error) {
          console.error("Failed to save AI config to localStorage", error);
        }
      }
      return updatedConfig;
    });
  }, []);


  return [config, saveConfig];
}
