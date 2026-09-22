import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createApprovalSettingsWorkflow,
  updateApprovalSettingsWorkflow,
} from "../../../../../workflows/approval/workflows";
import { adminApprovalSettingsFields } from "../../query-config";
import { AdminUpsertApprovalSettingsType } from "../../validators";

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: approvalSettings, metadata } = await query.graph({
    entity: "approval_settings",
    fields: adminApprovalSettingsFields,
    filters: req.filterableFields,
    pagination: {
      ...req.queryConfig.pagination,
    },
  });

  res.json({
    approvalSettings,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take,
  });
};

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpsertApprovalSettingsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const companyId = req.params.id;
  const {
    id: inputSettingId,
    requires_admin_approval,
    requires_sales_manager_approval,
  } = req.validatedBody;

  let settingId = inputSettingId;

  if (!settingId) {
    const { data: existingSettings } = await query.graph({
      entity: "approval_settings",
      fields: ["id"],
      filters: {
        company_id: companyId,
      },
    });

    settingId = existingSettings[0]?.id;
  }

  if (!settingId) {
    const {
      data: [company],
    } = await query.graph(
      {
        entity: "company",
        fields: ["id"],
        filters: {
          id: companyId,
        },
      },
      { throwIfKeyNotFound: true }
    );

    const { result: createdSettings } =
      await createApprovalSettingsWorkflow.run({
        input: [company],
        container: req.scope,
      });

    settingId = createdSettings[0].id;
  }

  const { result: updatedApprovalSettings } =
    await updateApprovalSettingsWorkflow.run({
      input: {
        id: settingId,
        requires_admin_approval,
        requires_sales_manager_approval,
      },
      container: req.scope,
    });

  const { data: approvalSettings } = await query.graph(
    {
      entity: "approval_settings",
      fields: adminApprovalSettingsFields,
      filters: {
        id: updatedApprovalSettings.id,
      },
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ approvalSettings });
};
