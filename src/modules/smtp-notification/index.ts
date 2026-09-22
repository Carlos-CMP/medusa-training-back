import { ModuleProvider, Modules } from "@medusajs/framework/utils";

import { SmtpNotificationService } from "./services/smtp-notification";

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [SmtpNotificationService],
});
