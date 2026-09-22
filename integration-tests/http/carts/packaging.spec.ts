import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import {
  adminHeaders,
  createAdminUser,
  createStoreUser,
} from "../../utils/admin";
import {
  cartSeeder,
  productSeeder,
  regionSeeder,
  salesChannelSeeder,
} from "../../utils/seeder";
import {
  generatePublishableKey,
  generateStoreHeaders,
} from "../../utils/store";

jest.setTimeout(60 * 1000);

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let storeHeaders, cart, product, salesChannel, region, variant;

    beforeEach(async () => {
      const container = getContainer();
      await createAdminUser(adminHeaders, container);
      const publishableKey = await generatePublishableKey(container);
      storeHeaders = generateStoreHeaders({ publishableKey });
      const res = await createStoreUser({ api, storeHeaders });
      storeHeaders.headers["Authorization"] = `Bearer ${res.token}`;

      region = await regionSeeder({ api, adminHeaders, data: {} });
      salesChannel = await salesChannelSeeder({
        api,
        adminHeaders,
        data: {},
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

      await api.post(
        "/admin/product-packaging",
        {
          variant_id: variant.id,
          sales_unit: "box",
          minimum_order_quantity: 6,
          quantity_increment: 6,
          units_per_box: 6,
          boxes_per_pallet: 24,
          package_weight: 4200,
          package_dimensions: "600x355x350 mm",
        },
        adminHeaders
      );

      cart = await cartSeeder({
        api,
        storeHeaders,
        data: {
          region_id: region.id,
          sales_channel_id: salesChannel.id,
        },
      });
    });

    describe("POST /store/carts/:id/line-items/bulk", () => {
      it("adds valid B2B packaged quantities", async () => {
        const response = await api.post(
          `/store/carts/${cart.id}/line-items/bulk`,
          {
            line_items: [
              {
                variant_id: variant.id,
                quantity: 12,
                metadata: {
                  purchase_unit: "box",
                  package_quantity: 2,
                },
              },
            ],
          },
          storeHeaders
        );

        expect(response.status).toEqual(200);
        expect(response.data.cart.items).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              variant_id: variant.id,
              quantity: 12,
            }),
          ])
        );
      });

      it("rejects quantities that do not match packaging increments", async () => {
        const { response } = await api
          .post(
            `/store/carts/${cart.id}/line-items/bulk`,
            {
              line_items: [
                {
                  variant_id: variant.id,
                  quantity: 8,
                },
              ],
            },
            storeHeaders
          )
          .catch((e) => e);

        expect(response.data).toMatchObject({
          type: "invalid_data",
          message: "Quantity for this variant must be a multiple of 6.",
        });
      });
    });

    describe("POST /store/carts/:id/line-items/:line_id/b2b", () => {
      it("validates later cart quantity edits against packaging rules", async () => {
        const {
          data: { cart: cartWithLine },
        } = await api.post(
          `/store/carts/${cart.id}/line-items/bulk`,
          {
            line_items: [
              {
                variant_id: variant.id,
                quantity: 6,
                metadata: {
                  purchase_unit: "unit",
                },
              },
            ],
          },
          storeHeaders
        );

        const lineItem = cartWithLine.items[0];
        const invalidUpdate = await api
          .post(
            `/store/carts/${cart.id}/line-items/${lineItem.id}/b2b`,
            {
              quantity: 5,
            },
            storeHeaders
          )
          .catch((e) => e);

        expect(invalidUpdate.response.data).toMatchObject({
          type: "invalid_data",
          message: "Minimum order quantity for this variant is 6 units.",
        });

        const validUpdate = await api.post(
          `/store/carts/${cart.id}/line-items/${lineItem.id}/b2b`,
          {
            quantity: 12,
            metadata: {
              purchase_unit: "unit",
            },
          },
          storeHeaders
        );

        expect(validUpdate.status).toEqual(200);
        expect(validUpdate.data.cart.items).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: lineItem.id,
              quantity: 12,
            }),
          ])
        );
      });
    });
  },
});
