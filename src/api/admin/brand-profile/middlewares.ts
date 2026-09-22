import { validateAndTransformBody } from "@medusajs/framework";
import { MiddlewareRoute } from "@medusajs/medusa";
import { AdminUpdateBrandProfile } from "./validators";

export const adminBrandProfileMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/admin/brand-profile",
    middlewares: [validateAndTransformBody(AdminUpdateBrandProfile)],
  },
];
