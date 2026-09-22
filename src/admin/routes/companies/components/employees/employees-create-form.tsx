import {
  Button,
  Drawer,
  Input,
  Label,
  Select,
  Text,
} from "@medusajs/ui";
import { useState } from "react";
import { AdminCreateEmployee, QueryCompany } from "../../../../../types";
import { CoolSwitch } from "../../../../components/common";

export function EmployeesCreateForm({
  handleSubmit,
  loading,
  error,
  company,
}: {
  handleSubmit: (data: AdminCreateEmployee) => Promise<void>;
  loading: boolean;
  error: Error | null;
  company: QueryCompany;
}) {
  const [formData, setFormData] = useState<
    Omit<AdminCreateEmployee, "spending_limit"> & {
      spending_limit: string;
    }
  >({
    company_id: company.id,
    is_admin: false,
    role: "buyer" as any,
    status: "active" as any,
    spending_limit: "0",
    customer_id: "",
  });
  const roleLimits = (company.role_spending_limits || {}) as Record<
    string,
    number
  >;
  const selectedRole = formData.role || "buyer";
  const selectedRoleLimit = Number(roleLimits[selectedRole] || 0);
  const roleLimitLabel = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: company.currency_code?.toUpperCase() || "EUR",
    maximumFractionDigits: 0,
  }).format(selectedRoleLimit);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value =
      e.target.type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : e.target.value;

    setFormData({ ...formData, [e.target.name]: value });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...formData,
      spending_limit: selectedRoleLimit,
    };

    handleSubmit(data);
  };

  return (
    <form onSubmit={onSubmit}>
      <Drawer.Body className="flex flex-col p-4 gap-6">
        <div className="flex flex-col gap-3">
          <h2 className="h2-core">Datos del usuario</h2>
          <div className="flex flex-col gap-2">
            <Label size="xsmall" className="txt-compact-small font-medium">
              Nombre
            </Label>
            <Input
              type="text"
              name="first_name"
              onChange={handleChange}
              placeholder="Laura"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label size="xsmall" className="txt-compact-small font-medium">
              Apellidos
            </Label>
            <Input
              type="text"
              name="last_name"
              onChange={handleChange}
              placeholder="Garcia"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label size="xsmall" className="txt-compact-small font-medium">
              Email
            </Label>
            <Input
              type="email"
              name="email"
              onChange={handleChange}
              placeholder="laura.garcia@empresa.com"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label size="xsmall" className="txt-compact-small font-medium">
              Teléfono
            </Label>
            <Input
              type="text"
              name="phone"
              onChange={handleChange}
              placeholder="0612345678"
            />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="h2-core">Permisos</h2>
          <div className="flex flex-col gap-2">
            <Label size="xsmall" className="txt-compact-small font-medium">
              Límite del rol
            </Label>
            <div className="rounded border border-ui-border-base bg-ui-bg-subtle px-3 py-2">
              <Text size="small" weight="plus">
                {roleLimitLabel}
              </Text>
              <Text size="xsmall" className="text-ui-fg-subtle">
                Se gestiona desde Empresa → Límites de gasto por rol.
              </Text>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label size="xsmall" className="txt-compact-small font-medium">
              Rol B2B
            </Label>
            <Select
              value={formData.role || "buyer"}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  role: value as any,
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
              Acceso administrador
            </Label>
            <CoolSwitch
              fieldName="is_admin"
              label="Es administrador"
              description="Permite gestionar datos de empresa y permisos."
              checked={formData.is_admin || false}
              onChange={(checked) =>
                setFormData({
                  ...formData,
                  is_admin: checked,
                  role: checked ? ("company_admin" as any) : ("buyer" as any),
                  spending_limit: String(
                    roleLimits[checked ? "company_admin" : "buyer"] || 0
                  ),
                })
              }
              tooltip="Los administradores pueden gestionar la empresa y los permisos de usuarios."
            />
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
