import { createSelectParams } from "@medusajs/medusa/api/utils/validators";
import { z } from "@medusajs/framework/zod";

export type GetCartLineItemsBulkParamsType = z.infer<
  typeof GetCartLineItemsBulkParams
>;
export const GetCartLineItemsBulkParams = createSelectParams();

export type StoreAddLineItemsBulkType = z.infer<typeof StoreAddLineItemsBulk>;
export const StoreAddLineItemsBulk = z
  .object({
    line_items: z.array(
      z.object({
        variant_id: z.string(),
        quantity: z.number(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    ),
  })
  .strict();

export type StoreUpdateLineItemB2BType = z.infer<
  typeof StoreUpdateLineItemB2B
>;
export const StoreUpdateLineItemB2B = z
  .object({
    quantity: z.number().int().min(0),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
