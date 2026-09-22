import { Module } from "@medusajs/framework/utils";
import BrandProfileModuleService from "./service";

export const BRAND_PROFILE_MODULE = "brandProfile";

export default Module(BRAND_PROFILE_MODULE, {
  service: BrandProfileModuleService,
});
