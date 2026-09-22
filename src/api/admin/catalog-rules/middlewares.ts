import { validateAndTransformBody } from "@medusajs/framework";
import { MiddlewareRoute } from "@medusajs/medusa";
import {
  AdminBulkUpsertCatalogRules,
  AdminSyncCatalogRulePriceList,
  AdminUpsertCatalogRule,
} from "./validators";

export const adminCatalogRulesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/admin/catalog-rules",
    middlewares: [validateAndTransformBody(AdminUpsertCatalogRule)],
  },
  {
    method: ["POST"],
    matcher: "/admin/catalog-rules/bulk",
    middlewares: [validateAndTransformBody(AdminBulkUpsertCatalogRules)],
  },
  {
    method: ["POST"],
    matcher: "/admin/catalog-rules/:id/sync-price-list",
    middlewares: [validateAndTransformBody(AdminSyncCatalogRulePriceList)],
  },
];
