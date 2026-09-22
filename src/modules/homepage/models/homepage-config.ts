import { model } from "@medusajs/framework/utils";

export const HomepageConfig = model.define("homepage_config", {
  id: model
    .id({
      prefix: "hpcfg",
    })
    .primaryKey(),
  key: model.text(),
  content: model.text(),
});
