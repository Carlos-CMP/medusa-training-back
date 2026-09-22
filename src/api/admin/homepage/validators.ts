import { z } from "@medusajs/framework/zod";

const HomepageMetric = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  isHidden: z.boolean().optional(),
});

const HomepageImageBlock = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  image: z.string(),
  isHidden: z.boolean().optional(),
});

const HomepageCategoryBlock = z.object({
  title: z.string().min(1),
  handle: z.string().min(1),
  image: z.string().min(1),
});

export const AdminUpdateHomepage = z.object({
  heroBadgePrimary: z.string().min(1),
  heroBadgeSecondary: z.string().min(1),
  heroTitle: z.string().min(1),
  heroBody: z.string().min(1),
  primaryCtaLabel: z.string().min(1),
  primaryCtaHref: z.string().min(1),
  secondaryCtaLabel: z.string().min(1),
  secondaryCtaHref: z.string().min(1),
  heroImage: z.string().min(1),
  heroImageAlt: z.string().min(1),
  heroImageEyebrow: z.string().min(1),
  heroImageTitle: z.string().min(1),
  metrics: z.array(HomepageMetric).min(1),
  trustBlocks: z.array(HomepageImageBlock).min(1),
  capabilityEyebrow: z.string().min(1),
  capabilityTitle: z.string().min(1),
  capabilityBlocks: z.array(HomepageImageBlock).min(1),
  categoryEyebrow: z.string().min(1),
  categoryTitle: z.string().min(1),
  featuredCategories: z.array(HomepageCategoryBlock).min(1),
  detailEyebrow: z.string().min(1),
  detailTitle: z.string().min(1),
  detailBody: z.string().min(1),
  detailCtaLabel: z.string().min(1),
  detailCtaHref: z.string().min(1),
  detailBlocks: z.array(HomepageImageBlock).min(1),
  catalogEyebrow: z.string().min(1),
  catalogTitle: z.string().min(1),
  operationsEyebrow: z.string().min(1),
  operationsTitle: z.string().min(1),
  operations: z.array(z.string().min(1)).min(1),
}).passthrough();

export type AdminUpdateHomepageType = z.infer<typeof AdminUpdateHomepage>;
