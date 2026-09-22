import { FetchError } from "@medusajs/js-sdk";
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { BrandProfileContent } from "../../../modules/brand-profile/defaults";
import { sdk } from "../../lib/client";
import { queryKeysFactory } from "../../lib/query-key-factory";

type AdminBrandProfileResponse = {
  brand_profile: BrandProfileContent;
};

export const brandProfileQueryKey = queryKeysFactory("brand_profile");

export const useBrandProfileContent = (
  options?: UseQueryOptions<
    AdminBrandProfileResponse,
    FetchError,
    AdminBrandProfileResponse,
    QueryKey
  >
) => {
  return useQuery({
    queryKey: brandProfileQueryKey.detail("main"),
    queryFn: () =>
      sdk.client.fetch<AdminBrandProfileResponse>("/admin/brand-profile", {
        method: "GET",
      }),
    ...options,
  });
};

export const useUpdateBrandProfileContent = (
  options?: UseMutationOptions<
    AdminBrandProfileResponse,
    FetchError,
    BrandProfileContent
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (brandProfile) =>
      sdk.client.fetch<AdminBrandProfileResponse>("/admin/brand-profile", {
        method: "POST",
        body: brandProfile,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: brandProfileQueryKey.all,
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
