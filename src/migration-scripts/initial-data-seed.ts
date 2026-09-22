import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function initial_data_seed({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  );

  const countries = ["gb", "de", "dk", "se", "fr", "es", "it"];
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: {
      title: "NGS WILD SPACE 3 | Altavoz party speaker profesional",
    },
    pagination: {
      take: 1,
    },
  });

  if (existingProducts.length) {
    logger.info("Initial NGS seed data already exists. Skipping seed.");
    return;
  }

  logger.info("Seeding store data...");
  const {
    result: [defaultSalesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [
        {
          name: "Default Sales Channel",
          description: "Created by Medusa",
        },
      ],
    },
  });

  const {
    result: [publishableApiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: "Default Publishable API Key",
          type: "publishable",
          created_by: "",
        },
      ],
    },
  });

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel.id],
    },
  });

  const {
    result: [store],
  } = await createStoresWorkflow(container).run({
    input: {
      stores: [
        {
          name: "Default Store",
          supported_currencies: [
            {
              currency_code: "eur",
              is_default: true,
            },
            {
              currency_code: "usd",
              is_default: false,
            },
          ],
          default_sales_channel_id: defaultSalesChannel.id,
        },
      ],
    },
  });

  logger.info("Seeding region data...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Europe",
          currency_code: "eur",
          countries,
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const region = regionResult[0];
  logger.info("Finished seeding regions.");

  logger.info("Seeding tax regions...");
  await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code,
      provider_id: "tp_system",
    })),
  });
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding stock location data...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "European Warehouse",
          address: {
            city: "Copenhagen",
            country_code: "DK",
            address_1: "",
          },
        },
      ],
    },
  });
  const stockLocation = stockLocationResult[0];

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  logger.info("Seeding fulfillment data...");
  const { result: shippingProfileResult } =
    await createShippingProfilesWorkflow(container).run({
      input: {
        data: [
          {
            name: "Default",
            type: "default",
          },
        ],
      },
    });
  const shippingProfile = shippingProfileResult[0];

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "European Warehouse delivery",
    type: "shipping",
    service_zones: [
      {
        name: "Europe",
        geo_zones: [
          {
            country_code: "gb",
            type: "country",
          },
          {
            country_code: "de",
            type: "country",
          },
          {
            country_code: "dk",
            type: "country",
          },
          {
            country_code: "se",
            type: "country",
          },
          {
            country_code: "fr",
            type: "country",
          },
          {
            country_code: "es",
            type: "country",
          },
          {
            country_code: "it",
            type: "country",
          },
        ],
      },
    ],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Ship in 2-3 days.",
          code: "standard",
        },
        prices: [
          {
            currency_code: "usd",
            amount: 10,
          },
          {
            currency_code: "eur",
            amount: 10,
          },
          {
            region_id: region.id,
            amount: 10,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Express Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Ship in 24 hours.",
          code: "express",
        },
        prices: [
          {
            currency_code: "usd",
            amount: 10,
          },
          {
            currency_code: "eur",
            amount: 10,
          },
          {
            region_id: region.id,
            amount: 10,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  });
  logger.info("Finished seeding fulfillment data.");

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel.id],
    },
  });
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding product data...");
  const {
    result: [collection],
  } = await createCollectionsWorkflow(container).run({
    input: {
      collections: [
        {
          title: "Destacados B2B",
          handle: "destacados-b2b",
        },
      ],
    },
  });

  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        {
          name: "Audio",
          is_active: true,
        },
        {
          name: "PC y Gaming",
          is_active: true,
        },
        {
          name: "Movilidad",
          is_active: true,
        },
        {
          name: "Accesorios",
          is_active: true,
        },
      ],
    },
  });

  const { result: productOptions } = await createProductOptionsWorkflow(
    container
  ).run({
    input: {
      product_options: [
        {
          title: "Storage",
          values: ["256 GB", "512 GB"],
        },
        {
          title: "Memory",
          values: ["256 GB", "512 GB"],
        },
        {
          title: "Color",
          values: ["Blue", "Red", "Black", "White", "Purple"],
        },
      ],
    },
  });

  const storageOption = productOptions.find((o) => o.title === "Storage")!;
  const memoryOption = productOptions.find((o) => o.title === "Memory")!;
  const colorOption = productOptions.find((o) => o.title === "Color")!;

  const valueId = (
    option: (typeof productOptions)[number],
    value: string
  ): string => option.values!.find((v) => v.value === value)!.id;

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "NGS WILD SPACE 3 | Altavoz party speaker profesional",
          collection_id: collection.id,
          category_ids: [
            categoryResult.find((cat) => cat.name === "Audio")?.id!,
          ],
          description:
            "Altavoz NGS orientado a canal retail y distribuidores, con foco en rotacion, disponibilidad y compra por volumen para campanas de audio.",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/laptop-front.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/laptop-side.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/laptop-top.png",
            },
          ],
          options: [
            {
              id: storageOption.id,
              value_ids: [
                valueId(storageOption, "256 GB"),
                valueId(storageOption, "512 GB"),
              ],
            },
            {
              id: colorOption.id,
              value_ids: [
                valueId(colorOption, "Black"),
                valueId(colorOption, "Red"),
              ],
            },
          ],
          variants: [
            {
              title: "Caja 1 unidad / Negro",
              sku: "NGS-WILD-SPACE-3-BLK",
              options: {
                Storage: "256 GB",
                Color: "Black",
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 271.2,
                  currency_code: "eur",
                },
                {
                  amount: 271.2,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "Caja 1 unidad / Rojo",
              sku: "NGS-WILD-SPACE-3-RED",
              options: {
                Storage: "512 GB",
                Color: "Red",
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 279.2,
                  currency_code: "eur",
                },
                {
                  amount: 279.2,
                  currency_code: "usd",
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

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "NGS XPRESSCAM 1080 | Webcam profesional",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Accesorios")?.id!,
          ],
          description:
            "Webcam 1080p para empresas, educacion y distribuidores IT. Producto adecuado para reposición recurrente y packs por volumen.",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/camera-front.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/camera-side.png",
            },
          ],
          options: [
            {
              id: colorOption.id,
              value_ids: [
                valueId(colorOption, "Black"),
                valueId(colorOption, "White"),
              ],
            },
          ],
          variants: [
            {
              title: "XPRESSCAM 1080 Black",
              sku: "NGS-XPRESSCAM-1080-BLK",
              options: {
                Color: "Black",
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 47.92,
                  currency_code: "eur",
                },
                {
                  amount: 47.92,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "XPRESSCAM 1080 White",
              sku: "NGS-XPRESSCAM-1080-WHT",
              options: {
                Color: "White",
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 51.92,
                  currency_code: "eur",
                },
                {
                  amount: 51.92,
                  currency_code: "usd",
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

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "NGS POWERPUMP 10W | Powerbank movilidad",
          collection_id: collection.id,
          category_ids: [
            categoryResult.find((cat) => cat.name === "Movilidad")?.id!,
          ],
          description:
            "Powerbank NGS para canal movilidad, ideal para compra por caja, programas de empresa y promociones retail.",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/phone-front.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/phone-side.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/phone-bottom.png",
            },
          ],
          options: [
            {
              id: memoryOption.id,
              value_ids: [
                valueId(memoryOption, "256 GB"),
                valueId(memoryOption, "512 GB"),
              ],
            },
            {
              id: colorOption.id,
              value_ids: [
                valueId(colorOption, "Purple"),
                valueId(colorOption, "Red"),
              ],
            },
          ],
          variants: [
            {
              title: "POWERPUMP 10W Purple",
              sku: "NGS-POWERPUMP-10W-PUR",
              options: {
                Memory: "256 GB",
                Color: "Purple",
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 24.9,
                  currency_code: "eur",
                },
                {
                  amount: 24.9,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "POWERPUMP 10W Red",
              sku: "NGS-POWERPUMP-10W-RED",
              options: {
                Memory: "256 GB",
                Color: "Red",
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 22.9,
                  currency_code: "eur",
                },
                {
                  amount: 22.9,
                  currency_code: "usd",
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

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "NGS GMX-27 | Monitor gaming distribución",
          collection_id: collection.id,
          category_ids: [
            categoryResult.find((cat) => cat.name === "PC y Gaming")?.id!,
          ],
          description:
            "Monitor gaming NGS para surtido de canal, con disponibilidad y precio B2B por region para pedidos recurrentes.",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/screen-front.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/screen-side.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/screen-top.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/screen-back.png",
            },
          ],
          options: [
            {
              id: colorOption.id,
              value_ids: [
                valueId(colorOption, "White"),
                valueId(colorOption, "Black"),
              ],
            },
          ],
          variants: [
            {
              title: "GMX-27 White",
              sku: "NGS-GMX-27-WHT",
              options: {
                Color: "White",
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 159.9,
                  currency_code: "eur",
                },
                {
                  amount: 159.9,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "GMX-27 Black",
              sku: "NGS-GMX-27-BLK",
              options: {
                Color: "Black",
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 149.9,
                  currency_code: "eur",
                },
                {
                  amount: 149.9,
                  currency_code: "usd",
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

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "NGS GHX-600 | Auricular gaming",
          collection_id: collection.id,
          category_ids: [
            categoryResult.find((cat) => cat.name === "Audio")?.id!,
          ],
          description: `Auricular gaming NGS para lineales retail, bundles y reposición por volumen en cuentas B2B.`,
          weight: 400,
          status: ProductStatus.PUBLISHED,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/headphone-front.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/headphone-side.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/headphone-top.png",
            },
          ],
          options: [
            {
              id: colorOption.id,
              value_ids: [
                valueId(colorOption, "Black"),
                valueId(colorOption, "White"),
              ],
            },
          ],
          variants: [
            {
              title: "GHX-600 Black",
              sku: "NGS-GHX-600-BLK",
              options: {
                Color: "Black",
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 31.99,
                  currency_code: "eur",
                },
                {
                  amount: 31.99,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "GHX-600 White",
              sku: "NGS-GHX-600-WHT",
              options: {
                Color: "White",
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 34.99,
                  currency_code: "eur",
                },
                {
                  amount: 34.99,
                  currency_code: "usd",
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

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "NGS FUNKY KIT | Teclado y ratón profesional",
          category_ids: [
            categoryResult.find((cat) => cat.name === "PC y Gaming")?.id!,
          ],
          description: `Pack teclado y ratón NGS para empresas, aulas, integradores y distribuidores IT.`,
          weight: 400,
          status: ProductStatus.PUBLISHED,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/keyboard-front.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/keyboard-side.png",
            },
          ],
          options: [
            {
              id: colorOption.id,
              value_ids: [
                valueId(colorOption, "Black"),
                valueId(colorOption, "White"),
              ],
            },
          ],
          variants: [
            {
              title: "FUNKY KIT Black",
              sku: "NGS-FUNKY-KIT-BLK",
              options: {
                Color: "Black",
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 18.9,
                  currency_code: "eur",
                },
                {
                  amount: 18.9,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "FUNKY KIT White",
              sku: "NGS-FUNKY-KIT-WHT",
              options: {
                Color: "White",
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 19.9,
                  currency_code: "eur",
                },
                {
                  amount: 19.9,
                  currency_code: "usd",
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

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "NGS EVO MOUSE | Ratón inalámbrico",
          category_ids: [
            categoryResult.find((cat) => cat.name === "PC y Gaming")?.id!,
          ],
          description: `Ratón inalámbrico NGS para pedidos por lote, renovación de puestos y canal informático.`,
          weight: 400,
          status: ProductStatus.PUBLISHED,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/mouse-top.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/mouse-front.png",
            },
          ],
          options: [
            {
              id: colorOption.id,
              value_ids: [
                valueId(colorOption, "Black"),
                valueId(colorOption, "White"),
              ],
            },
          ],
          variants: [
            {
              title: "EVO MOUSE Black",
              sku: "NGS-EVO-MOUSE-BLK",
              options: {
                Color: "Black",
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 9.9,
                  currency_code: "eur",
                },
                {
                  amount: 9.9,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "EVO MOUSE White",
              sku: "NGS-EVO-MOUSE-WHT",
              options: {
                Color: "White",
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 10.9,
                  currency_code: "eur",
                },
                {
                  amount: 10.9,
                  currency_code: "usd",
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

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "NGS WILD BASH COMPACT | Altavoz portátil",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Audio")?.id!,
          ],
          description: `Altavoz compacto NGS con precio B2B, buen margen y alta rotacion para distribuidores.`,
          weight: 400,
          status: ProductStatus.PUBLISHED,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/speaker-top.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/speaker-front.png",
            },
          ],
          options: [
            {
              id: colorOption.id,
              value_ids: [
                valueId(colorOption, "Black"),
                valueId(colorOption, "White"),
              ],
            },
          ],
          variants: [
            {
              title: "WILD BASH COMPACT Black",
              sku: "NGS-WILD-BASH-COMPACT-BLK",
              options: {
                Color: "Black",
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 87.2,
                  currency_code: "eur",
                },
                {
                  amount: 87.2,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "WILD BASH COMPACT White",
              sku: "NGS-WILD-BASH-COMPACT-WHT",
              options: {
                Color: "White",
              },
              manage_inventory: false,
              prices: [
                {
                  amount: 89.2,
                  currency_code: "eur",
                },
                {
                  amount: 89.2,
                  currency_code: "usd",
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

  logger.info("Finished seeding product data.");
}
