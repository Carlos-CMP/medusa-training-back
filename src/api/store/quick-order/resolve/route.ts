import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { CATALOG_RULES_MODULE } from "../../../../modules/catalog-rules";
import { PRODUCT_PACKAGING_MODULE } from "../../../../modules/product-packaging";
import { buildNgsPackagingFallback } from "../../../../utils/ngs-packaging-rules";
import { StoreQuickOrderResolveType } from "../validators";

const normalizeSku = (sku: string) => sku.trim().toUpperCase();

type CatalogRuleRecord = {
  status: string;
  priority: number;
  effect_type: string;
  target_type: string;
  target_id?: string | null;
  company_id?: string | null;
  customer_group_id?: string | null;
  region_id?: string | null;
  sales_channel_id?: string | null;
  zone_code?: string | null;
  currency_code?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

const matchesScope = (
  ruleValue: string | null | undefined,
  contextValue: string | undefined
) => {
  return !ruleValue || ruleValue === contextValue;
};

const isActiveInWindow = (rule: CatalogRuleRecord, now: Date) => {
  if (rule.status !== "active") {
    return false;
  }

  if (rule.starts_at && new Date(rule.starts_at) > now) {
    return false;
  }

  if (rule.ends_at && new Date(rule.ends_at) < now) {
    return false;
  }

  return true;
};

const matchesQuickOrderTarget = (
  rule: CatalogRuleRecord,
  match: {
    product: {
      id: string;
      categories?: { id: string }[];
      collection?: { id: string } | null;
    };
    variant: { id: string };
  }
) => {
  if (rule.target_type === "all") {
    return true;
  }

  if (rule.target_type === "product") {
    return rule.target_id === match.product.id;
  }

  if (rule.target_type === "variant") {
    return rule.target_id === match.variant.id;
  }

  if (rule.target_type === "category") {
    return (match.product.categories || []).some(
      (category) => category.id === rule.target_id
    );
  }

  if (rule.target_type === "collection") {
    return match.product.collection?.id === rule.target_id;
  }

  return false;
};

export async function POST(
  req: MedusaRequest<StoreQuickOrderResolveType>,
  res: MedusaResponse
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const requestedSkus = Array.from(
    new Set(req.validatedBody.skus.map(normalizeSku).filter(Boolean))
  );

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "thumbnail",
      "categories.id",
      "collection.id",
      "variants.id",
      "variants.title",
      "variants.sku",
      "variants.options.*",
    ],
    filters: {
      variants: {
        sku: requestedSkus,
      },
    },
    pagination: {
      take: 100,
      skip: 0,
    },
  });

  const matchedVariants = products.flatMap((product: any) =>
    (product.variants || [])
      .filter((variant: any) =>
        requestedSkus.includes(normalizeSku(variant.sku || ""))
      )
      .map((variant: any) => ({
        sku: normalizeSku(variant.sku),
        product: {
          id: product.id,
          title: product.title,
          handle: product.handle,
          thumbnail: product.thumbnail,
          categories: product.categories || [],
          collection: product.collection || null,
        },
        variant: {
          id: variant.id,
          title: variant.title,
          sku: variant.sku,
          options: variant.options || [],
        },
      }))
  );

  const variantIds = matchedVariants.map((match) => match.variant.id);
  const productPackagingModule = req.scope.resolve<any>(
    PRODUCT_PACKAGING_MODULE
  );
  const packaging = variantIds.length
    ? await productPackagingModule.listProductPackagings({
        variant_id: variantIds,
      })
    : [];
  const packagedVariantIds = new Set(
    packaging.map((item: any) => item.variant_id as string)
  );
  const missingVariantIds = variantIds.filter(
    (variantId) => !packagedVariantIds.has(variantId)
  );

  if (missingVariantIds.length) {
    const { data: variants } = await query.graph({
      entity: "variant",
      fields: ["id", "sku"],
      filters: {
        id: missingVariantIds,
      },
    });

    packaging.push(
      ...variants
        .map(buildNgsPackagingFallback)
        .filter((item): item is NonNullable<typeof item> => !!item)
    );
  }

  const packagingByVariantId = new Map(
    packaging.map((item: any) => [item.variant_id, item])
  );
  const catalogRulesModule = req.scope.resolve<any>(CATALOG_RULES_MODULE);
  const now = new Date();
  const catalogRules = (await catalogRulesModule.listCatalogRules(
    {
      status: "active",
    },
    {
      order: {
        priority: "ASC",
        created_at: "DESC",
      },
    }
  )) as CatalogRuleRecord[];
  const resolved = matchedVariants.map((match) => ({
    ...match,
    packaging: packagingByVariantId.get(match.variant.id) || null,
    catalog_rule_summary: {
      requires_quote: catalogRules
        .filter((rule) => rule.effect_type === "requires_quote")
        .filter((rule) => isActiveInWindow(rule, now))
        .filter((rule) => matchesQuickOrderTarget(rule, match))
        .filter((rule) => matchesScope(rule.region_id, req.validatedBody.region_id))
        .some((rule) => {
          return (
            !rule.company_id &&
            !rule.customer_group_id &&
            !rule.sales_channel_id &&
            !rule.zone_code &&
            !rule.currency_code
          );
        }),
    },
  }));
  const resolvedSkus = new Set(resolved.map((item) => item.sku));

  res.json({
    items: resolved,
    missing_skus: requestedSkus.filter((sku) => !resolvedSkus.has(sku)),
  });
}
