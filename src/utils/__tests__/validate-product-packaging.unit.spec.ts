import {
  PackagingRule,
  validateProductPackagingLineQuantities,
} from "../validate-product-packaging";

const variantId = "variant_ngs_pro_12a_black";

const rule: PackagingRule = {
  variant_id: variantId,
  minimum_order_quantity: 6,
  quantity_increment: 6,
  units_per_box: 6,
};

const rulesByVariantId = new Map([[variantId, rule]]);

describe("validateProductPackagingLineQuantities", () => {
  it("accepts valid unit quantities that respect minimum and increment", () => {
    expect(() =>
      validateProductPackagingLineQuantities(
        [
          {
            variant_id: variantId,
            quantity: 12,
            metadata: {
              purchase_unit: "unit",
            },
          },
        ],
        rulesByVariantId
      )
    ).not.toThrow();
  });

  it("rejects quantities below the B2B minimum", () => {
    expect(() =>
      validateProductPackagingLineQuantities(
        [
          {
            variant_id: variantId,
            quantity: 3,
          },
        ],
        rulesByVariantId
      )
    ).toThrow("Minimum order quantity for this variant is 6 units.");
  });

  it("rejects quantities that are not valid packaging increments", () => {
    expect(() =>
      validateProductPackagingLineQuantities(
        [
          {
            variant_id: variantId,
            quantity: 8,
          },
        ],
        rulesByVariantId
      )
    ).toThrow("Quantity for this variant must be a multiple of 6.");
  });

  it("accepts box purchases when packages match units per box", () => {
    expect(() =>
      validateProductPackagingLineQuantities(
        [
          {
            variant_id: variantId,
            quantity: 12,
            metadata: {
              purchase_unit: "box",
              package_quantity: 2,
            },
          },
        ],
        rulesByVariantId
      )
    ).not.toThrow();
  });

  it("rejects box purchases without package quantity metadata", () => {
    expect(() =>
      validateProductPackagingLineQuantities(
        [
          {
            variant_id: variantId,
            quantity: 12,
            metadata: {
              purchase_unit: "box",
            },
          },
        ],
        rulesByVariantId
      )
    ).toThrow("Box purchases must include package quantity.");
  });

  it("rejects box purchases when package count does not match line quantity", () => {
    expect(() =>
      validateProductPackagingLineQuantities(
        [
          {
            variant_id: variantId,
            quantity: 12,
            metadata: {
              purchase_unit: "box",
              package_quantity: 1,
            },
          },
        ],
        rulesByVariantId
      )
    ).toThrow("Box quantity must equal packages multiplied by 6 units per box.");
  });

  it("accepts zero quantity only when cart updates explicitly allow it", () => {
    expect(() =>
      validateProductPackagingLineQuantities(
        [
          {
            variant_id: variantId,
            quantity: 0,
          },
        ],
        rulesByVariantId,
        { allowZeroQuantity: true }
      )
    ).not.toThrow();
  });

  it("rejects zero quantity for add-to-cart operations", () => {
    expect(() =>
      validateProductPackagingLineQuantities(
        [
          {
            variant_id: variantId,
            quantity: 0,
          },
        ],
        rulesByVariantId
      )
    ).toThrow("Quantity must be a positive integer.");
  });

  it("falls back to metadata rules when no stored packaging rule exists", () => {
    expect(() =>
      validateProductPackagingLineQuantities(
        [
          {
            variant_id: "variant_without_rule",
            quantity: 24,
            metadata: {
              minimum_order_quantity: 12,
              quantity_increment: 12,
              units_per_box: 12,
              purchase_unit: "box",
              package_quantity: 2,
            },
          },
        ],
        rulesByVariantId
      )
    ).not.toThrow();
  });
});
