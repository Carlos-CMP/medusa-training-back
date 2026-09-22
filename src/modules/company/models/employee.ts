import { model } from "@medusajs/framework/utils";
import { Company } from "./company";

export const Employee = model.define("employee", {
  id: model
    .id({
      prefix: "emp",
    })
    .primaryKey(),
  spending_limit: model.bigNumber().default(0),
  is_admin: model.boolean().default(false),
  role: model
    .enum(["buyer", "approver", "company_admin", "warehouse_manager", "readonly"])
    .default("buyer"),
  status: model
    .enum(["invited", "active", "disabled"])
    .default("active"),
  invitation_email: model.text().nullable(),
  invitation_token: model.text().nullable(),
  invited_at: model.dateTime().nullable(),
  accepted_at: model.dateTime().nullable(),
  company: model.belongsTo(() => Company, {
    mappedBy: "employees",
  }),
});
