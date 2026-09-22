import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { generatedProductPackagingProfiles } from "./generated-client-profiles/product-packaging-registry";
import { upsertProductPackagingWorkflow } from "../workflows/product-packaging/workflows";

type ProfilePackagingRule = {
  sku: string | null;
  variant_id: string | null;
  sales_unit: "unit" | "box";
  minimum_order_quantity: number;
  quantity_increment: number;
  units_per_box: number;
  boxes_per_pallet?: number | null;
  package_weight?: number | null;
  package_dimensions?: string | null;
};

export default async function seed_product_packaging({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const activeProfile =
    process.env.B2B_CLIENT_PROFILE ||
    process.env.NEXT_PUBLIC_B2B_CLIENT_PROFILE ||
    "ngs";
  const packagingProfiles =
    generatedProductPackagingProfiles as Record<string, ProfilePackagingRule[]>;
  const packagingRules = packagingProfiles[activeProfile] || packagingProfiles.ngs;
  const skuRules = packagingRules.filter((rule) => rule.sku);

  const { data: variants } = await query.graph({
    entity: "variant",
    fields: ["id", "sku"],
    filters: {
      sku: skuRules.map((rule) => rule.sku),
    },
  });

  const variantBySku = new Map(
    variants
      .filter((variant) => variant.sku)
      .map((variant) => [variant.sku as string, variant.id])
  );

  for (const rule of packagingRules) {
    const variantId =
      rule.variant_id || (rule.sku ? variantBySku.get(rule.sku) : null);

    if (!variantId) {
      logger.warn(
        `Packaging seed skipped; variant not found for ${rule.sku || "unknown"}`
      );
      continue;
    }

    await upsertProductPackagingWorkflow(container).run({
      input: {
        variant_id: variantId,
        sales_unit: rule.sales_unit,
        minimum_order_quantity: rule.minimum_order_quantity,
        quantity_increment: rule.quantity_increment,
        units_per_box: rule.units_per_box,
        boxes_per_pallet: rule.boxes_per_pallet,
        package_weight: rule.package_weight,
        package_dimensions: rule.package_dimensions,
      },
    });
  }

  logger.info(
    `Seeded packaging rules for ${packagingRules.length} ${activeProfile} rows.`
  );
}
