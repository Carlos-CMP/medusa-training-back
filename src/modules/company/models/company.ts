import { model } from "@medusajs/framework/utils";
import { Employee } from "./employee";

export const Company = model.define("company", {
  id: model
    .id({
      prefix: "comp",
    })
    .primaryKey(),
  name: model.text(),
  email: model.text(),
  phone: model.text().nullable(),
  address: model.text().nullable(),
  city: model.text().nullable(),
  state: model.text().nullable(),
  zip: model.text().nullable(),
  country: model.text().nullable(),
  logo_url: model.text().nullable(),
  tax_id: model.text().nullable(),
  sector: model.text().nullable(),
  onboarding_status: model
    .enum(["pending", "approved", "rejected"])
    .default("approved"),
  payment_terms: model
    .enum(["prepaid", "bank_transfer", "net_30", "net_60", "credit"])
    .default("bank_transfer"),
  default_payment_method: model.text().nullable(),
  saved_payment_methods: model.json().nullable(),
  role_spending_limits: model.json().nullable(),
  currency_code: model.text().nullable(),
  spending_limit_reset_frequency: model
    .enum(["never", "daily", "weekly", "monthly", "yearly"])
    .default("monthly"),
  employees: model.hasMany(() => Employee),
});
