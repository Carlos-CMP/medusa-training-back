import { defineRouteConfig } from "@medusajs/admin-sdk";
import { PencilSquare, Trash } from "@medusajs/icons";
import { HttpTypes } from "@medusajs/types";
import {
  Badge,
  Button,
  Checkbox,
  Container,
  Heading,
  Input,
  Table,
  Text,
  Toaster,
  toast,
  usePrompt,
} from "@medusajs/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { sdk } from "../../lib/client";
import { resolveAdminAssetPreviewUrl } from "../../lib/assets";

const PAGE_SIZE = 50;

const ProductOpsPage = () => {
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();
  const prompt = usePrompt();

  const productsQuery = useQuery({
    queryKey: ["product-ops", search, offset],
    queryFn: () =>
      sdk.admin.product.list({
        limit: PAGE_SIZE,
        offset,
        q: search || undefined,
        fields: "id,title,handle,status,thumbnail,variants.sku,updated_at",
      }),
  });

  const products = productsQuery.data?.products || [];
  const count = productsQuery.data?.count || 0;
  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected]
  );

  const invalidate = () => {
    setSelected({});
    queryClient.invalidateQueries({ queryKey: ["product-ops"] });
  };

  const bulkStatusMutation = useMutation({
    mutationFn: async (status: "published" | "draft") => {
      await Promise.all(
        selectedIds.map((id) => sdk.admin.product.update(id, { status }))
      );
    },
    onSuccess: () => {
      toast.success("Productos actualizados");
      invalidate();
    },
    onError: () => toast.error("No se pudieron actualizar los productos"),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const confirmed = await prompt({
        title: "¿Eliminar productos seleccionados?",
        description:
          "Esta acción eliminará los productos seleccionados del catálogo.",
      });

      if (!confirmed) {
        return;
      }

      await Promise.all(selectedIds.map((id) => sdk.admin.product.delete(id)));
    },
    onSuccess: () => {
      toast.success("Productos eliminados");
      invalidate();
    },
    onError: () => toast.error("No se pudieron eliminar los productos"),
  });

  const allPageSelected =
    products.length > 0 && products.every((product) => selected[product.id]);
  const somePageSelected =
    products.some((product) => selected[product.id]) && !allPageSelected;

  const togglePage = (checked: boolean) => {
    setSelected((prev) => {
      const next = { ...prev };
      products.forEach((product) => {
        next[product.id] = checked;
      });
      return next;
    });
  };

  return (
    <>
      <Container className="flex flex-col overflow-hidden p-0">
        <div className="flex flex-col gap-y-4 border-b p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Heading className="font-sans font-medium h1-core">
                Operativa productos
              </Heading>
              <Text className="text-ui-fg-subtle">
                Selección múltiple para publicar, desactivar o borrar productos.
              </Text>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="small"
                variant="secondary"
                disabled={!selectedIds.length || bulkStatusMutation.isPending}
                onClick={() => bulkStatusMutation.mutate("published")}
              >
                Activar
              </Button>
              <Button
                size="small"
                variant="secondary"
                disabled={!selectedIds.length || bulkStatusMutation.isPending}
                onClick={() => bulkStatusMutation.mutate("draft")}
              >
                Desactivar
              </Button>
              <Button
                size="small"
                variant="danger"
                disabled={!selectedIds.length || bulkDeleteMutation.isPending}
                onClick={() => bulkDeleteMutation.mutate()}
              >
                <Trash />
                Borrar
              </Button>
            </div>
          </div>
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setOffset(0);
            }}
            placeholder="Buscar producto, handle o SKU"
          />
        </div>

        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell className="w-10">
                <Checkbox
                  checked={somePageSelected ? "indeterminate" : allPageSelected}
                  onCheckedChange={(value) => togglePage(!!value)}
                />
              </Table.HeaderCell>
              <Table.HeaderCell>Producto</Table.HeaderCell>
              <Table.HeaderCell>Estado</Table.HeaderCell>
              <Table.HeaderCell>SKU</Table.HeaderCell>
              <Table.HeaderCell>Actualizado</Table.HeaderCell>
              <Table.HeaderCell></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {productsQuery.isPending ? (
              <Table.Row>
                <Table.Cell colSpan={6}>Cargando productos...</Table.Cell>
              </Table.Row>
            ) : products.length ? (
              products.map((product) => (
                <Table.Row key={product.id}>
                  <Table.Cell>
                    <Checkbox
                      checked={!!selected[product.id]}
                      onCheckedChange={(value) =>
                        setSelected((prev) => ({
                          ...prev,
                          [product.id]: !!value,
                        }))
                      }
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-3">
                      {product.thumbnail ? (
                        <img
                          src={resolveAdminAssetPreviewUrl(product.thumbnail)}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-ui-bg-subtle" />
                      )}
                      <div className="grid gap-1">
                        <Text weight="plus">{product.title}</Text>
                        <Text size="xsmall" className="text-ui-fg-subtle">
                          {product.handle}
                        </Text>
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <StatusBadge status={product.status} />
                  </Table.Cell>
                  <Table.Cell>{getSkuSummary(product)}</Table.Cell>
                  <Table.Cell>
                    {product.updated_at
                      ? new Date(product.updated_at).toLocaleDateString("es-ES")
                      : "-"}
                  </Table.Cell>
                  <Table.Cell>
                    <Button
                      asChild
                      size="small"
                      variant="transparent"
                      className="gap-1"
                    >
                      <a href={`/app/products/${product.id}`}>
                        <PencilSquare />
                        Editar
                      </a>
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))
            ) : (
              <Table.Row>
                <Table.Cell colSpan={6}>No hay productos.</Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>

        <div className="flex items-center justify-between border-t p-4">
          <Text size="small" className="text-ui-fg-subtle">
            {selectedIds.length
              ? `${selectedIds.length} seleccionado${selectedIds.length === 1 ? "" : "s"}`
              : `${count} producto${count === 1 ? "" : "s"}`}
          </Text>
          <div className="flex gap-2">
            <Button
              size="small"
              variant="secondary"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Anterior
            </Button>
            <Button
              size="small"
              variant="secondary"
              disabled={offset + PAGE_SIZE >= count}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </Container>
      <Toaster />
    </>
  );
};

const StatusBadge = ({ status }: { status?: string }) => {
  const color = status === "published" ? "green" : "grey";

  return (
    <Badge size="small" color={color}>
      {status === "published" ? "Publicado" : "Borrador"}
    </Badge>
  );
};

const getSkuSummary = (product: HttpTypes.AdminProduct) => {
  const skus =
    product.variants?.map((variant) => variant.sku).filter(Boolean) || [];

  if (!skus.length) {
    return "-";
  }

  return skus.length === 1 ? skus[0] : `${skus[0]} +${skus.length - 1}`;
};

export const config = defineRouteConfig({
  label: "Operativa productos",
  icon: PencilSquare,
});

export default ProductOpsPage;
