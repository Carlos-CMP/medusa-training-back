import { FetchError } from "@medusajs/js-sdk";
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { sdk } from "../../lib/client";
import { queryKeysFactory } from "../../lib/query-key-factory";

export type AssetType =
  | "logo"
  | "hero"
  | "homepage"
  | "product"
  | "category"
  | "document"
  | "other";

export type AdminAsset = {
  id?: string;
  label: string;
  url: string;
  filename?: string | null;
  mime_type?: string | null;
  content_base64?: string | null;
  alt?: string | null;
  type: AssetType;
  client_profile_id: string;
  tags?: string | null;
  sort_order?: number;
};

export type AdminAssetUpload = Omit<AdminAsset, "url"> & {
  filename: string;
  mime_type: string;
  content_base64: string;
};

type AdminAssetsResponse = {
  assets: AdminAsset[];
};

type AdminAssetResponse = {
  asset: AdminAsset;
};

export const assetsQueryKey = queryKeysFactory("assets");

export const useAssets = (
  filters?: {
    client_profile_id?: string;
    type?: AssetType | "all";
  },
  options?: UseQueryOptions<
    AdminAssetsResponse,
    FetchError,
    AdminAssetsResponse,
    QueryKey
  >
) => {
  const params = new URLSearchParams();

  if (filters?.client_profile_id) {
    params.set("client_profile_id", filters.client_profile_id);
  }

  if (filters?.type && filters.type !== "all") {
    params.set("type", filters.type);
  }

  const query = params.toString();

  return useQuery({
    queryKey: assetsQueryKey.list(filters || {}),
    queryFn: () =>
      sdk.client.fetch<AdminAssetsResponse>(
        `/admin/assets${query ? `?${query}` : ""}`,
        {
          method: "GET",
        }
      ),
    ...options,
  });
};

export const useUpsertAsset = (
  options?: UseMutationOptions<AdminAssetResponse, FetchError, AdminAsset>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (asset) =>
      sdk.client.fetch<AdminAssetResponse>("/admin/assets", {
        method: "POST",
        body: asset,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: assetsQueryKey.all,
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useDeleteAsset = (
  options?: UseMutationOptions<{ deleted: { id: string } }, FetchError, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) =>
      sdk.client.fetch<{ deleted: { id: string } }>(`/admin/assets/${id}`, {
        method: "DELETE",
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: assetsQueryKey.all,
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useUploadAsset = (
  options?: UseMutationOptions<AdminAssetResponse, FetchError, AdminAssetUpload>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (asset) =>
      sdk.client.fetch<AdminAssetResponse>("/admin/assets/upload", {
        method: "POST",
        body: asset,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: assetsQueryKey.all,
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
