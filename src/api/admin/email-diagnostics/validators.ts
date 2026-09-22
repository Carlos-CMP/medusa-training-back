import { z } from "zod";

export const AdminSendEmailDiagnostic = z.object({
  to: z.string().email(),
  subject: z.string().optional().default("Prueba de correo Medusa"),
  message: z
    .string()
    .optional()
    .default("Este es un correo simple enviado desde Medusa Cloud."),
});

export type AdminSendEmailDiagnosticType = z.infer<
  typeof AdminSendEmailDiagnostic
>;
