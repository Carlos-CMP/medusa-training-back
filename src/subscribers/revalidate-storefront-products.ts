import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework";

const getStorefrontUrl = () =>
  (
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_STOREFRONT_URL ||
    "https://b2b-novicell.medusajs.site"
  ).replace(/\/$/, "");

export default async function revalidateStorefrontProducts({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger");
  const secret = process.env.REVALIDATE_SECRET;

  if (!secret) {
    logger.warn(
      `Skipping storefront product revalidation for product ${data.id}: REVALIDATE_SECRET is not set.`
    );
    return;
  }

  const url = `${getStorefrontUrl()}/api/revalidate?secret=${encodeURIComponent(secret)}&tag=products`;

  try {
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      throw new Error(`${response.status} ${await response.text()}`);
    }

    logger.info(`Storefront product cache revalidated for product ${data.id}.`);
  } catch (error) {
    logger.error(
      `Could not revalidate storefront product cache for product ${data.id}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
};
