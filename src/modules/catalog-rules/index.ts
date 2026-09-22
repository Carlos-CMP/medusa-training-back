import { Module } from "@medusajs/framework/utils";
import CatalogRulesModuleService from "./service";

export const CATALOG_RULES_MODULE = "catalogRules";

export default Module(CATALOG_RULES_MODULE, {
  service: CatalogRulesModuleService,
});
