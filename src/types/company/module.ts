/* Entity: Company */

import { CustomerGroupDTO } from "@medusajs/framework/types";
import { CustomerDTO } from "@medusajs/framework/types";
import { ModuleApprovalSettings } from "../approval/module";

export enum ModuleCompanySpendingLimitResetFrequency {
  NEVER = "never",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
}

export enum ModuleCompanyOnboardingStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum ModuleCompanyPaymentTerms {
  PREPAID = "prepaid",
  BANK_TRANSFER = "bank_transfer",
  NET_30 = "net_30",
  NET_60 = "net_60",
  CREDIT = "credit",
}

export enum ModuleEmployeeRole {
  BUYER = "buyer",
  APPROVER = "approver",
  COMPANY_ADMIN = "company_admin",
  WAREHOUSE_MANAGER = "warehouse_manager",
  READONLY = "readonly",
}

export enum ModuleEmployeeStatus {
  INVITED = "invited",
  ACTIVE = "active",
  DISABLED = "disabled",
}

export type ModuleCompany = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  logo_url: string | null;
  tax_id: string | null;
  sector: string | null;
  onboarding_status: ModuleCompanyOnboardingStatus;
  payment_terms: ModuleCompanyPaymentTerms;
  default_payment_method: string | null;
  saved_payment_methods: Record<string, unknown>[] | null;
  role_spending_limits: Record<string, number> | null;
  currency_code: string | null;
  spending_limit_reset_frequency: ModuleCompanySpendingLimitResetFrequency;
  created_at: Date;
  updated_at: Date;
  customer_group: CustomerGroupDTO;
  approval_settings: ModuleApprovalSettings;
};

export type ModuleCreateCompany = {
  name: string;
  phone: string;
  email: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  logo_url: string | null;
  tax_id?: string | null;
  sector?: string | null;
  onboarding_status?: ModuleCompanyOnboardingStatus | null;
  payment_terms?: ModuleCompanyPaymentTerms | null;
  default_payment_method?: string | null;
  saved_payment_methods?: Record<string, unknown>[] | null;
  role_spending_limits?: Record<string, number> | null;
  currency_code: string;
  spending_limit_reset_frequency: ModuleCompanySpendingLimitResetFrequency | null;
};

export interface ModuleUpdateCompany extends Partial<ModuleCompany> {
  id: string;
}

export type ModuleDeleteCompany = {
  id: string;
};

/* Entity: Employee */

export interface ModuleEmployee {
  id: string;
  spending_limit: number;
  is_admin: boolean;
  role: ModuleEmployeeRole;
  status: ModuleEmployeeStatus;
  invitation_email: string | null;
  invitation_token: string | null;
  invited_at: Date | null;
  accepted_at: Date | null;
  company_id: string;
  created_at: Date;
  updated_at: Date;
  customer: CustomerDTO;
  company: ModuleCompany;
}

export type ModuleCreateEmployee = {
  customer_id: string;
  spending_limit: number;
  is_admin: boolean;
  role?: ModuleEmployeeRole;
  status?: ModuleEmployeeStatus;
  invitation_email?: string | null;
  invitation_token?: string | null;
  invited_at?: Date | null;
  accepted_at?: Date | null;
  company_id: string;
};

export interface ModuleUpdateEmployee extends Partial<ModuleEmployee> {
  id: string;
}

export type ModuleDeleteEmployee = {
  id: string;
};
