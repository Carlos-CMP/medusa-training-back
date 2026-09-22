import { defineRouteConfig } from "@medusajs/admin-sdk";
import {
  ArrowDownMini,
  ArrowUpMini,
  DocumentSeries,
  Photo,
  Plus,
  Trash,
} from "@medusajs/icons";
import {
  Badge,
  Button,
  Container,
  Heading,
  IconButton,
  Input,
  Label,
  Switch,
  Text,
  Textarea,
  Toaster,
  toast,
} from "@medusajs/ui";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import {
  DEFAULT_HOMEPAGE_CONTENT,
  HomepageCategoryBlock,
  HomepageContent,
  HomepageImageBlock,
} from "../../../modules/homepage/defaults";
import { useBrandProfileContent } from "../../hooks/api/brand-profile";
import {
  AdminAsset,
  AssetType,
  useAssets,
  useUploadAsset,
} from "../../hooks/api/assets";
import {
  useHomepageContent,
  useUpdateHomepageContent,
} from "../../hooks/api/homepage";
import { resolveAdminAssetPreviewUrl } from "../../lib/assets";

type SectionKey =
  | "hero"
  | "metrics"
  | "trust"
  | "capabilities"
  | "detail"
  | "catalog"
  | "operations";

const sectionNav: Array<{
  key: SectionKey;
  label: string;
  description: string;
}> = [
  { key: "hero", label: "Hero", description: "Titular, CTAs e imagen principal" },
  { key: "metrics", label: "Métricas", description: "Datos rápidos bajo el hero" },
  { key: "trust", label: "Banda superior", description: "Calidad, stock, soporte" },
  {
    key: "capabilities",
    label: "Soluciones",
    description: "Bloques comerciales con imagen",
  },
  { key: "detail", label: "Bloque visual", description: "CTA y bloques de detalle" },
  { key: "catalog", label: "Catálogo", description: "Títulos del rail de producto" },
  { key: "operations", label: "Operativa B2B", description: "Puntos de valor Medusa" },
];

const toFormState = (content: HomepageContent): HomepageContent => ({
  ...content,
  metrics: content.metrics.map((item) => ({ ...item })),
  trustBlocks: content.trustBlocks.map((item) => ({ ...item })),
  capabilityBlocks: content.capabilityBlocks.map((item) => ({ ...item })),
  featuredCategories: content.featuredCategories.map((item) => ({ ...item })),
  detailBlocks: content.detailBlocks.map((item) => ({ ...item })),
  operations: [...content.operations],
});

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const value = String(reader.result || "");
      resolve(value.includes(",") ? value.split(",")[1] : value);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const moveItem = <T,>(items: T[], from: number, to: number) => {
  if (to < 0 || to >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);

  return next;
};

const insertAfter = <T,>(items: T[], index: number, item: T) => {
  const next = [...items];
  next.splice(index + 1, 0, item);

  return next;
};

const isValidLink = (value: string | undefined) => {
  if (!value) {
    return true;
  }

  return value.startsWith("/") || value.startsWith("https://") || value.startsWith("http://");
};

const getHomepageValidationWarnings = (content: HomepageContent) => {
  const warnings: string[] = [];

  if (!content.heroImage) {
    warnings.push("Hero sin imagen principal");
  }

  if (content.heroImage && !content.heroImageAlt) {
    warnings.push("Hero sin alt text");
  }

  if (content.heroTitle.length > 82) {
    warnings.push("Título hero largo: puede romper en móvil");
  }

  if (content.heroBody.length > 180) {
    warnings.push("Texto hero largo: revisa corte visual");
  }

  if (!isValidLink(content.primaryCtaHref)) {
    warnings.push("CTA principal con enlace no válido");
  }

  if (!isValidLink(content.secondaryCtaHref)) {
    warnings.push("CTA secundario con enlace no válido");
  }

  if (!isValidLink(content.detailCtaHref)) {
    warnings.push("CTA del bloque visual con enlace no válido");
  }

  content.featuredCategories.forEach((category) => {
    if (!category.title) {
      warnings.push("Categoría destacada sin título");
    }

    if (!category.handle) {
      warnings.push(`Categoría destacada sin handle: ${category.title || "sin título"}`);
    }

    if (!category.image) {
      warnings.push(`Categoría destacada sin imagen: ${category.title || "sin título"}`);
    }
  });

  const visibleImageBlocks = [
    ...content.trustBlocks,
    ...content.capabilityBlocks,
    ...content.detailBlocks,
  ].filter((item) => !item.isHidden);

  visibleImageBlocks.forEach((item) => {
    if (!item.image) {
      warnings.push(`Bloque visible sin imagen: ${item.title || "sin título"}`);
    }

    if (item.title.length > 54) {
      warnings.push(`Título largo en bloque: ${item.title}`);
    }
  });

  return warnings;
};

const Homepage = () => {
  const { data, isPending } = useHomepageContent();
  const { data: brandProfileData } = useBrandProfileContent();
  const [activeSection, setActiveSection] = useState<SectionKey>("hero");
  const validationPanelRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState<HomepageContent>(
    toFormState(DEFAULT_HOMEPAGE_CONTENT)
  );
  const activeProfileId = brandProfileData?.brand_profile?.id || "ngs";
  const storefrontUrl =
    import.meta.env.VITE_STOREFRONT_URL ||
    "https://storefront-virid-three-41.vercel.app/es";

  const updateHomepage = useUpdateHomepageContent({
    onSuccess: () => toast.success("Homepage actualizada"),
    onError: (error) =>
      toast.error(error.message || "No se pudo guardar la homepage"),
  });

  useEffect(() => {
    if (data?.homepage) {
      setForm(toFormState(data.homepage));
    }
  }, [data?.homepage]);

  const activeLabel = useMemo(
    () => sectionNav.find((section) => section.key === activeSection)?.label,
    [activeSection]
  );
  const validationWarnings = useMemo(
    () => getHomepageValidationWarnings(form),
    [form]
  );

  const updateField = (field: keyof HomepageContent, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateMetric = (
    index: number,
    field: keyof HomepageContent["metrics"][number],
    value: string | boolean
  ) => {
    setForm((current) => ({
      ...current,
      metrics: current.metrics.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addMetric = () => {
    setForm((current) => ({
      ...current,
      metrics: [...current.metrics, { value: "Nuevo", label: "Texto" }],
    }));
  };

  const removeMetric = (index: number) => {
    setForm((current) => ({
      ...current,
      metrics: current.metrics.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const duplicateMetric = (index: number) => {
    setForm((current) => ({
      ...current,
      metrics: insertAfter(current.metrics, index, { ...current.metrics[index] }),
    }));
  };

  const moveMetric = (index: number, direction: -1 | 1) => {
    setForm((current) => ({
      ...current,
      metrics: moveItem(current.metrics, index, index + direction),
    }));
  };

  const updateImageBlock = (
    collection: "trustBlocks" | "capabilityBlocks" | "detailBlocks",
    index: number,
    field: keyof HomepageImageBlock,
    value: string | boolean
  ) => {
    setForm((current) => ({
      ...current,
      [collection]: current[collection].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addImageBlock = (
    collection: "trustBlocks" | "capabilityBlocks" | "detailBlocks"
  ) => {
    setForm((current) => ({
      ...current,
      [collection]: [
        ...current[collection],
        { title: "Nuevo bloque", body: "Descripción", image: "" },
      ],
    }));
  };

  const removeImageBlock = (
    collection: "trustBlocks" | "capabilityBlocks" | "detailBlocks",
    index: number
  ) => {
    setForm((current) => ({
      ...current,
      [collection]: current[collection].filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  };

  const duplicateImageBlock = (
    collection: "trustBlocks" | "capabilityBlocks" | "detailBlocks",
    index: number
  ) => {
    setForm((current) => ({
      ...current,
      [collection]: insertAfter(current[collection], index, {
        ...current[collection][index],
      }),
    }));
  };

  const moveImageBlock = (
    collection: "trustBlocks" | "capabilityBlocks" | "detailBlocks",
    index: number,
    direction: -1 | 1
  ) => {
    setForm((current) => ({
      ...current,
      [collection]: moveItem(current[collection], index, index + direction),
    }));
  };

  const updateFeaturedCategory = (
    index: number,
    field: keyof HomepageCategoryBlock,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      featuredCategories: current.featuredCategories.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addFeaturedCategory = () => {
    setForm((current) => ({
      ...current,
      featuredCategories: [
        ...current.featuredCategories,
        { title: "Nueva categoría", handle: "nueva-categoria", image: "" },
      ],
    }));
  };

  const removeFeaturedCategory = (index: number) => {
    setForm((current) => ({
      ...current,
      featuredCategories: current.featuredCategories.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  };

  const duplicateFeaturedCategory = (index: number) => {
    setForm((current) => ({
      ...current,
      featuredCategories: insertAfter(current.featuredCategories, index, {
        ...current.featuredCategories[index],
      }),
    }));
  };

  const moveFeaturedCategory = (index: number, direction: -1 | 1) => {
    setForm((current) => ({
      ...current,
      featuredCategories: moveItem(
        current.featuredCategories,
        index,
        index + direction
      ),
    }));
  };

  const updateOperation = (index: number, value: string) => {
    setForm((current) => ({
      ...current,
      operations: current.operations.map((item, itemIndex) =>
        itemIndex === index ? value : item
      ),
    }));
  };

  const addOperation = () => {
    setForm((current) => ({
      ...current,
      operations: [...current.operations, "Nueva capacidad operativa"],
    }));
  };

  const removeOperation = (index: number) => {
    setForm((current) => ({
      ...current,
      operations: current.operations.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  };

  const duplicateOperation = (index: number) => {
    setForm((current) => ({
      ...current,
      operations: insertAfter(current.operations, index, current.operations[index]),
    }));
  };

  const moveOperation = (index: number, direction: -1 | 1) => {
    setForm((current) => ({
      ...current,
      operations: moveItem(current.operations, index, index + direction),
    }));
  };

  const handleSubmit = () => {
    if (!form.heroTitle || !form.heroBody) {
      toast.error("Hero necesita título y texto");
      return;
    }

    if (!form.metrics.length) {
      toast.error("Añade al menos una metrica");
      return;
    }

    updateHomepage.mutate(form);
  };

  const handleOpenStorefront = () => {
    window.open(storefrontUrl, "_blank", "noopener,noreferrer");
  };

  const handleShowWarnings = () => {
    validationPanelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  return (
    <>
      <Container className="flex flex-col overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
          <div>
            <Heading className="font-sans font-medium h1-core">
              Homepage
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Editor visual para textos, CTAs e imágenes de la home publica.
            </Text>
          </div>
          <div className="flex items-center gap-2">
            {validationWarnings.length ? (
              <button
                type="button"
                onClick={handleShowWarnings}
                className="rounded-md outline-none transition hover:opacity-80 focus-visible:shadow-borders-focus"
              >
                <Badge>{validationWarnings.length} avisos</Badge>
              </button>
            ) : (
              <Badge>OK visual</Badge>
            )}
            <Badge>{activeLabel}</Badge>
            <Button size="small" variant="secondary" onClick={handleOpenStorefront}>
              Abrir home
            </Button>
            <Button
              size="small"
              onClick={handleSubmit}
              isLoading={updateHomepage.isPending}
              disabled={isPending}
            >
              Guardar cambios
            </Button>
          </div>
        </div>

        <div className="grid gap-0 small:grid-cols-[280px_minmax(0,1fr)_380px]">
          <aside className="border-b bg-ui-bg-subtle p-4 small:border-b-0 small:border-r">
            <div className="grid gap-2">
              {sectionNav.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                  className={[
                    "rounded-lg border px-3 py-3 text-left transition",
                    activeSection === section.key
                      ? "border-ui-border-interactive bg-ui-bg-base shadow-elevation-card-rest"
                      : "border-transparent hover:bg-ui-bg-base",
                  ].join(" ")}
                >
                  <Text size="small" weight="plus">
                    {section.label}
                  </Text>
                  <Text size="xsmall" className="mt-1 text-ui-fg-subtle">
                    {section.description}
                  </Text>
                </button>
              ))}
            </div>
          </aside>

          <main className="min-h-[760px] p-6">
            {activeSection === "hero" && (
              <EditorPanel
                title="Hero principal"
                description="La primera impresión de la home. Cambia aquí el claim, CTAs e imagen principal."
              >
                <div className="grid gap-4">
                  <div className="grid gap-3 small:grid-cols-2">
                    <TextField
                      label="Badge izquierdo"
                      value={form.heroBadgePrimary}
                      onChange={(value) =>
                        updateField("heroBadgePrimary", value)
                      }
                    />
                    <TextField
                      label="Badge derecho"
                      value={form.heroBadgeSecondary}
                      onChange={(value) =>
                        updateField("heroBadgeSecondary", value)
                      }
                    />
                  </div>
                  <TextAreaField
                    label="Título"
                    value={form.heroTitle}
                    rows={3}
                    onChange={(value) => updateField("heroTitle", value)}
                  />
                  <TextAreaField
                    label="Texto"
                    value={form.heroBody}
                    rows={3}
                    onChange={(value) => updateField("heroBody", value)}
                  />
                  <div className="grid gap-3 small:grid-cols-2">
                    <TextField
                      label="CTA principal"
                      value={form.primaryCtaLabel}
                      onChange={(value) =>
                        updateField("primaryCtaLabel", value)
                      }
                    />
                    <TextField
                      label="Link CTA principal"
                      value={form.primaryCtaHref}
                      onChange={(value) =>
                        updateField("primaryCtaHref", value)
                      }
                    />
                    <TextField
                      label="CTA secundario"
                      value={form.secondaryCtaLabel}
                      onChange={(value) =>
                        updateField("secondaryCtaLabel", value)
                      }
                    />
                    <TextField
                      label="Link CTA secundario"
                      value={form.secondaryCtaHref}
                      onChange={(value) =>
                        updateField("secondaryCtaHref", value)
                      }
                    />
                  </div>
                  <ImageField
                    label="Imagen hero"
                    value={form.heroImage}
                    profileId={activeProfileId}
                    preferredType="hero"
                    onChange={(value) => updateField("heroImage", value)}
                  />
                  <TextField
                    label="Alt imagen"
                    value={form.heroImageAlt}
                    onChange={(value) => updateField("heroImageAlt", value)}
                  />
                  <div className="grid gap-3 small:grid-cols-2">
                    <TextField
                      label="Eyebrow sobre imagen"
                      value={form.heroImageEyebrow}
                      onChange={(value) =>
                        updateField("heroImageEyebrow", value)
                      }
                    />
                    <TextField
                      label="Texto sobre imagen"
                      value={form.heroImageTitle}
                      onChange={(value) =>
                        updateField("heroImageTitle", value)
                      }
                    />
                  </div>
                </div>
              </EditorPanel>
            )}

            {activeSection === "metrics" && (
              <EditorPanel
                title="Metricas"
                description="Pequeños argumentos de confianza que aparecen cerca del hero."
                action={<AddButton label="Añadir metrica" onClick={addMetric} />}
              >
                <div className="grid gap-3">
                  {form.metrics.map((metric, index) => (
                    <EditableCard
                      key={`metric-${index}`}
                      title={`Metrica ${index + 1}`}
                      meta={`${metric.value} - ${metric.label}`}
                      isHidden={metric.isHidden}
                      onDuplicate={() => duplicateMetric(index)}
                      onMoveUp={() => moveMetric(index, -1)}
                      onMoveDown={() => moveMetric(index, 1)}
                      onRemove={() => removeMetric(index)}
                      moveUpDisabled={index === 0}
                      moveDownDisabled={index === form.metrics.length - 1}
                      removeDisabled={form.metrics.length === 1}
                    >
                      <div className="grid gap-3 small:grid-cols-[160px_1fr]">
                        <TextField
                          label="Valor"
                          value={metric.value}
                          onChange={(value) =>
                            updateMetric(index, "value", value)
                          }
                        />
                        <TextField
                          label="Texto"
                          value={metric.label}
                          onChange={(value) =>
                            updateMetric(index, "label", value)
                          }
                        />
                      </div>
                      <VisibilityToggle
                        checked={!metric.isHidden}
                        label="Visible en la home"
                        onCheckedChange={(checked) =>
                          updateMetric(index, "isHidden", !checked)
                        }
                      />
                    </EditableCard>
                  ))}
                </div>
              </EditorPanel>
            )}

            {activeSection === "trust" && (
              <ImageBlocksEditor
                title="Banda superior"
                description="Bloques cortos de confianza: stock, calidad, soporte, condiciones."
                items={form.trustBlocks}
                profileId={activeProfileId}
                onAdd={() => addImageBlock("trustBlocks")}
                onRemove={(index) => removeImageBlock("trustBlocks", index)}
                onDuplicate={(index) =>
                  duplicateImageBlock("trustBlocks", index)
                }
                onMove={(index, direction) =>
                  moveImageBlock("trustBlocks", index, direction)
                }
                onChange={(index, field, value) =>
                  updateImageBlock("trustBlocks", index, field, value)
                }
              />
            )}

            {activeSection === "capabilities" && (
              <EditorPanel
                title="Soluciones"
                description="Sección comercial con titular y tarjetas visuales."
                action={
                  <AddButton
                    label="Añadir bloque"
                    onClick={() => addImageBlock("capabilityBlocks")}
                  />
                }
              >
                <div className="grid gap-4">
                  <TextField
                    label="Eyebrow"
                    value={form.capabilityEyebrow}
                    onChange={(value) =>
                      updateField("capabilityEyebrow", value)
                    }
                  />
                  <TextAreaField
                    label="Título"
                    value={form.capabilityTitle}
                    rows={3}
                    onChange={(value) => updateField("capabilityTitle", value)}
                  />
                  <BlockList
                    items={form.capabilityBlocks}
                    profileId={activeProfileId}
                    onRemove={(index) =>
                      removeImageBlock("capabilityBlocks", index)
                    }
                    onDuplicate={(index) =>
                      duplicateImageBlock("capabilityBlocks", index)
                    }
                    onMove={(index, direction) =>
                      moveImageBlock("capabilityBlocks", index, direction)
                    }
                    onChange={(index, field, value) =>
                      updateImageBlock("capabilityBlocks", index, field, value)
                    }
                  />
                </div>
              </EditorPanel>
            )}

            {activeSection === "detail" && (
              <EditorPanel
                title="Bloque visual"
                description="Bloque de refuerzo con CTA y mosaico de imágenes."
                action={
                  <AddButton
                    label="Añadir bloque"
                    onClick={() => addImageBlock("detailBlocks")}
                  />
                }
              >
                <div className="grid gap-4">
                  <div className="grid gap-3 small:grid-cols-2">
                    <TextField
                      label="Eyebrow"
                      value={form.detailEyebrow}
                      onChange={(value) => updateField("detailEyebrow", value)}
                    />
                    <TextField
                      label="CTA"
                      value={form.detailCtaLabel}
                      onChange={(value) =>
                        updateField("detailCtaLabel", value)
                      }
                    />
                    <TextField
                      label="Link CTA"
                      value={form.detailCtaHref}
                      onChange={(value) => updateField("detailCtaHref", value)}
                    />
                  </div>
                  <TextAreaField
                    label="Título"
                    value={form.detailTitle}
                    rows={2}
                    onChange={(value) => updateField("detailTitle", value)}
                  />
                  <TextAreaField
                    label="Texto"
                    value={form.detailBody}
                    rows={3}
                    onChange={(value) => updateField("detailBody", value)}
                  />
                  <BlockList
                    items={form.detailBlocks}
                    profileId={activeProfileId}
                    onRemove={(index) => removeImageBlock("detailBlocks", index)}
                    onDuplicate={(index) =>
                      duplicateImageBlock("detailBlocks", index)
                    }
                    onMove={(index, direction) =>
                      moveImageBlock("detailBlocks", index, direction)
                    }
                    onChange={(index, field, value) =>
                      updateImageBlock("detailBlocks", index, field, value)
                    }
                  />
                </div>
              </EditorPanel>
            )}

            {activeSection === "catalog" && (
              <EditorPanel
                title="Catálogo"
                description="Títulos de categorías y productos destacados."
              >
                <div className="grid gap-4">
                  <div className="grid gap-3 small:grid-cols-2">
                    <TextField
                      label="Eyebrow categorías"
                      value={form.categoryEyebrow}
                      onChange={(value) =>
                        updateField("categoryEyebrow", value)
                      }
                    />
                    <TextField
                      label="Título categorías"
                      value={form.categoryTitle}
                      onChange={(value) => updateField("categoryTitle", value)}
                    />
                    <TextField
                      label="Eyebrow catálogo"
                      value={form.catalogEyebrow}
                      onChange={(value) => updateField("catalogEyebrow", value)}
                    />
                    <TextField
                      label="Título catálogo"
                      value={form.catalogTitle}
                      onChange={(value) => updateField("catalogTitle", value)}
                    />
                  </div>
                  <FeaturedCategoriesEditor
                    items={form.featuredCategories}
                    profileId={activeProfileId}
                    onAdd={addFeaturedCategory}
                    onRemove={removeFeaturedCategory}
                    onDuplicate={duplicateFeaturedCategory}
                    onMove={moveFeaturedCategory}
                    onChange={updateFeaturedCategory}
                  />
                </div>
              </EditorPanel>
            )}

            {activeSection === "operations" && (
              <EditorPanel
                title="Operativa B2B"
                description="Argumentos de plataforma y backoffice."
                action={<AddButton label="Añadir punto" onClick={addOperation} />}
              >
                <div className="grid gap-4">
                  <TextField
                    label="Eyebrow"
                    value={form.operationsEyebrow}
                    onChange={(value) =>
                      updateField("operationsEyebrow", value)
                    }
                  />
                  <TextAreaField
                    label="Título"
                    value={form.operationsTitle}
                    rows={2}
                    onChange={(value) => updateField("operationsTitle", value)}
                  />
                  <div className="grid gap-3">
                    {form.operations.map((operation, index) => (
                      <EditableCard
                        key={`operation-${index}`}
                        title={`Punto ${index + 1}`}
                        meta={operation}
                        onDuplicate={() => duplicateOperation(index)}
                        onMoveUp={() => moveOperation(index, -1)}
                        onMoveDown={() => moveOperation(index, 1)}
                        onRemove={() => removeOperation(index)}
                        moveUpDisabled={index === 0}
                        moveDownDisabled={
                          index === form.operations.length - 1
                        }
                        removeDisabled={form.operations.length === 1}
                      >
                        <TextAreaField
                          label="Texto"
                          value={operation}
                          rows={2}
                          onChange={(value) => updateOperation(index, value)}
                        />
                      </EditableCard>
                    ))}
                  </div>
                </div>
              </EditorPanel>
            )}
          </main>

          <aside className="border-t bg-ui-bg-subtle p-4 small:border-l small:border-t-0">
            <div className="sticky top-4 grid gap-4">
              <PreviewCard
                ref={validationPanelRef}
                form={form}
                warnings={validationWarnings}
              />
            </div>
          </aside>
        </div>
      </Container>
      <Toaster />
    </>
  );
};

const EditorPanel = ({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) => (
  <div className="grid gap-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Text size="large" weight="plus">
          {title}
        </Text>
        <Text size="small" className="mt-1 text-ui-fg-subtle">
          {description}
        </Text>
      </div>
      {action}
    </div>
    {children}
  </div>
);

const AddButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <Button size="small" variant="secondary" onClick={onClick}>
    <Plus />
    {label}
  </Button>
);

const EditableCard = ({
  title,
  meta,
  isHidden,
  children,
  moveUpDisabled,
  moveDownDisabled,
  removeDisabled,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  title: string;
  meta?: string;
  isHidden?: boolean;
  children: ReactNode;
  moveUpDisabled?: boolean;
  moveDownDisabled?: boolean;
  removeDisabled?: boolean;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
}) => (
  <div
    className={[
      "grid gap-3 rounded-lg border bg-ui-bg-base p-4 shadow-elevation-card-rest",
      isHidden ? "opacity-65" : "",
    ].join(" ")}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <Text size="small" leading="compact" weight="plus">
          {title}
        </Text>
        {meta ? (
          <Text size="xsmall" className="mt-1 truncate text-ui-fg-subtle">
            {isHidden ? "Oculto - " : ""}
            {meta}
          </Text>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onMoveUp ? (
          <IconButton
            size="small"
            variant="transparent"
            disabled={moveUpDisabled}
            onClick={onMoveUp}
            type="button"
            aria-label="Subir bloque"
          >
            <ArrowUpMini />
          </IconButton>
        ) : null}
        {onMoveDown ? (
          <IconButton
            size="small"
            variant="transparent"
            disabled={moveDownDisabled}
            onClick={onMoveDown}
            type="button"
            aria-label="Bajar bloque"
          >
            <ArrowDownMini />
          </IconButton>
        ) : null}
        {onDuplicate ? (
          <IconButton
            size="small"
            variant="transparent"
            onClick={onDuplicate}
            type="button"
            aria-label="Duplicar bloque"
          >
            <DocumentSeries />
          </IconButton>
        ) : null}
        <IconButton
          size="small"
          variant="transparent"
          disabled={removeDisabled}
          onClick={onRemove}
          type="button"
          aria-label="Eliminar bloque"
        >
          <Trash />
        </IconButton>
      </div>
    </div>
    {children}
  </div>
);

const ImageBlocksEditor = ({
  title,
  description,
  items,
  profileId,
  onAdd,
  onRemove,
  onDuplicate,
  onMove,
  onChange,
}: {
  title: string;
  description: string;
  items: HomepageImageBlock[];
  profileId: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onChange: (
    index: number,
    field: keyof HomepageImageBlock,
    value: string | boolean
  ) => void;
}) => (
  <EditorPanel title={title} description={description} action={<AddButton label="Añadir bloque" onClick={onAdd} />}>
    <BlockList
      items={items}
      profileId={profileId}
      onRemove={onRemove}
      onDuplicate={onDuplicate}
      onMove={onMove}
      onChange={onChange}
    />
  </EditorPanel>
);

const FeaturedCategoriesEditor = ({
  items,
  profileId,
  onAdd,
  onRemove,
  onDuplicate,
  onMove,
  onChange,
}: {
  items: HomepageCategoryBlock[];
  profileId: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onChange: (
    index: number,
    field: keyof HomepageCategoryBlock,
    value: string
  ) => void;
}) => (
  <div className="grid gap-3 rounded-lg border bg-ui-bg-subtle p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="grid gap-1">
        <Text size="small" leading="compact" weight="plus">
          Categorías destacadas
        </Text>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          Cambia aquí las imágenes, títulos y enlaces de las tarjetas que aparecen justo bajo el hero.
        </Text>
      </div>
      <AddButton label="Añadir categoría" onClick={onAdd} />
    </div>

    <div className="rounded-md border bg-ui-bg-base p-3">
      <Text size="small" weight="plus">
        Cómo cambiar una imagen
      </Text>
      <Text size="small" className="mt-1 text-ui-fg-subtle">
        Abre una tarjeta, pulsa Biblioteca o sube una imagen nueva. Después revisa la vista previa lateral y guarda los cambios.
      </Text>
    </div>

    <div className="grid gap-3">
      {items.map((item, index) => (
        <EditableCard
          key={`featured-category-${index}`}
          title={item.title || `Categoría ${index + 1}`}
          meta={item.handle ? `/categories/${item.handle}` : "Sin enlace"}
          onDuplicate={() => onDuplicate(index)}
          onMoveUp={() => onMove(index, -1)}
          onMoveDown={() => onMove(index, 1)}
          onRemove={() => onRemove(index)}
          moveUpDisabled={index === 0}
          moveDownDisabled={index === items.length - 1}
          removeDisabled={items.length === 1}
        >
          <div className="grid gap-4 small:grid-cols-[220px_1fr]">
            <ImageField
              label="Imagen de la tarjeta"
              value={item.image}
              profileId={profileId}
              preferredType="category"
              onChange={(value) => onChange(index, "image", value)}
            />
            <div className="grid gap-3">
              <TextField
                label="Título visible"
                value={item.title}
                onChange={(value) => onChange(index, "title", value)}
              />
              <TextField
                label="Handle de categoría"
                value={item.handle}
                onChange={(value) => onChange(index, "handle", value)}
              />
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                Enlaza a /categories/{item.handle || "handle-de-categoria"}. Usa el handle real de Medusa.
              </Text>
            </div>
          </div>
        </EditableCard>
      ))}
    </div>
  </div>
);

const BlockList = ({
  items,
  profileId,
  onRemove,
  onDuplicate,
  onMove,
  onChange,
}: {
  items: HomepageImageBlock[];
  profileId: string;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onChange: (
    index: number,
    field: keyof HomepageImageBlock,
    value: string | boolean
  ) => void;
}) => (
  <div className="grid gap-3">
    {items.map((item, index) => (
      <EditableCard
        key={`block-${index}`}
        title={`Bloque ${index + 1}`}
        meta={item.title}
        isHidden={item.isHidden}
        onDuplicate={() => onDuplicate(index)}
        onMoveUp={() => onMove(index, -1)}
        onMoveDown={() => onMove(index, 1)}
        onRemove={() => onRemove(index)}
        moveUpDisabled={index === 0}
        moveDownDisabled={index === items.length - 1}
        removeDisabled={items.length === 1}
      >
        <div className="grid gap-4 small:grid-cols-[220px_1fr]">
          <ImageField
            label="Imagen"
            value={item.image}
            profileId={profileId}
            preferredType="homepage"
            onChange={(value) => onChange(index, "image", value)}
          />
          <div className="grid gap-3">
            <TextField
              label="Título"
              value={item.title}
              onChange={(value) => onChange(index, "title", value)}
            />
            <TextAreaField
              label="Texto"
              value={item.body}
              rows={3}
              onChange={(value) => onChange(index, "body", value)}
            />
            <VisibilityToggle
              checked={!item.isHidden}
              label="Visible en la home"
              onCheckedChange={(checked) =>
                onChange(index, "isHidden", !checked)
              }
            />
          </div>
        </div>
      </EditableCard>
    ))}
  </div>
);

const ImageField = ({
  label,
  value,
  profileId,
  preferredType = "homepage",
  onChange,
}: {
  label: string;
  value: string;
  profileId: string;
  preferredType?: AssetType | "all";
  onChange: (value: string) => void;
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [assetSearch, setAssetSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const { data, isPending } = useAssets({
    client_profile_id: profileId,
    type: preferredType,
  });
  const uploadAsset = useUploadAsset({
    onError: (error) =>
      toast.error(error.message || "No se pudo subir la imagen"),
  });
  const uploadType = preferredType === "all" ? "homepage" : preferredType;

  const assets = data?.assets || [];
  const filteredAssets = useMemo(() => {
    const query = assetSearch.trim().toLowerCase();

    if (!query) {
      return assets;
    }

    return assets.filter((asset) =>
      [asset.label, asset.url, asset.alt || "", asset.tags || "", asset.type]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [assetSearch, assets]);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploading(true);

    try {
      const content_base64 = await readFileAsBase64(file);
      const { asset } = await uploadAsset.mutateAsync({
        label: file.name.replace(/\.[^.]+$/, ""),
        filename: file.name,
        mime_type: file.type || "image/png",
        content_base64,
        type: uploadType,
        client_profile_id: profileId,
        alt: file.name,
        tags: `${uploadType}, homepage, uploaded`,
        sort_order: 0,
      });

      onChange(asset.url);
      toast.success("Imagen subida");
    } catch {
      toast.error("No se pudo procesar el archivo");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <Button
          type="button"
          size="small"
          variant="secondary"
          onClick={() => setPickerOpen((current) => !current)}
        >
          {pickerOpen ? "Cerrar" : "Biblioteca"}
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border bg-ui-bg-subtle">
        <div className="aspect-video bg-ui-bg-subtle">
          {value ? (
            <AssetPreviewImage
              src={resolveAdminAssetPreviewUrl(value)}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-4">
              <Text size="small" className="text-ui-fg-subtle">
                Sin imagen
              </Text>
            </div>
          )}
        </div>
        <div className="grid gap-2 border-t bg-ui-bg-base p-3">
          <Input value={value} onChange={(event) => onChange(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="small"
              variant="secondary"
              onClick={() => setPickerOpen((current) => !current)}
            >
              {pickerOpen ? "Cerrar biblioteca" : "Cambiar imagen"}
            </Button>
            {value ? (
              <Button
                type="button"
                size="small"
                variant="transparent"
                onClick={() => onChange("")}
              >
                Quitar
              </Button>
            ) : null}
          </div>
          <Label>
            <span className="mb-2 block text-ui-fg-subtle">Subir imagen</span>
            <Input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              disabled={uploading || uploadAsset.isPending}
              onChange={handleUpload}
            />
          </Label>
          {(uploading || uploadAsset.isPending) && (
            <Text size="small" className="text-ui-fg-subtle">
              Subiendo imagen...
            </Text>
          )}
        </div>
      </div>

      {pickerOpen && (
        <div className="rounded-lg border bg-ui-bg-base p-3">
          <div className="mb-3">
            <Input
              value={assetSearch}
              placeholder="Buscar en biblioteca..."
              onChange={(event) => setAssetSearch(event.target.value)}
            />
          </div>
          {isPending ? (
            <Text size="small" className="text-ui-fg-subtle">
              Cargando assets...
            </Text>
          ) : filteredAssets.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
              {filteredAssets.map((asset) => (
                <AssetTile
                  key={asset.id || asset.url}
                  asset={asset}
                  selected={value === asset.url}
                  onSelect={() => {
                    onChange(asset.url);
                    setPickerOpen(false);
                  }}
                />
              ))}
            </div>
          ) : (
            <Text size="small" className="text-ui-fg-subtle">
              No hay assets que coincidan. Ajusta la búsqueda o sube uno nuevo.
            </Text>
          )}
        </div>
      )}
    </div>
  );
};

const AssetTile = ({
  asset,
  selected,
  onSelect,
}: {
  asset: AdminAsset;
  selected: boolean;
  onSelect: () => void;
}) => (
  <button
    type="button"
    onClick={onSelect}
    className={[
      "overflow-hidden rounded-lg border text-left transition hover:bg-ui-bg-component-hover",
      selected ? "border-ui-border-interactive" : "border-ui-border-base",
    ].join(" ")}
  >
    <div className="aspect-[4/3] bg-ui-bg-subtle">
      <AssetPreviewImage
        src={resolveAdminAssetPreviewUrl(asset.url)}
        alt={asset.alt || asset.label}
        className="h-full w-full object-cover"
      />
    </div>
    <div className="p-2">
      <Text size="xsmall" weight="plus" className="truncate">
        {asset.label}
      </Text>
    </div>
  </button>
);

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
      <div className="grid h-full w-full place-items-center p-4">
        <div className="grid gap-2 text-center">
          <Photo className="mx-auto text-ui-fg-muted" />
          <Text size="xsmall" className="text-ui-fg-subtle">
            Sin vista previa
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

const TextField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="grid gap-2">
    <Label>{label}</Label>
    <Input value={value} onChange={(event) => onChange(event.target.value)} />
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

const VisibilityToggle = ({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-3 rounded-md border bg-ui-bg-subtle px-3 py-2">
    <div>
      <Text size="small" leading="compact" weight="plus">
        {label}
      </Text>
      <Text size="xsmall" className="text-ui-fg-subtle">
        {checked ? "Se muestra en storefront" : "Oculto sin borrar contenido"}
      </Text>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

const PreviewCard = forwardRef<
  HTMLDivElement,
  {
  form: HomepageContent;
  warnings: string[];
  }
>(({ form, warnings }, ref) => (
  <div
    ref={ref}
    className="overflow-hidden rounded-lg border bg-ui-bg-base shadow-elevation-card-rest"
  >
    <div className="border-b p-4">
      <Text size="small" weight="plus">
        Preview home
      </Text>
      <Text size="small" className="text-ui-fg-subtle">
        Resumen visual de lo que estas editando.
      </Text>
    </div>
    <div className="grid gap-4 p-4">
      <div className="overflow-hidden rounded-lg border">
        <div className="aspect-video bg-ui-bg-subtle">
          {form.heroImage ? (
            <img
              src={resolveAdminAssetPreviewUrl(form.heroImage)}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className="grid gap-2 p-3">
          <div className="flex flex-wrap gap-2">
            <Badge size="xsmall">{form.heroBadgePrimary}</Badge>
            <Badge size="xsmall">{form.heroBadgeSecondary}</Badge>
          </div>
          <Text weight="plus">{form.heroTitle}</Text>
          <Text size="small" className="text-ui-fg-subtle">
            {form.heroBody}
          </Text>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {form.metrics
          .filter((metric) => !metric.isHidden)
          .slice(0, 3)
          .map((metric, index) => (
          <div key={`${metric.value}-${index}`} className="rounded border p-2">
            <Text size="small" weight="plus">
              {metric.value}
            </Text>
            <Text size="xsmall" className="text-ui-fg-subtle">
              {metric.label}
            </Text>
          </div>
        ))}
      </div>

      <div>
        <Text size="small" weight="plus">
          Categorías destacadas
        </Text>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {form.featuredCategories.slice(0, 4).map((category, index) => (
            <div key={`${category.handle}-${index}`} className="overflow-hidden rounded-md border">
              <div className="aspect-video bg-ui-bg-subtle">
                {category.image ? (
                  <img
                    src={resolveAdminAssetPreviewUrl(category.image)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="p-2">
                <Text size="xsmall" weight="plus" className="truncate">
                  {category.title}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </div>

      <PreviewList
        title="Bloques"
        items={[
          `${visibleCount(form.trustBlocks)}/${form.trustBlocks.length} confianza`,
          `${visibleCount(form.capabilityBlocks)}/${form.capabilityBlocks.length} soluciones`,
          `${visibleCount(form.detailBlocks)}/${form.detailBlocks.length} visuales`,
          `${form.operations.length} puntos B2B`,
        ]}
      />

      <div className="rounded-md border bg-ui-bg-subtle p-3">
        <div className="flex items-center justify-between gap-2">
          <Text size="small" weight="plus">
            Validación rápida
          </Text>
          <Badge size="xsmall">{warnings.length ? `${warnings.length} avisos` : "OK"}</Badge>
        </div>
        {warnings.length ? (
          <ul className="mt-2 grid gap-1">
            {warnings.slice(0, 6).map((warning) => (
              <li key={warning}>
                <Text size="xsmall" className="text-ui-fg-subtle">
                  {warning}
                </Text>
              </li>
            ))}
          </ul>
        ) : (
          <Text size="xsmall" className="mt-2 text-ui-fg-subtle">
            Imágenes, CTAs y textos principales listos para revisar en web.
          </Text>
        )}
      </div>
    </div>
  </div>
));

PreviewCard.displayName = "PreviewCard";

const PreviewList = ({ title, items }: { title: string; items: string[] }) => (
  <div>
    <Text size="small" weight="plus">
      {title}
    </Text>
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item} size="xsmall">
          {item}
        </Badge>
      ))}
    </div>
  </div>
);

const visibleCount = (items: Array<{ isHidden?: boolean }>) =>
  items.filter((item) => !item.isHidden).length;

export const config = defineRouteConfig({
  label: "Homepage",
  icon: Photo,
});

export default Homepage;
