const DEFAULT_API_URL = "http://localhost:3000";
const DEFAULT_CABLE_SUFFIX = "/cable";

const ensureTrailingSlashRemoved = (url: string) =>
  url.endsWith("/") ? url.slice(0, -1) : url;

const ensureLeadingSlashAdded = (path: string) =>
  path.startsWith("/") ? path : `/${path}`;

const apiUrl = ensureTrailingSlashRemoved(
  import.meta.env.VITE_API_URL ?? DEFAULT_API_URL,
);

const cablePath = ensureLeadingSlashAdded(
  import.meta.env.VITE_CABLE_PATH ?? DEFAULT_CABLE_SUFFIX,
);

const cableUrl =
  import.meta.env.VITE_CABLE_URL ??
  apiUrl.replace(/^http/i, (scheme) =>
    scheme.toLowerCase() === "https" ? "wss" : "ws",
  ) +
    cablePath;

export const config = {
  apiUrl,
  cableUrl,
};

export type AppConfig = typeof config;
