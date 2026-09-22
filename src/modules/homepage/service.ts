import { MedusaService } from "@medusajs/framework/utils";
import { HomepageConfig } from "./models";

class HomepageModuleService extends MedusaService({
  HomepageConfig,
}) {}

export default HomepageModuleService;
