import { Button, CurrencyInput, Drawer, Input, Label, Select, Text } from "@medusajs/ui";
import { AdminUpdateCompany } from "../../../../types";
import { useState } from "react";
import { useRegions } from "../../../hooks/api";
import { currencySymbolMap } from "../../../utils";

const PAYMENT_METHOD_OPTIONS = [
  {
    id: "transferencia_bancaria",
    type: "bank_transfer",
    label: "Transferencia bancaria",
  },
  {
    id: "credito_empresa",
    type: "company_credit",
    label: "Crédito empresa",
  },
  {
    id: "tarjeta_corporativa",
    type: "corporate_card",
    label: "Tarjeta corporativa",
  },
  {
    id: "recibo_domiciliado",
    type: "direct_debit",
    label: "Recibo domiciliado",
  },
];

const ROLE_LIMIT_FIELDS = [
  { key: "buyer", label: "Comprador" },
  { key: "approver", label: "Aprobador" },
  { key: "company_admin", label: "Admin empresa" },
  { key: "warehouse_manager", label: "Responsable de almacén" },
  { key: "readonly", label: "Solo lectura" },
];

export function CompanyForm({
  company,
  handleSubmit,
  loading,
  error,
}: {
  company?: AdminUpdateCompany;
  handleSubmit: (data: AdminUpdateCompany) => Promise<void>;
  loading: boolean;
  error: Error | null;
}) {
  const [formData, setFormData] = useState<AdminUpdateCompany>(
    company || ({} as AdminUpdateCompany)
  );

  const { regions, isPending: regionsLoading } = useRegions();

  const currencyCodes = regions?.map((region) => region.currency_code);
  const countries = regions?.flatMap((region) => region.countries);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCurrencyChange = (value: string) => {
    setFormData({ ...formData, currency_code: value });
  };

  const handleCountryChange = (value: string) => {
    setFormData({ ...formData, country: value });
  };

  const handleOnboardingStatusChange = (value: string) => {
    setFormData({ ...formData, onboarding_status: value as any });
  };

  const handlePaymentTermsChange = (value: string) => {
    setFormData({ ...formData, payment_terms: value as any });
  };

  const selectedPaymentMethodIds = getSavedPaymentMethodIds(
    formData.saved_payment_methods
  );
  const roleSpendingLimits = (formData.role_spending_limits || {}) as Record<
    string,
    number
  >;

  const setPaymentMethodEnabled = (methodId: string, enabled: boolean) => {
    const nextIds = enabled
      ? Array.from(new Set([...selectedPaymentMethodIds, methodId]))
      : selectedPaymentMethodIds.filter((id) => id !== methodId);

    const nextMethods = PAYMENT_METHOD_OPTIONS.filter((method) =>
      nextIds.includes(method.id)
    ).map((method) => ({
      ...method,
      is_default:
        method.id === formData.default_payment_method ||
        (!formData.default_payment_method && method.id === nextIds[0]),
    }));

    setFormData({
      ...formData,
      saved_payment_methods: nextMethods,
      default_payment_method: nextIds.includes(
        formData.default_payment_method || ""
      )
        ? formData.default_payment_method
        : nextIds[0] || null,
    });
  };

  const setDefaultPaymentMethod = (value: string) => {
    setFormData({
      ...formData,
      default_payment_method: value,
      saved_payment_methods: PAYMENT_METHOD_OPTIONS.filter((method) =>
        selectedPaymentMethodIds.includes(method.id)
      ).map((method) => ({
        ...method,
        is_default: method.id === value,
      })),
    });
  };

  const setRoleSpendingLimit = (role: string, value: string) => {
    setFormData({
      ...formData,
      role_spending_limits: {
        ...roleSpendingLimits,
        [role]: Number(value || 0),
      },
    });
  };

  return (
    <form>
      <Drawer.Body className="p-4">
        <div className="flex flex-col gap-2">
          <Label size="xsmall">Nombre de empresa</Label>
          <Input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Medusa"
          />
          <Label size="xsmall">Teléfono de empresa</Label>
          <Input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="1234567890"
          />
          <Label size="xsmall">Email de empresa</Label>
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="medusa@medusa.com"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label size="xsmall">CIF / VAT</Label>
              <Input
                type="text"
                name="tax_id"
                value={formData.tax_id || ""}
                onChange={handleChange}
                placeholder="ESB00000000"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label size="xsmall">Sector</Label>
              <Input
                type="text"
                name="sector"
                value={formData.sector || ""}
                onChange={handleChange}
                placeholder="instalador"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label size="xsmall">Estado onboarding</Label>
              <Select
                value={formData.onboarding_status || "approved"}
                onValueChange={handleOnboardingStatusChange}
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="pending">Pendiente</Select.Item>
                  <Select.Item value="approved">Aprobada</Select.Item>
                  <Select.Item value="rejected">Denegada</Select.Item>
                </Select.Content>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label size="xsmall">Condiciones de pago</Label>
              <Select
                value={formData.payment_terms || "bank_transfer"}
                onValueChange={handlePaymentTermsChange}
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="prepaid">Pago anticipado</Select.Item>
                  <Select.Item value="bank_transfer">Transferencia</Select.Item>
                  <Select.Item value="net_30">Crédito 30 días</Select.Item>
                  <Select.Item value="net_60">Crédito 60 días</Select.Item>
                  <Select.Item value="credit">Crédito comercial</Select.Item>
                </Select.Content>
              </Select>
            </div>
          </div>
          <Label size="xsmall">Dirección de empresa</Label>
          <Input
            type="text"
            name="address"
            value={formData.address || ""}
            onChange={handleChange}
            placeholder="1234 Main St"
          />
          <Label size="xsmall">Ciudad</Label>
          <Input
            type="text"
            name="city"
            value={formData.city || ""}
            onChange={handleChange}
            placeholder="New York"
          />
          <Label size="xsmall">Provincia / estado</Label>
          <Input
            type="text"
            name="state"
            value={formData.state || ""}
            onChange={handleChange}
            placeholder="NY"
          />
          <Label size="xsmall">Código postal</Label>
          <Input
            type="text"
            name="zip"
            value={formData.zip || ""}
            onChange={handleChange}
            placeholder="10001"
          />
          <div className="flex gap-4 w-full">
            <div className="flex flex-col gap-2 w-1/2">
              <Label size="xsmall">País</Label>
              <Select
                name="country"
                value={formData.country || ""}
                onValueChange={handleCountryChange}
                disabled={regionsLoading}
              >
                <Select.Trigger disabled={regionsLoading}>
                  <Select.Value placeholder="Selecciona país" />
                </Select.Trigger>
                <Select.Content className="z-50">
                  {countries?.map((country) => (
                    <Select.Item
                      key={country?.iso_2 || ""}
                      value={country?.iso_2 || ""}
                    >
                      {country?.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <Label size="xsmall">Moneda</Label>

              <Select
                name="currency_code"
                value={formData.currency_code || ""}
                onValueChange={handleCurrencyChange}
                defaultValue={currencyCodes?.[0]}
                disabled={regionsLoading}
              >
                <Select.Trigger disabled={regionsLoading}>
                  <Select.Value placeholder="Selecciona moneda" />
                </Select.Trigger>

                <Select.Content className="z-50">
                  {currencyCodes?.map((currencyCode) => (
                    <Select.Item key={currencyCode} value={currencyCode}>
                      {currencyCode.toUpperCase()}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
          </div>
          <Label size="xsmall">URL del logo</Label>
          <Input
            type="text"
            name="logo_url"
            value={formData.logo_url || ""}
            onChange={handleChange}
            placeholder="https://example.com/logo.png"
          />
          <div className="mt-2 flex flex-col gap-3 rounded border border-ui-border-base bg-ui-bg-subtle p-3">
            <div>
              <Text size="small" leading="compact" weight="plus">
                Métodos de pago disponibles
              </Text>
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                Selecciona qué métodos verá este cliente en checkout.
              </Text>
            </div>
            <div className="grid gap-2">
              {PAYMENT_METHOD_OPTIONS.map((method) => (
                <label
                  key={method.id}
                  className="flex items-center gap-2 text-ui-fg-base txt-compact-small"
                >
                  <input
                    type="checkbox"
                    checked={selectedPaymentMethodIds.includes(method.id)}
                    onChange={(event) =>
                      setPaymentMethodEnabled(method.id, event.target.checked)
                    }
                  />
                  {method.label}
                </label>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Label size="xsmall">Método predeterminado</Label>
              <Select
                value={formData.default_payment_method || ""}
                onValueChange={setDefaultPaymentMethod}
                disabled={!selectedPaymentMethodIds.length}
              >
                <Select.Trigger>
                  <Select.Value placeholder="Selecciona método" />
                </Select.Trigger>
                <Select.Content>
                  {PAYMENT_METHOD_OPTIONS.filter((method) =>
                    selectedPaymentMethodIds.includes(method.id)
                  ).map((method) => (
                    <Select.Item key={method.id} value={method.id}>
                      {method.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
          </div>
          <div className="mt-2 flex flex-col gap-3 rounded border border-ui-border-base bg-ui-bg-subtle p-3">
            <div>
              <Text size="small" leading="compact" weight="plus">
                Límites de gasto por rol
              </Text>
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                El checkout usa estos límites según el rol B2B del usuario.
              </Text>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {ROLE_LIMIT_FIELDS.map((role) => (
                <div key={role.key} className="flex flex-col gap-2">
                  <Label size="xsmall">{role.label}</Label>
                  <CurrencyInput
                    symbol={currencySymbolMap[formData.currency_code || "eur"]}
                    code={formData.currency_code || "eur"}
                    name={`role_spending_limit_${role.key}`}
                    value={String(roleSpendingLimits[role.key] || 0)}
                    onChange={(event) =>
                      setRoleSpendingLimit(
                        role.key,
                        event.target.value.replace(/[^0-9.]/g, "")
                      )
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Drawer.Body>
      <Drawer.Footer>
        <Drawer.Close asChild>
          <Button variant="secondary">Cancelar</Button>
        </Drawer.Close>
        <Button
          isLoading={loading}
          onClick={async () => await handleSubmit(formData)}
        >
          Guardar
        </Button>
        {error && (
          <Text className="txt-compact-small text-ui-fg-warning">
            Error: {error?.message}
          </Text>
        )}
      </Drawer.Footer>
    </form>
  );
}

function getSavedPaymentMethodIds(methods: unknown) {
  if (!Array.isArray(methods)) {
    return [];
  }

  return methods
    .map((method) => {
      if (!method || typeof method !== "object") {
        return null;
      }

      const data = method as Record<string, unknown>;
      const directId = String(data.id || "");
      const optionByType = PAYMENT_METHOD_OPTIONS.find(
        (option) => option.type === data.type
      );

      return directId || optionByType?.id || "";
    })
    .filter((id): id is string => Boolean(id));
}
