import { StatusBadge } from "@medusajs/ui";

const StatusTitles: Record<string, string> = {
  accepted: "Aceptado",
  customer_rejected: "Rechazado por cliente",
  merchant_rejected: "Rechazado por ventas",
  pending_merchant: "Pendiente de ventas",
  pending_customer: "Pendiente de cliente",
};

const StatusColors: Record<string, "green" | "orange" | "red" | "blue"> = {
  accepted: "green",
  customer_rejected: "orange",
  merchant_rejected: "red",
  pending_merchant: "blue",
  pending_customer: "blue",
};

export default function QuoteStatusBadge({ status }: { status: string }) {
  return (
    <StatusBadge color={StatusColors[status]}>
      {StatusTitles[status]}
    </StatusBadge>
  );
}
