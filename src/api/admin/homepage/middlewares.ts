import { validateAndTransformBody } from "@medusajs/framework";
import { MiddlewareRoute } from "@medusajs/medusa";
import { AdminUpdateHomepage } from "./validators";

export const adminHomepageMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/admin/homepage",
    middlewares: [validateAndTransformBody(AdminUpdateHomepage)],
  },
];
