import { Module } from "@medusajs/framework/utils";
import AssetLibraryModuleService from "./service";

export const ASSET_LIBRARY_MODULE = "assetLibrary";

export default Module(ASSET_LIBRARY_MODULE, {
  service: AssetLibraryModuleService,
});
