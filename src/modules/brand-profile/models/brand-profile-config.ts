import { model } from "@medusajs/framework/utils";

export const BrandProfileConfig = model.define("brand_profile_config", {
  id: model
    .id({
      prefix: "bpcfg",
    })
    .primaryKey(),
  key: model.text(),
  content: model.text(),
});
