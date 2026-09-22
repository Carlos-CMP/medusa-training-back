import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type {
  IAuthModuleService,
  IUserModuleService,
} from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils";

const appUrl = () =>
  (
    process.env.MEDUSA_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:9000"
  ).replace(/\/$/, "");

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params;

  if (!id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invite ID is required."
    );
  }

  const userModuleService = req.scope.resolve<IUserModuleService>(Modules.USER);
  const invite = await userModuleService.retrieveInvite(id);
  await clearClaimableEmailpassIdentity(req, invite.email);

  const token = invite.token || invite.id;
  const target = `${appUrl()}/app/invite?token=${encodeURIComponent(token)}`;

  clearAuthCookies(res);

  return res
    .status(200)
    .set("Content-Type", "text/html; charset=utf-8")
    .set("Cache-Control", "no-store")
    .send(renderInviteRedirectPage(target));
}

function clearAuthCookies(res: MedusaResponse) {
  const options = { path: "/" };
  const cookieNames = [
    "connect.sid",
    "medusa.sid",
    "medusa_session",
    "medusa_admin_session",
    "medusa_auth_token",
    "medusa_user_auth_token",
  ];

  cookieNames.forEach((cookieName) => res.clearCookie(cookieName, options));
}

function renderInviteRedirectPage(target: string) {
  const serializedTarget = JSON.stringify(target);

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Preparando invitaci&oacute;n</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #111318;
        color: #f8fafc;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      main {
        width: min(420px, calc(100vw - 40px));
        padding: 28px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
      }

      h1 {
        margin: 0 0 8px;
        font-size: 20px;
        line-height: 1.25;
      }

      p {
        margin: 0;
        color: #cbd5e1;
        font-size: 14px;
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Preparando la invitaci&oacute;n</h1>
      <p>Estamos limpiando una sesi&oacute;n anterior antes de abrir el formulario.</p>
    </main>
    <script>
      const target = ${serializedTarget};

      try {
        localStorage.clear();
      } catch (error) {}

      try {
        sessionStorage.clear();
      } catch (error) {}

      try {
        document.cookie.split(";").forEach((cookie) => {
          const name = cookie.split("=")[0].trim();
          if (!name) {
            return;
          }

          document.cookie = name + "=; Max-Age=0; path=/";
          document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
        });
      } catch (error) {}

      window.location.replace(target);
    </script>
  </body>
</html>`;
}

async function clearClaimableEmailpassIdentity(
  req: MedusaRequest,
  email?: string | null
) {
  if (!email) {
    return;
  }

  const normalizedEmail = email.toLowerCase();
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  const userModuleService = req.scope.resolve<IUserModuleService>(Modules.USER);
  const authModuleService = req.scope.resolve<IAuthModuleService>(Modules.AUTH);

  const existingUsers = await userModuleService.listUsers(
    { email: normalizedEmail },
    { take: 1 }
  );

  if (existingUsers.length) {
    return;
  }

  const providerIdentities = await authModuleService.listProviderIdentities(
    {
      provider: "emailpass",
      entity_id: normalizedEmail,
    },
    {
      take: 10,
      relations: ["auth_identity"],
      select: [
        "id",
        "auth_identity_id",
        "auth_identity.id",
        "auth_identity.app_metadata",
      ],
    } as any
  );

  const claimableAuthIdentityIds = providerIdentities
    .map((providerIdentity) => providerIdentity.auth_identity)
    .filter((authIdentity) => {
      const metadata = authIdentity?.app_metadata || {};
      return authIdentity?.id && !metadata.user_id;
    })
    .map((authIdentity) => authIdentity!.id);

  const orphanProviderIdentityIds = providerIdentities
    .filter((providerIdentity) => !providerIdentity.auth_identity_id)
    .map((providerIdentity) => providerIdentity.id);

  if (claimableAuthIdentityIds.length) {
    await authModuleService.deleteAuthIdentities(claimableAuthIdentityIds);
    logger.info(
      `Cleared ${claimableAuthIdentityIds.length} stale invite auth identities for ${normalizedEmail}.`
    );
  }

  if (orphanProviderIdentityIds.length) {
    await authModuleService.deleteProviderIdentities(orphanProviderIdentityIds);
    logger.info(
      `Cleared ${orphanProviderIdentityIds.length} orphan invite provider identities for ${normalizedEmail}.`
    );
  }
}
