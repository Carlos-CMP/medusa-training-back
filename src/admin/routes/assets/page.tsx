import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Photo, Plus, Trash } from "@medusajs/icons";
import {
  Badge,
  Button,
  Container,
  Heading,
  IconButton,
  Input,
  Label,
  Select,
  Text,
  Textarea,
  Toaster,
  toast,
} from "@medusajs/ui";
import { useEffect, useMemo, useState } from "react";
import {
  AdminAsset,
  AdminAssetUpload,
  AssetType,
  useAssets,
  useDeleteAsset,
  useUploadAsset,
  useUpsertAsset,
} from "../../hooks/api/assets";
import { useBrandProfileContent } from "../../hooks/api/brand-profile";
import { resolveAdminAssetPreviewUrl } from "../../lib/assets";

const assetTypes: Array<AssetType | "all"> = [
  "all",
  "logo",
  "hero",
  "homepage",
  "product",
  "category",
  "document",
  "other",
];

const assetTypeLabels: Record<AssetType | "all", string> = {
  all: "Todos",
  logo: "Logos",
  hero: "Hero",
  homepage: "Home",
  product: "Producto",
  category: "Categoría",
  document: "Documentos",
  other: "Otros",
};

type ViewMode = "grid" | "list";

const emptyAsset: AdminAsset = {
  label: "",
  url: "",
  alt: "",
  type: "homepage",
  client_profile_id: "ngs",
  tags: "",
  sort_order: 0,
};

const createEmptyAsset = (profileId: string): AdminAsset => ({
  ...emptyAsset,
  client_profile_id: profileId,
});

const normalizeAssetKey = (value: string | null | undefined) =>
  (value || "").trim().toLowerCase();

const getDuplicateKeys = (assets: AdminAsset[]) => {
  const nameCounts = new Map<string, number>();
  const urlCounts = new Map<string, number>();

  assets.forEach((asset) => {
    const nameKey = normalizeAssetKey(asset.label);
    const urlKey = normalizeAssetKey(asset.url);

    if (nameKey) {
      nameCounts.set(nameKey, (nameCounts.get(nameKey) || 0) + 1);
    }

    if (urlKey) {
      urlCounts.set(urlKey, (urlCounts.get(urlKey) || 0) + 1);
    }
  });

  return {
    names: nameCounts,
    urls: urlCounts,
  };
};

const isDuplicateAsset = (
  asset: AdminAsset,
  duplicates: ReturnType<typeof getDuplicateKeys>
) => {
  const nameKey = normalizeAssetKey(asset.label);
  const urlKey = normalizeAssetKey(asset.url);

  return (
    (!!nameKey && (duplicates.names.get(nameKey) || 0) > 1) ||
    (!!urlKey && (duplicates.urls.get(urlKey) || 0) > 1)
  );
};

const getAssetUsageLabel = (asset: AdminAsset) => {
  if (asset.type === "logo") {
    return "Header / footer";
  }

  if (asset.type === "hero") {
    return "Hero home";
  }

  if (asset.type === "product") {
    return "Producto / PDP";
  }

  if (asset.type === "category") {
    return "Categoría";
  }

  if (asset.type === "document") {
    return "Descarga";
  }

  const tags = normalizeAssetKey(asset.tags);

  if (tags.includes("home") || tags.includes("homepage")) {
    return "Homepage";
  }

  return "Sin uso asignado";
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const mimeTypesByExtension: Record<string, AdminAssetUpload["mime_type"]> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

const getUploadMimeType = (file: File) => {
  if (file.type) {
    return file.type as AdminAssetUpload["mime_type"];
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "";

  return mimeTypesByExtension[extension];
};

const AssetsPage = () => {
  const { data: brandProfileData } = useBrandProfileContent();
  const [profileId, setProfileId] = useState("ngs");
  const [type, setType] = useState<AssetType | "all">("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [form, setForm] = useState<AdminAsset>(emptyAsset);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const activeProfileId = brandProfileData?.brand_profile?.id || "ngs";

  useEffect(() => {
    if (!brandProfileData?.brand_profile?.id) {
      return;
    }

    setProfileId((current) =>
      current === "ngs" ? brandProfileData.brand_profile.id : current
    );
    setForm((current) =>
      current.client_profile_id === "ngs"
        ? { ...current, client_profile_id: brandProfileData.brand_profile.id }
        : current
    );
  }, [brandProfileData?.brand_profile?.id]);

  const { data, isPending } = useAssets({
    client_profile_id: profileId,
    type,
  });
  const { data: allAssetsData } = useAssets({
    client_profile_id: profileId,
    type: "all",
  });

  const assets = data?.assets || [];
  const allAssets = allAssetsData?.assets || assets;
  const filteredAssets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...assets]
      .filter((asset) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          asset.label,
          asset.url,
          asset.alt || "",
          asset.tags || "",
          asset.type,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((left, right) => (left.sort_order || 0) - (right.sort_order || 0));
  }, [assets, search]);

  const typeCounts = useMemo(() => {
    return assetTypes.reduce<Record<string, number>>((acc, assetType) => {
      acc[assetType] =
        assetType === "all"
          ? allAssets.length
          : allAssets.filter((asset) => asset.type === assetType).length;

      return acc;
    }, {});
  }, [allAssets]);

  const duplicates = useMemo(() => getDuplicateKeys(allAssets), [allAssets]);

  const upsertAsset = useUpsertAsset({
    onSuccess: () => {
      toast.success("Asset guardado");
      setForm(createEmptyAsset(profileId));
    },
    onError: (error) => toast.error(error.message || "No se pudo guardar"),
  });

  const deleteAsset = useDeleteAsset({
    onSuccess: () => toast.success("Asset eliminado"),
    onError: (error) => toast.error(error.message || "No se pudo eliminar"),
  });

  const uploadAsset = useUploadAsset({
    onSuccess: ({ asset }) => {
      toast.success("Imagen subida");
      setSelectedFile(null);
      setForm({
        ...emptyAsset,
        ...asset,
        alt: asset.alt || "",
        tags: asset.tags || "",
        sort_order: asset.sort_order || 0,
      });
    },
    onError: (error) => toast.error(error.message || "No se pudo subir"),
  });

  const updateField = (
    field: keyof AdminAsset,
    value: string | number | AssetType
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleNewAsset = () => {
    setSelectedFile(null);
    setForm(createEmptyAsset(profileId));
  };

  const handleEdit = (asset: AdminAsset) => {
    setSelectedFile(null);
    setForm({
      ...emptyAsset,
      ...asset,
      alt: asset.alt || "",
      tags: asset.tags || "",
      sort_order: asset.sort_order || 0,
    });
  };

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("Ruta copiada");
  };

  const handleSubmit = () => {
    if (!form.label || !form.url) {
      toast.error("Nombre y URL son obligatorios");
      return;
    }

    upsertAsset.mutate({
      ...form,
      client_profile_id: form.client_profile_id || profileId,
      alt: form.alt || null,
      tags: form.tags || null,
      sort_order: Number(form.sort_order || 0),
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Selecciona una imagen");
      return;
    }

    if (!form.label) {
      toast.error("El nombre es obligatorio");
      return;
    }

    const contentBase64 = await fileToBase64(selectedFile);
    const mimeType = getUploadMimeType(selectedFile);

    if (!mimeType) {
      toast.error("Formato no soportado. Usa JPG, PNG, WEBP, GIF o SVG.");
      return;
    }

    uploadAsset.mutate({
      id: form.id,
      label: form.label,
      alt: form.alt || null,
      type: form.type,
      client_profile_id: form.client_profile_id || profileId,
      tags: form.tags || null,
      sort_order: Number(form.sort_order || 0),
      filename: selectedFile.name,
      mime_type: mimeType,
      content_base64: contentBase64,
    });
  };

  return (
    <>
      <Container className="flex flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <Heading className="font-sans font-medium h1-core">
              Biblioteca de assets
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Mini DAM para logos, heroes, categorías, productos y documentos.
              Perfil activo: {activeProfileId}.
            </Text>
          </div>
          <Button size="small" variant="secondary" onClick={handleNewAsset}>
            <Plus />
            Nuevo asset
          </Button>
        </div>

        <div className="grid min-h-[calc(100vh-180px)] bg-ui-bg-subtle small:grid-cols-[minmax(0,1fr)_360px]">
          <main className="grid content-start gap-4 p-6">
            <div className="rounded-lg border bg-ui-bg-base p-4">
              <div className="grid gap-3 medium:grid-cols-[1fr_220px]">
                <TextField
                  label="Buscar por nombre, URL, alt o tags"
                  value={search}
                  onChange={setSearch}
                  placeholder="Buscar assets..."
                />
                <TextField
                  label="Perfil cliente"
                  value={profileId}
                  onChange={setProfileId}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {assetTypes.map((assetType) => (
                    <button
                      key={assetType}
                      type="button"
                      onClick={() => setType(assetType)}
                      className={`rounded border px-3 py-1.5 text-xs font-medium transition ${
                        type === assetType
                          ? "border-ui-border-interactive bg-ui-bg-interactive text-ui-fg-on-color"
                          : "border-ui-border-base bg-ui-bg-base text-ui-fg-subtle hover:bg-ui-bg-base-hover"
                      }`}
                    >
                      {assetTypeLabels[assetType]} ({typeCounts[assetType] || 0})
                    </button>
                  ))}
                </div>
                <div className="flex rounded border bg-ui-bg-base p-1">
                  {(["grid", "list"] as ViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      className={`rounded px-3 py-1 text-xs font-medium ${
                        viewMode === mode
                          ? "bg-ui-bg-interactive text-ui-fg-on-color"
                          : "text-ui-fg-subtle hover:bg-ui-bg-base-hover"
                      }`}
                    >
                      {mode === "grid" ? "Grid" : "Lista"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Text size="small" weight="plus">
                {filteredAssets.length} assets
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                Filtrado por {assetTypeLabels[type].toLowerCase()}
              </Text>
            </div>

            {isPending ? (
              <div className="rounded-lg border bg-ui-bg-base p-8 text-center">
                <Text size="small" className="text-ui-fg-subtle">
                  Cargando assets...
                </Text>
              </div>
            ) : filteredAssets.length ? (
              viewMode === "grid" ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-3">
                {filteredAssets.map((asset) => {
                  const isDefault = asset.id?.startsWith("default-");
                  const isSelected =
                    (!!form.id && form.id === asset.id) ||
                    (!form.id && form.url === asset.url);
                  const isDuplicate = isDuplicateAsset(asset, duplicates);
                  const usageLabel = getAssetUsageLabel(asset);

                  return (
                    <article
                      key={`${asset.id || asset.url}-${asset.label}`}
                      onClick={() => handleEdit(asset)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleEdit(asset);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className={`group overflow-hidden rounded-lg border bg-ui-bg-base text-left transition hover:bg-ui-bg-base-hover ${
                        isSelected
                          ? "shadow-borders-interactive-with-focus"
                          : "shadow-elevation-card-rest"
                      }`}
                    >
                      <div className="flex h-20 items-center justify-center border-b bg-ui-bg-component">
                        {asset.url ? (
                          <AssetImage
                            src={resolveAdminAssetPreviewUrl(asset.url)}
                            alt={asset.alt || asset.label}
                            className="max-h-full max-w-full object-contain p-2"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Photo className="text-ui-fg-muted" />
                          </div>
                        )}
                      </div>
                      <div className="grid gap-2 p-2">
                        <div className="grid gap-1">
                          <div className="flex items-start justify-between gap-2">
                            <Text
                              size="small"
                              leading="compact"
                              weight="plus"
                              className="truncate"
                            >
                              {asset.label}
                            </Text>
                            <Badge size="xsmall">{asset.type}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <Badge size="xsmall">{usageLabel}</Badge>
                            {isDuplicate ? (
                              <Badge size="xsmall">Duplicado</Badge>
                            ) : null}
                          </div>
                          <Text
                            size="xsmall"
                            leading="compact"
                            className="truncate text-ui-fg-subtle"
                          >
                            {asset.url}
                          </Text>
                        </div>

                        <div className="flex min-h-8 items-center justify-between gap-2">
                          <Text
                            size="xsmall"
                            leading="compact"
                            className="text-ui-fg-subtle"
                          >
                            Orden {asset.sort_order || 0}
                          </Text>
                          <div className="flex gap-1 opacity-100 transition large:opacity-0 large:group-hover:opacity-100">
                            <Button
                              size="small"
                              variant="secondary"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleCopy(asset.url);
                              }}
                            >
                              Copiar
                            </Button>
                            <IconButton
                              size="small"
                              variant="transparent"
                              type="button"
                              disabled={isDefault || !asset.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                asset.id && deleteAsset.mutate(asset.id);
                              }}
                            >
                              <Trash />
                            </IconButton>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              ) : (
                <div className="overflow-hidden rounded-lg border bg-ui-bg-base">
                  {filteredAssets.map((asset) => {
                    const isDefault = asset.id?.startsWith("default-");
                    const isSelected =
                      (!!form.id && form.id === asset.id) ||
                      (!form.id && form.url === asset.url);
                    const isDuplicate = isDuplicateAsset(asset, duplicates);
                    const usageLabel = getAssetUsageLabel(asset);

                    return (
                      <article
                        key={`${asset.id || asset.url}-${asset.label}-row`}
                        onClick={() => handleEdit(asset)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleEdit(asset);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      className={`grid w-full grid-cols-[52px_minmax(0,1fr)_110px_120px_110px] items-center gap-3 border-b px-3 py-2 text-left transition last:border-b-0 hover:bg-ui-bg-base-hover ${
                          isSelected ? "bg-ui-bg-component" : ""
                        }`}
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded border bg-ui-bg-component">
                          {asset.url ? (
                            <AssetImage
                              src={resolveAdminAssetPreviewUrl(asset.url)}
                              alt={asset.alt || asset.label}
                              className="max-h-full max-w-full object-contain p-1"
                            />
                          ) : (
                            <Photo className="text-ui-fg-muted" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Text size="small" weight="plus" className="truncate">
                            {asset.label}
                          </Text>
                          <Text size="xsmall" className="truncate text-ui-fg-subtle">
                            {asset.url}
                          </Text>
                        </div>
                        <Badge size="xsmall">{asset.type}</Badge>
                        <Text size="xsmall" className="truncate text-ui-fg-subtle">
                          {usageLabel}
                        </Text>
                        <div className="flex items-center justify-end gap-1">
                          {isDuplicate ? <Badge size="xsmall">Duplicado</Badge> : null}
                          <IconButton
                            size="small"
                            variant="transparent"
                            type="button"
                            disabled={isDefault || !asset.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              asset.id && deleteAsset.mutate(asset.id);
                            }}
                          >
                            <Trash />
                          </IconButton>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="rounded-lg border bg-ui-bg-base p-8 text-center">
                <Photo className="mx-auto text-ui-fg-muted" />
                <Text size="small" weight="plus" className="mt-3">
                  No hay assets para este filtro
                </Text>
                <Text size="small" className="mt-1 text-ui-fg-subtle">
                  Ajusta la búsqueda, cambia el tipo o sube un nuevo asset.
                </Text>
              </div>
            )}
          </main>

          <aside className="border-l bg-ui-bg-base p-6">
            <div className="sticky top-6 grid gap-4">
              <div>
                <Text size="small" weight="plus">
                  {form.id ? "Editar asset" : "Nuevo asset"}
                </Text>
                <Text size="small" className="mt-1 text-ui-fg-subtle">
                  Selecciona un asset, copia su ruta o sube uno nuevo. Los
                  cambios se guardan en la biblioteca del perfil activo.
                </Text>
              </div>

              {form.url ? (
                <div className="flex h-36 items-center justify-center overflow-hidden rounded-lg border bg-ui-bg-subtle">
                  <AssetImage
                    src={resolveAdminAssetPreviewUrl(form.url)}
                    alt={form.alt || form.label}
                    className="max-h-full max-w-full object-contain p-3"
                  />
                </div>
              ) : (
                <div className="flex h-36 items-center justify-center rounded-lg border bg-ui-bg-subtle">
                  <Photo className="text-ui-fg-muted" />
                </div>
              )}

              <div className="grid gap-3">
                <TextField
                  label="Nombre"
                  value={form.label}
                  onChange={(value) => updateField("label", value)}
                />
                <TextField
                  label="URL / ruta"
                  value={form.url}
                  onChange={(value) => updateField("url", value)}
                />

                <div className="grid gap-2 rounded-lg border bg-ui-bg-subtle p-3">
                  <Text size="small" leading="compact" weight="plus">
                    Subir imagen
                  </Text>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                    onChange={(event) =>
                      setSelectedFile(event.target.files?.[0] || null)
                    }
                  />
                  {selectedFile ? (
                    <Text size="small" className="text-ui-fg-subtle">
                      {selectedFile.name} -{" "}
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </Text>
                  ) : null}
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={handleUpload}
                    isLoading={uploadAsset.isPending}
                    disabled={!selectedFile || !form.label}
                  >
                    Subir y registrar
                  </Button>
                </div>

                <TextAreaField
                  label="Alt text"
                  value={form.alt || ""}
                  rows={2}
                  onChange={(value) => updateField("alt", value)}
                />

                <div className="grid gap-3 small:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Tipo</Label>
                    <Select
                      value={form.type}
                      onValueChange={(value) =>
                        updateField("type", value as AssetType)
                      }
                    >
                      <Select.Trigger>
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        {assetTypes
                          .filter((assetType) => assetType !== "all")
                          .map((assetType) => (
                            <Select.Item key={assetType} value={assetType}>
                              {assetTypeLabels[assetType]}
                            </Select.Item>
                          ))}
                      </Select.Content>
                    </Select>
                  </div>
                  <NumberField
                    label="Orden"
                    value={Number(form.sort_order || 0)}
                    onChange={(value) => updateField("sort_order", value)}
                  />
                </div>

                <TextField
                  label="Perfil"
                  value={form.client_profile_id}
                  onChange={(value) => updateField("client_profile_id", value)}
                />
                <TextField
                  label="Tags"
                  value={form.tags || ""}
                  onChange={(value) => updateField("tags", value)}
                />

                <div className="flex gap-2">
                  <Button
                    size="small"
                    onClick={handleSubmit}
                    isLoading={upsertAsset.isPending}
                  >
                    Guardar asset
                  </Button>
                  <Button size="small" variant="secondary" onClick={handleNewAsset}>
                    Limpiar
                  </Button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </Container>
      <Toaster />
    </>
  );
};

const TextField = ({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) => (
  <div className="grid gap-2">
    <Label>{label}</Label>
    <Input
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>
);

const AssetImage = ({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="grid h-full w-full place-items-center p-2">
        <div className="flex size-10 items-center justify-center rounded-md border bg-ui-bg-subtle">
          <Photo className="text-ui-fg-muted" />
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};

const NumberField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) => (
  <div className="grid gap-2">
    <Label>{label}</Label>
    <Input
      type="number"
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </div>
);

const TextAreaField = ({
  label,
  value,
  rows = 4,
  onChange,
}: {
  label: string;
  value: string;
  rows?: number;
  onChange: (value: string) => void;
}) => (
  <div className="grid gap-2">
    <Label>{label}</Label>
    <Textarea
      rows={rows}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>
);

export const config = defineRouteConfig({
  label: "Assets",
  icon: Photo,
});

export default AssetsPage;
