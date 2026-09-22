import { MiddlewareRoute } from "@medusajs/medusa";
import { adminCompaniesMiddlewares } from "./companies/middlewares";
import { adminQuotesMiddlewares } from "./quotes/middlewares";
import { adminApprovalsMiddlewares } from "./approvals/middlewares";
import { adminHomepageMiddlewares } from "./homepage/middlewares";
import { adminProductPackagingMiddlewares } from "./product-packaging/middlewares";
import { adminBrandProfileMiddlewares } from "./brand-profile/middlewares";
import { adminAssetsMiddlewares } from "./assets/middlewares";
import { adminCatalogRulesMiddlewares } from "./catalog-rules/middlewares";
import { adminEmailDiagnosticsMiddlewares } from "./email-diagnostics/middlewares";

export const adminMiddlewares: MiddlewareRoute[] = [
  ...adminCompaniesMiddlewares,
  ...adminQuotesMiddlewares,
  ...adminApprovalsMiddlewares,
  ...adminHomepageMiddlewares,
  ...adminProductPackagingMiddlewares,
  ...adminBrandProfileMiddlewares,
  ...adminAssetsMiddlewares,
  ...adminCatalogRulesMiddlewares,
  ...adminEmailDiagnosticsMiddlewares,
];
