import {
  checkSpendingLimit,
  getCustomerRoleSpendingLimit,
} from "../check-spending-limit";
import { ModuleCompanySpendingLimitResetFrequency } from "../../types/company";

// This is the condition validate-cart-completion.ts relies on before
// throwing MedusaError.Types.NOT_ALLOWED ("Cart total exceeds spending
// limit"). See docs/control de errores/sistema-errores-plan.md, Fase 2/8.
describe("getCustomerRoleSpendingLimit", () => {
  it("returns 0 for a null employee", () => {
    expect(getCustomerRoleSpendingLimit(null)).toBe(0);
  });

  it("prefers the company's per-role limit over the legacy employee limit", () => {
    const employee = {
      role: "buyer",
      is_admin: false,
      spending_limit: 100,
      company: { role_spending_limits: { buyer: 500 } },
    } as any;

    expect(getCustomerRoleSpendingLimit(employee)).toBe(500);
  });

  it("falls back to the legacy employee spending_limit when no role limit is set", () => {
    const employee = {
      role: "buyer",
      is_admin: false,
      spending_limit: 250,
      company: { role_spending_limits: {} },
    } as any;

    expect(getCustomerRoleSpendingLimit(employee)).toBe(250);
  });

  it("returns 0 (no limit enforced) when neither is set", () => {
    const employee = {
      role: "buyer",
      is_admin: false,
      spending_limit: 0,
      company: { role_spending_limits: {} },
    } as any;

    expect(getCustomerRoleSpendingLimit(employee)).toBe(0);
  });
});

describe("checkSpendingLimit", () => {
  const employeeWithLimit = (limit: number) =>
    ({
      role: "buyer",
      is_admin: false,
      spending_limit: limit,
      company: {
        role_spending_limits: {},
        spending_limit_reset_frequency:
          ModuleCompanySpendingLimitResetFrequency.NEVER,
      },
    } as any);

  it("returns false when there is no cart, customer, or employee", () => {
    expect(checkSpendingLimit(null, null)).toBe(false);
    expect(checkSpendingLimit({ total: 100 } as any, null)).toBe(false);
  });

  it("returns false when the employee has no spending limit configured", () => {
    const customer = {
      employee: employeeWithLimit(0),
      orders: [],
    } as any;

    expect(checkSpendingLimit({ total: 1_000_000 } as any, customer)).toBe(
      false
    );
  });

  it("returns false when past orders plus the cart stay within the limit", () => {
    const customer = {
      employee: employeeWithLimit(1000),
      orders: [{ created_at: new Date().toISOString(), total: 300 }],
    } as any;

    expect(checkSpendingLimit({ total: 400 } as any, customer)).toBe(false);
  });

  it("returns true when past orders plus the cart exceed the limit", () => {
    const customer = {
      employee: employeeWithLimit(1000),
      orders: [{ created_at: new Date().toISOString(), total: 700 }],
    } as any;

    expect(checkSpendingLimit({ total: 400 } as any, customer)).toBe(true);
  });

  it("ignores orders outside the spend window", () => {
    const employee = {
      role: "buyer",
      is_admin: false,
      spending_limit: 1000,
      company: {
        role_spending_limits: {},
        spending_limit_reset_frequency:
          ModuleCompanySpendingLimitResetFrequency.DAILY,
      },
    } as any;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const customer = {
      employee,
      orders: [{ created_at: yesterday.toISOString(), total: 900 }],
    } as any;

    // Yesterday's order falls outside today's spend window, so it
    // shouldn't count toward the limit.
    expect(checkSpendingLimit({ total: 400 } as any, customer)).toBe(false);
  });
});
