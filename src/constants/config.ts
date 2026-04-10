/**
 * App Configuration Constants
 */

import { Platform } from "react-native";

// Use localhost for web (same-origin avoids CORS cookie issues),
// LAN IP for native mobile (Expo Go / dev build).
// For mobile: Run `ipconfig getifaddr en0` (macOS) or `hostname -I` (Linux) to get your LAN IP
// and update the MOBILE_API_URL below.
const WEB_API_URL = "http://127.0.0.1:5001/api";
const MOBILE_API_URL = "http://192.168.31.111:5001/api"; // Update this to your machine's LAN IP

export const API_BASE_URL = Platform.OS === "web"
  ? WEB_API_URL
  : MOBILE_API_URL;

export const API_TIMEOUT = 15000; // 15 seconds

export const APP_NAME = "Time To Travel";
export const APP_VERSION = "1.0.0";

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;

// Chat
export const MAX_MESSAGE_LENGTH = 2000;
