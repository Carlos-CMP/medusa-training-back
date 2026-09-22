import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { MedusaError } from "@medusajs/framework/utils";

const FALLBACK_STOREFRONT_URL = "https://b2b-novicell.medusajs.site";

const contentTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

const getStorefrontUrl = () =>
  (
    process.env.STOREFRONT_URL ||
    process.env.MEDUSA_STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_STOREFRONT_URL ||
    FALLBACK_STOREFRONT_URL
  ).replace(/\/$/, "");

const validatePathPart = (value: string) => {
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(value)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid image path");
  }
};

const validateFilename = (filename: string) => {
  const match = filename.match(
    /^([a-z0-9][a-z0-9._-]*)\.(jpg|jpeg|png|webp|gif|svg)$/i
  );

  if (!match) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid image file");
  }

  return match[2].toLowerCase();
};

export const proxyStorefrontImage = async (
  req: MedusaRequest,
  res: MedusaResponse,
  parts: string[]
) => {
  if (!parts.length) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid image path");
  }

  const filename = parts[parts.length - 1];
  const extension = validateFilename(filename);
  parts.slice(0, -1).forEach(validatePathPart);

  const encodedPath = parts.map(encodeURIComponent).join("/");
  const imageUrl = `${getStorefrontUrl()}/images/${encodedPath}`;
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Image not found: ${encodedPath}`
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  res.setHeader(
    "Content-Type",
    response.headers.get("content-type") || contentTypes[extension]
  );
  res.setHeader(
    "Cache-Control",
    "public, max-age=86400, stale-while-revalidate=604800"
  );
  res.send(buffer);
};
