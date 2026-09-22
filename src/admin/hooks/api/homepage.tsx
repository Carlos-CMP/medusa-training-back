import { FetchError } from "@medusajs/js-sdk";
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { HomepageContent } from "../../../modules/homepage/defaults";
import { sdk } from "../../lib/client";
import { queryKeysFactory } from "../../lib/query-key-factory";

type AdminHomepageResponse = {
  homepage: HomepageContent;
};

export const homepageQueryKey = queryKeysFactory("homepage");

export const useHomepageContent = (
  options?: UseQueryOptions<
    AdminHomepageResponse,
    FetchError,
    AdminHomepageResponse,
    QueryKey
  >
) => {
  return useQuery({
    queryKey: homepageQueryKey.detail("main"),
    queryFn: () =>
      sdk.client.fetch<AdminHomepageResponse>("/admin/homepage", {
        method: "GET",
      }),
    ...options,
  });
};

export const useUpdateHomepageContent = (
  options?: UseMutationOptions<
    AdminHomepageResponse,
    FetchError,
    HomepageContent
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (homepage) =>
      sdk.client.fetch<AdminHomepageResponse>("/admin/homepage", {
        method: "POST",
        body: homepage,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: homepageQueryKey.all,
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
