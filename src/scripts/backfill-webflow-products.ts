import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { syncProductToWebflow } from "../utils/webflow-product-sync";

export default async function backfillWebflowProducts({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: {},
    pagination: { take: 1000 },
  });

  if (!products.length) {
    logger.info("No products found to sync to Webflow.");
    return;
  }

  let synced = 0;
  let skipped = 0;

  for (const product of products) {
    const result = await syncProductToWebflow(container, product.id);

    if (result === "synced") {
      synced += 1;
    } else {
      skipped += 1;
    }
  }

  logger.info(
    `Webflow backfill complete: ${synced} synced, ${skipped} skipped/failed out of ${products.length}.`
  );
}
