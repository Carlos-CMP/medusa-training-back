import { MedusaService } from "@medusajs/framework/utils";
import { CatalogRule } from "./models";

class CatalogRulesModuleService extends MedusaService({
  CatalogRule,
}) {}

export default CatalogRulesModuleService;
