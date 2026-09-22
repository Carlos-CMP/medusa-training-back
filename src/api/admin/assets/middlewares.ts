import { validateAndTransformBody } from "@medusajs/framework";
import { MiddlewareRoute } from "@medusajs/medusa";
import { AdminUploadAsset, AdminUpsertAsset } from "./validators";

export const adminAssetsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/admin/assets",
    middlewares: [validateAndTransformBody(AdminUpsertAsset)],
  },
  {
    method: ["POST"],
    matcher: "/admin/assets/upload",
    bodyParser: { sizeLimit: "30mb" },
    middlewares: [validateAndTransformBody(AdminUploadAsset)],
  },
];
