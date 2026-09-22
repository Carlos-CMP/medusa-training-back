import {
  createFindParams,
  createOperatorMap,
  createSelectParams,
} from "@medusajs/medusa/api/utils/validators";
import { z } from "@medusajs/framework/zod";

const employeeRoleValues = [
  "buyer",
  "approver",
  "company_admin",
  "warehouse_manager",
  "readonly",
] as const;

/* Company Validators */
export type AdminGetCompanyParamsType = z.infer<typeof AdminGetCompanyParams>;
export const AdminGetCompanyParams = createFindParams({
  limit: 50,
  offset: 0,
})
  .merge(
    z.object({
      q: z.string().optional(),
      id: z
        .union([z.string(), z.array(z.string()), createOperatorMap()])
        .optional(),
      name: z
        .union([z.string(), z.array(z.string()), createOperatorMap()])
        .optional(),
      email: z
        .union([z.string(), z.array(z.string()), createOperatorMap()])
        .optional(),
      onboarding_status: z
        .union([z.string(), z.array(z.string()), createOperatorMap()])
        .optional(),
      customer_group_id: z
        .union([z.string(), z.array(z.string()), createOperatorMap()])
        .optional(),
      created_at: createOperatorMap().optional(),
      updated_at: createOperatorMap().optional(),
    })
  )
  .strict();

export type AdminCreateCompanyType = z.infer<typeof AdminCreateCompany>;
export const AdminCreateCompany = z
  .object({
    name: z.string(),
    email: z.string(),
    currency_code: z.string(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    logo_url: z.string().optional(),
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
  })
  .strict();

export type AdminUpdateCompanyType = z.infer<typeof AdminUpdateCompany>;
export const AdminUpdateCompany = z
  .object({
    name: z.string().optional(),
    email: z.string().optional(),
    currency_code: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
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
  })
  .strict();

export type AdminGetCustomerGroupParamsType = z.infer<
  typeof AdminGetCustomerGroupParams
>;
export const AdminGetCustomerGroupParams = createSelectParams();

export type AdminAddCompanyToCustomerGroupType = z.infer<
  typeof AdminAddCompanyToCustomerGroup
>;
export const AdminAddCompanyToCustomerGroup = z.object({
  group_id: z.string(),
});

export type AdminRemoveCompanyFromCustomerGroupType = z.infer<
  typeof AdminRemoveCompanyFromCustomerGroup
>;
export const AdminRemoveCompanyFromCustomerGroup = z.object({
  group_id: z.string(),
});

/* Employee Validators */

export type AdminGetEmployeeParamsType = z.infer<typeof AdminGetEmployeeParams>;
export const AdminGetEmployeeParams = createSelectParams();

export type AdminCreateEmployeeType = z.infer<typeof AdminCreateEmployee>;
export const AdminCreateEmployee = z
  .object({
    spending_limit: z.number().optional(),
    raw_spending_limit: z
      .object({
        value: z.number().optional(),
        precision: z.number().optional(),
      })
      .optional(),
    is_admin: z.boolean().optional(),
    role: z
      .enum(employeeRoleValues)
      .optional(),
    status: z.enum(["invited", "active", "disabled"]).optional(),
    invitation_email: z.string().email().optional().nullable(),
    customer_id: z.string(),
  })
  .strict();

export type AdminUpdateEmployeeType = z.infer<typeof AdminUpdateEmployee>;
export const AdminUpdateEmployee = z
  .object({
    id: z.string(),
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

/* Approval Settings Validators */
export type AdminGetApprovalSettingsParamsType = z.infer<
  typeof AdminGetApprovalSettingsParams
>;
export const AdminGetApprovalSettingsParams = createSelectParams();

export type AdminCreateApprovalSettingsType = z.infer<
  typeof AdminCreateApprovalSettings
>;
export const AdminCreateApprovalSettings = z
  .object({
    company_id: z.string(),
    requires_admin_approval: z.boolean(),
    requires_sales_manager_approval: z.boolean(),
  })
  .strict();

export type AdminUpdateApprovalSettingsType = z.infer<
  typeof AdminUpdateApprovalSettings
>;
export const AdminUpdateApprovalSettings = z
  .object({
    id: z.string(),
    requires_admin_approval: z.boolean(),
    requires_sales_manager_approval: z.boolean(),
  })
  .strict();

export type AdminUpsertApprovalSettingsType = z.infer<
  typeof AdminUpsertApprovalSettings
>;
export const AdminUpsertApprovalSettings = z
  .object({
    id: z.string().optional(),
    company_id: z.string().optional(),
    requires_admin_approval: z.boolean(),
    requires_sales_manager_approval: z.boolean(),
  })
  .strict();

export type AdminDeleteApprovalSettingsType = z.infer<
  typeof AdminDeleteApprovalSettings
>;
export const AdminDeleteApprovalSettings = z.object({
  ids: z.array(z.string()),
});
