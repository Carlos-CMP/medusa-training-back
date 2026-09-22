import { MedusaContainer } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
} from "@medusajs/framework/utils";
import {
  createAndPublishWebflowItem,
  getWebflowSyncConfig,
  tryPublishWebflowItems,
  updateWebflowItem,
  WebflowProductFieldData,
} from "./webflow-client";

const CURRENCY_CODE = (
  process.env.WEBFLOW_SYNC_CURRENCY_CODE || "eur"
).toLowerCase();

const getStorefrontUrl = () =>
  (
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_STOREFRONT_URL ||
    "https://b2b-novicell.medusajs.site"
  ).replace(/\/$/, "");

const formatPrice = (amount: number, currencyCode: string) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
  }).format(amount);

const toWebflowSlug = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

type SyncableProduct = {
  id: string;
  title: string;
  handle: string | null;
  subtitle: string | null;
  thumbnail: string | null;
  metadata: Record<string, unknown> | null;
  categories?: { name: string }[] | null;
  variants?: { prices?: { amount: number; currency_code: string }[] }[] | null;
};

export const PRODUCT_SYNC_QUERY_FIELDS = [
  "id",
  "title",
  "handle",
  "subtitle",
  "thumbnail",
  "metadata",
  "categories.name",
  "variants.prices.amount",
  "variants.prices.currency_code",
];

const buildFieldData = (product: SyncableProduct): WebflowProductFieldData => {
  const price = product.variants
    ?.flatMap((variant) => variant.prices || [])
    .find((entry) => entry.currency_code === CURRENCY_CODE);

  const fieldData: WebflowProductFieldData = {
    name: product.title,
    slug: toWebflowSlug(product.handle || product.id),
    "medusa-product-id": product.id,
  };

  if (price) {
    fieldData.price = formatPrice(price.amount, price.currency_code);
  }

  if (product.thumbnail) {
    fieldData["main-image"] = { url: product.thumbnail, alt: product.title };
  }

  if (product.categories?.[0]?.name) {
    fieldData.category = product.categories[0].name;
  }

  if (product.subtitle) {
    fieldData["short-description"] = product.subtitle;
  }

  if (product.handle) {
    fieldData["product-url"] = `${getStorefrontUrl()}/products/${product.handle}`;
  }

  return fieldData;
};

export type WebflowSyncResult = "synced" | "skipped";

export const syncProductToWebflow = async (
  container: MedusaContainer,
  productId: string
): Promise<WebflowSyncResult> => {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const config = getWebflowSyncConfig();

  if (!config) {
    return "skipped";
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: products } = await query.graph({
    entity: "product",
    fields: PRODUCT_SYNC_QUERY_FIELDS,
    filters: { id: productId },
  });

  const product = products[0] as SyncableProduct | undefined;

  if (!product) {
    logger.warn(`Webflow sync skipped: product ${productId} not found.`);
    return "skipped";
  }

  const fieldData = buildFieldData(product);
  const existingItemId = product.metadata?.webflow_item_id as
    | string
    | undefined;

  try {
    if (existingItemId) {
      await updateWebflowItem(
        config.apiToken,
        config.collectionId,
        existingItemId,
        fieldData
      );
      const published = await tryPublishWebflowItems(
        config.apiToken,
        config.collectionId,
        [existingItemId]
      );
      logger.info(
        `Webflow CMS item ${existingItemId} updated for product ${product.id}${
          published ? "" : " (publish failed, content saved as staged/unpublished)"
        }.`
      );
    } else {
      const { item, published } = await createAndPublishWebflowItem(
        config.apiToken,
        config.collectionId,
        fieldData
      );

      const productModuleService = container.resolve(
        ModuleRegistrationName.PRODUCT
      );
      await productModuleService.updateProducts(product.id, {
        metadata: { ...product.metadata, webflow_item_id: item.id },
      });

      logger.info(
        `Webflow CMS item ${item.id} created for product ${product.id}${
          published ? "" : " (publish failed, content saved as staged/unpublished)"
        }.`
      );
    }

    return "synced";
  } catch (error) {
    logger.error(
      `Webflow sync failed for product ${product.id}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return "skipped";
  }
};
