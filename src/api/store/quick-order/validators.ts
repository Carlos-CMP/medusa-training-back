import { z } from "@medusajs/framework/zod";

export const StoreQuickOrderResolve = z
  .object({
    skus: z.array(z.string().min(1)).min(1).max(100),
    region_id: z.string().optional(),
  })
  .strict();

export type StoreQuickOrderResolveType = z.infer<
  typeof StoreQuickOrderResolve
>;
