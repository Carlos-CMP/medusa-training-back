import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { PRODUCT_PACKAGING_MODULE } from "../../../modules/product-packaging";

export type UpsertProductPackagingInput = {
  variant_id: string;
  sales_unit: "unit" | "box";
  minimum_order_quantity: number;
  quantity_increment: number;
  units_per_box: number;
  boxes_per_pallet?: number | null;
  package_weight?: number | null;
  package_dimensions?: string | null;
};

type ProductPackagingRecord = UpsertProductPackagingInput & {
  id: string;
};

export const upsertProductPackagingStep = createStep(
  "upsert-product-packaging",
  async (input: UpsertProductPackagingInput, { container }) => {
    const productPackagingModule = container.resolve<any>(
      PRODUCT_PACKAGING_MODULE
    );
    const [existing] = await productPackagingModule.listProductPackagings({
      variant_id: input.variant_id,
    });
    const previousData = existing ? { ...existing } : null;

    const data = {
      variant_id: input.variant_id,
      sales_unit: input.sales_unit,
      minimum_order_quantity: input.minimum_order_quantity,
      quantity_increment: input.quantity_increment,
      units_per_box: input.units_per_box,
      boxes_per_pallet: input.boxes_per_pallet ?? null,
      package_weight: input.package_weight ?? null,
      package_dimensions: input.package_dimensions ?? null,
    };

    const packaging = existing
      ? await productPackagingModule.updateProductPackagings({
          id: existing.id,
          ...data,
        })
      : await productPackagingModule.createProductPackagings(data);

    return new StepResponse(packaging, {
      createdId: existing ? null : packaging.id,
      previousData,
    });
  },
  async (
    rollbackData: {
      createdId: string | null;
      previousData: ProductPackagingRecord | null;
    },
    { container }
  ) => {
    const productPackagingModule = container.resolve<any>(
      PRODUCT_PACKAGING_MODULE
    );

    if (rollbackData.previousData) {
      await productPackagingModule.updateProductPackagings(
        rollbackData.previousData
      );
      return;
    }

    if (rollbackData.createdId) {
      await productPackagingModule.deleteProductPackagings([
        rollbackData.createdId,
      ]);
    }
  }
);
