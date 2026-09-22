import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { upsertProductPackagingWorkflow } from "../../../../workflows/product-packaging/workflows";
import { AdminBulkUpsertProductPackagingType } from "../validators";

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminBulkUpsertProductPackagingType>,
  res: MedusaResponse
) => {
  const packaging: unknown[] = [];

  for (const item of req.validatedBody.packaging) {
    const { result } = await upsertProductPackagingWorkflow.run({
      input: item,
      container: req.scope,
    });

    packaging.push(result);
  }

  res.json({
    packaging,
  });
};
