/* Store Company Query Config */
export const storeCompanyFields = [
  "id",
  "name",
  "logo_url",
  "email",
  "phone",
  "address",
  "city",
  "state",
  "zip",
  "country",
  "tax_id",
  "sector",
  "onboarding_status",
  "payment_terms",
  "default_payment_method",
  "saved_payment_methods",
  "role_spending_limits",
  "currency_code",
  "*employees",
  "*approval_settings",
];

export const storeCompanyQueryConfig = {
  list: {
    defaults: storeCompanyFields,
    isList: true,
  },
  retrieve: {
    defaults: storeCompanyFields,
    isList: false,
  },
};

/* Store Employee Query Config */
export const storeEmployeeFields = [
  "id",
  "spending_limit",
  "is_admin",
  "role",
  "status",
  "invitation_email",
  "invitation_token",
  "invited_at",
  "accepted_at",
  "customer_id",
  "*customer",
  "company_id",
  "*company",
];

export const storeEmployeeQueryConfig = {
  list: {
    defaults: storeEmployeeFields,
    isList: true,
  },
  retrieve: {
    defaults: storeEmployeeFields,
    isList: false,
  },
};

/* Store Approval Settings Query Config */
type ApprovalSettingsField =
  | "id"
  | "company_id"
  | "requires_admin_approval"
  | "requires_sales_manager_approval"
  | "created_at"
  | "updated_at"
  | "deleted_at";

export const storeApprovalSettingsFields: ApprovalSettingsField[] = [
  "id",
  "company_id",
  "requires_admin_approval",
  "requires_sales_manager_approval",
  "created_at",
  "updated_at",
  "deleted_at",
];

export const storeApprovalSettingsQueryConfig = {
  retrieve: {
    defaults: storeApprovalSettingsFields,
    isList: false,
  },
};
