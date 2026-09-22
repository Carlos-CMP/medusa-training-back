# Sincronizacion de productos: Medusa -> Webflow CMS

## Objetivo

Disponer del catalogo de productos de Medusa dentro del CMS de Webflow para
que marketing pueda usarlo en landing pages, banners de campana o secciones
de producto destacado en el Designer, sin depender de un desarrollador para
cada cambio de contenido.

No es el mismo trabajo que la integracion documentada en Confluence
("Arquitectura: Webflow + Medusa", tambien exportada en
`medusa-training/docs/Arquitectura- Webflow + Medusa.md`, otro repo), que
cubre como el storefront Next.js se monta dentro del sitio Webflow via
Webflow Cloud. Esto es un mecanismo aparte: una copia de los datos de
producto dentro de una Collection del CMS de Webflow.

## Decision de alcance

Sync de **un solo sentido**, Medusa -> Webflow. Medusa sigue siendo la unica
fuente de verdad para precio, stock, variantes y checkout.

- Webflow nunca escribe de vuelta en Medusa.
- Si alguien edita un item directamente en la Collection de Webflow, el
  proximo sync (al crear/actualizar ese producto en Medusa) lo sobrescribe.
- Motivo: evitar que Webflow se convierta en fuente de datos transaccionales
  (precio/stock reales deben vivir solo donde esta la logica de negocio).

## Hecho hasta ahora

Codigo en `medusa-training-backend`, ejecutado y verificado contra la
Collection real:

| Archivo | Que hace |
| --- | --- |
| `src/utils/webflow-client.ts` | Cliente de bajo nivel contra la Webflow Data API v2: crear item, actualizar item, publicar items (`tryPublishWebflowItems`, no bloqueante, ver "Problema conocido"), archivar item. |
| `src/utils/webflow-product-sync.ts` | Mapea un producto de Medusa a los campos de la Collection y decide crear vs. actualizar segun `product.metadata.webflow_item_id`. Incluye `toWebflowSlug()` para sanear el handle (quita tildes/caracteres no permitidos). |
| `src/subscribers/sync-product-to-webflow.ts` | Dispara el sync en los eventos `product.created` y `product.updated`. |
| `src/scripts/create-webflow-products-collection.ts` | Script de una sola vez (`medusa exec`) que crea la Collection "Productos Medusa" con el esquema de campos de abajo. Ya ejecutado: `collection_id` `6ab23b8ee702a4b0e8333e0b`. |
| `src/scripts/backfill-webflow-products.ts` | Sincroniza de una vez todos los productos ya existentes en Medusa. Ya ejecutado: 8/8 productos sincronizados. |
| `.env` | `WEBFLOW_API_TOKEN`, `WEBFLOW_SITE_ID` (`6a75971f1cce004b55255dab`) y `WEBFLOW_PRODUCTS_COLLECTION_ID` (`6ab23b8ee702a4b0e8333e0b`) ya rellenos. |

Si `WEBFLOW_API_TOKEN` o `WEBFLOW_PRODUCTS_COLLECTION_ID` estan vacios, el
subscriber no hace nada (no falla, se salta el sync).

## Problema conocido: el endpoint de publish devuelve 404

`POST /v2/collections/{collection_id}/items/publish` devuelve
`404 resource_not_found` de forma consistente para este site/token, incluso
publicando un item ya existente y verificado por `GET` (no es un problema de
propagacion/timing, se probo con reintentos y con una llamada aislada varios
segundos despues). El endpoint, metodo y body usados coinciden con la
documentacion oficial de Webflow; la causa concreta no esta identificada.

**Mitigacion aplicada:** el fallo de publish ya no bloquea el sync. El item
se crea/actualiza igualmente (contenido correcto, campo `isDraft: false`),
solo queda sin el "push" explicito a live. En la practica esto significa que
el contenido esta listo en la Collection, pero puede no reflejarse en el
sitio publicado hasta el proximo **Publish manual del sitio** desde el
Designer o el dashboard de Webflow.

**Pendiente de investigar:** confirmar con soporte de Webflow o revisando
permisos/plan del workspace por que este endpoint especifico 404ea cuando el
resto de la API (crear, listar, archivar items) funciona con el mismo token
y collection_id.

### Esquema de la Collection "Productos Medusa"

| Campo (slug) | Tipo | Contenido |
| --- | --- | --- |
| `name` (default) | PlainText | Titulo del producto |
| `slug` (default) | PlainText | Handle del producto |
| `medusa-product-id` | PlainText | ID del producto en Medusa, para trazabilidad |
| `price` | PlainText | Precio formateado en la moneda de `WEBFLOW_SYNC_CURRENCY_CODE` |
| `main-image` | Image | Thumbnail del producto (URL publica) |
| `category` | PlainText | Primera categoria o coleccion del producto |
| `short-description` | PlainText | Subtitulo del producto |
| `product-url` | Link | Enlace al PDP real en el storefront |

## Pasos pendientes

1. En el Designer de Webflow: anadir un Collection List enlazado a
   "Productos Medusa" donde se quiera mostrar el catalogo (hero, landing de
   campana, etc.).
2. Publicar el sitio manualmente al menos una vez tras el backfill, para que
   los 8 items ya sincronizados queden visibles (ver "Problema conocido").
3. Verificar el sync automatico: crear o editar un producto de prueba en
   Medusa y comprobar que el item aparece/actualiza en la Collection.
4. Opcional: investigar el 404 de `items/publish` con soporte de Webflow
   para poder automatizar tambien el publish y no depender de hacerlo a
   mano tras cada sync.

## Fuera de alcance (por ahora)

- Borrado: el subscriber no escucha `product.deleted`. Un producto borrado
  en Medusa deja el item huerfano (publicado) en Webflow hasta que se borre
  o archive a mano.
- Escritura Webflow -> Medusa: descartada por decision explicita (ver
  "Decision de alcance").
