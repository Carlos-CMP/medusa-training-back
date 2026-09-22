import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  authenticate,
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework";
import { MiddlewareRoute } from "@medusajs/medusa";
import { ApprovalType } from "../../../types/approval";
import { approvalTransformQueryConfig } from "./query-config";
import { StoreGetApprovals, StoreUpdateApproval } from "./validators";

const getAuthenticatedCustomerId = (req: AuthenticatedMedusaRequest) => {
  const appMetadata = req.auth_context.app_metadata as
    | { customer_id?: string }
    | undefined

  return appMetadata?.customer_id || req.auth_context.actor_id
}

const ensureApprovalManager = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const customerId = getAuthenticatedCustomerId(req)

  if (!customerId) {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [customer],
  } = await query.graph({
    entity: "customer",
    fields: [
      "id",
      "employee.id",
      "employee.company_id",
      "employee.company.id",
      "employee.is_admin",
      "employee.role",
      "employee.status",
    ],
    filters: { id: customerId },
  })

  const employee = customer?.employee
  const companyId = employee?.company?.id || employee?.company_id
  const canManageApprovals =
    employee?.is_admin ||
    employee?.role === "company_admin" ||
    employee?.role === "approver"

  if (
    !employee ||
    !companyId ||
    employee.status === "disabled" ||
    employee.status === "invited" ||
    !canManageApprovals
  ) {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  ;(req as any).company_employee = employee
  ;(req as any).company_id = companyId

  next()
}

const ensureApprovalAccess = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const { id } = req.params;

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const {
    data: [approval],
  } = await query.graph({
    entity: "approval",
    fields: ["id", "type", "cart_id"],
    filters: { id },
  });

  if (!approval) {
    res.status(404).json({ message: "Approval not found" });
    return;
  }

  const approvalType = approval.type as unknown as ApprovalType;

  if (approvalType !== ApprovalType.ADMIN) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const {
    data: [cart],
  } = await query.graph({
    entity: "cart",
    fields: ["id", "company.id"],
    filters: { id: approval.cart_id },
  });

  if (cart?.company?.id !== (req as any).company_id) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  next();
};

export const storeApprovalsMiddlewares: MiddlewareRoute[] = [
  {
    method: "ALL",
    matcher: "/store/approvals*",
    middlewares: [
      authenticate("customer", ["session", "bearer"]),
      ensureApprovalManager,
    ],
  },
  {
    method: ["GET"],
    matcher: "/store/approvals",
    middlewares: [
      validateAndTransformQuery(
        StoreGetApprovals,
        approvalTransformQueryConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/approvals/:id",
    middlewares: [
      ensureApprovalAccess,
      validateAndTransformBody(StoreUpdateApproval),
    ],
  },
];
