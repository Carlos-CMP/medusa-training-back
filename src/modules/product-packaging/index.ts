import { Module } from "@medusajs/framework/utils";
import ProductPackagingModuleService from "./service";

export const PRODUCT_PACKAGING_MODULE = "productPackaging";

export default Module(PRODUCT_PACKAGING_MODULE, {
  service: ProductPackagingModuleService,
});
