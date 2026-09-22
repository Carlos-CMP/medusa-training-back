import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createCustomersWorkflow } from "@medusajs/core-flows";
import {
  createEmployeesWorkflow,
  updateEmployeesWorkflow,
} from "../../../../../workflows/employee/workflows";
import type { StoreInviteEmployeeType } from "../../validators";

export const POST = async (
  req: MedusaRequest<StoreInviteEmployeeType>,
  res: MedusaResponse
) => {
  const { id: companyId } = req.params;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const customerModule = req.scope.resolve<any>(Modules.CUSTOMER);
  const logger = req.scope.resolve<any>("logger");
  const { email, first_name, last_name, role, spending_limit } =
    req.validatedBody;

  const [existingCustomer] = await customerModule.listCustomers({ email });
  const customer =
    existingCustomer ||
    (
      await createCustomersWorkflow(req.scope).run({
        input: {
          customersData: [
            {
              email,
              first_name: first_name || "Invitado",
              last_name: last_name || "B2B",
              has_account: false,
              metadata: {
                invited_from_company_id: companyId,
                b2b_role: role,
              },
            },
          ],
        },
      })
    ).result[0];

  const {
    data: existingEmployees,
  } = await query.graph({
    entity: "employee",
    fields: ["id", "company_id", "customer.id"],
    filters: {
      company_id: companyId,
    },
  });
  const existingEmployee = existingEmployees.find(
    (employee: any) => employee.customer?.id === customer.id
  );

  const employeeInput = {
    company_id: companyId,
    spending_limit: spending_limit || 0,
    is_admin: role === "company_admin",
    role,
    status: "invited" as const,
    invitation_email: email,
    invitation_token: `invite-${customer.id}`,
    invited_at: new Date(),
  };

  const employeeId = existingEmployee
    ? (
        await updateEmployeesWorkflow.run({
          container: req.scope,
          input: {
            id: existingEmployee.id,
            ...employeeInput,
          },
        })
      ).result.id
    : (
        await createEmployeesWorkflow.run({
          container: req.scope,
          input: {
            customerId: customer.id,
            employeeData: {
              ...employeeInput,
              customer_id: customer.id,
            },
          },
        })
      ).result.id;

  const {
    data: [employee],
  } = await query.graph(
    {
      entity: "employee",
      fields: req.queryConfig.fields,
      filters: { id: employeeId },
    },
    { throwIfKeyNotFound: true }
  );

  const storefrontUrl = (
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_STOREFRONT_URL ||
    "http://localhost:8000"
  ).replace(/\/$/, "");

  try {
    const notificationService = req.scope.resolve<any>("notification");

    await notificationService.createNotifications({
      to: email,
      channel: "email",
      template: "b2b-employee-invited",
      data: {
        email,
        first_name,
        last_name,
        role,
        company_id: companyId,
        company_name: employee.company?.name || "tu empresa",
        invite_url: `${storefrontUrl}/es/account?email=${encodeURIComponent(
          email
        )}`,
      },
    });
  } catch (error) {
    logger.warn(
      `Could not send B2B employee invitation to ${email}: ${
        (error as Error).message
      }`
    );
  }

  res.json({ employee });
};
