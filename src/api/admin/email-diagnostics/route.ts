import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { AdminSendEmailDiagnosticType } from "./validators";

export async function POST(
  req: MedusaRequest<AdminSendEmailDiagnosticType>,
  res: MedusaResponse
) {
  const { to, subject, message } = req.validatedBody;
  const notificationService = req.scope.resolve("notification");

  const result = await notificationService.createNotifications({
    to,
    channel: "email",
    template: "email-diagnostic",
    content: {
      subject,
      text: message,
    },
    data: {
      diagnostic: true,
    },
  });

  return res.json({
    ok: true,
    result,
  });
}
