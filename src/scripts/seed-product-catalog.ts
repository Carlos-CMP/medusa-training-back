import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  createSalesChannelsWorkflow,
} from "@medusajs/medusa/core-flows";
import { generatedProductCatalogProfiles } from "./generated-client-profiles/product-catalog-registry";

type ProfileProductCatalogRow = {
  handle: string;
  title: string;
  category: string;
  description?: string | null;
  sku: string;
  variant_title: string;
  color?: string | null;
  price_eur: number;
  image_url?: string | null;
};

type ProductGroup = {
  handle: string;
  title: string;
  category: string;
  description?: string | null;
  image_url?: string | null;
  rows: ProfileProductCatalogRow[];
};

const groupRowsByHandle = (rows: ProfileProductCatalogRow[]) => {
  return rows.reduce<Record<string, ProductGroup>>((acc, row) => {
    if (!acc[row.handle]) {
      acc[row.handle] = {
        handle: row.handle,
        title: row.title,
        category: row.category,
        description: row.description,
        image_url: row.image_url,
        rows: [],
      };
    }

    acc[row.handle].rows.push(row);

    return acc;
  }, {});
};

const unique = <T,>(items: T[]) => [...new Set(items)];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default async function seed_product_catalog({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const activeProfile =
    process.env.B2B_CLIENT_PROFILE ||
    process.env.NEXT_PUBLIC_B2B_CLIENT_PROFILE ||
    "ngs";
  const productCatalogProfiles =
    generatedProductCatalogProfiles as Record<
      string,
      ProfileProductCatalogRow[]
    >;
  const catalogRows =
    productCatalogProfiles[activeProfile] || productCatalogProfiles.ngs;

  if (!catalogRows?.length) {
    logger.warn(`No product catalog rows found for profile ${activeProfile}.`);
    return;
  }

  const productGroups = Object.values(groupRowsByHandle(catalogRows));
  const handles = productGroups.map((group) => group.handle);

  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: {
      handle: handles,
    },
  });
  const existingHandles = new Set(
    existingProducts
      .map((product) => product.handle as string | undefined)
      .filter(Boolean)
  );
  const productGroupsToCreate = productGroups.filter(
    (group) => !existingHandles.has(group.handle)
  );

  if (!productGroupsToCreate.length) {
    logger.info(
      `Product catalog seed skipped. All ${handles.length} ${activeProfile} products already exist.`
    );
    return;
  }

  const { data: existingSalesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
    pagination: {
      take: 1,
    },
  });
  let defaultSalesChannel: { id: string } | undefined =
    existingSalesChannels[0];

  if (!defaultSalesChannel) {
    const {
      result: [createdSalesChannel],
    } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
            description: "Created by product catalog seed",
          },
        ],
      },
    });

    defaultSalesChannel = createdSalesChannel;
  }

  const categories = unique(productGroupsToCreate.map((group) => group.category));
  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
    filters: {
      name: categories,
    },
  });
  const categoryByName = new Map(
    existingCategories.map((category) => [
      category.name as string,
      category.id as string,
    ])
  );
  const missingCategories = categories.filter(
    (category) => !categoryByName.has(category)
  );

  if (missingCategories.length) {
    const { result: createdCategories } =
      await createProductCategoriesWorkflow(container).run({
        input: {
          product_categories: missingCategories.map((category) => ({
            name: category,
            handle: slugify(category),
            is_active: true,
          })),
        },
      });

    for (const category of createdCategories) {
      categoryByName.set(category.name, category.id);
    }
  }

  const colorValues = unique(
    catalogRows
      .map((row) => row.color || row.variant_title)
      .filter(Boolean) as string[]
  );
  const {
    result: [colorOption],
  } = await createProductOptionsWorkflow(container).run({
    input: {
      product_options: [
        {
          title: `Color ${activeProfile}`,
          values: colorValues,
        },
      ],
    },
  });
  const valueId = (value: string) =>
    colorOption.values!.find((optionValue) => optionValue.value === value)!.id;

  for (const group of productGroupsToCreate) {
    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: group.title,
            handle: group.handle,
            category_ids: [
              categoryByName.get(group.category) ||
                categoryByName.get(group.category)!,
            ],
            description: group.description || undefined,
            status: ProductStatus.PUBLISHED,
            metadata: {
              brand: "Novisound",
            },
            images: group.image_url
              ? [
                  {
                    url: group.image_url,
                  },
                ]
              : [],
            options: [
              {
                id: colorOption.id,
                value_ids: unique(
                  group.rows.map((row) => row.color || row.variant_title)
                ).map(valueId),
              },
            ],
            variants: group.rows.map((row) => ({
              title: row.variant_title,
              sku: row.sku,
              options: {
                [colorOption.title]: row.color || row.variant_title,
              },
              manage_inventory: false,
              prices: [
                {
                  amount: row.price_eur,
                  currency_code: "eur",
                },
              ],
            })),
            sales_channels: [
              {
                id: defaultSalesChannel.id,
              },
            ],
          },
        ],
      },
    });
  }

  logger.info(
    `Seeded ${productGroupsToCreate.length} products and ${catalogRows.length} rows for ${activeProfile}.`
  );
}
