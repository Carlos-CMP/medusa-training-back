import { ApprovalStatusType } from "../../../../../types/approval";

export const useApprovalsTableFilters = () => {
  const filters: any[] = [
    {
      label: "Estado",
      key: "status",
      type: "select",
      options: [
        { label: "Pendiente", value: ApprovalStatusType.PENDING },
        { label: "Aprobado", value: ApprovalStatusType.APPROVED },
        { label: "Rechazado", value: ApprovalStatusType.REJECTED },
      ],
    },
  ];

  return filters;
};
