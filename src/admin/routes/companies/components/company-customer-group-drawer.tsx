import { HttpTypes } from "@medusajs/types";
import { Button, Drawer, Hint, Table, toast } from "@medusajs/ui";
import { QueryCompany } from "../../../../types";
import {
  useAddCompanyToCustomerGroup,
  useRemoveCompanyFromCustomerGroup,
} from "../../../hooks/api";

export function CompanyCustomerGroupDrawer({
  company,
  customerGroups,
  open,
  setOpen,
}: {
  company: QueryCompany;
  customerGroups?: HttpTypes.AdminCustomerGroup[];
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const { mutateAsync: addMutate, isPending: addLoading } =
    useAddCompanyToCustomerGroup(company.id);

  const { mutateAsync: removeMutate, isPending: removeLoading } =
    useRemoveCompanyFromCustomerGroup(company.id);

  const handleAdd = async (groupId: string) => {
    await addMutate(groupId, {
      onSuccess: async () => {
        setOpen(false);
        toast.success("Empresa añadida al grupo de clientes");
      },
      onError: (error) => {
        toast.error("No se pudo añadir la empresa al grupo");
      },
    });
  };

  const handleRemove = async (groupId: string) => {
    await removeMutate(groupId, {
      onSuccess: async () => {
        toast.success("Empresa retirada del grupo de clientes");
      },
      onError: () => {
        toast.error("No se pudo retirar la empresa del grupo");
      },
    });
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <Drawer.Content className="z-50">
        <Drawer.Header>
          <Drawer.Title>Grupo de clientes de {company.name}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="space-y-4 h-full overflow-y-hidden">
          <Hint variant="info">
            Al añadir {company.name} a un grupo se vinculan automáticamente{" "}
            {company.employees?.length} usuario
            {company.employees?.length === 1 ? "" : "s"} asociado
            {company.employees?.length === 1 ? "" : "s"}.
          </Hint>
          <div className="h-full overflow-y-auto">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Grupo cliente</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">
                    Acciones
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {customerGroups ? (
                  customerGroups.map((group) => (
                    <Table.Row key={group.id}>
                      <Table.Cell>{group.name}</Table.Cell>
                      <Table.Cell className="text-right">
                        {company.customer_group?.id &&
                        company.customer_group.id === group.id ? (
                          <Button
                            onClick={() => handleRemove(group.id)}
                            isLoading={removeLoading}
                            variant="danger"
                          >
                            Quitar
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleAdd(group.id)}
                            disabled={
                              (company.customer_group?.id &&
                                company.customer_group.id !== group.id) ||
                              addLoading
                            }
                            isLoading={addLoading}
                          >
                            Añadir
                          </Button>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))
                ) : (
                  <Table.Row>
                    <Table.Cell>No hay grupos de clientes.</Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table>
          </div>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  );
}
