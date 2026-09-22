import { validateAndTransformBody } from "@medusajs/framework";
import { MiddlewareRoute } from "@medusajs/medusa";
import { AdminSendEmailDiagnostic } from "./validators";

export const adminEmailDiagnosticsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/admin/email-diagnostics",
    middlewares: [validateAndTransformBody(AdminSendEmailDiagnostic)],
  },
];
