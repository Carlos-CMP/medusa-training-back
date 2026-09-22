import { MedusaService } from "@medusajs/framework/utils";
import { ProductPackaging } from "./models";

class ProductPackagingModuleService extends MedusaService({
  ProductPackaging,
}) {}

export default ProductPackagingModuleService;
