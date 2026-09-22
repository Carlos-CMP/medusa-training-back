import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import { ResendNotificationService } from "./services/resend-notification";

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [ResendNotificationService],
});
