import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";

const IMAGE_BY_HANDLE: Record<string, string> = {
  "novisound-tower-pro-x1": "products/novisound-tower-pro-x1.png",
  "novisound-studio-pair-s5": "products/novisound-studio-pair-s5.png",
  "novisound-boom-go-b8": "products/novisound-boom-go-b8.png",
  "novisound-cinema-bar-c12": "products/novisound-cinema-bar-c12.png",
  "novisound-amplifier-a500": "products/novisound-amplifier-a500.png",
  "novisound-wireless-mic-m2": "products/novisound-wireless-mic-m2.png",
  "novisound-soundbar-suite-s900": "products/novisound-soundbar-suite-s900.png",
};

const getStorefrontUrl = () =>
  (
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_STOREFRONT_URL ||
    "https://b2b-novicell.medusajs.site"
  ).replace(/\/$/, "");

const getBackendUrl = () =>
  (
    process.env.MEDUSA_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "https://b2b-novicell.medusajs.app"
  ).replace(/\/$/, "");

const imageUrlForHandle = (handle: string) =>
  `${getBackendUrl()}/images/novisound/${IMAGE_BY_HANDLE[handle]}`;

const packagedNovisoundPathForHandle = (handle: string) =>
  `/images/novisound/${IMAGE_BY_HANDLE[handle]}`;

const isPackagedNovisoundUrl = (url: string | null | undefined, handle: string) => {
  if (!url) {
    return false;
  }

  const path = packagedNovisoundPathForHandle(handle);

  return (
    url === path ||
    url.endsWith(path) ||
    url === `${getStorefrontUrl()}${path}` ||
    url === `${getBackendUrl()}${path}`
  );
};

const imageUrlsForProduct = (product: any) =>
  Array.isArray(product.images)
    ? product.images.map((image: any) => image?.url).filter(Boolean)
    : [];

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve("query");

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "thumbnail", "images.*"],
    filters: {
      handle: Object.keys(IMAGE_BY_HANDLE),
    },
    pagination: {
      take: Object.keys(IMAGE_BY_HANDLE).length,
      skip: 0,
    },
  });

  const updates = products.flatMap((product: any) => {
    if (!product.handle || !IMAGE_BY_HANDLE[product.handle]) {
      return [];
    }

    const imageUrls = imageUrlsForProduct(product);
    const firstExistingImage = imageUrls[0] as string | undefined;
    const packagedUrl = imageUrlForHandle(product.handle);

    if (
      firstExistingImage &&
      !isPackagedNovisoundUrl(firstExistingImage, product.handle)
    ) {
      return [];
    }

    const hasCurrentPackagedImage =
      firstExistingImage &&
      isPackagedNovisoundUrl(firstExistingImage, product.handle);
    const thumbnailIsCurrentPackaged = isPackagedNovisoundUrl(
      product.thumbnail,
      product.handle
    );

    if (hasCurrentPackagedImage && thumbnailIsCurrentPackaged) {
      const currentImageUsesBackendProxy = firstExistingImage === packagedUrl;
      const currentThumbnailUsesBackendProxy = product.thumbnail === packagedUrl;

      if (currentImageUsesBackendProxy && currentThumbnailUsesBackendProxy) {
        return [];
      }
    }

    return [
      {
        id: product.id,
        thumbnail: packagedUrl,
        images: [{ url: packagedUrl }],
      },
    ];
  });

  if (updates.length) {
    await updateProductsWorkflow(req.scope).run({
      input: {
        products: updates,
      },
    });
  }

  res.status(200).json({
    repaired: updates.length,
    skipped_existing_media: products.length - updates.length,
    products: updates,
  });
};
