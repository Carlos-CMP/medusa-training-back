import { defineRouteConfig } from "@medusajs/admin-sdk";
import {
  ArrowDownTray,
  ArrowPath,
  ArrowUpTray,
  BuildingStorefront,
  PencilSquare,
  Plus,
  Trash,
} from "@medusajs/icons";
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  IconButton,
  Input,
  Label,
  Select,
  Table,
  Text,
  Textarea,
  Toaster,
  toast,
} from "@medusajs/ui";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AdminCatalogRule,
  CatalogRuleEffectType,
  CatalogRuleFilters,
  CatalogRuleStatus,
  CatalogRuleSimulatorOption,
  CatalogRuleSimulatorProductOption,
  CatalogRuleTargetType,
  CatalogRuleType,
  useBulkUpsertCatalogRules,
  useCatalogRuleSimulatorOptions,
  useCatalogRules,
  useDeleteCatalogRule,
  useSimulateCatalogRules,
  useSyncCatalogRulePriceList,
  useUpsertCatalogRule,
} from "../../hooks/api/catalog-rules";

type CatalogRuleFormState = AdminCatalogRule & {
  metadataJson: string;
};

type CsvImportRow = {
  rowNumber: number;
  catalogRule?: AdminCatalogRule;
  errors: string[];
  raw: Record<string, string>;
};

type CsvImportPreview = {
  filename: string;
  rows: CsvImportRow[];
};

type SimulationFormState = {
  product_id: string;
  variant_id: string;
  category_id: string;
  collection_id: string;
  company_id: string;
  customer_group_id: string;
  region_id: string;
  sales_channel_id: string;
  zone_code: string;
  currency_code: string;
};

const EMPTY_FORM: CatalogRuleFormState = {
  name: "",
  description: "",
  status: "draft",
  priority: 100,
  rule_type: "price",
  target_type: "all",
  target_id: "",
  company_id: "",
  customer_group_id: "",
  region_id: "",
  sales_channel_id: "",
  zone_code: "",
  currency_code: "eur",
  effect_type: "discount_percentage",
  discount_percentage: 0,
  fixed_price: null,
  minimum_quantity: 1,
  starts_at: "",
  ends_at: "",
  metadata: null,
  metadataJson: "",
};

const EMPTY_SIMULATION: SimulationFormState = {
  product_id: "",
  variant_id: "",
  category_id: "",
  collection_id: "",
  company_id: "",
  customer_group_id: "",
  region_id: "",
  sales_channel_id: "",
  zone_code: "",
  currency_code: "eur",
};

const statusOptions: Array<CatalogRuleStatus | "all"> = [
  "all",
  "draft",
  "active",
  "archived",
];
const ruleTypeOptions: Array<CatalogRuleType | "all"> = [
  "all",
  "price",
  "visibility",
  "assortment",
  "quote",
];
const targetTypeOptions: CatalogRuleTargetType[] = [
  "all",
  "product",
  "variant",
  "category",
  "collection",
];
const effectTypeOptions: CatalogRuleEffectType[] = [
  "discount_percentage",
  "fixed_price",
  "hide",
  "show_only",
  "requires_quote",
];

const csvHeaders = [
  "id",
  "name",
  "description",
  "status",
  "priority",
  "rule_type",
  "target_type",
  "target_id",
  "company_id",
  "customer_group_id",
  "region_id",
  "sales_channel_id",
  "zone_code",
  "currency_code",
  "effect_type",
  "discount_percentage",
  "fixed_price",
  "minimum_quantity",
  "starts_at",
  "ends_at",
  "metadata",
];

const statusImportOptions: CatalogRuleStatus[] = ["draft", "active", "archived"];
const ruleTypeImportOptions: CatalogRuleType[] = [
  "price",
  "visibility",
  "assortment",
  "quote",
];

const escapeCsvCell = (value: unknown) => {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue =
    typeof value === "object" ? JSON.stringify(value) : String(value);

  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

const parseCsvRow = (line: string) => {
  const cells: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && insideQuotes && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === "," && !insideQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current.trim());

  return cells;
};

const parseCsvText = (text: string) => {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length);
  const headers = parseCsvRow(lines[0] || "").map((header) =>
    header.trim().toLowerCase()
  );

  return lines.slice(1).map((line, index) => {
    const values = parseCsvRow(line);
    const row: Record<string, string> = {};

    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] || "";
    });

    return {
      rowNumber: index + 2,
      row,
    };
  });
};

const nullable = (value?: string) => value?.trim() || null;

const parseOptionalNumber = (
  rawValue: string | undefined,
  field: string,
  errors: string[]
) => {
  if (!rawValue?.trim()) {
    return null;
  }

  const value = Number(rawValue.replace(",", "."));

  if (!Number.isFinite(value)) {
    errors.push(`${field} must be numeric`);
    return null;
  }

  return value;
};

const parsePositiveInteger = (
  rawValue: string | undefined,
  field: string,
  fallback: number,
  errors: string[]
) => {
  if (!rawValue?.trim()) {
    return fallback;
  }

  const value = Number(rawValue);

  if (!Number.isInteger(value) || value <= 0) {
    errors.push(`${field} must be a positive integer`);
    return fallback;
  }

  return value;
};

const parseMetadata = (value: string | undefined, errors: string[]) => {
  if (!value?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      errors.push("metadata must be a JSON object");
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    errors.push("metadata must be valid JSON");
    return null;
  }
};

const isOneOf = <TValue extends string>(
  value: string,
  options: readonly TValue[]
): value is TValue => options.includes(value as TValue);

const metadataToJson = (metadata?: AdminCatalogRule["metadata"]) => {
  if (!metadata) {
    return "";
  }

  if (typeof metadata === "string") {
    try {
      return JSON.stringify(JSON.parse(metadata), null, 2);
    } catch {
      return metadata;
    }
  }

  return JSON.stringify(metadata, null, 2);
};

const buildCatalogRuleFromCsvRow = (
  row: Record<string, string>
): Omit<CsvImportRow, "rowNumber"> => {
  const errors: string[] = [];
  const name = row.name?.trim();
  const status = row.status?.trim() || "draft";
  const ruleType = row.rule_type?.trim() || "price";
  const targetType = row.target_type?.trim() || "all";
  const effectType = row.effect_type?.trim() || "discount_percentage";

  if (!name) {
    errors.push("name is required");
  }

  if (!isOneOf(status, statusImportOptions)) {
    errors.push("status is invalid");
  }

  if (!isOneOf(ruleType, ruleTypeImportOptions)) {
    errors.push("rule_type is invalid");
  }

  if (!isOneOf(targetType, targetTypeOptions)) {
    errors.push("target_type is invalid");
  }

  if (!isOneOf(effectType, effectTypeOptions)) {
    errors.push("effect_type is invalid");
  }

  if (targetType !== "all" && !row.target_id?.trim()) {
    errors.push("target_id is required when target_type is not all");
  }

  const priority = parsePositiveInteger(row.priority, "priority", 100, errors);
  const minimumQuantity = parsePositiveInteger(
    row.minimum_quantity,
    "minimum_quantity",
    1,
    errors
  );
  const discountPercentage = parseOptionalNumber(
    row.discount_percentage,
    "discount_percentage",
    errors
  );
  const fixedPrice = parseOptionalNumber(row.fixed_price, "fixed_price", errors);
  const metadata = parseMetadata(row.metadata, errors);

  if (effectType === "discount_percentage" && discountPercentage === null) {
    errors.push("discount_percentage is required for discount rules");
  }

  if (effectType === "fixed_price" && fixedPrice === null) {
    errors.push("fixed_price is required for fixed price rules");
  }

  if (discountPercentage !== null && (discountPercentage < 0 || discountPercentage > 100)) {
    errors.push("discount_percentage must be between 0 and 100");
  }

  if (errors.length) {
    return {
      errors,
      raw: row,
    };
  }

  return {
    errors,
    raw: row,
    catalogRule: {
      id: row.id?.trim() || undefined,
      name,
      description: nullable(row.description),
      status: status as CatalogRuleStatus,
      priority,
      rule_type: ruleType as CatalogRuleType,
      target_type: targetType as CatalogRuleTargetType,
      target_id: targetType === "all" ? null : nullable(row.target_id),
      company_id: nullable(row.company_id),
      customer_group_id: nullable(row.customer_group_id),
      region_id: nullable(row.region_id),
      sales_channel_id: nullable(row.sales_channel_id),
      zone_code: nullable(row.zone_code),
      currency_code: nullable(row.currency_code),
      effect_type: effectType as CatalogRuleEffectType,
      discount_percentage:
        effectType === "discount_percentage" ? discountPercentage : null,
      fixed_price: effectType === "fixed_price" ? fixedPrice : null,
      minimum_quantity: minimumQuantity,
      starts_at: nullable(row.starts_at),
      ends_at: nullable(row.ends_at),
      metadata,
    },
  };
};

const toFormState = (catalogRule?: AdminCatalogRule): CatalogRuleFormState => {
  if (!catalogRule) {
    return EMPTY_FORM;
  }

  return {
    ...EMPTY_FORM,
    ...catalogRule,
    description: catalogRule.description || "",
    target_id: catalogRule.target_id || "",
    company_id: catalogRule.company_id || "",
    customer_group_id: catalogRule.customer_group_id || "",
    region_id: catalogRule.region_id || "",
    sales_channel_id: catalogRule.sales_channel_id || "",
    zone_code: catalogRule.zone_code || "",
    currency_code: catalogRule.currency_code || "eur",
    starts_at: catalogRule.starts_at || "",
    ends_at: catalogRule.ends_at || "",
    metadataJson: metadataToJson(catalogRule.metadata),
  };
};

const compact = (value?: string | null) => value || "-";

const parseRuleMetadata = (metadata?: AdminCatalogRule["metadata"]) => {
  if (!metadata) {
    return {};
  }

  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  return metadata;
};

const canSyncPriceList = (rule: AdminCatalogRule) => {
  const metadata = parseRuleMetadata(rule.metadata);

  return (
    rule.status === "active" &&
    rule.rule_type === "price" &&
    rule.effect_type === "fixed_price" &&
    rule.target_type === "variant" &&
    Boolean(rule.target_id) &&
    rule.fixed_price !== null &&
    rule.fixed_price !== undefined &&
    Boolean(rule.currency_code) &&
    !metadata.price_list_id
  );
};

const effectLabel = (rule: AdminCatalogRule) => {
  if (rule.effect_type === "discount_percentage") {
    return `${rule.discount_percentage || 0}% discount`;
  }

  if (rule.effect_type === "fixed_price") {
    return `${rule.fixed_price || 0} fixed`;
  }

  return rule.effect_type.replace("_", " ");
};

const CatalogRulesPage = () => {
  const [filters, setFilters] = useState<CatalogRuleFilters>({
    status: "all",
    rule_type: "all",
    limit: 100,
    offset: 0,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CatalogRuleFormState>(EMPTY_FORM);
  const [importPreview, setImportPreview] = useState<CsvImportPreview | null>(
    null
  );
  const [simulationForm, setSimulationForm] =
    useState<SimulationFormState>(EMPTY_SIMULATION);
  const [simulatorSearch, setSimulatorSearch] = useState("");
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const { data, isPending } = useCatalogRules(filters);
  const { data: simulatorOptions, isPending: isLoadingSimulatorOptions } =
    useCatalogRuleSimulatorOptions(simulatorSearch);
  const catalogRules = data?.catalog_rules || [];
  const activeRules = useMemo(
    () => catalogRules.filter((rule) => rule.status === "active").length,
    [catalogRules]
  );

  const upsertCatalogRule = useUpsertCatalogRule({
    onSuccess: () => {
      toast.success("Catalog rule saved");
      setOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (error) =>
      toast.error(error.message || "Could not save catalog rule"),
  });
  const deleteCatalogRule = useDeleteCatalogRule({
    onSuccess: () => toast.success("Catalog rule deleted"),
    onError: (error) =>
      toast.error(error.message || "Could not delete catalog rule"),
  });
  const bulkUpsertCatalogRules = useBulkUpsertCatalogRules({
    onSuccess: (data) => {
      toast.success(`${data.catalog_rules.length} catalog rules imported`);
      setImportPreview(null);
    },
    onError: (error) =>
      toast.error(error.message || "Could not import catalog rules"),
  });
  const syncCatalogRulePriceList = useSyncCatalogRulePriceList({
    onSuccess: (data) =>
      toast.success(`Price list created: ${data.price_list.title}`),
    onError: (error) =>
      toast.error(error.message || "Could not sync price list"),
  });
  const simulateCatalogRules = useSimulateCatalogRules({
    onError: (error) =>
      toast.error(error.message || "Could not simulate catalog rules"),
  });

  const validImportRows = useMemo(
    () =>
      importPreview?.rows.filter((row) => row.catalogRule && !row.errors.length) ||
      [],
    [importPreview]
  );
  const invalidImportRows = useMemo(
    () => importPreview?.rows.filter((row) => row.errors.length) || [],
    [importPreview]
  );

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
    }
  }, [open]);

  const updateForm = <TKey extends keyof CatalogRuleFormState>(
    field: TKey,
    value: CatalogRuleFormState[TKey]
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCreate = () => {
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const handleEdit = (catalogRule: AdminCatalogRule) => {
    setForm(toFormState(catalogRule));
    setOpen(true);
  };

  const handleExportCsv = () => {
    if (!catalogRules.length) {
      toast.error("There are no visible catalog rules to export");
      return;
    }

    const rows = catalogRules.map((rule) =>
      csvHeaders
        .map((header) => escapeCsvCell(rule[header as keyof AdminCatalogRule]))
        .join(",")
    );
    const csv = [csvHeaders.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `catalog-rules-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    const text = await file.text();
    const parsedRows = parseCsvText(text);

    if (!parsedRows.length) {
      toast.error("CSV file has no data rows");
      return;
    }

    setImportPreview({
      filename: file.name,
      rows: parsedRows.map(({ rowNumber, row }) => ({
        rowNumber,
        ...buildCatalogRuleFromCsvRow(row),
      })),
    });
  };

  const handleConfirmImport = () => {
    const catalogRulesToImport = validImportRows
      .map((row) => row.catalogRule)
      .filter((rule): rule is AdminCatalogRule => Boolean(rule));

    if (!catalogRulesToImport.length) {
      toast.error("There are no valid rows to import");
      return;
    }

    bulkUpsertCatalogRules.mutate(catalogRulesToImport);
  };

  const updateSimulation = <TKey extends keyof SimulationFormState>(
    field: TKey,
    value: SimulationFormState[TKey]
  ) => {
    setSimulationForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const applyProductToSimulation = (
    product: CatalogRuleSimulatorProductOption
  ) => {
    setSimulationForm((current) => ({
      ...current,
      product_id: product.id,
      variant_id: "",
      category_id: product.categories?.[0]?.id || current.category_id,
      collection_id: product.collection_id || current.collection_id,
    }));
  };

  const applyVariantToSimulation = (
    product: CatalogRuleSimulatorProductOption,
    variant: CatalogRuleSimulatorOption
  ) => {
    setSimulationForm((current) => ({
      ...current,
      product_id: product.id,
      variant_id: variant.id,
      category_id: product.categories?.[0]?.id || current.category_id,
      collection_id: product.collection_id || current.collection_id,
    }));
  };

  const handleSimulate = () => {
    simulateCatalogRules.mutate(
      Object.fromEntries(
        Object.entries(simulationForm).filter(([, value]) => value.trim())
      )
    );
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (form.target_type !== "all" && !form.target_id) {
      toast.error("Target id is required when target is not all");
      return;
    }

    if (
      form.effect_type === "discount_percentage" &&
      (form.discount_percentage === null ||
        form.discount_percentage === undefined)
    ) {
      toast.error("Discount percentage is required");
      return;
    }

    if (
      form.effect_type === "fixed_price" &&
      (form.fixed_price === null || form.fixed_price === undefined)
    ) {
      toast.error("Fixed price is required");
      return;
    }

    let metadata: Record<string, unknown> | null = null;

    if (form.metadataJson.trim()) {
      try {
        metadata = JSON.parse(form.metadataJson);
      } catch {
        toast.error("El JSON de metadata no es valido");
        return;
      }
    }

    upsertCatalogRule.mutate({
      id: form.id,
      name: form.name,
      description: form.description || null,
      status: form.status,
      priority: Number(form.priority || 100),
      rule_type: form.rule_type,
      target_type: form.target_type,
      target_id: form.target_type === "all" ? null : form.target_id || null,
      company_id: form.company_id || null,
      customer_group_id: form.customer_group_id || null,
      region_id: form.region_id || null,
      sales_channel_id: form.sales_channel_id || null,
      zone_code: form.zone_code || null,
      currency_code: form.currency_code || null,
      effect_type: form.effect_type,
      discount_percentage:
        form.effect_type === "discount_percentage"
          ? Number(form.discount_percentage || 0)
          : null,
      fixed_price:
        form.effect_type === "fixed_price" ? Number(form.fixed_price || 0) : null,
      minimum_quantity: Number(form.minimum_quantity || 1),
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      metadata,
    });
  };

  return (
    <>
      <Container className="flex flex-col p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <Heading className="font-sans font-medium h1-core">
              Reglas de catálogo
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Reglas por cliente, region, canal y zona para precios B2B y
              surtidos.
            </Text>
          </div>
          <div className="flex items-center gap-x-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImportCsv}
            />
            <Button
              size="small"
              variant="secondary"
              disabled={!catalogRules.length}
              onClick={handleExportCsv}
            >
              <ArrowDownTray />
              Exportar CSV
            </Button>
            <Button
              size="small"
              variant="secondary"
              onClick={() => importInputRef.current?.click()}
            >
              <ArrowUpTray />
              Importar CSV
            </Button>
            <Button size="small" onClick={handleCreate}>
              <Plus />
              Nueva regla
            </Button>
          </div>
        </div>

        <div className="grid gap-4 p-6">
          <div className="grid gap-3 rounded-lg border p-4 medium:grid-cols-[repeat(5,minmax(0,1fr))]">
            <SelectFilter
              label="Estado"
              value={filters.status || "all"}
              options={statusOptions}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  status: value as CatalogRuleStatus | "all",
                }))
              }
            />
            <SelectFilter
              label="Tipo de regla"
              value={filters.rule_type || "all"}
              options={ruleTypeOptions}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  rule_type: value as CatalogRuleType | "all",
                }))
              }
            />
            <TextField
              label="Region"
              value={filters.region_id || ""}
              onChange={(value) =>
                setFilters((current) => ({ ...current, region_id: value }))
              }
            />
            <TextField
              label="Canal"
              value={filters.sales_channel_id || ""}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  sales_channel_id: value,
                }))
              }
            />
            <TextField
              label="Zona"
              value={filters.zone_code || ""}
              onChange={(value) =>
                setFilters((current) => ({ ...current, zone_code: value }))
              }
            />
          </div>

          <div className="grid gap-3 small:grid-cols-3">
            <Metric label="Reglas totales" value={data?.count || 0} />
            <Metric label="Reglas activas" value={activeRules} />
            <Metric label="Filas visibles" value={catalogRules.length} />
          </div>

          <div className="grid gap-4 rounded-lg border bg-ui-bg-base p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Text size="small" leading="compact" weight="plus">
                  Simulador de reglas
                </Text>
                <Text
                  size="small"
                  leading="compact"
                  className="text-ui-fg-subtle"
                >
                  Comprueba que reglas activas aplican por producto, empresa,
                  region, canal y zona.
                </Text>
              </div>
              <Button
                size="small"
                variant="secondary"
                onClick={handleSimulate}
                isLoading={simulateCatalogRules.isPending}
              >
                Simular
              </Button>
            </div>

            <div className="grid gap-3 rounded-lg border bg-ui-bg-subtle p-3">
              <div className="grid gap-2 medium:grid-cols-[minmax(0,1fr)_auto] medium:items-end">
                <TextField
                  label="Buscar producto o empresa"
                  value={simulatorSearch}
                  onChange={setSimulatorSearch}
                />
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => setSimulationForm(EMPTY_SIMULATION)}
                >
                  Limpiar contexto
                </Button>
              </div>

              <SimulationContextSummary simulationForm={simulationForm} />

              <div className="grid gap-3 large:grid-cols-2">
                <div className="grid gap-2">
                  <Text size="small" leading="compact" weight="plus">
                    Producto y variante
                  </Text>
                  {isLoadingSimulatorOptions ? (
                    <Text size="small" className="text-ui-fg-subtle">
                      Cargando opciones de producto...
                    </Text>
                  ) : simulatorOptions?.products.length ? (
                    <div className="grid gap-2">
                      {simulatorOptions.products.map((product) => (
                        <div
                          key={product.id}
                          className="grid gap-2 rounded-md border bg-ui-bg-base p-2"
                        >
                          <SimulatorOptionButton
                            option={product}
                            selected={simulationForm.product_id === product.id}
                            onClick={() => applyProductToSimulation(product)}
                          />
                          {product.variants?.length ? (
                            <div className="flex flex-wrap gap-2 pl-2">
                              {product.variants.map((variant) => (
                                <SimulatorOptionButton
                                  key={variant.id}
                                  option={variant}
                                  selected={
                                    simulationForm.variant_id === variant.id
                                  }
                                  compact
                                  onClick={() =>
                                    applyVariantToSimulation(product, variant)
                                  }
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Text size="small" className="text-ui-fg-subtle">
                      No se han encontrado productos. Usa los campos manuales
                      de ID.
                    </Text>
                  )}
                </div>

                <div className="grid gap-3">
                  <SimulatorOptionSection
                    title="Empresa"
                    options={simulatorOptions?.companies || []}
                    selectedId={simulationForm.company_id}
                    onSelect={(option) =>
                      updateSimulation("company_id", option.id)
                    }
                  />
                  <SimulatorOptionSection
                    title="Grupo de clientes"
                    options={simulatorOptions?.customer_groups || []}
                    selectedId={simulationForm.customer_group_id}
                    onSelect={(option) =>
                      updateSimulation("customer_group_id", option.id)
                    }
                  />
                  <SimulatorOptionSection
                    title="Region"
                    options={simulatorOptions?.regions || []}
                    selectedId={simulationForm.region_id}
                    onSelect={(option) =>
                      updateSimulation("region_id", option.id)
                    }
                  />
                  <SimulatorOptionSection
                    title="Canal"
                    options={simulatorOptions?.sales_channels || []}
                    selectedId={simulationForm.sales_channel_id}
                    onSelect={(option) =>
                      updateSimulation("sales_channel_id", option.id)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3 medium:grid-cols-5">
              <TextField
                label="ID de producto"
                value={simulationForm.product_id}
                onChange={(value) => updateSimulation("product_id", value)}
              />
              <TextField
                label="ID de variante"
                value={simulationForm.variant_id}
                onChange={(value) => updateSimulation("variant_id", value)}
              />
              <TextField
                label="ID de categoría"
                value={simulationForm.category_id}
                onChange={(value) => updateSimulation("category_id", value)}
              />
              <TextField
                label="ID de empresa"
                value={simulationForm.company_id}
                onChange={(value) => updateSimulation("company_id", value)}
              />
              <TextField
                label="Grupo de clientes"
                value={simulationForm.customer_group_id}
                onChange={(value) =>
                  updateSimulation("customer_group_id", value)
                }
              />
              <TextField
                label="Region"
                value={simulationForm.region_id}
                onChange={(value) => updateSimulation("region_id", value)}
              />
              <TextField
                label="Canal"
                value={simulationForm.sales_channel_id}
                onChange={(value) =>
                  updateSimulation("sales_channel_id", value)
                }
              />
              <TextField
                label="Zona"
                value={simulationForm.zone_code}
                onChange={(value) => updateSimulation("zone_code", value)}
              />
              <TextField
                label="Moneda"
                value={simulationForm.currency_code}
                onChange={(value) => updateSimulation("currency_code", value)}
              />
              <TextField
                label="ID de coleccion"
                value={simulationForm.collection_id}
                onChange={(value) => updateSimulation("collection_id", value)}
              />
            </div>

            {simulateCatalogRules.data ? (
              <div className="grid gap-2 rounded-lg border bg-ui-bg-subtle p-3">
                <div className="flex items-center justify-between gap-3">
                  <Text size="small" leading="compact" weight="plus">
                    Reglas aplicables
                  </Text>
                  <Badge size="small">
                    {simulateCatalogRules.data.applicable_rules.length}
                  </Badge>
                </div>
                {simulateCatalogRules.data.applicable_rules.length ? (
                  <div className="grid gap-2">
                    {simulateCatalogRules.data.applicable_rules.map((rule) => (
                      <div
                        key={rule.id || rule.name}
                        className="grid gap-1 rounded-md border bg-ui-bg-base p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Text size="small" leading="compact" weight="plus">
                            {rule.name}
                          </Text>
                          <Badge size="xsmall">{rule.effect_type}</Badge>
                        </div>
                        <Text
                          size="small"
                          leading="compact"
                          className="text-ui-fg-subtle"
                        >
                          {rule.rule_type} / {rule.target_type}
                          {rule.target_id ? `:${rule.target_id}` : ""} /
                          priority {rule.priority} / {effectLabel(rule)}
                        </Text>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Text size="small" className="text-ui-fg-subtle">
                    No hay reglas activas para este contexto.
                  </Text>
                )}
              </div>
            ) : null}
          </div>

          {isPending ? (
            <div className="rounded-lg border p-6">
              <Text size="small" className="text-ui-fg-subtle">
                Loading catalog rules...
              </Text>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Name</Table.HeaderCell>
                    <Table.HeaderCell>Status</Table.HeaderCell>
                    <Table.HeaderCell>Target</Table.HeaderCell>
                    <Table.HeaderCell>Context</Table.HeaderCell>
                    <Table.HeaderCell>Effect</Table.HeaderCell>
                    <Table.HeaderCell>Min qty</Table.HeaderCell>
                    <Table.HeaderCell>Priority</Table.HeaderCell>
                    <Table.HeaderCell>Actions</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {catalogRules.length ? (
                    catalogRules.map((rule) => (
                      <Table.Row key={rule.id}>
                        <Table.Cell>
                          <div>
                            <Text size="small" weight="plus">
                              {rule.name}
                            </Text>
                            <Text size="small" className="text-ui-fg-subtle">
                              {rule.rule_type}
                              {parseRuleMetadata(rule.metadata).price_list_id
                                ? " / price list synced"
                                : ""}
                            </Text>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge size="small">{rule.status}</Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="small">
                            {rule.target_type}
                            {rule.target_id ? `:${rule.target_id}` : ""}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="small" className="text-ui-fg-subtle">
                            c:{compact(rule.company_id)} / r:
                            {compact(rule.region_id)} / ch:
                            {compact(rule.sales_channel_id)}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>{effectLabel(rule)}</Table.Cell>
                        <Table.Cell>{rule.minimum_quantity}</Table.Cell>
                        <Table.Cell>{rule.priority}</Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center gap-x-1">
                            <IconButton
                              size="small"
                              variant="transparent"
                              disabled={
                                !rule.id ||
                                !canSyncPriceList(rule) ||
                                syncCatalogRulePriceList.isPending
                              }
                              onClick={() =>
                                rule.id &&
                                syncCatalogRulePriceList.mutate({
                                  id: rule.id,
                                })
                              }
                            >
                              <ArrowPath />
                            </IconButton>
                            <IconButton
                              size="small"
                              variant="transparent"
                              onClick={() => handleEdit(rule)}
                            >
                              <PencilSquare />
                            </IconButton>
                            <IconButton
                              size="small"
                              variant="transparent"
                              disabled={!rule.id}
                              onClick={() =>
                                rule.id && deleteCatalogRule.mutate(rule.id)
                              }
                            >
                              <Trash />
                            </IconButton>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))
                  ) : (
                    <Table.Row>
                      <Table.Cell colSpan={8}>
                        <Text size="small" className="text-ui-fg-subtle">
                          No hay reglas de catálogo.
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table>
            </div>
          )}
        </div>
      </Container>

      <Drawer open={open} onOpenChange={setOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>
              {form.id ? "Editar regla de catálogo" : "Nueva regla de catálogo"}
            </Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-1 flex-col gap-y-4 overflow-auto p-4">
            <TextField
              label="Name"
              value={form.name}
              onChange={(value) => updateForm("name", value)}
            />
            <TextAreaField
              label="Descripción"
              value={form.description || ""}
              rows={2}
              onChange={(value) => updateForm("description", value)}
            />
            <div className="grid gap-3 small:grid-cols-2">
              <SelectField
                label="Estado"
                value={form.status}
                options={statusOptions.filter(
                  (option): option is CatalogRuleStatus => option !== "all"
                )}
                onChange={(value) =>
                  updateForm("status", value as CatalogRuleStatus)
                }
              />
              <NumberField
                label="Prioridad"
                value={form.priority}
                onChange={(value) => updateForm("priority", value)}
              />
            </div>
            <div className="grid gap-3 small:grid-cols-2">
              <SelectField
                label="Tipo de regla"
                value={form.rule_type}
                options={ruleTypeOptions.filter(
                  (option): option is CatalogRuleType => option !== "all"
                )}
                onChange={(value) =>
                  updateForm("rule_type", value as CatalogRuleType)
                }
              />
              <SelectField
                label="Efecto"
                value={form.effect_type}
                options={effectTypeOptions}
                onChange={(value) =>
                  updateForm("effect_type", value as CatalogRuleEffectType)
                }
              />
            </div>
            <div className="grid gap-3 small:grid-cols-2">
              <SelectField
                label="Tipo de objetivo"
                value={form.target_type}
                options={targetTypeOptions}
                onChange={(value) =>
                  updateForm("target_type", value as CatalogRuleTargetType)
                }
              />
              <TextField
                label="ID objetivo"
                value={form.target_id || ""}
                onChange={(value) => updateForm("target_id", value)}
              />
            </div>
            <div className="grid gap-3 small:grid-cols-2">
              <NumberField
                label="Descuento %"
                value={Number(form.discount_percentage || 0)}
                disabled={form.effect_type !== "discount_percentage"}
                onChange={(value) => updateForm("discount_percentage", value)}
              />
              <NumberField
                label="Precio fijo"
                value={Number(form.fixed_price || 0)}
                disabled={form.effect_type !== "fixed_price"}
                onChange={(value) => updateForm("fixed_price", value)}
              />
            </div>
            <NumberField
              label="Cantidad minima"
              value={form.minimum_quantity}
              onChange={(value) => updateForm("minimum_quantity", value)}
            />
            <div className="grid gap-3 small:grid-cols-2">
              <TextField
                label="ID empresa"
                value={form.company_id || ""}
                onChange={(value) => updateForm("company_id", value)}
              />
              <TextField
                label="ID grupo de clientes"
                value={form.customer_group_id || ""}
                onChange={(value) => updateForm("customer_group_id", value)}
              />
              <TextField
                label="ID region"
                value={form.region_id || ""}
                onChange={(value) => updateForm("region_id", value)}
              />
              <TextField
                label="ID canal"
                value={form.sales_channel_id || ""}
                onChange={(value) => updateForm("sales_channel_id", value)}
              />
              <TextField
                label="Código de zona"
                value={form.zone_code || ""}
                onChange={(value) => updateForm("zone_code", value)}
              />
              <TextField
                label="Código de moneda"
                value={form.currency_code || ""}
                onChange={(value) => updateForm("currency_code", value)}
              />
            </div>
            <div className="grid gap-3 small:grid-cols-2">
              <TextField
                label="Inicio"
                value={form.starts_at || ""}
                onChange={(value) => updateForm("starts_at", value)}
              />
              <TextField
                label="Fin"
                value={form.ends_at || ""}
                onChange={(value) => updateForm("ends_at", value)}
              />
            </div>
            <TextAreaField
              label="Metadata JSON"
              value={form.metadataJson}
              rows={5}
              onChange={(value) => updateForm("metadataJson", value)}
            />
          </Drawer.Body>
          <Drawer.Footer>
            <div className="flex items-center justify-end gap-x-2">
              <Drawer.Close asChild>
                <Button
                  size="small"
                  variant="secondary"
                  disabled={upsertCatalogRule.isPending}
                >
                  Cancelar
                </Button>
              </Drawer.Close>
              <Button
                size="small"
                onClick={handleSubmit}
                isLoading={upsertCatalogRule.isPending}
              >
                Guardar regla
              </Button>
            </div>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>

      <Drawer
        open={Boolean(importPreview)}
        onOpenChange={(nextOpen) => !nextOpen && setImportPreview(null)}
      >
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Import catalog rules</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-1 flex-col gap-y-4 overflow-auto p-4">
            <div>
              <Text size="small" weight="plus">
                {importPreview?.filename}
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                Review valid and invalid rows before applying changes.
              </Text>
            </div>

            <div className="grid gap-3 small:grid-cols-3">
              <Metric label="Rows" value={importPreview?.rows.length || 0} />
              <Metric label="Valid" value={validImportRows.length} />
              <Metric label="Errors" value={invalidImportRows.length} />
            </div>

            {invalidImportRows.length ? (
              <div className="rounded-lg border border-ui-border-error bg-ui-bg-base p-4">
                <Text size="small" weight="plus" className="text-ui-fg-error">
                  Rows with errors
                </Text>
                <div className="mt-3 grid gap-2">
                  {invalidImportRows.slice(0, 8).map((row) => (
                    <div key={row.rowNumber} className="rounded-md border p-3">
                      <Text size="small" weight="plus">
                        Row {row.rowNumber}: {row.raw.name || "Unnamed rule"}
                      </Text>
                      <Text size="small" className="text-ui-fg-subtle">
                        {row.errors.join(", ")}
                      </Text>
                    </div>
                  ))}
                  {invalidImportRows.length > 8 ? (
                    <Text size="small" className="text-ui-fg-subtle">
                      {invalidImportRows.length - 8} more invalid rows hidden.
                    </Text>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="rounded-lg border">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Row</Table.HeaderCell>
                    <Table.HeaderCell>Name</Table.HeaderCell>
                    <Table.HeaderCell>Target</Table.HeaderCell>
                    <Table.HeaderCell>Context</Table.HeaderCell>
                    <Table.HeaderCell>Effect</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {validImportRows.length ? (
                    validImportRows.slice(0, 10).map((row) => {
                      const rule = row.catalogRule!;

                      return (
                        <Table.Row key={row.rowNumber}>
                          <Table.Cell>{row.rowNumber}</Table.Cell>
                          <Table.Cell>
                            <Text size="small" weight="plus">
                              {rule.name}
                            </Text>
                            <Text size="small" className="text-ui-fg-subtle">
                              {rule.status} / {rule.rule_type}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            {rule.target_type}
                            {rule.target_id ? `:${rule.target_id}` : ""}
                          </Table.Cell>
                          <Table.Cell>
                            <Text size="small" className="text-ui-fg-subtle">
                              c:{compact(rule.company_id)} / r:
                              {compact(rule.region_id)} / ch:
                              {compact(rule.sales_channel_id)}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>{effectLabel(rule)}</Table.Cell>
                        </Table.Row>
                      );
                    })
                  ) : (
                    <Table.Row>
                      <Table.Cell colSpan={5}>
                        <Text size="small" className="text-ui-fg-subtle">
                          No valid catalog rules found in this CSV.
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table>
              {validImportRows.length > 10 ? (
                <div className="border-t px-4 py-3">
                  <Text size="small" className="text-ui-fg-subtle">
                    {validImportRows.length - 10} more valid rows will be
                    imported.
                  </Text>
                </div>
              ) : null}
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <div className="flex items-center justify-end gap-x-2">
              <Drawer.Close asChild>
                <Button
                  size="small"
                  variant="secondary"
                  disabled={bulkUpsertCatalogRules.isPending}
                >
                  Cancelar
                </Button>
              </Drawer.Close>
              <Button
                size="small"
                onClick={handleConfirmImport}
                disabled={!validImportRows.length}
                isLoading={bulkUpsertCatalogRules.isPending}
              >
                Import valid rows
              </Button>
            </div>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
      <Toaster />
    </>
  );
};

const SimulationContextSummary = ({
  simulationForm,
}: {
  simulationForm: SimulationFormState;
}) => {
  const activeEntries = Object.entries(simulationForm).filter(
    ([, value]) => value.trim() && value !== "eur"
  );

  if (!activeEntries.length) {
    return (
      <Text size="small" className="text-ui-fg-subtle">
        Selecciona producto, empresa, región o canal para simular un contexto
        de compra B2B.
      </Text>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {activeEntries.map(([key, value]) => (
        <Badge key={key} size="small">
          {key.replace("_id", "")}: {compact(value)}
        </Badge>
      ))}
    </div>
  );
};

const SimulatorOptionButton = ({
  option,
  selected,
  compact: isCompact,
  onClick,
}: {
  option: CatalogRuleSimulatorOption;
  selected: boolean;
  compact?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    className={`rounded-md border px-3 py-2 text-left transition-colors ${
      selected
        ? "border-ui-border-interactive bg-ui-bg-interactive text-ui-fg-on-color"
        : "border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-base-hover"
    } ${isCompact ? "min-w-[120px]" : "w-full"}`}
    onClick={onClick}
  >
    <Text size="small" leading="compact" weight="plus">
      {option.label}
    </Text>
    {option.description ? (
      <Text
        size="xsmall"
        leading="compact"
        className={selected ? "text-ui-fg-on-color" : "text-ui-fg-subtle"}
      >
        {option.description}
      </Text>
    ) : null}
  </button>
);

const SimulatorOptionSection = ({
  title,
  options,
  selectedId,
  onSelect,
}: {
  title: string;
  options: CatalogRuleSimulatorOption[];
  selectedId: string;
  onSelect: (option: CatalogRuleSimulatorOption) => void;
}) => (
  <div className="grid gap-2">
    <Text size="small" leading="compact" weight="plus">
      {title}
    </Text>
    {options.length ? (
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <SimulatorOptionButton
            key={option.id}
            option={option}
            selected={selectedId === option.id}
            compact
            onClick={() => onSelect(option)}
          />
        ))}
      </div>
    ) : (
      <Text size="small" className="text-ui-fg-subtle">
        No hay opciones.
      </Text>
    )}
  </div>
);

const Metric = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border bg-ui-bg-subtle p-4">
    <Text size="small" className="text-ui-fg-subtle">
      {label}
    </Text>
    <Text size="large" weight="plus">
      {value}
    </Text>
  </div>
);

const TextField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="grid gap-2">
    <Label>{label}</Label>
    <Input value={value} onChange={(event) => onChange(event.target.value)} />
  </div>
);

const NumberField = ({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) => (
  <div className="grid gap-2">
    <Label>{label}</Label>
    <Input
      type="number"
      min={0}
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </div>
);

const TextAreaField = ({
  label,
  value,
  rows = 4,
  onChange,
}: {
  label: string;
  value: string;
  rows?: number;
  onChange: (value: string) => void;
}) => (
  <div className="grid gap-2">
    <Label>{label}</Label>
    <Textarea
      rows={rows}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>
);

const SelectField = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) => (
  <div className="grid gap-2">
    <Label>{label}</Label>
    <Select value={value} onValueChange={onChange}>
      <Select.Trigger>
        <Select.Value />
      </Select.Trigger>
      <Select.Content>
        {options.map((option) => (
          <Select.Item key={option} value={option}>
            {option}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  </div>
);

const SelectFilter = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) => <SelectField label={label} value={value} options={options} onChange={onChange} />;

export const config = defineRouteConfig({
  label: "Catalog rules",
  icon: BuildingStorefront,
});

export default CatalogRulesPage;
