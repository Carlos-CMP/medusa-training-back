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

export type AdminProductPackaging = {
  id: string;
  variant_id: string;
  sales_unit: "unit" | "box";
  minimum_order_quantity: number;
  quantity_increment: number;
  units_per_box: number;
  boxes_per_pallet?: number | null;
  package_weight?: number | null;
  package_dimensions?: string | null;
};

export type AdminUpsertProductPackaging = Omit<
  AdminProductPackaging,
  "id"
>;

type AdminProductPackagingResponse = {
  packaging: AdminProductPackaging[];
};

type AdminProductPackagingMutationResponse = {
  packaging: AdminProductPackaging;
};

export const productPackagingQueryKeys =
  queryKeysFactory("product_packaging");

export const useProductPackaging = (
  variantIds: string[],
  options?: Omit<
    UseQueryOptions<
      AdminProductPackagingResponse,
      FetchError,
      AdminProductPackagingResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  return useQuery({
    queryKey: productPackagingQueryKeys.list({ variantIds }),
    queryFn: () =>
      sdk.client.fetch<AdminProductPackagingResponse>(
        "/admin/product-packaging",
        {
          method: "GET",
          query: {
            variant_id: variantIds,
          },
        }
      ),
    ...options,
  });
};

export const useUpsertProductPackaging = (
  options?: UseMutationOptions<
    AdminProductPackagingMutationResponse,
    FetchError,
    AdminUpsertProductPackaging
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) =>
      sdk.client.fetch<AdminProductPackagingMutationResponse>(
        "/admin/product-packaging",
        {
          method: "POST",
          body: payload,
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: productPackagingQueryKeys.all,
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useBulkUpsertProductPackaging = (
  options?: UseMutationOptions<
    AdminProductPackagingResponse,
    FetchError,
    AdminUpsertProductPackaging[]
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (packaging) =>
      sdk.client.fetch<AdminProductPackagingResponse>(
        "/admin/product-packaging/bulk",
        {
          method: "POST",
          body: { packaging },
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: productPackagingQueryKeys.all,
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
