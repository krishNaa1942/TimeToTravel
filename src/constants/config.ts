/**
 * App Configuration Constants
 */

import { Platform } from "react-native";
import Constants from "expo-constants";

const API_PORT = 5001;
const DEFAULT_APP_WEB_URL = "https://timetravel.app";

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

function isPrivateHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "10.0.2.2" ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
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

function resolveDevelopmentApiUrl(
  candidateUrl: string,
  expoHost: string | null,
): string {
  const candidateHost = extractHost(candidateUrl);

  if (!candidateHost || !isPrivateHost(candidateHost)) {
    return candidateUrl;
  }

  if (expoHost && candidateHost !== expoHost) {
    return buildApiUrl(expoHost);
  }

  return candidateUrl;
}

const getApiUrl = (): string => {
  const expoHost = getExpoHost();

  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envApiUrl) {
    return resolveDevelopmentApiUrl(envApiUrl, expoHost);
  }

  const extraApiUrl = Constants.expoConfig?.extra?.apiUrl;
  if (extraApiUrl) {
    return resolveDevelopmentApiUrl(extraApiUrl, expoHost);
  }

  const lanIp = process.env.LAN_IP;
  if (lanIp) {
    if (expoHost && lanIp !== expoHost && isPrivateHost(lanIp)) {
      return buildApiUrl(expoHost);
    }

    return buildApiUrl(lanIp);
  }

  if (Platform.OS === "web") {
    return "/api";
  }

  if (Platform.OS === "android") {
    if (Constants.isDevice) {
      if (expoHost) {
        return buildApiUrl(expoHost);
      }
    }

    return buildApiUrl("10.0.2.2");
  }

  return buildApiUrl(expoHost || "127.0.0.1");
};

const getAppWebUrl = (): string => {
  const envAppUrl = process.env.EXPO_PUBLIC_APP_URL;
  if (envAppUrl) {
    return envAppUrl.replace(/\/+$/, "");
  }

  const extraAppUrl = Constants.expoConfig?.extra?.appUrl;
  if (extraAppUrl) {
    return String(extraAppUrl).replace(/\/+$/, "");
  }

  return DEFAULT_APP_WEB_URL;
};

export const API_BASE_URL = getApiUrl();
export const APP_WEB_URL = getAppWebUrl();

export const API_TIMEOUT = 15000; // 15 seconds

export const APP_NAME = "Time To Travel";
export const APP_VERSION = "1.0.0";

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;

// Chat
export const MAX_MESSAGE_LENGTH = 2000;
