import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import {
  deleteEmployeesWorkflow,
  updateEmployeesWorkflow,
} from "../../../../../../workflows/employee/workflows";
import {
  AdminGetEmployeeParamsType,
  AdminUpdateEmployeeType,
} from "../../../validators";

export const GET = async (
  req: AuthenticatedMedusaRequest<AdminGetEmployeeParamsType>,
  res: MedusaResponse
) => {
  const { employeeId } = req.params;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const {
    data: [employee],
  } = await query.graph(
    {
      entity: "employee",
      fields: req.queryConfig?.fields,
      filters: { ...req.filterableFields, id: employeeId },
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ employee });
};

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateEmployeeType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const params = req.params as {
    id: string;
    employeeId?: string;
    employee_id?: string;
  };
  const { id } = params;
  const employeeId = params.employeeId || params.employee_id;
  if (!employeeId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Employee id is required."
    );
  }
  const {
    spending_limit,
    is_admin,
    role,
    status,
    invitation_email,
    invitation_token,
    invited_at,
    accepted_at,
  } = req.validatedBody;

  const updateInput = removeUndefined({
    id: employeeId,
    company_id: id,
    spending_limit,
    is_admin,
    role,
    status,
    invitation_email,
    invitation_token,
    invited_at: invited_at ? new Date(invited_at) : undefined,
    accepted_at: accepted_at ? new Date(accepted_at) : undefined,
  });

  await updateEmployeesWorkflow.run({
    input: updateInput,
    container: req.scope,
  });

  const {
    data: [employee],
  } = await query.graph(
    {
      entity: "employee",
      fields: req.queryConfig?.fields,
      filters: { ...req.filterableFields, id: employeeId },
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ employee });
};

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const params = req.params as {
    id: string;
    employeeId?: string;
    employee_id?: string;
  };
  const { id } = params;
  const employeeId = params.employeeId || params.employee_id;
  if (!employeeId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Employee id is required."
    );
  }

  await deleteEmployeesWorkflow.run({
    input: {
      id: employeeId,
      company_id: id,
    },
    container: req.scope,
  });

  res.status(200).json({
    id: employeeId,
    object: "employee",
    deleted: true,
  });
};

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as T;
}
