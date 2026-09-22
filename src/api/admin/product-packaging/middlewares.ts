import { validateAndTransformBody } from "@medusajs/framework";
import { MiddlewareRoute } from "@medusajs/medusa";
import {
  AdminBulkUpsertProductPackaging,
  AdminUpsertProductPackaging,
} from "./validators";

export const adminProductPackagingMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/admin/product-packaging",
    middlewares: [validateAndTransformBody(AdminUpsertProductPackaging)],
  },
  {
    method: ["POST"],
    matcher: "/admin/product-packaging/bulk",
    middlewares: [validateAndTransformBody(AdminBulkUpsertProductPackaging)],
  },
];
