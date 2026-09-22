import { defineRouteConfig } from "@medusajs/admin-sdk";
import {
  Buildings,
  ChartBar,
  CurrencyDollar,
  DocumentText,
  ExclamationCircle,
} from "@medusajs/icons";
import { Badge, Button, Container, Heading, Text } from "@medusajs/ui";
import { Link } from "react-router-dom";
import {
  B2BControlSummary,
  useB2BControlSummary,
} from "../../hooks/api/b2b-control";

type CompanyRow = B2BControlSummary["accounts"]["companies"][number];

const B2BControl = () => {
  const { data, isLoading } = useB2BControlSummary();
  const summary = data?.summary;
  const accounts = summary?.accounts;
  const companies = accounts?.companies || [];
  const pendingApprovals = accounts?.pending_approvals || 0;

  const handleExport = () => {
    const rows = [
      [
        "Empresa",
        "Email",
        "CIF",
        "Estado",
        "Condiciones",
        "Usuarios",
        "Aprobadores",
        "GMV periodo",
        "Frecuencia pedidos",
        "Ultima actividad",
        "Limite comprador",
        "Limite aprobador",
      ],
      ...companies.map((company) => [
        company.name,
        company.email,
        company.tax_id,
        company.status,
        company.payment_terms,
        company.employees,
        company.approvers,
        company.period_gmv,
        company.order_frequency,
        formatDate(company.last_activity),
        company.buyer_limit,
        company.approver_limit,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "b2b-control-empresas.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-y-4">
      <Container className="p-0">
        <div className="flex flex-col gap-4 border-b border-ui-border-base px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Text
              size="xsmall"
              leading="compact"
              weight="plus"
              className="text-ui-fg-subtle"
            >
              Canal digital B2B
            </Text>
            <Heading level="h1" className="mt-1">
              B2B Control
            </Heading>
            <Text
              size="small"
              leading="compact"
              className="mt-2 max-w-2xl text-ui-fg-subtle"
            >
              Seguimiento por empresa: ventas, frecuencia, actividad reciente,
              aprobaciones y datos listos para el equipo comercial.
            </Text>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="small" variant="secondary" onClick={handleExport}>
              <DocumentText />
              Exportar CSV
            </Button>
            <Button size="small" variant="secondary" asChild>
              <Link to="/quotes">Presupuestos</Link>
            </Button>
            <Button size="small" variant="secondary" asChild>
              <Link to="/companies">Empresas</Link>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8">
            <Text
              size="small"
              leading="compact"
              className="text-center text-ui-fg-subtle"
            >
              Cargando control B2B...
            </Text>
          </div>
        ) : (
          <div className="grid gap-4 p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Pedidos del período"
                value={summary?.quotes.total || 0}
                detail={`${pendingApprovals} pendiente(s) de aprobación o respuesta`}
                icon={<ChartBar />}
              />
              <Metric
                label="GMV del período"
                value={formatCurrency(accounts?.period_gmv || 0)}
                detail={`${formatCurrency(summary?.quotes.average_value || 0)} ticket medio`}
                icon={<CurrencyDollar />}
              />
              <Metric
                label="Empresas activas"
                value={accounts?.active_companies || 0}
                detail={`${summary?.companies.total || 0} empresas en total`}
                icon={<Buildings />}
              />
              <Metric
                label="Incidencias"
                value={(summary?.quotes.stale || 0) + pendingApprovals}
                detail="Aprobaciones, presupuestos o SLAs a revisar"
                icon={<ExclamationCircle />}
              />
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
              <Container className="p-0">
                <div className="border-b border-ui-border-base px-6 py-4">
                  <Text size="small" leading="compact" weight="plus">
                    Vista por empresa
                  </Text>
                  <Text
                    size="small"
                    leading="compact"
                    className="text-ui-fg-subtle"
                  >
                    La unidad de análisis es la cuenta cliente, no el usuario
                    individual.
                  </Text>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] table-fixed text-left">
                    <thead className="border-b border-ui-border-base bg-ui-bg-subtle">
                      <tr>
                        <TableHead className="w-[240px]">Empresa</TableHead>
                        <TableHead className="w-[110px]">Estado</TableHead>
                        <TableHead className="w-[130px]">GMV</TableHead>
                        <TableHead className="w-[120px]">Frecuencia</TableHead>
                        <TableHead className="w-[140px]">Última actividad</TableHead>
                        <TableHead className="w-[130px]">Límite comprador</TableHead>
                        <TableHead className="w-[130px]">Usuarios</TableHead>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.map((company) => (
                        <CompanyTableRow key={company.id} company={company} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </Container>

              <Container className="p-0">
                <div className="border-b border-ui-border-base px-6 py-4">
                  <Text size="small" leading="compact" weight="plus">
                    Pipeline operativo
                  </Text>
                  <Text
                    size="small"
                    leading="compact"
                    className="text-ui-fg-subtle"
                  >
                    Lo que necesita atención antes de cerrar pedidos.
                  </Text>
                </div>
                <div className="grid gap-3 px-6 py-4">
                  <StatusLine
                    label="Pendiente comercial"
                    value={summary?.quotes.pending_merchant || 0}
                  />
                  <StatusLine
                    label="Esperando cliente"
                    value={summary?.quotes.pending_customer || 0}
                  />
                  <StatusLine
                    label="Fuera de SLA"
                    value={summary?.quotes.stale || 0}
                  />
                  <StatusLine
                    label="Reglas comerciales activas"
                    value={summary?.catalog_rules.active || 0}
                  />
                  <StatusLine
                    label="Cobertura packaging"
                    value={`${summary?.packaging.coverage || 0}%`}
                  />
                </div>
              </Container>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
};

const Metric = ({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
}) => (
  <div className="rounded-lg border border-ui-border-base bg-ui-bg-component p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {label}
        </Text>
        <Text size="xlarge" leading="compact" weight="plus" className="mt-2">
          {value}
        </Text>
      </div>
      <div className="flex size-9 items-center justify-center rounded-md border border-ui-border-base bg-ui-bg-base text-ui-fg-subtle">
        {icon}
      </div>
    </div>
    <Text size="small" leading="compact" className="mt-3 text-ui-fg-subtle">
      {detail}
    </Text>
  </div>
);

const CompanyTableRow = ({ company }: { company: CompanyRow }) => (
  <tr className="border-b border-ui-border-base">
    <td className="px-6 py-4">
      <Text size="small" leading="compact" weight="plus">
        {company.name}
      </Text>
      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        {company.tax_id} · {company.email}
      </Text>
    </td>
    <td className="px-4 py-4">
      <Badge size="xsmall" color={company.status === "approved" ? "green" : "orange"}>
        {formatStatus(company.status)}
      </Badge>
    </td>
    <td className="px-4 py-4">
      <Text size="small" leading="compact" weight="plus">
        {formatCurrency(company.period_gmv)}
      </Text>
    </td>
    <td className="px-4 py-4">
      <Text size="small" leading="compact">
        {company.order_frequency} pedido(s)
      </Text>
    </td>
    <td className="px-4 py-4">
      <Text size="small" leading="compact">
        {formatDate(company.last_activity)}
      </Text>
    </td>
    <td className="px-4 py-4">
      <Text size="small" leading="compact">
        {company.buyer_limit > 0 ? formatCurrency(company.buyer_limit) : "Sin límite"}
      </Text>
    </td>
    <td className="px-4 py-4">
      <Text size="small" leading="compact">
        {company.employees} usuario(s), {company.approvers} aprobador(es)
      </Text>
    </td>
  </tr>
);

const TableHead = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <th className={`px-4 py-3 text-xs font-semibold uppercase text-ui-fg-subtle ${className || ""}`}>
    {children}
  </th>
);

const StatusLine = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex items-center justify-between gap-3 rounded-md border border-ui-border-base bg-ui-bg-component px-3 py-2">
    <Text size="small" leading="compact" className="text-ui-fg-subtle">
      {label}
    </Text>
    <Text size="small" leading="compact" weight="plus">
      {value}
    </Text>
  </div>
);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
};

const formatStatus = (status: string) => {
  switch (status) {
    case "approved":
      return "Activa";
    case "pending":
      return "Pendiente";
    case "rejected":
      return "Rechazada";
    default:
      return status;
  }
};

export const config = defineRouteConfig({
  label: "B2B Control",
  icon: Buildings,
});

export default B2BControl;
