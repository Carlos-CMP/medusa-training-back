import { z } from "@medusajs/framework/zod";

const BrandProfileLink: z.ZodType<any> = z.lazy(() =>
  z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  enabled: z.boolean().optional(),
  children: z.array(BrandProfileLink).optional(),
})
);

const FooterColumn = z.object({
  title: z.string().min(1),
  links: z.array(BrandProfileLink).min(1),
});

const ProductPageContent = z
  .object({
    benefits: z
      .array(
        z.object({
          label: z.string().min(1),
        })
      )
      .optional(),
    supportPanels: z
      .array(
        z.object({
          title: z.string().min(1),
          body: z.string().min(1),
          action: z.string().min(1),
          href: z.string().min(1).optional(),
        })
      )
      .optional(),
  })
  .optional();

export const AdminUpdateBrandProfile = z.object({
  id: z.string().min(1),
  brand: z.object({
    name: z.string().min(1),
    legalName: z.string().min(1),
    tagline: z.string().min(1),
    logo: z.object({
      light: z.string(),
      dark: z.string(),
    }),
    colors: z.object({
      background: z.string().min(1),
      foreground: z.string().min(1),
      primary: z.string().min(1),
      accent: z.string().min(1),
      muted: z.string().min(1),
      border: z.string().min(1),
    }),
  }),
  seo: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
  }),
  markets: z.object({
    defaultCountryCode: z.string().min(2),
    languages: z.array(z.string().min(2)).min(1),
    currency: z.string().min(3),
  }),
  navigation: z.object({
    main: z.array(BrandProfileLink).min(1),
  }),
  footer: z.object({
    description: z.string().min(1),
    columns: z.array(FooterColumn).min(1),
  }),
  fallbacks: z.object({
    productCategoryLabel: z.string().min(1),
    productTechnicalDescription: z.string().min(1),
    productBrandKeywords: z.array(z.string().min(1)).min(1),
  }),
  productPage: ProductPageContent,
});

export type AdminUpdateBrandProfileType = z.infer<
  typeof AdminUpdateBrandProfile
>;
