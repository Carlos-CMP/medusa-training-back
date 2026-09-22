import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework";
import { syncProductToWebflow } from "../utils/webflow-product-sync";

export default async function syncProductToWebflowSubscriber({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await syncProductToWebflow(container, data.id);
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
};
