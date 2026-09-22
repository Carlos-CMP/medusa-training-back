export const useQuotesTableFilters = () => {
  const filters: any[] = [
    {
      key: "status",
      label: "Estado",
      type: "select",
      multiple: true,
      options: [
        { label: "Pendiente comercial", value: "pending_merchant" },
        { label: "Esperando cliente", value: "pending_customer" },
        { label: "Aceptado", value: "accepted" },
        { label: "Rechazado", value: "rejected" },
      ],
    },
  ];

  return filters;
};
