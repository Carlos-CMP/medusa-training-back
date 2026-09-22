import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Check, UserGroup, XMark } from "@medusajs/icons";
import {
  Avatar,
  Badge,
  Button,
  Container,
  Heading,
  Table,
  Text,
  Toaster,
  toast,
} from "@medusajs/ui";
import { QueryCompany } from "../../../types";
import { useCompanies, useUpdateCompany } from "../../hooks/api";

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Denegada",
};

const statusColors: Record<string, "orange" | "green" | "red"> = {
  pending: "orange",
  approved: "green",
  rejected: "red",
};

const B2BOnboarding = () => {
  const { data, isPending } = useCompanies({
    fields:
      "*employees,*employees.customer,*employees.company,*customer_group,*approval_settings",
    limit: 100,
  });

  const companies = data?.companies || [];
  const isLoading = isPending && !data;
  const pendingCompanies = companies.filter(
    (company) => company.onboarding_status === "pending"
  );
  const reviewedCompanies = companies.filter(
    (company) => company.onboarding_status !== "pending"
  );

  return (
    <>
      <Container className="flex flex-col overflow-hidden p-0">
        <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
          <div>
            <Heading className="font-sans font-medium h1-core">
              Altas B2B
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Aprueba o deniega solicitudes de empresas y usuarios registrados
              desde el storefront.
            </Text>
          </div>
          <Badge color={pendingCompanies.length ? "orange" : "green"}>
            {pendingCompanies.length} pendientes
          </Badge>
        </div>

        <div className="grid gap-6 p-6">
          <OnboardingTable
            title="Solicitudes pendientes"
            description="Estas empresas aun no tienen acceso comercial completo."
            companies={pendingCompanies}
            isPending={isLoading}
            emptyLabel="No hay altas pendientes."
          />

          <OnboardingTable
            title="Solicitudes revisadas"
            description="Histórico reciente de altas aprobadas o denegadas."
            companies={reviewedCompanies}
            isPending={isLoading}
            emptyLabel="Todavía no hay solicitudes revisadas."
          />
        </div>
      </Container>
      <Toaster />
    </>
  );
};

const OnboardingTable = ({
  title,
  description,
  companies,
  isPending,
  emptyLabel,
}: {
  title: string;
  description: string;
  companies: QueryCompany[];
  isPending: boolean;
  emptyLabel: string;
}) => (
  <div className="rounded-lg border bg-ui-bg-base">
    <div className="border-b px-6 py-4">
      <Text size="small" leading="compact" weight="plus">
        {title}
      </Text>
      <Text size="small" className="text-ui-fg-subtle">
        {description}
      </Text>
    </div>

    {isPending ? (
      <div className="px-6 py-8">
        <Text size="small" className="text-ui-fg-subtle">
          Cargando solicitudes...
        </Text>
      </div>
    ) : companies.length ? (
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Empresa</Table.HeaderCell>
            <Table.HeaderCell>Contacto</Table.HeaderCell>
            <Table.HeaderCell>Usuario</Table.HeaderCell>
            <Table.HeaderCell>Estado</Table.HeaderCell>
            <Table.HeaderCell>Acciones</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {companies.map((company) => (
            <OnboardingRow key={company.id} company={company} />
          ))}
        </Table.Body>
      </Table>
    ) : (
      <div className="px-6 py-8">
        <Text size="small" className="text-ui-fg-subtle">
          {emptyLabel}
        </Text>
      </div>
    )}
  </div>
);

const OnboardingRow = ({ company }: { company: QueryCompany }) => {
  const updateCompany = useUpdateCompany(company.id, {
    onSuccess: (_, variables) => {
      toast.success(
        variables.onboarding_status === "approved"
          ? `${company.name} aprobada`
          : `${company.name} denegada`
      );
    },
    onError: () => toast.error("No se pudo actualizar la solicitud"),
  });

  const primaryEmployee = company.employees?.[0];
  const customer = primaryEmployee?.customer;
  const status = company.onboarding_status || "approved";

  return (
    <Table.Row>
      <Table.Cell>
        <div className="flex items-center gap-3">
          <Avatar
            src={company.logo_url || undefined}
            fallback={company.name?.charAt(0) || "B"}
          />
          <div>
            <Text size="small" weight="plus">
              {company.name}
            </Text>
            <Text size="small" className="text-ui-fg-subtle">
              {company.tax_id || company.sector || "Sin datos fiscales"}
            </Text>
          </div>
        </div>
      </Table.Cell>
      <Table.Cell>
        <Text size="small">{company.email}</Text>
        <Text size="small" className="text-ui-fg-subtle">
          {company.phone || "Sin teléfono"}
        </Text>
      </Table.Cell>
      <Table.Cell>
        <Text size="small">
          {customer?.email || primaryEmployee?.invitation_email || "-"}
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          {primaryEmployee?.role || "company_admin"} ·{" "}
          {primaryEmployee?.status || "active"}
        </Text>
      </Table.Cell>
      <Table.Cell>
        <Badge size="small" color={statusColors[status] || "green"}>
          {statusLabels[status] || "Aprobada"}
        </Badge>
      </Table.Cell>
      <Table.Cell>
        <div className="flex flex-wrap gap-2">
          <Button
            size="small"
            variant="secondary"
            disabled={status === "approved" || updateCompany.isPending}
            isLoading={
              updateCompany.isPending &&
              updateCompany.variables?.onboarding_status === "approved"
            }
            onClick={() =>
              updateCompany.mutate({ onboarding_status: "approved" })
            }
          >
            <Check />
            Aprobar
          </Button>
          <Button
            size="small"
            variant="secondary"
            disabled={status === "rejected" || updateCompany.isPending}
            isLoading={
              updateCompany.isPending &&
              updateCompany.variables?.onboarding_status === "rejected"
            }
            onClick={() =>
              updateCompany.mutate({ onboarding_status: "rejected" })
            }
          >
            <XMark />
            Denegar
          </Button>
        </div>
      </Table.Cell>
    </Table.Row>
  );
};

export const config = defineRouteConfig({
  label: "Altas B2B",
  icon: UserGroup,
});

export default B2BOnboarding;
