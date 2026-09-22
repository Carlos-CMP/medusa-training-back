import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TextCell } from "../../../../components/common/table/table-cells/text-cell";
import { StatusBadge } from "@medusajs/ui";
import { ApprovalStatusType } from "../../../../../types/approval";
import ItemsPopover from "../approvals-items-popover";
import { DateCell } from "../../../../../admin/components/common/table/table-cells/date-cell";
import { ApprovalActions } from "../approval-actions";

const columnHelper = createColumnHelper<any>();

export const useApprovalsTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(
    () => [
      columnHelper.accessor("id", {
        header: t("fields.id"),
        cell: ({ getValue }) => <TextCell text={`#${getValue().slice(-4)}`} />,
      }),
      columnHelper.accessor("updated_at", {
        header: "Actualizado",
        cell: ({ getValue }) => <DateCell date={getValue()} />,
      }),
      columnHelper.accessor("company.name", {
        header: t("fields.company"),
        cell: ({ getValue }) => <TextCell text={getValue()} />,
      }),
      columnHelper.accessor("approval_status.status", {
        header: "Estado",
        cell: ({ getValue }) => {
          const status = getValue();
          return (
            <StatusBadge
              color={
                status === ApprovalStatusType.APPROVED
                  ? "green"
                  : status === ApprovalStatusType.REJECTED
                  ? "red"
                  : "purple"
              }
            >
              {formatApprovalStatus(status)}
            </StatusBadge>
          );
        },
      }),
      columnHelper.accessor("items", {
        header: "Artículos",
        cell: ({ getValue, row }) => (
          <ItemsPopover
            items={getValue()}
            currencyCode={row.original.currency_code}
          />
        ),
      }),
      columnHelper.accessor("actions", {
        header: "Acciones",
        cell: ({ row }) => <ApprovalActions cart={row.original} />,
      }),
    ],
    [t]
  );
};

const formatApprovalStatus = (status: ApprovalStatusType) => {
  switch (status) {
    case ApprovalStatusType.APPROVED:
      return "Aprobado";
    case ApprovalStatusType.REJECTED:
      return "Rechazado";
    default:
      return "Pendiente";
  }
};
