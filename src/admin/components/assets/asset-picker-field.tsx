import { Photo } from "@medusajs/icons";
import { Button, Input, Label, Text } from "@medusajs/ui";
import { useEffect, useMemo, useState } from "react";
import { AdminAsset, AssetType, useAssets } from "../../hooks/api/assets";
import { resolveAdminAssetPreviewUrl } from "../../lib/assets";

type AssetPickerFieldProps = {
  label: string;
  value: string;
  profileId?: string;
  preferredType?: AssetType | "all";
  onChange: (value: string) => void;
};

const getAssetKey = (asset: AdminAsset) =>
  asset.id || `${asset.type}-${asset.url}`;

export const AssetPickerField = ({
  label,
  value,
  profileId = "ngs",
  preferredType = "all",
  onChange,
}: AssetPickerFieldProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data, isPending } = useAssets({
    client_profile_id: profileId,
    type: preferredType,
  });

  const assets = useMemo(() => data?.assets || [], [data?.assets]);
  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return assets;
    }

    return assets.filter((asset) =>
      [asset.label, asset.url, asset.alt || "", asset.tags || "", asset.type]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [assets, search]);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <Button
          type="button"
          size="small"
          variant="secondary"
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? "Cerrar assets" : "Seleccionar asset"}
        </Button>
      </div>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />

      {isOpen ? (
        <div className="grid gap-3 rounded-lg border bg-ui-bg-subtle p-3">
          <Input
            value={search}
            placeholder="Buscar asset..."
            onChange={(event) => setSearch(event.target.value)}
          />

          {isPending ? (
            <Text size="small" className="text-ui-fg-subtle">
              Cargando assets...
            </Text>
          ) : null}

          {!isPending && !filteredAssets.length ? (
            <Text size="small" className="text-ui-fg-subtle">
              No hay assets para este perfil, tipo o búsqueda.
            </Text>
          ) : null}

          {filteredAssets.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] gap-2">
              {filteredAssets.map((asset) => (
                <div
                  key={getAssetKey(asset)}
                  className="grid gap-2 rounded-lg border bg-ui-bg-base p-2"
                >
                  <div className="aspect-[4/3] overflow-hidden rounded-md border bg-ui-bg-subtle">
                    <AssetPreviewImage
                      src={resolveAdminAssetPreviewUrl(asset.url)}
                      alt={asset.alt || ""}
                      className="h-full w-full object-contain p-1"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Text
                      size="xsmall"
                      leading="compact"
                      weight="plus"
                      className="truncate"
                    >
                      {asset.label}
                    </Text>
                    <Text
                      size="xsmall"
                      leading="compact"
                      className="truncate text-ui-fg-subtle"
                    >
                      {asset.type}
                    </Text>
                  </div>
                  <Button
                    type="button"
                    size="small"
                    variant={value === asset.url ? "primary" : "secondary"}
                    onClick={() => {
                      onChange(asset.url);
                      setIsOpen(false);
                    }}
                  >
                    {value === asset.url ? "Seleccionado" : "Usar"}
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

const AssetPreviewImage = ({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className="grid h-full w-full place-items-center p-2">
        <div className="grid gap-1 text-center">
          <Photo className="mx-auto text-ui-fg-muted" />
          <Text size="xsmall" className="text-ui-fg-subtle">
            Sin preview
          </Text>
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
