import { completeCartWorkflow } from "@medusajs/core-flows";
import { StepResponse } from "@medusajs/framework/workflows-sdk";
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import { getCartApprovalStatus } from "../../utils/get-cart-approval-status";
import { checkSpendingLimit } from "../../utils/check-spending-limit";
import { validateProductPackagingLines } from "../../utils/validate-product-packaging";
completeCartWorkflow.hooks.validate(async ({ cart }, { container }) => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const {
    data: [queryCart],
  } = await query.graph({
    entity: "cart",
    fields: ["approvals.*", "customer_id", "total", "items.*"],
    filters: {
      id: cart.id,
    },
  });

  // Check if cart is pending approval
  const { isPendingApproval } = getCartApprovalStatus(queryCart);

  if (isPendingApproval) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Cart is pending approval"
    );
  }

  // Check if spending limit will be exceeded
  if (queryCart.customer_id) {
    const {
      data: [customer],
    } = await query.graph({
      entity: "customer",
      fields: [
        "employee.spending_limit",
        "employee.role",
        "employee.is_admin",
        "employee.company.spending_limit_reset_frequency",
        "employee.company.role_spending_limits",
        "orders.*",
      ],
      filters: {
        id: queryCart.customer_id,
      },
    });

    const spendLimitExceeded = checkSpendingLimit(
      queryCart as any,
      customer as any
    );

    if (spendLimitExceeded) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Cart total exceeds spending limit"
      );
    }
  }

  await validateProductPackagingLines(
    container,
    (queryCart.items || [])
      .filter((item): item is NonNullable<typeof item> => !!item)
      .map((item) => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
        metadata: item.metadata as Record<string, unknown> | null | undefined,
      }))
  );

  return new StepResponse(undefined, null);
});
