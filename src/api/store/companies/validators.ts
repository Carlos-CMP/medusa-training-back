import { createSelectParams } from "@medusajs/medusa/api/utils/validators";
import { z } from "@medusajs/framework/zod";
import { ApprovalStatusType } from "../../../types/approval";

const employeeRoleValues = [
  "buyer",
  "approver",
  "company_admin",
  "warehouse_manager",
  "readonly",
] as const;

/* Company Validators */
export type StoreGetCompanyParamsType = z.infer<typeof StoreGetCompanyParams>;
export const StoreGetCompanyParams = createSelectParams();

export type StoreCreateCompanyType = z.infer<typeof StoreCreateCompany>;
export const StoreCreateCompany = z
  .object({
    name: z.string(),
    email: z.string(),
    currency_code: z.string(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    zip: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    logo_url: z.string().optional().nullable(),
    tax_id: z.string().optional().nullable(),
    sector: z.string().optional().nullable(),
    onboarding_status: z.enum(["pending", "approved", "rejected"]).optional(),
    payment_terms: z
      .enum(["prepaid", "bank_transfer", "net_30", "net_60", "credit"])
      .optional()
      .nullable(),
    default_payment_method: z.string().optional().nullable(),
    saved_payment_methods: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
    role_spending_limits: z.record(z.string(), z.number()).optional().nullable(),
    spending_limit_reset_frequency: z
      .enum(["never", "daily", "weekly", "monthly", "yearly"])
      .optional()
      .nullable(),
  })
  .strict();

export type StoreUpdateCompanyType = z.infer<typeof StoreUpdateCompany>;
export const StoreUpdateCompany = z
  .object({
    name: z.string().optional(),
    email: z.string().optional(),
    currency_code: z.string().optional(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    zip: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    logo_url: z.string().optional().nullable(),
    tax_id: z.string().optional().nullable(),
    sector: z.string().optional().nullable(),
    onboarding_status: z.enum(["pending", "approved", "rejected"]).optional(),
    payment_terms: z
      .enum(["prepaid", "bank_transfer", "net_30", "net_60", "credit"])
      .optional()
      .nullable(),
    default_payment_method: z.string().optional().nullable(),
    saved_payment_methods: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
    role_spending_limits: z.record(z.string(), z.number()).optional().nullable(),
    spending_limit_reset_frequency: z
      .enum(["never", "daily", "weekly", "monthly", "yearly"])
      .optional()
      .nullable(),
  })
  .strict();

/* Employee Validators */
export type StoreGetEmployeeParamsType = z.infer<typeof StoreGetEmployeeParams>;
export const StoreGetEmployeeParams = createSelectParams();

export type StoreCreateEmployeeType = z.infer<typeof StoreCreateEmployee>;
export const StoreCreateEmployee = z
  .object({
    spending_limit: z.number().optional().nullable(),
    is_admin: z.boolean().optional().nullable().default(false),
    role: z
      .enum(employeeRoleValues)
      .optional()
      .default("buyer"),
    status: z.enum(["invited", "active", "disabled"]).optional().default("active"),
    invitation_email: z.string().email().optional().nullable(),
    customer_id: z.string(),
  })
  .strict();

export type StoreUpdateEmployeeType = z.infer<typeof StoreUpdateEmployee>;
export const StoreUpdateEmployee = z
  .object({
    spending_limit: z.number().optional(),
    raw_spending_limit: z
      .object({
        value: z.number().optional(),
        precision: z.number().optional(),
      })
      .optional(),
    is_admin: z.boolean().optional(),
    role: z.enum(employeeRoleValues).optional(),
    status: z.enum(["invited", "active", "disabled"]).optional(),
    invitation_email: z.string().email().optional().nullable(),
    invitation_token: z.string().optional().nullable(),
    invited_at: z.string().datetime().optional().nullable(),
    accepted_at: z.string().datetime().optional().nullable(),
  })
  .strict();

export type StoreInviteEmployeeType = z.infer<typeof StoreInviteEmployee>;
export const StoreInviteEmployee = z
  .object({
    email: z.string().email(),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    role: z
      .enum(employeeRoleValues)
      .default("buyer"),
    spending_limit: z.number().optional().default(0),
  })
  .strict();

/* Approval Settings Validators */
export type StoreGetApprovalSettingsParamsType = z.infer<
  typeof StoreGetApprovalSettingsParams
>;
export const StoreGetApprovalSettingsParams = createSelectParams();

export type StoreUpdateApprovalSettingsType = z.infer<
  typeof StoreUpdateApprovalSettings
>;
export const StoreUpdateApprovalSettings = z
  .object({
    requires_admin_approval: z.boolean(),
  })
  .strict();

/* Approval Validators */
export type StoreGetApprovalParamsType = z.infer<typeof StoreGetApprovalParams>;
export const StoreGetApprovalParams = createSelectParams();

export type StoreUpdateApprovalType = z.infer<typeof StoreUpdateApproval>;
export const StoreUpdateApproval = z.object({
  status: z.nativeEnum(ApprovalStatusType),
  handled_by: z.string(),
});

export type StoreDeleteApprovalType = z.infer<typeof StoreDeleteApproval>;
export const StoreDeleteApproval = z.object({
  id: z.string(),
});
