import { FindParams, PaginatedResponse } from "@medusajs/framework/types";
import { QueryCompany, QueryEmployee } from "./query";
import { ModuleCompanyFilters, ModuleEmployeeFilters } from "./service";
import {
  ModuleCompanyOnboardingStatus,
  ModuleCompanyPaymentTerms,
  ModuleCompanySpendingLimitResetFrequency,
  ModuleEmployeeRole,
  ModuleEmployeeStatus,
} from "./module";

/* Filters */

export interface CompanyFilterParams extends FindParams, ModuleCompanyFilters {}

export interface EmployeeFilterParams
  extends FindParams,
    ModuleEmployeeFilters {}

/* Admin */

/* Company */
export type AdminCompanyResponse = {
  company: QueryCompany;
};

export type AdminCompaniesResponse = PaginatedResponse<{
  companies: QueryCompany[];
}>;

export type AdminCreateCompany = {
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
  currency_code: string | null;
};

export type AdminUpdateCompany = Partial<AdminCreateCompany>;

/* Employee */

export type AdminEmployeeResponse = {
  employee: QueryEmployee;
};

export type AdminEmployeesResponse = PaginatedResponse<{
  employees: QueryEmployee[];
}>;

export type AdminCreateEmployee = {
  spending_limit: number;
  is_admin: boolean;
  role?: ModuleEmployeeRole;
  status?: ModuleEmployeeStatus;
  invitation_email?: string | null;
  company_id: string;
  customer_id: string;
};

export type AdminUpdateEmployee = Partial<AdminCreateEmployee>;

/* Store */

/* Company */

export type StoreCompanyResponse = {
  company: QueryCompany;
};

export type StoreCompaniesResponse = PaginatedResponse<{
  companies: QueryCompany[];
}>;

export type StoreCompanyPreviewResponse = {
  company: QueryCompany;
};

export type StoreCreateCompany = {
  name: string;
  phone?: string | null;
  email: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  logo_url?: string | null;
  tax_id?: string | null;
  sector?: string | null;
  onboarding_status?: ModuleCompanyOnboardingStatus | null;
  payment_terms?: ModuleCompanyPaymentTerms | null;
  default_payment_method?: string | null;
  saved_payment_methods?: Record<string, unknown>[] | null;
  role_spending_limits?: Record<string, number> | null;
  currency_code: string;
};

export type StoreUpdateCompany = {
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
  currency_code: string;
  role_spending_limits?: Record<string, number> | null;
  spending_limit_reset_frequency?: ModuleCompanySpendingLimitResetFrequency;
};

/* Employee */

export type StoreEmployeeResponse = {
  employee: QueryEmployee;
};

export type StoreEmployeesResponse = PaginatedResponse<{
  employees: QueryEmployee[];
}>;

export type StoreCreateEmployee = {
  customer_id: string;
  spending_limit: number;
  is_admin: boolean;
  role?: ModuleEmployeeRole;
  status?: ModuleEmployeeStatus;
  invitation_email?: string | null;
  company_id: string;
};

export type StoreUpdateEmployee = {
  id: string;
  spending_limit?: number;
  is_admin?: boolean;
  role?: ModuleEmployeeRole;
  status?: ModuleEmployeeStatus;
  invitation_email?: string | null;
  company_id: string;
};
