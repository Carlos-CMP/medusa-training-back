import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import { PRODUCT_PACKAGING_MODULE } from "../modules/product-packaging";
import { buildNgsPackagingFallback } from "./ngs-packaging-rules";

export type PackagingRule = {
  variant_id: string;
  minimum_order_quantity: number;
  quantity_increment: number;
  units_per_box: number;
};

export type LineItemInput = {
  variant_id?: string | null;
  quantity?: number | null;
  metadata?: Record<string, unknown> | null;
};

const invalidPackagingQuantity = (message: string) =>
  new MedusaError(MedusaError.Types.INVALID_DATA, message);

const toPositiveInteger = (value: unknown) => {
  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0
    ? numberValue
    : undefined;
};

const normalizeRule = (
  rule?: PackagingRule,
  metadata?: Record<string, unknown> | null
) => {
  return {
    minimumOrderQuantity:
      toPositiveInteger(rule?.minimum_order_quantity) ??
      toPositiveInteger(metadata?.minimum_order_quantity) ??
      1,
    quantityIncrement:
      toPositiveInteger(rule?.quantity_increment) ??
      toPositiveInteger(metadata?.quantity_increment) ??
      1,
    unitsPerBox:
      toPositiveInteger(rule?.units_per_box) ??
      toPositiveInteger(metadata?.units_per_box) ??
      1,
  };
};

export const validateProductPackagingLineQuantities = (
  lineItems: LineItemInput[],
  rulesByVariantId: Map<string, PackagingRule>,
  options: {
    allowZeroQuantity?: boolean;
  } = {}
) => {
  for (const lineItem of lineItems) {
    if (!lineItem.variant_id) {
      continue;
    }

    const quantity = toPositiveInteger(lineItem.quantity);

    if (!quantity) {
      if (options.allowZeroQuantity && Number(lineItem.quantity) === 0) {
        continue;
      }

      throw invalidPackagingQuantity("Quantity must be a positive integer.");
    }

    const rule = normalizeRule(
      rulesByVariantId.get(lineItem.variant_id),
      lineItem.metadata
    );
    const purchaseUnit = lineItem.metadata?.purchase_unit;
    const packageQuantity = toPositiveInteger(
      lineItem.metadata?.package_quantity
    );

    if (quantity < rule.minimumOrderQuantity) {
      throw invalidPackagingQuantity(
        `Minimum order quantity for this variant is ${rule.minimumOrderQuantity} units.`
      );
    }

    if (quantity % rule.quantityIncrement !== 0) {
      throw invalidPackagingQuantity(
        `Quantity for this variant must be a multiple of ${rule.quantityIncrement}.`
      );
    }

    if (purchaseUnit === "box") {
      if (!packageQuantity) {
        throw invalidPackagingQuantity(
          "Box purchases must include package quantity."
        );
      }

      if (quantity !== packageQuantity * rule.unitsPerBox) {
        throw invalidPackagingQuantity(
          `Box quantity must equal packages multiplied by ${rule.unitsPerBox} units per box.`
        );
      }
    }
  }
};

export const validateProductPackagingLines = async (
  container: any,
  lineItems: LineItemInput[],
  options: {
    allowZeroQuantity?: boolean;
  } = {}
) => {
  const variantIds = Array.from(
    new Set(
      lineItems
        .map((lineItem) => lineItem.variant_id)
        .filter((variantId): variantId is string => !!variantId)
    )
  );

  if (!variantIds.length) {
    return;
  }

  const productPackagingModule = container.resolve(
    PRODUCT_PACKAGING_MODULE
  ) as any;
  const packagingRules = await productPackagingModule.listProductPackagings({
    variant_id: variantIds,
  });

  const packagedVariantIds = new Set(
    packagingRules.map((rule) => rule.variant_id as string)
  );
  const missingVariantIds = variantIds.filter(
    (variantId) => !packagedVariantIds.has(variantId)
  );

  if (missingVariantIds.length) {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const { data: variants } = await query.graph({
      entity: "variant",
      fields: ["id", "sku"],
      filters: {
        id: missingVariantIds,
      },
    });

    packagingRules.push(
      ...variants
        .map(buildNgsPackagingFallback)
        .filter((item): item is NonNullable<typeof item> => !!item)
    );
  }

  const rulesByVariantId = new Map<string, PackagingRule>(
    packagingRules.map((rule) => [rule.variant_id, rule])
  );

  validateProductPackagingLineQuantities(lineItems, rulesByVariantId, options);
};
