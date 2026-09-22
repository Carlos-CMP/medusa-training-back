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

export type CatalogRuleStatus = "draft" | "active" | "archived";
export type CatalogRuleType = "price" | "visibility" | "assortment" | "quote";
export type CatalogRuleTargetType =
  | "all"
  | "product"
  | "variant"
  | "category"
  | "collection";
export type CatalogRuleEffectType =
  | "discount_percentage"
  | "fixed_price"
  | "hide"
  | "show_only"
  | "requires_quote";

export type AdminCatalogRule = {
  id?: string;
  name: string;
  description?: string | null;
  status: CatalogRuleStatus;
  priority: number;
  rule_type: CatalogRuleType;
  target_type: CatalogRuleTargetType;
  target_id?: string | null;
  company_id?: string | null;
  customer_group_id?: string | null;
  region_id?: string | null;
  sales_channel_id?: string | null;
  zone_code?: string | null;
  currency_code?: string | null;
  effect_type: CatalogRuleEffectType;
  discount_percentage?: number | null;
  fixed_price?: number | null;
  minimum_quantity: number;
  starts_at?: string | null;
  ends_at?: string | null;
  metadata?: Record<string, unknown> | string | null;
};

export type CatalogRuleFilters = {
  status?: CatalogRuleStatus | "all";
  rule_type?: CatalogRuleType | "all";
  target_type?: CatalogRuleTargetType | "all";
  effect_type?: CatalogRuleEffectType | "all";
  company_id?: string;
  region_id?: string;
  sales_channel_id?: string;
  zone_code?: string;
  currency_code?: string;
  limit?: number;
  offset?: number;
};

type AdminCatalogRulesResponse = {
  catalog_rules: AdminCatalogRule[];
  count: number;
  limit: number;
  offset: number;
};

type AdminCatalogRuleResponse = {
  catalog_rule: AdminCatalogRule;
};

type AdminCatalogRulesMutationResponse = {
  catalog_rules: AdminCatalogRule[];
};

type AdminCatalogRulePriceListSyncResponse = {
  catalog_rule: AdminCatalogRule;
  price_list: {
    id: string;
    title: string;
  };
  synced: boolean;
};

type AdminCatalogRulePriceListSyncPayload = {
  id: string;
  title?: string;
  description?: string;
};

export type CatalogRuleSimulationContext = {
  product_id?: string;
  variant_id?: string;
  category_id?: string;
  collection_id?: string;
  company_id?: string;
  customer_group_id?: string;
  region_id?: string;
  sales_channel_id?: string;
  zone_code?: string;
  currency_code?: string;
};

type CatalogRuleSimulationResponse = {
  context: CatalogRuleSimulationContext;
  applicable_rules: AdminCatalogRule[];
};

export type CatalogRuleSimulatorOption = {
  id: string;
  label: string;
  description?: string;
};

export type CatalogRuleSimulatorProductOption = CatalogRuleSimulatorOption & {
  collection_id?: string;
  categories?: CatalogRuleSimulatorOption[];
  variants?: CatalogRuleSimulatorOption[];
};

export type CatalogRuleSimulatorOptions = {
  products: CatalogRuleSimulatorProductOption[];
  companies: CatalogRuleSimulatorOption[];
  customer_groups: CatalogRuleSimulatorOption[];
  regions: CatalogRuleSimulatorOption[];
  sales_channels: CatalogRuleSimulatorOption[];
};

export const catalogRulesQueryKeys = queryKeysFactory("catalog_rules");

const buildQuery = (filters?: CatalogRuleFilters) => {
  const query: Record<string, string | number> = {};

  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === "all") {
      return;
    }

    query[key] = value;
  });

  return query;
};

const safeCall = async <TData,>(call: () => Promise<TData>) => {
  try {
    return await call();
  } catch (_error) {
    return undefined;
  }
};

const compactOptionDescription = (parts: Array<string | undefined | null>) =>
  parts.filter(Boolean).join(" / ");

const mapOption = (
  item: any,
  fallbackLabel = "Untitled"
): CatalogRuleSimulatorOption => ({
  id: item.id,
  label: item.name || item.title || item.email || item.handle || fallbackLabel,
  description: compactOptionDescription([
    item.handle,
    item.email,
    item.code,
    item.currency_code,
  ]),
});

export const useCatalogRules = (
  filters?: CatalogRuleFilters,
  options?: UseQueryOptions<
    AdminCatalogRulesResponse,
    FetchError,
    AdminCatalogRulesResponse,
    QueryKey
  >
) => {
  return useQuery({
    queryKey: catalogRulesQueryKeys.list(filters || {}),
    queryFn: () =>
      sdk.client.fetch<AdminCatalogRulesResponse>("/admin/catalog-rules", {
        method: "GET",
        query: buildQuery(filters),
      }),
    ...options,
  });
};

export const useCatalogRuleSimulatorOptions = (
  search: string,
  options?: UseQueryOptions<
    CatalogRuleSimulatorOptions,
    FetchError,
    CatalogRuleSimulatorOptions,
    QueryKey
  >
) => {
  const query = search.trim();

  return useQuery({
    queryKey: catalogRulesQueryKeys.detail("simulator-options", { q: query }),
    queryFn: async () => {
      const [
        productsResult,
        companiesResult,
        customerGroupsResult,
        regionsResult,
        salesChannelsResult,
      ] = await Promise.all([
        safeCall(() =>
          (sdk.admin as any).product.list({
            q: query || undefined,
            limit: 8,
            fields:
              "id,title,handle,collection_id,categories.id,categories.name,variants.id,variants.title,variants.sku",
          })
        ),
        safeCall(() =>
          sdk.client.fetch<any>("/admin/companies", {
            method: "GET",
            query: {
              q: query || undefined,
              limit: 8,
            },
          })
        ),
        safeCall(() => sdk.admin.customerGroup.list({ limit: 20 })),
        safeCall(() => sdk.admin.region.list({ limit: 20 })),
        safeCall(() => (sdk.admin as any).salesChannel.list({ limit: 20 })),
      ]);

      return {
        products: ((productsResult as any)?.products || []).map(
          (product: any) => ({
            ...mapOption(product),
            collection_id: product.collection_id,
            categories: (product.categories || []).map((category: any) =>
              mapOption(category)
            ),
            variants: (product.variants || []).map((variant: any) => ({
              id: variant.id,
              label: variant.title || variant.sku || variant.id,
              description: variant.sku,
            })),
          })
        ),
        companies: ((companiesResult as any)?.companies || []).map(
          (company: any) => mapOption(company)
        ),
        customer_groups: (
          (customerGroupsResult as any)?.customer_groups || []
        ).map((group: any) => mapOption(group)),
        regions: ((regionsResult as any)?.regions || []).map((region: any) =>
          mapOption(region)
        ),
        sales_channels: (
          (salesChannelsResult as any)?.sales_channels || []
        ).map((channel: any) => mapOption(channel)),
      };
    },
    ...options,
  });
};

export const useUpsertCatalogRule = (
  options?: UseMutationOptions<
    AdminCatalogRuleResponse,
    FetchError,
    AdminCatalogRule
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (catalogRule) =>
      sdk.client.fetch<AdminCatalogRuleResponse>("/admin/catalog-rules", {
        method: "POST",
        body: catalogRule,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: catalogRulesQueryKeys.all,
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useDeleteCatalogRule = (
  options?: UseMutationOptions<{ id: string }, FetchError, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) =>
      sdk.client.fetch<{ id: string }>(`/admin/catalog-rules/${id}`, {
        method: "DELETE",
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: catalogRulesQueryKeys.all,
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useBulkUpsertCatalogRules = (
  options?: UseMutationOptions<
    AdminCatalogRulesMutationResponse,
    FetchError,
    AdminCatalogRule[]
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (catalogRules) =>
      sdk.client.fetch<AdminCatalogRulesMutationResponse>(
        "/admin/catalog-rules/bulk",
        {
          method: "POST",
          body: {
            catalog_rules: catalogRules,
          },
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: catalogRulesQueryKeys.all,
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useSyncCatalogRulePriceList = (
  options?: UseMutationOptions<
    AdminCatalogRulePriceListSyncResponse,
    FetchError,
    AdminCatalogRulePriceListSyncPayload
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }) =>
      sdk.client.fetch<AdminCatalogRulePriceListSyncResponse>(
        `/admin/catalog-rules/${id}/sync-price-list`,
        {
          method: "POST",
          body,
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: catalogRulesQueryKeys.all,
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useSimulateCatalogRules = (
  options?: UseMutationOptions<
    CatalogRuleSimulationResponse,
    FetchError,
    CatalogRuleSimulationContext
  >
) => {
  return useMutation({
    mutationFn: (context) =>
      sdk.client.fetch<CatalogRuleSimulationResponse>("/store/catalog-rules", {
        method: "GET",
        query: buildQuery(context),
      }),
    ...options,
  });
};
