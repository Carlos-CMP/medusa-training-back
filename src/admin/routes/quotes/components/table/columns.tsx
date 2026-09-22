import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DateCell } from "../../../../components/common/table/table-cells/date-cell";
import { TextCell } from "../../../../components/common/table/table-cells/text-cell";
import QuoteStatusBadge from "../quote-status-badge";
import { formatAmount } from "../../../../utils";

const columnHelper = createColumnHelper<any>();

export const useQuotesTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(
    () => [
      columnHelper.accessor("draft_order.display_id", {
        header: t("fields.id"),
        cell: ({ getValue }) => <TextCell text={`#${getValue()}`} />,
      }),
      columnHelper.accessor("status", {
        header: t("fields.status"),
        cell: ({ getValue }) => <QuoteStatusBadge status={getValue()} />,
      }),
      columnHelper.accessor("customer.email", {
        header: t("fields.email"),
        cell: ({ getValue }) => <TextCell text={getValue()} />,
      }),
      columnHelper.accessor("draft_order.customer.employee.company.name", {
        header: t("fields.company"),
        cell: ({ getValue }) => <TextCell text={getValue()} />,
      }),
      columnHelper.accessor("draft_order.total", {
        header: t("fields.total"),
        cell: ({ getValue, row }) => {
          const total =
            getValue() ??
            row.original.draft_order?.subtotal ??
            row.original.draft_order?.item_total ??
            0;

          return (
            <TextCell
              text={formatAmount(
                Number(total) || 0,
                row.original.draft_order?.currency_code || "eur"
              )}
            />
          );
        },
      }),

      columnHelper.accessor("created_at", {
        header: t("fields.createdAt"),
        cell: ({ getValue }) => <DateCell date={getValue()} />,
      }),
    ],
    [t]
  );
};
