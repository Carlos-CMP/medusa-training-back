import { readFile } from "fs/promises";
import path from "path";
import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createCollectionsWorkflow,
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  createSalesChannelsWorkflow,
} from "@medusajs/medusa/core-flows";
import { upsertProductPackagingWorkflow } from "../workflows/product-packaging/workflows";

type NovisoundRow = Record<string, string>;

const DEFAULT_CSV_PATH = path.resolve(
  process.cwd(),
  "..",
  "..",
  "..",
  "novisound_medusa_products.csv"
);

const IMAGE_BASE_URL = (
  process.env.NOVISOUND_IMAGE_BASE_URL ||
  `${
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_STOREFRONT_URL ||
    "https://b2b-novicell.medusajs.site"
  }/images/novisound`
).replace(/\/$/, "");

const IMAGE_BY_HANDLE: Record<string, string> = {
  "novisound-tower-pro-x1": "products/novisound-tower-pro-x1.png",
  "novisound-studio-pair-s5": "products/novisound-studio-pair-s5.png",
  "novisound-boom-go-b8": "products/novisound-boom-go-b8.png",
  "novisound-cinema-bar-c12": "products/novisound-cinema-bar-c12.png",
  "novisound-amplifier-a500": "products/novisound-amplifier-a500.png",
  "novisound-wireless-mic-m2": "products/novisound-wireless-mic-m2.png",
  "novisound-soundbar-suite-s900": "products/novisound-soundbar-suite-s900.png",
};

const parseCsv = (content: string): NovisoundRow[] => {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const nextCharacter = content[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === "," && !quoted) {
      row.push(field);
      field = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      row.push(field);
      field = "";

      if (row.some((value) => value.trim())) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    field += character;
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [headers = [], ...dataRows] = rows;

  return dataRows.map((dataRow) =>
    headers.reduce<NovisoundRow>((acc, header, index) => {
      acc[header.replace(/^\uFEFF/, "")] = dataRow[index] || "";
      return acc;
    }, {})
  );
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const unique = <T,>(items: T[]) => [...new Set(items)];

const centsToAmount = (value: string) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount / 100 : 0;
};

const numberOrNull = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseSpecs = (value: string) => {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
};

const categoryName = (value: string) => {
  const segments = value.split(">").map((segment) => segment.trim());
  return segments[segments.length - 1] || value;
};

const imageUrl = (handle: string) => {
  const filename = IMAGE_BY_HANDLE[handle];
  return filename ? `${IMAGE_BASE_URL}/${filename}` : "";
};

const ensureDefaultSalesChannel = async (
  container: MedusaContainer,
  query: any
) => {
  const { data: existingSalesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
    pagination: {
      take: 1,
    },
  });

  if (existingSalesChannels[0]) {
    return existingSalesChannels[0] as { id: string };
  }

  const {
    result: [createdSalesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [
        {
          name: "Default Sales Channel",
          description: "Created by Novisound import",
        },
      ],
    },
  });

  return createdSalesChannel;
};

const ensureCategories = async (
  container: MedusaContainer,
  query: any,
  rows: NovisoundRow[]
) => {
  const names = unique(rows.map((row) => categoryName(row.categories)));
  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
    filters: {
      name: names,
    },
  });
  const categoryByName = new Map<string, string>(
    existingCategories.map((category: any) => [
      category.name as string,
      category.id as string,
    ])
  );
  const missingCategories = names.filter((name) => !categoryByName.has(name));

  if (missingCategories.length) {
    const { result: createdCategories } =
      await createProductCategoriesWorkflow(container).run({
        input: {
          product_categories: missingCategories.map((name) => ({
            name,
            handle: slugify(`novisound-${name}`),
            is_active: true,
          })),
        },
      });

    for (const category of createdCategories) {
      categoryByName.set(category.name, category.id);
    }
  }

  return categoryByName;
};

const ensureCollections = async (
  container: MedusaContainer,
  query: any,
  rows: NovisoundRow[]
) => {
  const titles = unique(rows.map((row) => row.collection).filter(Boolean));
  const { data: existingCollections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "title"],
    filters: {
      title: titles,
    },
  });
  const collectionByTitle = new Map<string, string>(
    existingCollections.map((collection: any) => [
      collection.title as string,
      collection.id as string,
    ])
  );
  const missingCollections = titles.filter(
    (title) => !collectionByTitle.has(title)
  );

  if (missingCollections.length) {
    const { result: createdCollections } = await createCollectionsWorkflow(
      container
    ).run({
      input: {
        collections: missingCollections.map((title) => ({
          title,
          handle: slugify(title),
        })),
      },
    });

    for (const collection of createdCollections) {
      collectionByTitle.set(collection.title, collection.id);
    }
  }

  return collectionByTitle;
};

export default async function import_novisound_products({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const csvPath = process.env.NOVISOUND_CSV_PATH || DEFAULT_CSV_PATH;
  const rows = parseCsv(await readFile(csvPath, "utf-8")).filter(
    (row) => row.handle && row.sku
  );

  if (!rows.length) {
    logger.warn(`Novisound import skipped; no rows found in ${csvPath}.`);
    return;
  }

  const handles = rows.map((row) => row.handle);
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: {
      handle: handles,
    },
  });
  const existingHandles = new Set(
    existingProducts
      .map((product: any) => product.handle as string | undefined)
      .filter(Boolean)
  );
  const rowsToCreate = rows.filter((row) => !existingHandles.has(row.handle));

  if (!rowsToCreate.length) {
    logger.info("Novisound import skipped; all products already exist.");
  } else {
    const defaultSalesChannel = await ensureDefaultSalesChannel(
      container,
      query
    );
    const categoryByName = await ensureCategories(container, query, rowsToCreate);
    const collectionByTitle = await ensureCollections(
      container,
      query,
      rowsToCreate
    );
    const colors = unique(rowsToCreate.map((row) => row.color || "Unico"));
    const {
      result: [colorOption],
    } = await createProductOptionsWorkflow(container).run({
      input: {
        product_options: [
          {
            title: "Color Novisound",
            values: colors,
          },
        ],
      },
    });
    const valueId = (value: string) =>
      colorOption.values!.find((optionValue) => optionValue.value === value)!
        .id;

    for (const row of rowsToCreate) {
      const category = categoryName(row.categories);
      const image = imageUrl(row.handle);
      const metadata = {
        brand: row.brand,
        // The storefront only lists products whose brand/handle/etc. contain
        // "novisound" (see isNovisoundCatalogProduct in medusa-training).
        // Set explicitly so the gate passes regardless of the CSV's brand column.
        sync_scope: "novisound",
        model: row.model,
        product_type: row.product_type,
        tags: row.tags,
        ean: row.ean,
        cost_price: centsToAmount(row.cost_price),
        inventory_quantity: numberOrNull(row.inventory_quantity),
        allow_backorder: row.allow_backorder === "true",
        track_inventory: row.track_inventory === "true",
        material: row.material,
        color: row.color,
        connectivity: row.connectivity,
        power_watts: row.power_watts,
        frequency_response: row.frequency_response,
        impedance: row.impedance,
        sensitivity: row.sensitivity,
        warranty_months: numberOrNull(row.warranty_months),
        minimum_order_quantity: numberOrNull(row.minimum_order_quantity),
        lead_time_days: numberOrNull(row.lead_time_days),
        specifications: parseSpecs(row.specifications_json),
      };

      await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              title: row.title,
              subtitle: row.subtitle || undefined,
              handle: row.handle,
              collection_id:
                collectionByTitle.get(row.collection) || undefined,
              category_ids: [categoryByName.get(category)!],
              description: row.description || undefined,
              weight: numberOrNull(row.weight_grams) || undefined,
              length: numberOrNull(row.length_mm) || undefined,
              width: numberOrNull(row.width_mm) || undefined,
              height: numberOrNull(row.height_mm) || undefined,
              status:
                row.status === "draft"
                  ? ProductStatus.DRAFT
                  : ProductStatus.PUBLISHED,
              thumbnail: image || undefined,
              images: image ? [{ url: image }] : [],
              metadata,
              options: [
                {
                  id: colorOption.id,
                  value_ids: [valueId(row.color || "Unico")],
                },
              ],
              variants: [
                {
                  title: row.variant_title || row.title,
                  sku: row.sku,
                  ean: row.ean || undefined,
                  manage_inventory: false,
                  metadata,
                  options: {
                    [colorOption.title]: row.color || "Unico",
                  },
                  prices: [
                    {
                      amount: centsToAmount(row.price),
                      currency_code: row.currency_code || "eur",
                    },
                  ],
                },
              ],
              sales_channels: [
                {
                  id: defaultSalesChannel.id,
                },
              ],
            },
          ],
        },
      });

      logger.info(`Created Novisound product ${row.handle}.`);
    }
  }

  const skus = rows.map((row) => row.sku);
  const { data: variants } = await query.graph({
    entity: "variant",
    fields: ["id", "sku"],
    filters: {
      sku: skus,
    },
  });
  const variantBySku = new Map(
    variants.map((variant: any) => [variant.sku as string, variant.id as string])
  );

  for (const row of rows) {
    const variantId = variantBySku.get(row.sku);

    if (!variantId) {
      logger.warn(`Packaging skipped; variant not found for ${row.sku}.`);
      continue;
    }

    const minimumOrderQuantity =
      numberOrNull(row.minimum_order_quantity) || 1;
    const unitsPerBox = Math.max(minimumOrderQuantity, 1);

    await upsertProductPackagingWorkflow(container).run({
      input: {
        variant_id: variantId,
        sales_unit: unitsPerBox > 1 ? "box" : "unit",
        minimum_order_quantity: minimumOrderQuantity,
        quantity_increment: minimumOrderQuantity,
        units_per_box: unitsPerBox,
        boxes_per_pallet: Math.max(Math.floor(72 / unitsPerBox), 1),
        package_weight: numberOrNull(row.weight_grams),
        package_dimensions: `${row.length_mm} x ${row.width_mm} x ${row.height_mm} mm`,
      },
    });
  }

  logger.info(
    `Novisound import finished. Products created: ${rowsToCreate.length}. Packaging checked: ${rows.length}.`
  );
}
