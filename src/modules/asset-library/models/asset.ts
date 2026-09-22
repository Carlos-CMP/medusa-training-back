import { model } from "@medusajs/framework/utils";

export const Asset = model.define("asset", {
  id: model
    .id({
      prefix: "asset",
    })
    .primaryKey(),
  label: model.text(),
  url: model.text(),
  filename: model.text().nullable(),
  mime_type: model.text().nullable(),
  content_base64: model.text().nullable(),
  alt: model.text().nullable(),
  type: model
    .enum([
      "logo",
      "hero",
      "homepage",
      "product",
      "category",
      "document",
      "other",
    ])
    .default("homepage"),
  client_profile_id: model.text().default("ngs"),
  tags: model.text().nullable(),
  sort_order: model.number().default(0),
});
