import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";
import type { IUserModuleService } from "@medusajs/framework/types";

type InviteEventData = {
  id: string;
  email?: string;
  token?: string;
};

type InviteEmailData = {
  id: string;
  email: string;
  token?: string;
};

const appUrl = () =>
  (
    process.env.MEDUSA_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:9000"
  ).replace(/\/$/, "");

const inviteUrl = (data: InviteEventData) => {
  return `${appUrl()}/invite/${encodeURIComponent(data.id)}`;
};

const resolveInvite = async (
  data: InviteEventData,
  container: SubscriberArgs<InviteEventData>["container"]
): Promise<InviteEmailData | null> => {
  if (data.email) {
    return {
      id: data.id,
      email: data.email,
      token: data.token,
    };
  }

  const userModuleService = container.resolve<IUserModuleService>(Modules.USER);
  const invite = await userModuleService.retrieveInvite(data.id);

  if (!invite.email) {
    return null;
  }

  return {
    id: invite.id,
    email: invite.email,
    token: invite.token,
  };
};

export default async function sendInviteUserEmail({
  event: { data },
  container,
}: SubscriberArgs<InviteEventData>) {
  const logger = container.resolve("logger");

  try {
    const invite = await resolveInvite(data, container);

    if (!invite) {
      logger.warn(`Skipping invite email: invite ${data.id} has no email.`);
      return;
    }

    const notificationService = container.resolve("notification");

    await notificationService.createNotifications({
      to: invite.email,
      channel: "email",
      template: process.env.INVITE_USER_EMAIL_TEMPLATE || "user-invited",
      data: {
        email: invite.email,
        invite_url: inviteUrl(invite),
      },
    });

    logger.info(`Invite email queued for ${invite.email}.`);
  } catch (error) {
    logger.error(
      `Could not queue invite email for invite ${data.id}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export const config: SubscriberConfig = {
  event: ["invite.created", "invite.resent"],
};
