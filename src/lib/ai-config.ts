"use client";

import { useEffect, useState, useCallback } from "react";
import { AIConfig, AIConfigSchema } from "./types";

const CONFIG_KEY = "aiConfig";

// This file is no longer the primary source of truth for API keys,
// as the key is now managed via .env and localStorage for OpenAI.
// However, we keep the hook structure in case other client-side
// configurations are needed in the future.

const defaultConfig: AIConfig = {
  provider: 'openai',
  openai: {
    apiKey: undefined,
    model: 'gpt-4o',
  }
};

/**
 * Custom hook for managing AI configuration in localStorage.
 * This hook is client-side only.
 * @deprecated The configuration is now primarily handled server-side via .env. This hook is kept for potential future use but is not actively controlling the AI provider.
 */
export function useAIConfig(): [AIConfig, (config: AIConfig | ((prev: AIConfig) => AIConfig)) => void] {
  const [config, setConfig] = useState<AIConfig>(() => {
    if (typeof window === "undefined") {
      return defaultConfig;
    }
    try {
      // We only manage the OpenAI key here now for display/UI purposes.
      const openAIKey = window.localStorage.getItem("OPENAI_API_KEY");
      const storedConfig: AIConfig = {
        provider: 'openai',
        openai: {
          apiKey: openAIKey || undefined,
          model: 'gpt-4o'
        }
      };
      return storedConfig;

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
          if (updatedConfig.openai?.apiKey) {
            window.localStorage.setItem("OPENAI_API_KEY", updatedConfig.openai.apiKey);
          }
        } catch (error) {
          console.error("Failed to save AI config to localStorage", error);
        }
      }
      return updatedConfig;
    });
  }, []);


  return [config, saveConfig];
}
