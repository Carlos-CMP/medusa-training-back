import {
  Button,
  Container,
  Drawer,
  Label,
  Select,
  Table,
  Text,
} from "@medusajs/ui";
import { useState } from "react";
import {
  AdminUpdateEmployee,
  QueryCompany,
  QueryEmployee,
} from "../../../../../types";
import { CoolSwitch } from "../../../../components/common";

export function EmployeesUpdateForm({
  company,
  employee,
  handleSubmit,
  loading,
  error,
}: {
  employee: QueryEmployee;
  company: QueryCompany;
  handleSubmit: (data: AdminUpdateEmployee) => Promise<void>;
  loading: boolean;
  error: Error | null;
}) {
  const [formData, setFormData] = useState<{
    spending_limit: string;
    is_admin: boolean;
    role: string;
    status: string;
  }>({
    spending_limit: employee?.spending_limit?.toString() || "0",
    is_admin: employee?.is_admin || false,
    role: employee?.role || "buyer",
    status: employee?.status || "active",
  });
  const roleLimits = (company.role_spending_limits || {}) as Record<
    string,
    number
  >;
  const selectedRoleLimit = roleLimits[formData.role] || 0;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const spendingLimit = formData.spending_limit
      ? Number(formData.spending_limit)
      : undefined;

    const data = {
      ...formData,
      id: employee?.id,
      spending_limit: spendingLimit,
      raw_spending_limit: {
        value: spendingLimit,
      },
    };

    handleSubmit(data);
  };

  return (
    <form onSubmit={onSubmit}>
      <Drawer.Body className="p-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="h2-core">Datos del usuario</h2>
              <a
                href={`/app/customers/${employee?.customer!.id}/edit`}
                className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover self-end"
              >
                Editar ficha de cliente
              </a>
            </div>
            <Container className="p-0 overflow-hidden">
              <Table>
                <Table.Body>
                  <Table.Row>
                    <Table.Cell className="font-medium font-sans txt-compact-small">
                      Nombre
                    </Table.Cell>
                    <Table.Cell>
                      {employee?.customer!.first_name}{" "}
                      {employee?.customer!.last_name}
                    </Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="font-medium font-sans txt-compact-small">
                      Email
                    </Table.Cell>
                    <Table.Cell>{employee?.customer!.email}</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="font-medium font-sans txt-compact-small">
                      Teléfono
                    </Table.Cell>
                    <Table.Cell>{employee?.customer!.phone}</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="font-medium font-sans txt-compact-small">
                      Empresa
                    </Table.Cell>
                    <Table.Cell>{company.name}</Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table>
            </Container>
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="h2-core">Permisos</h2>
            <div className="flex flex-col gap-2">
              <Label size="xsmall" className="txt-compact-small font-medium">
                Límite del rol
              </Label>
              <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle px-3 py-2">
                <Text size="small" leading="compact" weight="plus">
                  {new Intl.NumberFormat("es-ES", {
                    style: "currency",
                    currency: (company.currency_code || "eur").toUpperCase(),
                    maximumFractionDigits: 0,
                  }).format(selectedRoleLimit)}
                </Text>
                <Text size="small" leading="compact" className="text-ui-fg-subtle">
                  Se gestiona desde Empresa → Límites de gasto por rol.
                </Text>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label size="xsmall" className="txt-compact-small font-medium">
                Rol B2B
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    role: value,
                    is_admin: value === "company_admin",
                    spending_limit: String(roleLimits[value] || 0),
                  })
                }
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="buyer">Comprador</Select.Item>
                  <Select.Item value="approver">Aprobador</Select.Item>
                  <Select.Item value="company_admin">Admin empresa</Select.Item>
                  <Select.Item value="warehouse_manager">
                    Responsable de almacén
                  </Select.Item>
                  <Select.Item value="readonly">Solo lectura</Select.Item>
                </Select.Content>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label size="xsmall" className="txt-compact-small font-medium">
                Estado
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="invited">Invitado</Select.Item>
                  <Select.Item value="active">Activo</Select.Item>
                  <Select.Item value="disabled">Desactivado</Select.Item>
                </Select.Content>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label size="xsmall" className="txt-compact-small font-medium">
                Acceso administrador
              </Label>
              <CoolSwitch
                fieldName="is_admin"
                label="Es administrador"
                description="Permite gestionar datos de empresa y permisos."
                checked={formData.is_admin}
                onChange={(checked) =>
                  setFormData({
                    ...formData,
                    is_admin: checked,
                    role: checked
                      ? "company_admin"
                      : formData.role === "company_admin"
                      ? "buyer"
                      : formData.role,
                    spending_limit: String(
                      roleLimits[
                        checked
                          ? "company_admin"
                          : formData.role === "company_admin"
                          ? "buyer"
                          : formData.role
                      ] || 0
                    ),
                  })
                }
                tooltip="Los administradores pueden gestionar la empresa y los permisos de usuarios."
              />
            </div>
          </div>
        </div>
      </Drawer.Body>
      <Drawer.Footer>
        <Drawer.Close asChild>
          <Button variant="secondary">Cancelar</Button>
        </Drawer.Close>
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar"}
        </Button>
        {error && <Text className="text-red-500">{error.message}</Text>}
      </Drawer.Footer>
    </form>
  );
}
