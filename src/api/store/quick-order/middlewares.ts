import { validateAndTransformBody } from "@medusajs/framework";
import { MiddlewareRoute } from "@medusajs/medusa";
import { StoreQuickOrderResolve } from "./validators";

export const storeQuickOrderMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/store/quick-order/resolve",
    middlewares: [validateAndTransformBody(StoreQuickOrderResolve)],
  },
];
