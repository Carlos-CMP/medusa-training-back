import { MedusaService } from "@medusajs/framework/utils";
import { BrandProfileConfig } from "./models";

class BrandProfileModuleService extends MedusaService({
  BrandProfileConfig,
}) {}

export default BrandProfileModuleService;
