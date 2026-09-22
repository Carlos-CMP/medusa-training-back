import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { addToCartWorkflowId } from "@medusajs/core-flows";
import { StoreAddLineItemsBulkType } from "../../../validators";
import { validateProductPackagingLines } from "../../../../../../utils/validate-product-packaging";

export async function POST(
  req: MedusaRequest<StoreAddLineItemsBulkType>,
  res: MedusaResponse
) {
  const { id } = req.params;
  const { line_items } = req.validatedBody;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const {
    data: [cart],
  } = await query.graph(
    {
      entity: "cart",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  );

  const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE);

  await validateProductPackagingLines(req.scope, line_items);

  await workflowEngine.run(addToCartWorkflowId, {
    input: {
      cart_id: cart.id,
      items: line_items,
    },
  });

  const {
    data: [upatedCart],
  } = await query.graph(
    {
      entity: "cart",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ cart: upatedCart });
}
