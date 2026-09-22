import { BrandProfileContent } from "./defaults";

const LEGACY_ASSET_HOSTS = [
  "https://ngs-medusa-backend.onrender.com",
  "http://ngs-medusa-backend.onrender.com",
  "http://localhost:9000",
];

export const normalizeBrandAssetUrl = (url?: string | null) => {
  const value = (url || "").trim();

  if (!value) {
    return "";
  }

  const legacyHost = LEGACY_ASSET_HOSTS.find((host) =>
    value.startsWith(`${host}/asset-files/`)
  );

  if (legacyHost) {
    return value.replace(legacyHost, "");
  }

  return value;
};

export const normalizeBrandProfileContent = (
  content: BrandProfileContent
): BrandProfileContent => ({
  ...content,
  brand: {
    ...content.brand,
    logo: {
      light: normalizeBrandAssetUrl(content.brand.logo.light),
      dark: normalizeBrandAssetUrl(content.brand.logo.dark),
    },
  },
});
