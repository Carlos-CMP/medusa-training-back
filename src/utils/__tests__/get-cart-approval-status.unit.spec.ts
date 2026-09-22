import { getCartApprovalStatus } from "../get-cart-approval-status";
import { ApprovalStatusType } from "../../types/approval";

// These are the conditions validate-add-to-cart.ts, validate-update-cart.ts
// and validate-cart-completion.ts rely on before throwing
// MedusaError.Types.NOT_ALLOWED ("Cart is pending approval"). See
// docs/control de errores/sistema-errores-plan.md, Fase 2/8.
describe("getCartApprovalStatus", () => {
  it("returns all-false defaults for a cart with no approvals", () => {
    expect(getCartApprovalStatus({ approvals: [] })).toEqual({
      isPendingApproval: false,
      isApproved: false,
      isRejected: false,
    });
  });

  it("returns all-false defaults for a null cart", () => {
    expect(getCartApprovalStatus(null)).toEqual({
      isPendingApproval: false,
      isApproved: false,
      isRejected: false,
    });
  });

  it("flags isPendingApproval when any approval is pending", () => {
    const status = getCartApprovalStatus({
      approvals: [{ status: ApprovalStatusType.PENDING }],
    });

    expect(status.isPendingApproval).toBe(true);
    expect(status.isApproved).toBe(false);
  });

  it("treats a pending approval as taking priority over an approved one", () => {
    const status = getCartApprovalStatus({
      approvals: [
        { status: ApprovalStatusType.APPROVED },
        { status: ApprovalStatusType.PENDING },
      ],
    });

    expect(status.isPendingApproval).toBe(true);
    expect(status.isApproved).toBe(false);
  });

  it("flags isApproved when approved and nothing is pending", () => {
    const status = getCartApprovalStatus({
      approvals: [{ status: ApprovalStatusType.APPROVED }],
    });

    expect(status.isApproved).toBe(true);
    expect(status.isPendingApproval).toBe(false);
  });

  it("flags isRejected only when nothing is pending or approved", () => {
    const status = getCartApprovalStatus({
      approvals: [{ status: ApprovalStatusType.REJECTED }],
    });

    expect(status.isRejected).toBe(true);
    expect(status.isPendingApproval).toBe(false);
    expect(status.isApproved).toBe(false);
  });
});
