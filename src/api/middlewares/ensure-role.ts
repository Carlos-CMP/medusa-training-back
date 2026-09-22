import {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

const getAuthenticatedCustomerId = (req: AuthenticatedMedusaRequest) => {
  const appMetadata = req.auth_context.app_metadata as
    | { customer_id?: string }
    | undefined

  return appMetadata?.customer_id || req.auth_context.actor_id
}

const hasRole = (
  employee: {
    is_admin?: boolean | null
    role?: string | null
    status?: string | null
  },
  role?: string
) => {
  if (!role) {
    return true
  }

  if (employee.status && employee.status !== "active") {
    return false
  }

  return employee.is_admin || employee.role === role
}

type EnsureRoleOptions = {
  allowBootstrap?: boolean
}

const canBootstrapCompanyAdmin = async (
  req: AuthenticatedMedusaRequest,
  companyId: string,
  customerId: string
) => {
  const body = (req as any).validatedBody || {}

  if (
    body.customer_id !== customerId ||
    body.role !== "company_admin" ||
    body.is_admin !== true ||
    body.status === "disabled" ||
    body.status === "invited"
  ) {
    return false
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [company],
  } = await query.graph({
    entity: "companies",
    fields: ["id", "employees.id"],
    filters: { id: companyId },
  })

  return Boolean(company && company.employees?.length === 0)
}

export const ensureCompanyMember = () => {
  return async (
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    const customerId = getAuthenticatedCustomerId(req)
    const companyId = req.params.id

    if (!customerId || !companyId) {
      return res.status(403).json({ message: "Forbidden" })
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    const {
      data: [customer],
    } = await query.graph({
      entity: "customer",
      fields: [
        "id",
        "employee.id",
        "employee.company_id",
        "employee.company.id",
        "employee.is_admin",
        "employee.role",
        "employee.status",
      ],
      filters: { id: customerId },
    })

    const employee = customer?.employee
    const employeeCompanyId = employee?.company?.id || employee?.company_id

    if (
      !employee ||
      employee.status === "disabled" ||
      employee.status === "invited" ||
      employeeCompanyId !== companyId
    ) {
      return res.status(403).json({ message: "Forbidden" })
    }

    ;(req as any).company_employee = employee

    return next()
  }
}

export const ensureRole = (role: string, options: EnsureRoleOptions = {}) => {
  return async (
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    const customerId = getAuthenticatedCustomerId(req)
    const companyId = req.params.id

    if (!customerId || !companyId) {
      return res.status(403).json({ message: "Forbidden" })
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    const {
      data: [customer],
    } = await query.graph({
      entity: "customer",
      fields: [
        "id",
        "employee.id",
        "employee.company_id",
        "employee.company.id",
        "employee.is_admin",
        "employee.role",
        "employee.status",
      ],
      filters: { id: customerId },
    })

    const employee = customer?.employee
    const employeeCompanyId = employee?.company?.id || employee?.company_id

    if (
      !employee ||
      employeeCompanyId !== companyId ||
      !hasRole(employee, role)
    ) {
      if (
        options.allowBootstrap &&
        role === "company_admin" &&
        (await canBootstrapCompanyAdmin(req, companyId, customerId))
      ) {
        return next()
      }

      return res.status(403).json({ message: "Forbidden" })
    }

    ;(req as any).company_employee = employee

    return next()
  }
}
