const DEFAULT_STOREFRONT_URL = "https://b2b-novicell.medusajs.site";

const LEGACY_ASSET_HOSTS = [
  "https://ngs-medusa-backend.onrender.com",
  "http://ngs-medusa-backend.onrender.com",
  "http://localhost:9000",
];

export const normalizeAssetUrlForStorage = (url?: string | null) => {
  const value = (url || "").trim();

  if (!value) {
    return "";
  }

  const legacyHost = LEGACY_ASSET_HOSTS.find(
    (host) =>
      value.startsWith(`${host}/asset-files/`) ||
      value.startsWith(`${host}/store/asset-files/`)
  );

  if (legacyHost) {
    return value
      .replace(`${legacyHost}/store/asset-files/`, "/asset-files/")
      .replace(legacyHost, "");
  }

  return value;
};

const getAdminBackendUrl = () => {
  const configured =
    import.meta.env.VITE_BACKEND_URL || "https://b2b-novicell.medusajs.app";

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
};

export const resolveAdminAssetPreviewUrl = (url?: string | null) => {
  const normalizedUrl = normalizeAssetUrlForStorage(url);

  if (!normalizedUrl) {
    return "";
  }

  if (
    normalizedUrl.startsWith("http://") ||
    normalizedUrl.startsWith("https://") ||
    normalizedUrl.startsWith("data:") ||
    normalizedUrl.startsWith("blob:")
  ) {
    return normalizedUrl;
  }

  if (normalizedUrl.startsWith("/asset-files/")) {
    return `${getAdminBackendUrl()}${normalizedUrl}`;
  }

  if (normalizedUrl.startsWith("/images/")) {
    const storefrontUrl =
      import.meta.env.VITE_STOREFRONT_URL || DEFAULT_STOREFRONT_URL;

    return `${storefrontUrl.replace(/\/$/, "")}${normalizedUrl}`;
  }

  return normalizedUrl;
};
