import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import { updateLineItemInCartWorkflow } from "@medusajs/medusa/core-flows";
import { StoreUpdateLineItemB2BType } from "../../../../validators";
import { validateProductPackagingLines } from "../../../../../../../utils/validate-product-packaging";

export async function POST(
  req: MedusaRequest<StoreUpdateLineItemB2BType>,
  res: MedusaResponse
) {
  const { id, line_id } = req.params;
  const { quantity, metadata } = req.validatedBody;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const {
    data: [cart],
  } = await query.graph(
    {
      entity: "cart",
      fields: ["id", "items.*"],
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  );

  const lineItem = cart.items?.find((item) => item?.id === line_id);

  if (!lineItem) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Line item not found.");
  }

  const nextMetadata = {
    ...((lineItem.metadata || {}) as Record<string, unknown>),
    ...(metadata || {}),
  };

  await validateProductPackagingLines(
    req.scope,
    [
      {
        variant_id: lineItem.variant_id,
        quantity,
        metadata: nextMetadata,
      },
    ],
    { allowZeroQuantity: true }
  );

  await updateLineItemInCartWorkflow(req.scope).run({
    input: {
      cart_id: id,
      item_id: line_id,
      update: {
        quantity,
        metadata: nextMetadata,
      },
    },
  });

  const {
    data: [updatedCart],
  } = await query.graph(
    {
      entity: "cart",
      ...req.queryConfig,
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ cart: updatedCart });
}
