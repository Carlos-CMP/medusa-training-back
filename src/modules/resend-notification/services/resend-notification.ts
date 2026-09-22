import {
  Logger,
  NotificationTypes,
} from "@medusajs/framework/types";
import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils";
import { Resend } from "resend";

type InjectedDependencies = {
  logger: Logger;
};

type ResendProviderOptions = {
  api_key: string;
  from: string;
};

type TemplateData = Record<string, unknown>;

const renderB2BEmployeeInvitedEmail = (data: TemplateData) => {
  const inviteUrl = String(data.invite_url || "");
  const email = data.email ? String(data.email) : "";
  const companyName = data.company_name ? String(data.company_name) : "tu empresa";

  return {
    subject: "Invitación al portal B2B",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111827;">
        <h1 style="font-size: 24px; margin: 0 0 16px;">Invitación al portal B2B</h1>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
          ${email ? `Hola ${email},` : "Hola,"}
        </p>
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

const renderUserInvitedEmail = (data: TemplateData) => {
  const inviteUrl = String(data.invite_url || "");
  const email = data.email ? String(data.email) : "";

  return {
    subject: "Invitación al backoffice B2B",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111827;">
        <h1 style="font-size: 24px; margin: 0 0 16px;">Invitación al backoffice B2B</h1>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
          ${email ? `Hola ${email},` : "Hola,"}
        </p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          Te han invitado a acceder al backoffice de Medusa. Pulsa el botón para aceptar la invitación y crear tu acceso.
        </p>
        <p style="margin: 0 0 24px;">
          <a href="${inviteUrl}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 6px; font-weight: 700;">
            Aceptar invitación
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

const renderNotificationContent = (
  notification: NotificationTypes.ProviderSendNotificationDTO
) => {
  if ("content" in notification && notification.content) {
    return {
      subject: notification.content.subject || "Notificación",
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
        subject: String(notification.template || "Notificación"),
        html: `<pre>${JSON.stringify(notification.data || {}, null, 2)}</pre>`,
      };
  }
};

export class ResendNotificationService extends AbstractNotificationProviderService {
  static identifier = "notification-resend";

  protected readonly logger_: Logger;
  protected readonly resend_: Resend;
  protected readonly from_: string;

  constructor({ logger }: InjectedDependencies, options: ResendProviderOptions) {
    super();

    if (!options.api_key || !options.from) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend notification provider requires api_key and from."
      );
    }

    this.logger_ = logger;
    this.resend_ = new Resend(options.api_key);
    this.from_ = options.from;
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    if (!notification?.to) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No recipient provided for Resend notification."
      );
    }

    const content = renderNotificationContent(notification);
    const from = notification.from?.trim() || this.from_;

    const { error } = await this.resend_.emails.send({
      from,
      to: Array.isArray(notification.to) ? notification.to : [notification.to],
      subject: content.subject,
      html: content.html,
    });

    if (error) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to send Resend email: ${error.message}`
      );
    }

    this.logger_.info(
      `Resend email sent to ${Array.isArray(notification.to) ? notification.to.join(", ") : notification.to}`
    );

    return {};
  }
}
