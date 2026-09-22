import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { adminHeaders, createAdminUser } from "../../utils/admin";
import {
  productSeeder,
  regionSeeder,
  salesChannelSeeder,
} from "../../utils/seeder";
import {
  generatePublishableKey,
  generateStoreHeaders,
} from "../../utils/store";

jest.setTimeout(60 * 1000);

const createCatalogRule = async ({ api, data }: { api: any; data: any }) => {
  const payload = Object.fromEntries(
    Object.entries({
      name: "B2B catalog rule",
      status: "active",
      priority: 10,
      rule_type: "price",
      target_type: "product",
      effect_type: "discount_percentage",
      discount_percentage: 10,
      minimum_quantity: 1,
      ...data,
    }).filter(([, value]) => value !== undefined)
  );

  return (
    await api.post(
      "/admin/catalog-rules",
      payload,
      adminHeaders
    )
  ).data.catalog_rule;
};

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let storeHeaders;
    let product;
    let variant;
    let region;
    let salesChannel;

    beforeEach(async () => {
      const container = getContainer();
      await createAdminUser(adminHeaders, container);
      const publishableKey = await generatePublishableKey(container);
      storeHeaders = generateStoreHeaders({ publishableKey });

      region = await regionSeeder({
        api,
        adminHeaders,
        data: {
          name: "B2B Europe",
          currency_code: "eur",
        },
      });
      salesChannel = await salesChannelSeeder({
        api,
        adminHeaders,
        data: {
          name: "B2B distributors",
        },
      });

      product = await productSeeder({
        api,
        adminHeaders,
        data: {
          sales_channels: [{ id: salesChannel.id }],
        },
      });
      product = (
        await api.post(
          `/admin/products/${product.id}`,
          { status: "published" },
          adminHeaders
        )
      ).data.product;
      variant = product.variants[0];

      await api.post(
        `/admin/api-keys/${publishableKey.id}/sales-channels`,
        { add: [salesChannel.id] },
        adminHeaders
      );
    });

    describe("catalog rule admin API", () => {
      it("creates and lists B2B catalog rules", async () => {
        const catalogRule = await createCatalogRule({
          api,
          data: {
            name: "Distribuidor zona norte",
            target_id: product.id,
            region_id: region.id,
            sales_channel_id: salesChannel.id,
            zone_code: "norte",
            currency_code: "eur",
            discount_percentage: 12,
            metadata: {
              source: "integration-test",
            },
          },
        });

        expect(catalogRule).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            name: "Distribuidor zona norte",
            target_id: product.id,
            region_id: region.id,
            sales_channel_id: salesChannel.id,
            zone_code: "norte",
            currency_code: "eur",
            discount_percentage: 12,
          })
        );

        const response = await api.get(
          `/admin/catalog-rules?id=${catalogRule.id}`,
          adminHeaders
        );

        expect(response.status).toBe(200);
        expect(response.data.catalog_rules).toHaveLength(1);
        expect(response.data.catalog_rules[0].id).toBe(catalogRule.id);
      });
    });

    describe("GET /store/catalog-rules", () => {
      it("returns only active rules that match target and B2B context", async () => {
        const matchingRule = await createCatalogRule({
          api,
          data: {
            name: "Precio instalador Europa",
            target_id: product.id,
            region_id: region.id,
            sales_channel_id: salesChannel.id,
            zone_code: "eu-west",
            currency_code: "eur",
            discount_percentage: 15,
          },
        });
        const variantRule = await createCatalogRule({
          api,
          data: {
            name: "Precio fijo variante",
            priority: 5,
            target_type: "variant",
            target_id: variant.id,
            region_id: region.id,
            sales_channel_id: salesChannel.id,
            zone_code: "eu-west",
            currency_code: "eur",
            effect_type: "fixed_price",
            fixed_price: 77.5,
            discount_percentage: undefined,
          },
        });

        await createCatalogRule({
          api,
          data: {
            name: "Otra region",
            target_id: product.id,
            region_id: "reg_other",
            sales_channel_id: salesChannel.id,
            zone_code: "eu-west",
            currency_code: "eur",
          },
        });
        await createCatalogRule({
          api,
          data: {
            name: "Canal oculto",
            target_id: product.id,
            region_id: region.id,
            sales_channel_id: "sc_other",
            zone_code: "eu-west",
            currency_code: "eur",
          },
        });
        await createCatalogRule({
          api,
          data: {
            name: "Borrador no aplicable",
            status: "draft",
            target_id: product.id,
            region_id: region.id,
            sales_channel_id: salesChannel.id,
            zone_code: "eu-west",
            currency_code: "eur",
          },
        });

        const response = await api.get(
          `/store/catalog-rules?product_id=${product.id}&variant_id=${variant.id}&region_id=${region.id}&sales_channel_id=${salesChannel.id}&zone_code=eu-west&currency_code=eur`,
          storeHeaders
        );
        const applicableRuleIds = response.data.applicable_rules.map(
          (rule) => rule.id
        );

        expect(response.status).toBe(200);
        expect(response.data.context).toMatchObject({
          product_id: product.id,
          variant_id: variant.id,
          region_id: region.id,
          sales_channel_id: salesChannel.id,
          zone_code: "eu-west",
          currency_code: "eur",
        });
        expect(applicableRuleIds).toEqual([variantRule.id, matchingRule.id]);
      });

      it("ignores expired, future and archived rules", async () => {
        const activeRule = await createCatalogRule({
          api,
          data: {
            name: "Regla vigente",
            target_id: product.id,
          },
        });

        await createCatalogRule({
          api,
          data: {
            name: "Regla caducada",
            target_id: product.id,
            ends_at: "2020-01-01T00:00:00.000Z",
          },
        });
        await createCatalogRule({
          api,
          data: {
            name: "Regla futura",
            target_id: product.id,
            starts_at: "2999-01-01T00:00:00.000Z",
          },
        });
        await createCatalogRule({
          api,
          data: {
            name: "Regla archivada",
            status: "archived",
            target_id: product.id,
          },
        });

        const response = await api.get(
          `/store/catalog-rules?product_id=${product.id}`,
          storeHeaders
        );

        expect(response.data.applicable_rules.map((rule) => rule.id)).toEqual([
          activeRule.id,
        ]);
      });
    });
  },
});
