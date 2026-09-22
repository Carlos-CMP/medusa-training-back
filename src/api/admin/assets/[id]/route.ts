import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { deleteAssetWorkflow } from "../../../../workflows/asset-library/workflows";

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { result } = await deleteAssetWorkflow.run({
    input: {
      id: req.params.id,
    },
    container: req.scope,
  });

  res.json({
    deleted: result,
  });
};
