import { HttpTypes } from "@medusajs/framework/types";
import {
  Check,
  Link,
  LockClosedSolid,
  PencilSquare,
  Trash,
  XMark,
} from "@medusajs/icons";
import { toast } from "@medusajs/ui";
import { QueryCompany } from "../../../../types";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActionMenu } from "../../../components/common";
import { DeletePrompt } from "../../../components/common/delete-prompt";
import { useDeleteCompany, useUpdateCompany } from "../../../hooks/api";
import {
  CompanyApprovalSettingsDrawer,
  CompanyCustomerGroupDrawer,
  CompanyUpdateDrawer,
} from "./";

export const CompanyActionsMenu = ({
  company,
  customerGroups,
}: {
  company: QueryCompany;
  customerGroups?: HttpTypes.AdminCustomerGroup[];
}) => {
  const [editOpen, setEditOpen] = useState(false);
  const [customerGroupOpen, setCustomerGroupOpen] = useState(false);
  const [approvalSettingsOpen, setApprovalSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { mutateAsync: mutateDelete, isPending: loadingDelete } =
    useDeleteCompany(company.id);
  const { mutateAsync: updateCompany, isPending: updatingCompany } =
    useUpdateCompany(company.id);

  const navigate = useNavigate();

  const handleDelete = () => {
    mutateDelete(company.id, {
      onSuccess: () => {
        navigate("/companies");
        toast.success(`Empresa ${company.name} eliminada`);
      },
    });
  };

  const handleOnboardingStatus = async (
    onboarding_status: "approved" | "rejected"
  ) => {
    await updateCompany(
      { onboarding_status },
      {
        onSuccess: () => {
          toast.success(
            onboarding_status === "approved"
              ? `${company.name} aprobada`
              : `${company.name} denegada`
          );
        },
        onError: () => {
          toast.error("No se pudo actualizar el estado de onboarding");
        },
      }
    );
  };

  return (
    <>
      <ActionMenu
        groups={[
          {
            actions: [
              ...(company.onboarding_status !== "approved"
                ? [
                    {
                      icon: <Check />,
                      label: updatingCompany
                        ? "Actualizando..."
                        : "Aprobar alta B2B",
                      onClick: () => handleOnboardingStatus("approved"),
                    },
                  ]
                : []),
              ...(company.onboarding_status !== "rejected"
                ? [
                    {
                      icon: <XMark />,
                      label: updatingCompany
                        ? "Actualizando..."
                        : "Denegar alta B2B",
                      onClick: () => handleOnboardingStatus("rejected"),
                    },
                  ]
                : []),
            ],
          },
          {
            actions: [
              {
                icon: <PencilSquare />,
                label: "Editar datos",
                onClick: () => setEditOpen(true),
              },
              {
                icon: <Link />,
                label: "Gestionar grupo cliente",
                onClick: () => setCustomerGroupOpen(true),
              },
              {
                icon: <LockClosedSolid />,
                label: "Reglas de aprobación",
                onClick: () => setApprovalSettingsOpen(true),
              },
            ],
          },
          {
            actions: [
              {
                icon: <Trash />,
                label: "Eliminar",
                onClick: () => setDeleteOpen(true),
              },
            ],
          },
        ]}
      />

      <CompanyUpdateDrawer
        company={company}
        open={editOpen}
        setOpen={setEditOpen}
      />
      <CompanyCustomerGroupDrawer
        company={company}
        customerGroups={customerGroups}
        open={customerGroupOpen}
        setOpen={setCustomerGroupOpen}
      />
      <CompanyApprovalSettingsDrawer
        company={company}
        open={approvalSettingsOpen}
        setOpen={setApprovalSettingsOpen}
      />
      <DeletePrompt
        handleDelete={handleDelete}
        loading={loadingDelete}
        open={deleteOpen}
        setOpen={setDeleteOpen}
      />
    </>
  );
};
