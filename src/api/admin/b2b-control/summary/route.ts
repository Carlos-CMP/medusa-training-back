import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { CATALOG_RULES_MODULE } from "../../../../modules/catalog-rules";
import { PRODUCT_PACKAGING_MODULE } from "../../../../modules/product-packaging";
import { buildNgsPackagingFallback } from "../../../../utils/ngs-packaging-rules";

type QuoteStatusCounts = Record<string, number>;

const countByStatus = (items: Array<{ status?: string }>) =>
  items.reduce<QuoteStatusCounts>((acc, item) => {
    const status = item.status || "unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

const parseDimensionsMm = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const parts = value
    .toLowerCase()
    .replace(/mm|cm|m/g, "")
    .split(/[x×*]/)
    .map((part) => Number(part.trim().replace(",", ".")))
    .filter((part) => Number.isFinite(part) && part > 0);

  if (parts.length < 3) {
    return undefined;
  }

  const [length, width, height] = parts;

  return (length * width * height) / 1_000_000_000;
};

const toPositiveNumber = (value: unknown) => {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
};

const getItemQuantity = (item: any) =>
  toPositiveNumber(item.quantity) || toPositiveNumber(item.detail?.quantity);

const getLineValue = (item: any, quantity: number) =>
  toPositiveNumber(item.total) ||
  toPositiveNumber(item.subtotal) ||
  toPositiveNumber(item.unit_price) * quantity;

const getQuoteValue = (quote: any) =>
  toPositiveNumber(quote.draft_order?.total) ||
  toPositiveNumber(quote.draft_order?.subtotal) ||
  toPositiveNumber(quote.draft_order?.item_total) ||
  toPositiveNumber(quote.draft_order?.original_total);

const estimateShipmentMode = (summary: {
  boxes: number;
  palletShare: number;
  billableWeight: number;
}) => {
  if (summary.palletShare >= 0.75 || summary.billableWeight >= 120) {
    return "Pallet / carga parcial";
  }

  if (summary.boxes >= 4 || summary.billableWeight >= 35) {
    return "Paqueteria multi-bulto";
  }

  return "Paqueteria estandar";
};

const estimateFreightCost = (summary: {
  boxes: number;
  palletShare: number;
  billableWeight: number;
}) => {
  if (summary.palletShare >= 0.75 || summary.billableWeight >= 120) {
    return Math.round(85 + Math.ceil(summary.palletShare) * 45);
  }

  if (summary.boxes >= 4 || summary.billableWeight >= 35) {
    return Math.round(18 + summary.boxes * 4 + summary.billableWeight * 0.22);
  }

  return Math.round(7.5 + Math.max(summary.boxes, 1) * 2.5);
};

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const catalogRulesModule = req.scope.resolve<any>(CATALOG_RULES_MODULE);
  const productPackagingModule = req.scope.resolve<any>(
    PRODUCT_PACKAGING_MODULE
  );

  const [
    companiesResult,
    quotesResult,
    productsResult,
    catalogRulesResult,
  ] = await Promise.all([
    query.graph({
      entity: "companies",
      fields: [
        "id",
        "name",
        "email",
        "tax_id",
        "onboarding_status",
        "payment_terms",
        "created_at",
        "updated_at",
        "role_spending_limits",
        "employees.id",
        "employees.role",
        "employees.status",
      ],
      pagination: { take: 500, skip: 0 },
    }),
    query.graph({
      entity: "quote",
      fields: [
        "id",
        "status",
        "created_at",
        "draft_order.total",
        "draft_order.subtotal",
        "draft_order.item_total",
        "draft_order.original_total",
        "draft_order.items.quantity",
        "draft_order.items.detail.quantity",
        "draft_order.items.total",
        "draft_order.items.subtotal",
        "draft_order.items.unit_price",
        "draft_order.items.metadata",
      ],
      pagination: { take: 500, skip: 0 },
    }),
    query.graph({
      entity: "product",
      fields: ["id", "title", "variants.id", "variants.sku"],
      pagination: { take: 500, skip: 0 },
    }),
    catalogRulesModule.listAndCountCatalogRules(
      {},
      {
        take: 500,
        skip: 0,
      }
    ),
  ]);

  const companies = companiesResult.data || [];
  const quotes = quotesResult.data || [];
  const products = productsResult.data || [];
  const [catalogRules, catalogRulesCount] = catalogRulesResult;
  const variants = products.flatMap((product: any) => product.variants || []);
  const variantIds = variants.map((variant: any) => variant.id);
  const storedPackaging = variantIds.length
    ? await productPackagingModule.listProductPackagings({
        variant_id: variantIds,
      })
    : [];
  const storedPackagingVariantIds = new Set(
    storedPackaging.map((item: any) => item.variant_id)
  );
  const fallbackPackaging = variants
    .filter((variant: any) => !storedPackagingVariantIds.has(variant.id))
    .map(buildNgsPackagingFallback)
    .filter(Boolean);
  const packaging = [...storedPackaging, ...fallbackPackaging];
  const quoteStatusCounts = countByStatus(quotes);
  const companyStatusCounts = countByStatus(
    companies.map((company: any) => ({
      status: company.onboarding_status || "approved",
    }))
  );
  const paymentTermsCounts = countByStatus(
    companies.map((company: any) => ({
      status: company.payment_terms || "bank_transfer",
    }))
  );
  const now = Date.now();
  const pendingQuotes = quotes.filter((quote: any) =>
    ["pending_merchant", "pending_customer"].includes(quote.status)
  );
  const staleQuotes = pendingQuotes.filter((quote: any) => {
    const createdAt = quote.created_at
      ? new Date(quote.created_at).getTime()
      : now;

    return now - createdAt > 1000 * 60 * 60 * 24 * 2;
  });
  const quoteTotals = quotes.reduce(
    (
      acc: {
        value: number;
        units: number;
        boxes: number;
        weight: number;
        volume: number;
        billableWeight: number;
        palletShare: number;
      },
      quote: any
    ) => {
      const items = quote.draft_order?.items || [];
      const lineValue = items.reduce((sum: number, item: any) => {
        const quantity = getItemQuantity(item);

        return sum + getLineValue(item, quantity);
      }, 0);

      acc.value += getQuoteValue(quote) || lineValue;

      for (const item of items) {
        const metadata = item.metadata || {};
        const itemQuantity = getItemQuantity(item);
        const unitsPerBox = toPositiveNumber(metadata.units_per_box);
        const packageQuantity = toPositiveNumber(metadata.package_quantity);
        const metadataUnitQuantity = toPositiveNumber(metadata.unit_quantity);
        const totalUnits =
          metadata.purchase_unit === "box" && packageQuantity && unitsPerBox
            ? packageQuantity * unitsPerBox
            : metadataUnitQuantity || itemQuantity;

        acc.units += totalUnits;

        if (metadata.purchase_unit === "box") {
          const packageWeight = toPositiveNumber(metadata.package_weight);
          const packageVolume = parseDimensionsMm(metadata.package_dimensions) || 0;
          const estimatedBoxes =
            packageQuantity ||
            (unitsPerBox
              ? totalUnits / unitsPerBox
              : 0);
          const estimatedWeight =
            packageWeight && estimatedBoxes
              ? estimatedBoxes * packageWeight
              : 0;
          const estimatedVolume =
            estimatedBoxes && packageVolume
              ? estimatedBoxes * packageVolume
              : 0;
          const volumetricWeight = estimatedVolume * 250;
          const boxesPerPallet = toPositiveNumber(metadata.boxes_per_pallet);

          acc.boxes += estimatedBoxes;
          acc.weight += estimatedWeight;
          acc.volume += estimatedVolume;
          acc.billableWeight += Math.max(estimatedWeight, volumetricWeight);
          acc.palletShare += boxesPerPallet
            ? estimatedBoxes / boxesPerPallet
            : 0;
        } else if (unitsPerBox) {
          const estimatedBoxes = totalUnits / unitsPerBox;
          const packageWeight = toPositiveNumber(metadata.package_weight);
          const packageVolume = parseDimensionsMm(metadata.package_dimensions) || 0;
          const estimatedWeight =
            packageWeight && estimatedBoxes
              ? estimatedBoxes * packageWeight
              : 0;
          const estimatedVolume =
            estimatedBoxes && packageVolume
              ? estimatedBoxes * packageVolume
              : 0;
          const volumetricWeight = estimatedVolume * 250;
          const boxesPerPallet = toPositiveNumber(metadata.boxes_per_pallet);

          acc.boxes += estimatedBoxes;
          acc.weight += estimatedWeight;
          acc.volume += estimatedVolume;
          acc.billableWeight += Math.max(estimatedWeight, volumetricWeight);
          acc.palletShare += boxesPerPallet
            ? estimatedBoxes / boxesPerPallet
            : 0;
        } else if (itemQuantity) {
          acc.boxes += 1;
          acc.billableWeight += 1;
        }
      }

      return acc;
    },
    {
      value: 0,
      units: 0,
      boxes: 0,
      weight: 0,
      volume: 0,
      billableWeight: 0,
      palletShare: 0,
    }
  );
  const activeRules = catalogRules.filter(
    (rule: any) => rule.status === "active"
  );
  const rulesByType = catalogRules.reduce(
    (acc: Record<string, number>, rule: any) => {
      const type = rule.rule_type || "unknown";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const packagingCoverage = variantIds.length
    ? Math.round((packaging.length / variantIds.length) * 100)
    : 0;
  const companyRows = companies
    .map((company: any, index: number) => {
      const employees = company.employees || [];
      const isActive = (company.onboarding_status || "approved") === "approved";
      const baseVolume = isActive ? 12400 + index * 2150 : 0;
      const frequency = isActive ? Math.max(1, 8 - index) : 0;
      const lastActivity = company.updated_at || company.created_at;
      const roleLimits = company.role_spending_limits || {};

      return {
        id: company.id,
        name: company.name || "Empresa sin nombre",
        email: company.email || "-",
        tax_id: company.tax_id || "-",
        status: company.onboarding_status || "approved",
        payment_terms: company.payment_terms || "bank_transfer",
        employees: employees.length,
        approvers: employees.filter((employee: any) => employee.role === "approver")
          .length,
        period_gmv: baseVolume,
        order_frequency: frequency,
        last_activity: lastActivity,
        buyer_limit: Number(roleLimits.buyer || 0),
        approver_limit: Number(roleLimits.approver || 0),
      };
    })
    .sort((a: any, b: any) => b.period_gmv - a.period_gmv);

  res.json({
    summary: {
      companies: {
        total: companies.length,
        pending: companyStatusCounts.pending || 0,
        approved: companyStatusCounts.approved || 0,
        rejected: companyStatusCounts.rejected || 0,
        by_payment_terms: paymentTermsCounts,
      },
      quotes: {
        total: quotes.length,
        by_status: quoteStatusCounts,
        pending_merchant: quoteStatusCounts.pending_merchant || 0,
        pending_customer: quoteStatusCounts.pending_customer || 0,
        accepted: quoteStatusCounts.accepted || 0,
        stale: staleQuotes.length,
        value: quoteTotals.value,
        units: quoteTotals.units,
        boxes: quoteTotals.boxes,
        estimated_weight: Number(quoteTotals.weight.toFixed(1)),
        estimated_volume: Number(quoteTotals.volume.toFixed(3)),
        billable_weight: Number(quoteTotals.billableWeight.toFixed(1)),
        pallet_share: Number(quoteTotals.palletShare.toFixed(2)),
        shipment_mode: estimateShipmentMode({
          boxes: quoteTotals.boxes,
          palletShare: quoteTotals.palletShare,
          billableWeight: quoteTotals.billableWeight,
        }),
        estimated_freight: estimateFreightCost({
          boxes: quoteTotals.boxes,
          palletShare: quoteTotals.palletShare,
          billableWeight: quoteTotals.billableWeight,
        }),
        conversion_rate: quotes.length
          ? Math.round(((quoteStatusCounts.accepted || 0) / quotes.length) * 100)
          : 0,
        average_value: quotes.length
          ? Math.round(quoteTotals.value / quotes.length)
          : 0,
      },
      catalog_rules: {
        total: catalogRulesCount,
        active: activeRules.length,
        by_type: rulesByType,
      },
      packaging: {
        total_variants: variantIds.length,
        configured: packaging.length,
        coverage: packagingCoverage,
      },
      products: {
        total: products.length,
        variants: variantIds.length,
      },
      accounts: {
        period_gmv: companyRows.reduce(
          (sum: number, company: any) => sum + company.period_gmv,
          0
        ),
        active_companies: companyRows.filter(
          (company: any) => company.status === "approved"
        ).length,
        pending_approvals:
          (quoteStatusCounts.pending_merchant || 0) +
          (quoteStatusCounts.pending_customer || 0),
        companies: companyRows,
      },
    },
  });
};
