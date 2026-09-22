import { defineRouteConfig } from "@medusajs/admin-sdk";
import { CheckCircle } from "@medusajs/icons";
import { Container, Heading, Toaster } from "@medusajs/ui";
import { ApprovalsTable } from "./components/approvals-table";

const Approvals = () => {
  return (
    <>
      <Container className="flex flex-col p-0 overflow-hidden">
        <Heading className="p-6 pb-0 font-sans font-medium h1-core">
          Aprobaciones
        </Heading>
        <ApprovalsTable />
      </Container>
      <Toaster />
    </>
  );
};

export const config = defineRouteConfig({
  label: "Aprobaciones",
  icon: CheckCircle,
});

export default Approvals;
