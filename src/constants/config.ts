/**
 * App Configuration Constants
 */

import { Platform } from "react-native";
import Constants from "expo-constants";

const API_PORT = 5001;

function buildApiUrl(host: string): string {
  return `http://${host}:${API_PORT}/api`;
}

function extractHost(value: string | undefined | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.includes("://") ? trimmed : `http://${trimmed}`;

  try {
    const url = new URL(normalized);
    return url.hostname || null;
  } catch {
    const hostPart = trimmed.split(":")[0];
    return hostPart || null;
  }
}

function getExpoHost(): string | null {
  const hostCandidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoConfig?.debuggerHost,
    (Constants as any)?.manifest2?.debuggerHost,
    (Constants as any)?.manifest?.debuggerHost,
  ];

  for (const candidate of hostCandidates) {
    const host = extractHost(candidate);
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return host;
    }
  }

  return null;
}

const getApiUrl = (): string => {
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envApiUrl) {
    return envApiUrl;
  }

  const extraApiUrl = Constants.expoConfig?.extra?.apiUrl;
  if (extraApiUrl) {
    return extraApiUrl;
  }

  const lanIp = process.env.LAN_IP;
  if (lanIp) {
    return buildApiUrl(lanIp);
  }

  if (Platform.OS === "web") {
    return "/api";
  }

  if (Platform.OS === "android") {
    if (Constants.isDevice) {
      const expoHost = getExpoHost();
      if (expoHost) {
        return buildApiUrl(expoHost);
      }
    }

    return buildApiUrl("10.0.2.2");
  }

  const expoHost = getExpoHost();
  return buildApiUrl(expoHost || "127.0.0.1");
};

export const API_BASE_URL = getApiUrl();

export const API_TIMEOUT = 15000; // 15 seconds

export const APP_NAME = "Time To Travel";
export const APP_VERSION = "1.0.0";

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;

// Chat
export const MAX_MESSAGE_LENGTH = 2000;
