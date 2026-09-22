import { MedusaService } from "@medusajs/framework/utils";
import { Asset } from "./models";

class AssetLibraryModuleService extends MedusaService({
  Asset,
}) {}

export default AssetLibraryModuleService;
