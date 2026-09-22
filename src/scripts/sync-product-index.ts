import { MedusaContainer } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

type IndexService = {
  getInfo?: () => Promise<unknown>
  sync: (input?: { strategy?: "full" | "reset" }) => Promise<void>
}

const printIndexInfo = async (label: string, indexService: IndexService) => {
  if (!indexService.getInfo) {
    return
  }

  const info = await indexService.getInfo()
  console.log(`${label}: ${JSON.stringify(info, null, 2)}`)
}

export default async function syncProductIndex({
  container,
}: {
  container: MedusaContainer
}) {
  const strategy = (process.env.INDEX_SYNC_STRATEGY || "reset") as
    | "full"
    | "reset"
  const indexService = container.resolve(Modules.INDEX) as IndexService

  console.log(`Starting Medusa index sync with strategy: ${strategy}`)
  await printIndexInfo("Index info before sync", indexService)
  await indexService.sync({ strategy })
  await printIndexInfo("Index info after sync", indexService)
  console.log("Medusa index sync finished.")
}
