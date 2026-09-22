import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

const WEBFLOW_API_BASE = "https://api.webflow.com/v2";

export default async function createWebflowProductsCollection({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  const apiToken = process.env.WEBFLOW_API_TOKEN;
  const siteId = process.env.WEBFLOW_SITE_ID;

  if (!apiToken || !siteId) {
    logger.error(
      "Set WEBFLOW_API_TOKEN and WEBFLOW_SITE_ID before running this script."
    );
    return;
  }

  const response = await fetch(
    `${WEBFLOW_API_BASE}/sites/${siteId}/collections`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        displayName: "Productos Medusa",
        singularName: "Producto",
        slug: "productos-medusa",
        fields: [
          {
            type: "PlainText",
            displayName: "Medusa Product Id",
            slug: "medusa-product-id",
            isRequired: true,
          },
          {
            type: "PlainText",
            displayName: "Price",
            slug: "price",
          },
          {
            type: "Image",
            displayName: "Main Image",
            slug: "main-image",
          },
          {
            type: "PlainText",
            displayName: "Category",
            slug: "category",
          },
          {
            type: "PlainText",
            displayName: "Short Description",
            slug: "short-description",
          },
          {
            type: "Link",
            displayName: "Product Url",
            slug: "product-url",
          },
        ],
      }),
    }
  );

  const body = await response.json();

  if (!response.ok) {
    logger.error(
      `Failed to create Webflow collection: ${response.status} ${JSON.stringify(body)}`
    );
    return;
  }

  logger.info(
    `Webflow collection "${body.displayName}" created. Set WEBFLOW_PRODUCTS_COLLECTION_ID=${body.id} in your .env.`
  );
}
