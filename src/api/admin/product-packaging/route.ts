import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { PRODUCT_PACKAGING_MODULE } from "../../../modules/product-packaging";
import { buildNgsPackagingFallback } from "../../../utils/ngs-packaging-rules";
import { upsertProductPackagingWorkflow } from "../../../workflows/product-packaging/workflows";
import { AdminUpsertProductPackagingType } from "./validators";

const normalizeVariantIds = (variantId: unknown): string[] => {
  if (Array.isArray(variantId)) {
    return variantId.flatMap((id) => String(id).split(",")).filter(Boolean);
  }

  if (typeof variantId === "string") {
    return variantId.split(",").filter(Boolean);
  }

  return [];
};

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const productPackagingModule = req.scope.resolve<any>(
    PRODUCT_PACKAGING_MODULE
  );
  const variantIds = normalizeVariantIds(req.query.variant_id);
  const filters = variantIds.length ? { variant_id: variantIds } : {};
  const packaging = await productPackagingModule.listProductPackagings(filters);

  if (variantIds.length) {
    const packagedVariantIds = new Set(
      packaging.map((item) => item.variant_id as string)
    );
    const missingVariantIds = variantIds.filter(
      (variantId) => !packagedVariantIds.has(variantId)
    );

    if (missingVariantIds.length) {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
      const { data: variants } = await query.graph({
        entity: "variant",
        fields: ["id", "sku"],
        filters: {
          id: missingVariantIds,
        },
      });

      packaging.push(
        ...variants
          .map(buildNgsPackagingFallback)
          .filter((item): item is NonNullable<typeof item> => !!item)
      );
    }
  }

  res.json({
    packaging,
  });
};

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpsertProductPackagingType>,
  res: MedusaResponse
) => {
  const { result } = await upsertProductPackagingWorkflow.run({
    input: req.validatedBody,
    container: req.scope,
  });

  res.json({
    packaging: result,
  });
};
