import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";
import { Logger, NotificationTypes } from "@medusajs/framework/types";
import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils";

type InjectedDependencies = {
  logger: Logger;
};

type SmtpProviderOptions = {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
  from: string;
};

type TemplateData = Record<string, unknown>;

type RenderedEmailContent = {
  subject: string;
  text: string;
  html?: string;
};

const renderB2BEmployeeInvitedEmail = (
  data: TemplateData
): RenderedEmailContent => {
  const inviteUrl = String(data.invite_url || "");
  const email = data.email ? String(data.email) : "";
  const companyName = data.company_name ? String(data.company_name) : "tu empresa";
  const subject = "Invitación al portal B2B";
  const greeting = email ? `Hola ${email},` : "Hola,";
  const text = [
    subject,
    "",
    greeting,
    "",
    `Te han invitado a acceder al portal B2B de ${companyName}.`,
    "Desde ahí podrás consultar pedidos, presupuestos y condiciones de compra según tu rol.",
    "",
    "Accede desde este enlace:",
    inviteUrl,
    "",
    "Si no esperabas este correo, puedes ignorarlo.",
  ].join("\n");

  return {
    subject,
    text,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111827;">
        <h1 style="font-size: 24px; margin: 0 0 16px;">Invitación al portal B2B</h1>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">${greeting}</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
          Te han invitado a acceder al portal B2B de <strong>${companyName}</strong>.
        </p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          Podrás consultar pedidos, presupuestos y condiciones de compra según tu rol.
        </p>
        <p style="margin: 0 0 24px;">
          <a href="${inviteUrl}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 6px; font-weight: 700;">
            Acceder al portal
          </a>
        </p>
        <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin: 0;">
          Si el botón no funciona, copia y pega esta URL en tu navegador:<br />
          <a href="${inviteUrl}" style="color: #2563eb;">${inviteUrl}</a>
        </p>
      </div>
    `,
  };
};

const renderUserInvitedEmail = (data: TemplateData): RenderedEmailContent => {
  const inviteUrl = String(data.invite_url || "");
  const email = data.email ? String(data.email) : "";
  const greeting = email ? `Hola ${email},` : "Hola,";
  const subject = "Acceso al backoffice B2B";
  const text = [
    subject,
    "",
    greeting,
    "",
    "Te han creado una invitación para acceder al backoffice de Medusa.",
    "",
    "Copia y pega este enlace en tu navegador para crear tu acceso:",
    inviteUrl,
    "",
    "Si no esperabas este correo, puedes ignorarlo.",
  ].join("\n");

  return {
    subject,
    text,
  };
};

const renderNotificationContent = (
  notification: NotificationTypes.ProviderSendNotificationDTO
): RenderedEmailContent => {
  if ("content" in notification && notification.content) {
    return {
      subject: notification.content.subject || "Notificaci\u00f3n",
      text: notification.content.text || "",
      html: notification.content.html || "",
    };
  }

  switch (notification.template) {
    case "b2b-employee-invited":
      return renderB2BEmployeeInvitedEmail(notification.data || {});
    case "user-invited":
      return renderUserInvitedEmail(notification.data || {});
    default:
      return {
        subject: String(notification.template || "Notificaci\u00f3n"),
        text: JSON.stringify(notification.data || {}, null, 2),
        html: `<pre>${JSON.stringify(notification.data || {}, null, 2)}</pre>`,
      };
  }
};

export class SmtpNotificationService extends AbstractNotificationProviderService {
  static identifier = "notification-smtp";

  protected readonly logger_: Logger;
  protected readonly transporter_: Transporter;
  protected readonly from_: string;
  protected readonly user_: string;

  constructor({ logger }: InjectedDependencies, options: SmtpProviderOptions) {
    super();

    if (!options.host || !options.port || !options.user || !options.pass || !options.from) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "SMTP notification provider requires host, port, user, pass, and from."
      );
    }

    this.logger_ = logger;
    this.user_ = options.user;
    this.from_ = options.host.includes("gmail.com") ? options.user : options.from;
    this.transporter_ = nodemailer.createTransport({
      host: options.host,
      port: Number(options.port),
      secure: Boolean(options.secure),
      auth: {
        user: options.user,
        pass: options.pass,
      },
    });
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    if (!notification?.to) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No recipient provided for SMTP notification."
      );
    }

    const content = renderNotificationContent(notification);
    const recipients = Array.isArray(notification.to)
      ? notification.to
      : [notification.to];

    const message = {
      from: notification.from?.trim() || this.from_,
      to: recipients.join(", "),
      subject: content.subject,
      text: content.text,
      ...(content.html ? { html: content.html } : {}),
    };

    const delivery = await this.transporter_.sendMail(message);

    const accepted = (delivery.accepted || []).join(", ");
    const rejected = (delivery.rejected || []).join(", ");

    if (!delivery.accepted?.length) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `SMTP email was not accepted by provider. Rejected: ${rejected || "none"}`
      );
    }

    this.logger_.info(
      `SMTP delivery accepted. To: ${accepted}. Rejected: ${rejected || "none"}. Message ID: ${
        delivery.messageId || "n/a"
      }. Response: ${delivery.response || "n/a"}`
    );

    return {};
  }
}
