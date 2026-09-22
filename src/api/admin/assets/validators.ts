import { z } from "@medusajs/framework/zod";

export const AdminUpsertAsset = z.object({
  id: z.string().min(1).optional(),
  label: z.string().min(1),
  url: z.string().min(1),
  alt: z.string().nullable().optional(),
  type: z
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
  client_profile_id: z.string().min(1).default("ngs"),
  tags: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
});

export type AdminUpsertAssetType = z.infer<typeof AdminUpsertAsset>;

export const AdminUploadAsset = AdminUpsertAsset.omit({
  url: true,
}).extend({
  filename: z.string().min(1),
  mime_type: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ]),
  content_base64: z.string().min(1).max(30_000_000),
});

export type AdminUploadAssetType = z.infer<typeof AdminUploadAsset>;
