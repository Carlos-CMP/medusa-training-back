const WEBFLOW_API_BASE = "https://api.webflow.com/v2";

const getEnv = (name: string) => {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
};

export type WebflowSyncConfig = {
  apiToken: string;
  collectionId: string;
};

export const getWebflowSyncConfig = (): WebflowSyncConfig | null => {
  const apiToken = getEnv("WEBFLOW_API_TOKEN");
  const collectionId = getEnv("WEBFLOW_PRODUCTS_COLLECTION_ID");

  if (!apiToken || !collectionId) {
    return null;
  }

  return { apiToken, collectionId };
};

export type WebflowImageFieldValue = {
  url: string;
  alt?: string;
};

export type WebflowProductFieldData = {
  name: string;
  slug: string;
  "medusa-product-id": string;
  price?: string;
  "main-image"?: WebflowImageFieldValue;
  category?: string;
  "short-description"?: string;
  "product-url"?: string;
};

export type WebflowItem = {
  id: string;
  fieldData: WebflowProductFieldData;
};

const webflowFetch = async <T>(
  apiToken: string,
  path: string,
  init: RequestInit = {}
): Promise<T> => {
  const response = await fetch(`${WEBFLOW_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const error = new Error(
      `Webflow API ${init.method || "GET"} ${path} failed with ${response.status}: ${body}`
    ) as Error & { status: number };
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export const createWebflowItem = (
  apiToken: string,
  collectionId: string,
  fieldData: WebflowProductFieldData
): Promise<WebflowItem> =>
  webflowFetch<WebflowItem>(
    apiToken,
    `/collections/${collectionId}/items?skipInvalidFiles=true`,
    {
      method: "POST",
      body: JSON.stringify({ isArchived: false, isDraft: false, fieldData }),
    }
  );

// `POST /collections/{id}/items/publish` returns 404 for this account even
// against items that verifiably exist (confirmed via a direct, isolated
// call well after creation, not a propagation-timing issue). Cause
// unresolved against Webflow's own docs; see docs/sync-productos-webflow-cms.md.
// Publish failures are treated as non-fatal so the item content still syncs;
// making it live currently requires a manual Publish from the Webflow site.
export const tryPublishWebflowItems = async (
  apiToken: string,
  collectionId: string,
  itemIds: string[]
): Promise<boolean> => {
  try {
    await publishWebflowItems(apiToken, collectionId, itemIds);
    return true;
  } catch {
    return false;
  }
};

export const createAndPublishWebflowItem = async (
  apiToken: string,
  collectionId: string,
  fieldData: WebflowProductFieldData
): Promise<{ item: WebflowItem; published: boolean }> => {
  const item = await createWebflowItem(apiToken, collectionId, fieldData);
  const published = await tryPublishWebflowItems(apiToken, collectionId, [item.id]);
  return { item, published };
};

export const updateWebflowItem = (
  apiToken: string,
  collectionId: string,
  itemId: string,
  fieldData: WebflowProductFieldData
): Promise<WebflowItem> =>
  webflowFetch<WebflowItem>(
    apiToken,
    `/collections/${collectionId}/items/${itemId}?skipInvalidFiles=true`,
    {
      method: "PATCH",
      body: JSON.stringify({ fieldData }),
    }
  );

export const publishWebflowItems = (
  apiToken: string,
  collectionId: string,
  itemIds: string[]
): Promise<void> => {
  if (!itemIds.length) {
    return Promise.resolve();
  }

  return webflowFetch(apiToken, `/collections/${collectionId}/items/publish`, {
    method: "POST",
    body: JSON.stringify({ itemIds }),
  });
};

export const archiveWebflowItem = async (
  apiToken: string,
  collectionId: string,
  itemId: string
): Promise<void> => {
  await webflowFetch(apiToken, `/collections/${collectionId}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ isArchived: true }),
  });

  await publishWebflowItems(apiToken, collectionId, [itemId]);
};
