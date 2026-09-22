import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Buildings, Plus, Trash } from "@medusajs/icons";
import {
  Button,
  Container,
  Heading,
  IconButton,
  Input,
  Label,
  Text,
  Textarea,
  Toaster,
  toast,
} from "@medusajs/ui";
import { useEffect, useMemo, useState } from "react";
import {
  BrandProfileContent,
  DEFAULT_BRAND_PROFILE_CONTENT,
} from "../../../modules/brand-profile/defaults";
import {
  useBrandProfileContent,
  useUpdateBrandProfileContent,
} from "../../hooks/api/brand-profile";
import { AssetPickerField } from "../../components/assets/asset-picker-field";

type LinkItem = BrandProfileContent["navigation"]["main"][number];
type FooterColumn = BrandProfileContent["footer"]["columns"][number];
type SupportPanel = NonNullable<
  NonNullable<BrandProfileContent["productPage"]>["supportPanels"]
>[number];
type LinkFieldValue = string | boolean | LinkItem[];

const cloneProfile = (content: BrandProfileContent): BrandProfileContent =>
  JSON.parse(JSON.stringify(content));

const toPrettyJson = (value: unknown) => JSON.stringify(value, null, 2);

const createNavigationLink = (label = "Nuevo link"): LinkItem => ({
  label,
  href: "/store",
  enabled: true,
  children: [],
});

const normalizeLink = (link: LinkItem): LinkItem => ({
  ...link,
  enabled: link.enabled !== false,
  children: (link.children || []).map(normalizeLink),
});

const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number) => {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);
  return nextItems;
};

const BrandProfile = () => {
  const { data, isPending } = useBrandProfileContent();
  const [form, setForm] = useState<BrandProfileContent>(
    cloneProfile(DEFAULT_BRAND_PROFILE_CONTENT)
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [draggedNavigationIndex, setDraggedNavigationIndex] = useState<
    number | null
  >(null);
  const [draggedChildIndex, setDraggedChildIndex] = useState<{
    parentIndex: number;
    childIndex: number;
  } | null>(null);
  const [jsonValue, setJsonValue] = useState(
    toPrettyJson(DEFAULT_BRAND_PROFILE_CONTENT)
  );

  const updateBrandProfile = useUpdateBrandProfileContent({
    onSuccess: () => toast.success("Perfil de marca actualizado"),
    onError: (error) =>
      toast.error(error.message || "No se pudo guardar el perfil de marca"),
  });

  useEffect(() => {
    if (data?.brand_profile) {
      const nextProfile = cloneProfile(data.brand_profile);
      nextProfile.navigation.main = nextProfile.navigation.main.map(
        normalizeLink
      );
      setForm(nextProfile);
      setJsonValue(toPrettyJson(nextProfile));
    }
  }, [data?.brand_profile]);

  const previewLinks = useMemo(
    () => form.navigation.main.map((link) => `${link.label} -> ${link.href}`),
    [form.navigation.main]
  );

  const updateBrand = (
    field: keyof BrandProfileContent["brand"],
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      brand: {
        ...current.brand,
        [field]: value,
      },
    }));
  };

  const updateLogo = (
    field: keyof BrandProfileContent["brand"]["logo"],
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      brand: {
        ...current.brand,
        logo: {
          ...current.brand.logo,
          [field]: value,
        },
      },
    }));
  };

  const updateColor = (
    field: keyof BrandProfileContent["brand"]["colors"],
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      brand: {
        ...current.brand,
        colors: {
          ...current.brand.colors,
          [field]: value,
        },
      },
    }));
  };

  const updateSeo = (
    field: keyof BrandProfileContent["seo"],
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      seo: {
        ...current.seo,
        [field]: value,
      },
    }));
  };

  const updateMarkets = (
    field: keyof BrandProfileContent["markets"],
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      markets: {
        ...current.markets,
        [field]:
          field === "languages"
            ? value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
            : value,
      },
    }));
  };

  const updateNavigation = (
    index: number,
    field: keyof LinkItem,
    value: LinkFieldValue
  ) => {
    setForm((current) => ({
      ...current,
      navigation: {
        main: current.navigation.main.map((link, linkIndex) =>
          linkIndex === index ? { ...link, [field]: value } : link
        ),
      },
    }));
  };

  const addNavigation = () => {
    setForm((current) => ({
      ...current,
      navigation: {
        main: [...current.navigation.main, createNavigationLink("Nuevo")],
      },
    }));
  };

  const moveNavigation = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) {
      return;
    }

    setForm((current) => ({
      ...current,
      navigation: {
        main: moveItem(current.navigation.main, fromIndex, toIndex),
      },
    }));
  };

  const removeNavigation = (index: number) => {
    setForm((current) => ({
      ...current,
      navigation: {
        main: current.navigation.main.filter(
          (_, linkIndex) => linkIndex !== index
        ),
      },
    }));
  };

  const updateNavigationChild = (
    parentIndex: number,
    childIndex: number,
    field: keyof LinkItem,
    value: LinkFieldValue
  ) => {
    setForm((current) => ({
      ...current,
      navigation: {
        main: current.navigation.main.map((link, linkIndex) =>
          linkIndex === parentIndex
            ? {
                ...link,
                children: (link.children || []).map((child, currentChildIndex) =>
                  currentChildIndex === childIndex
                    ? { ...child, [field]: value }
                    : child
                ),
              }
            : link
        ),
      },
    }));
  };

  const addNavigationChild = (parentIndex: number) => {
    setForm((current) => ({
      ...current,
      navigation: {
        main: current.navigation.main.map((link, linkIndex) =>
          linkIndex === parentIndex
            ? {
                ...link,
                children: [
                  ...(link.children || []),
                  createNavigationLink("Nuevo subenlace"),
                ],
              }
            : link
        ),
      },
    }));
  };

  const moveNavigationChild = (
    parentIndex: number,
    fromIndex: number,
    toIndex: number
  ) => {
    if (fromIndex === toIndex) {
      return;
    }

    setForm((current) => ({
      ...current,
      navigation: {
        main: current.navigation.main.map((link, linkIndex) =>
          linkIndex === parentIndex
            ? {
                ...link,
                children: moveItem(link.children || [], fromIndex, toIndex),
              }
            : link
        ),
      },
    }));
  };

  const removeNavigationChild = (parentIndex: number, childIndex: number) => {
    setForm((current) => ({
      ...current,
      navigation: {
        main: current.navigation.main.map((link, linkIndex) =>
          linkIndex === parentIndex
            ? {
                ...link,
                children: (link.children || []).filter(
                  (_, currentChildIndex) => currentChildIndex !== childIndex
                ),
              }
            : link
        ),
      },
    }));
  };

  const updateFooterDescription = (value: string) => {
    setForm((current) => ({
      ...current,
      footer: {
        ...current.footer,
        description: value,
      },
    }));
  };

  const updateFooterColumn = (
    index: number,
    field: keyof Pick<FooterColumn, "title">,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      footer: {
        ...current.footer,
        columns: current.footer.columns.map((column, columnIndex) =>
          columnIndex === index ? { ...column, [field]: value } : column
        ),
      },
    }));
  };

  const addFooterColumn = () => {
    setForm((current) => ({
      ...current,
      footer: {
        ...current.footer,
        columns: [
          ...current.footer.columns,
          {
            title: "Nueva columna",
            links: [{ label: "Catálogo", href: "/store" }],
          },
        ],
      },
    }));
  };

  const removeFooterColumn = (index: number) => {
    setForm((current) => ({
      ...current,
      footer: {
        ...current.footer,
        columns: current.footer.columns.filter(
          (_, columnIndex) => columnIndex !== index
        ),
      },
    }));
  };

  const updateFooterLink = (
    columnIndex: number,
    linkIndex: number,
    field: keyof LinkItem,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      footer: {
        ...current.footer,
        columns: current.footer.columns.map((column, currentColumnIndex) =>
          currentColumnIndex === columnIndex
            ? {
                ...column,
                links: column.links.map((link, currentLinkIndex) =>
                  currentLinkIndex === linkIndex
                    ? { ...link, [field]: value }
                    : link
                ),
              }
            : column
        ),
      },
    }));
  };

  const addFooterLink = (columnIndex: number) => {
    setForm((current) => ({
      ...current,
      footer: {
        ...current.footer,
        columns: current.footer.columns.map((column, currentColumnIndex) =>
          currentColumnIndex === columnIndex
            ? {
                ...column,
                links: [
                  ...column.links,
                  { label: "Nuevo link", href: "/store" },
                ],
              }
            : column
        ),
      },
    }));
  };

  const removeFooterLink = (columnIndex: number, linkIndex: number) => {
    setForm((current) => ({
      ...current,
      footer: {
        ...current.footer,
        columns: current.footer.columns.map((column, currentColumnIndex) =>
          currentColumnIndex === columnIndex
            ? {
                ...column,
                links: column.links.filter(
                  (_, currentLinkIndex) => currentLinkIndex !== linkIndex
                ),
              }
            : column
        ),
      },
    }));
  };

  const updateFallbacks = (
    field: keyof BrandProfileContent["fallbacks"],
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      fallbacks: {
        ...current.fallbacks,
        [field]:
          field === "productBrandKeywords"
            ? value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
            : value,
      },
    }));
  };

  const updateBenefit = (index: number, value: string) => {
    setForm((current) => ({
      ...current,
      productPage: {
        ...current.productPage,
        benefits: (current.productPage?.benefits || []).map(
          (benefit, itemIndex) =>
            itemIndex === index ? { ...benefit, label: value } : benefit
        ),
      },
    }));
  };

  const addBenefit = () => {
    setForm((current) => ({
      ...current,
      productPage: {
        ...current.productPage,
        benefits: [
          ...(current.productPage?.benefits || []),
          { label: "Nuevo beneficio" },
        ],
      },
    }));
  };

  const removeBenefit = (index: number) => {
    setForm((current) => ({
      ...current,
      productPage: {
        ...current.productPage,
        benefits: (current.productPage?.benefits || []).filter(
          (_, itemIndex) => itemIndex !== index
        ),
      },
    }));
  };

  const updateSupportPanel = (
    index: number,
    field: keyof SupportPanel,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      productPage: {
        ...current.productPage,
        supportPanels: (current.productPage?.supportPanels || []).map(
          (panel, itemIndex) =>
            itemIndex === index ? { ...panel, [field]: value } : panel
        ),
      },
    }));
  };

  const addSupportPanel = () => {
    setForm((current) => ({
      ...current,
      productPage: {
        ...current.productPage,
        supportPanels: [
          ...(current.productPage?.supportPanels || []),
          {
            title: "Nuevo panel",
            body: "Descripción del soporte.",
            action: "Ver más",
            href: "/store",
          },
        ],
      },
    }));
  };

  const removeSupportPanel = (index: number) => {
    setForm((current) => ({
      ...current,
      productPage: {
        ...current.productPage,
        supportPanels: (current.productPage?.supportPanels || []).filter(
          (_, itemIndex) => itemIndex !== index
        ),
      },
    }));
  };

  const applyJsonToForm = () => {
    try {
      const parsed = JSON.parse(jsonValue) as BrandProfileContent;
      const nextProfile = cloneProfile(parsed);
      nextProfile.navigation.main = nextProfile.navigation.main.map(
        normalizeLink
      );
      setForm(nextProfile);
      toast.success("JSON aplicado al formulario");
    } catch {
      toast.error("El JSON del perfil de marca no es valido");
    }
  };

  const syncJsonFromForm = () => {
    setJsonValue(toPrettyJson(form));
    toast.success("JSON actualizado desde el formulario");
  };

  const handleSubmit = () => {
    if (!form.brand.name || !form.seo.title) {
      toast.error("Marca y título SEO son obligatorios");
      return;
    }

    if (!form.navigation.main.length) {
      toast.error("Añade al menos un enlace de navegación");
      return;
    }

    if (!form.navigation.main.some((link) => link.enabled !== false)) {
      toast.error("Activa al menos un enlace de navegación");
      return;
    }

    if (!form.footer.columns.length) {
      toast.error("Añade al menos una columna de footer");
      return;
    }

    updateBrandProfile.mutate(form);
  };

  return (
    <>
      <Container className="flex flex-col p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <Heading className="font-sans font-medium h1-core">
              Brand profile
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Edita identidad, SEO, navegación, footer y fallbacks de producto.
            </Text>
          </div>
          <Button
            size="small"
            onClick={handleSubmit}
            isLoading={updateBrandProfile.isPending}
            disabled={isPending}
          >
            Guardar cambios
          </Button>
        </div>

        <div className="grid gap-6 p-6 small:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-6">
            <Section title="Identidad">
              <div className="grid gap-3 small:grid-cols-2">
                <TextField
                  label="Nombre comercial"
                  value={form.brand.name}
                  onChange={(value) => updateBrand("name", value)}
                />
                <TextField
                  label="Nombre legal"
                  value={form.brand.legalName}
                  onChange={(value) => updateBrand("legalName", value)}
                />
              </div>
              <TextAreaField
                label="Tagline"
                value={form.brand.tagline}
                rows={2}
                onChange={(value) => updateBrand("tagline", value)}
              />
              <div className="grid gap-3 small:grid-cols-2">
                <AssetPickerField
                  label="Logo claro"
                  value={form.brand.logo.light}
                  profileId={form.id || "ngs"}
                  preferredType="logo"
                  onChange={(value) => updateLogo("light", value)}
                />
                <AssetPickerField
                  label="Logo oscuro"
                  value={form.brand.logo.dark}
                  profileId={form.id || "ngs"}
                  preferredType="logo"
                  onChange={(value) => updateLogo("dark", value)}
                />
              </div>
              <div className="grid gap-3 small:grid-cols-3">
                {Object.entries(form.brand.colors).map(([key, value]) => (
                  <ColorField
                    key={key}
                    label={key}
                    value={value}
                    onChange={(nextValue) =>
                      updateColor(
                        key as keyof BrandProfileContent["brand"]["colors"],
                        nextValue
                      )
                    }
                  />
                ))}
              </div>
            </Section>

            <Section title="SEO y mercado">
              <TextField
                label="Título SEO"
                value={form.seo.title}
                onChange={(value) => updateSeo("title", value)}
              />
              <TextAreaField
                label="Descripción SEO"
                value={form.seo.description}
                rows={3}
                onChange={(value) => updateSeo("description", value)}
              />
              <div className="grid gap-3 small:grid-cols-3">
                <TextField
                  label="País por defecto"
                  value={form.markets.defaultCountryCode}
                  onChange={(value) =>
                    updateMarkets("defaultCountryCode", value)
                  }
                />
                <TextField
                  label="Idiomás"
                  value={form.markets.languages.join(", ")}
                  onChange={(value) => updateMarkets("languages", value)}
                />
                <TextField
                  label="Moneda"
                  value={form.markets.currency}
                  onChange={(value) => updateMarkets("currency", value)}
                />
              </div>
            </Section>

            <Section
              title="Navegación"
              actionLabel="Añadir enlace"
              onAction={addNavigation}
            >
              <div className="grid gap-3">
                {form.navigation.main.map((link, index) => (
                  <NavigationEditorRow
                    key={`navigation-${index}`}
                    link={link}
                    index={index}
                    draggable
                    isDragging={draggedNavigationIndex === index}
                    onDragStart={() => setDraggedNavigationIndex(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (draggedNavigationIndex !== null) {
                        moveNavigation(draggedNavigationIndex, index);
                      }
                      setDraggedNavigationIndex(null);
                    }}
                    onToggle={() =>
                      updateNavigation(index, "enabled", link.enabled === false)
                    }
                    onRemove={() => removeNavigation(index)}
                    removeDisabled={form.navigation.main.length === 1}
                    onChange={(field, value) =>
                      updateNavigation(index, field, value)
                    }
                    onAddChild={() => addNavigationChild(index)}
                  >
                    {(link.children || []).map((child, childIndex) => (
                      <NavigationEditorRow
                        key={`navigation-${index}-child-${childIndex}`}
                        link={child}
                        index={childIndex}
                        level="child"
                        draggable
                        isDragging={
                          draggedChildIndex?.parentIndex === index &&
                          draggedChildIndex.childIndex === childIndex
                        }
                        onDragStart={() =>
                          setDraggedChildIndex({
                            parentIndex: index,
                            childIndex,
                          })
                        }
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (draggedChildIndex?.parentIndex === index) {
                            moveNavigationChild(
                              index,
                              draggedChildIndex.childIndex,
                              childIndex
                            );
                          }
                          setDraggedChildIndex(null);
                        }}
                        onToggle={() =>
                          updateNavigationChild(
                            index,
                            childIndex,
                            "enabled",
                            child.enabled === false
                          )
                        }
                        onRemove={() =>
                          removeNavigationChild(index, childIndex)
                        }
                        onChange={(field, value) =>
                          updateNavigationChild(index, childIndex, field, value)
                        }
                      />
                    ))}
                  </NavigationEditorRow>
                ))}
              </div>
            </Section>

            <Section
              title="Footer"
              actionLabel="Añadir columna"
              onAction={addFooterColumn}
            >
              <TextAreaField
                label="Descripción"
                value={form.footer.description}
                rows={3}
                onChange={updateFooterDescription}
              />
              <div className="grid gap-3">
                {form.footer.columns.map((column, columnIndex) => (
                  <EditableRow
                    key={`footer-column-${columnIndex}`}
                    title={`Columna ${columnIndex + 1}`}
                    onRemove={() => removeFooterColumn(columnIndex)}
                    removeDisabled={form.footer.columns.length === 1}
                  >
                    <TextField
                      label="Título"
                      value={column.title}
                      onChange={(value) =>
                        updateFooterColumn(columnIndex, "title", value)
                      }
                    />
                    <div className="grid gap-2">
                      {column.links.map((link, linkIndex) => (
                        <div
                          key={`footer-${columnIndex}-${linkIndex}`}
                          className="grid gap-2 rounded-lg border bg-ui-bg-base p-3"
                        >
                          <div className="flex items-center justify-between">
                            <Text size="small" weight="plus">
                              Link {linkIndex + 1}
                            </Text>
                            <IconButton
                              size="small"
                              variant="transparent"
                              disabled={column.links.length === 1}
                              onClick={() =>
                                removeFooterLink(columnIndex, linkIndex)
                              }
                            >
                              <Trash />
                            </IconButton>
                          </div>
                          <LinkFields
                            link={link}
                            onChange={(field, value) =>
                              updateFooterLink(
                                columnIndex,
                                linkIndex,
                                field,
                                value
                              )
                            }
                          />
                        </div>
                      ))}
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() => addFooterLink(columnIndex)}
                      >
                        <Plus />
                        Añadir link
                      </Button>
                    </div>
                  </EditableRow>
                ))}
              </div>
            </Section>

            <Section title="Fallbacks de producto">
              <div className="grid gap-3 small:grid-cols-2">
                <TextField
                  label="Etiqueta categoría fallback"
                  value={form.fallbacks.productCategoryLabel}
                  onChange={(value) =>
                    updateFallbacks("productCategoryLabel", value)
                  }
                />
                <TextField
                  label="Keywords de producto"
                  value={form.fallbacks.productBrandKeywords.join(", ")}
                  onChange={(value) =>
                    updateFallbacks("productBrandKeywords", value)
                  }
                />
              </div>
              <TextAreaField
                label="Descripción técnica fallback"
                value={form.fallbacks.productTechnicalDescription}
                rows={3}
                onChange={(value) =>
                  updateFallbacks("productTechnicalDescription", value)
                }
              />
            </Section>

            <Section
              title="Beneficios PDP"
              actionLabel="Añadir beneficio"
              onAction={addBenefit}
            >
              <div className="grid gap-3">
                {(form.productPage?.benefits || []).map((benefit, index) => (
                  <EditableRow
                    key={`benefit-${index}`}
                    title={`Beneficio ${index + 1}`}
                    onRemove={() => removeBenefit(index)}
                    removeDisabled={
                      (form.productPage?.benefits || []).length === 1
                    }
                  >
                    <TextField
                      label="Texto"
                      value={benefit.label}
                      onChange={(value) => updateBenefit(index, value)}
                    />
                  </EditableRow>
                ))}
              </div>
            </Section>

            <Section
              title="Paneles soporte PDP"
              actionLabel="Añadir panel"
              onAction={addSupportPanel}
            >
              <div className="grid gap-3">
                {(form.productPage?.supportPanels || []).map((panel, index) => (
                  <EditableRow
                    key={`support-panel-${index}`}
                    title={`Panel ${index + 1}`}
                    onRemove={() => removeSupportPanel(index)}
                    removeDisabled={
                      (form.productPage?.supportPanels || []).length === 1
                    }
                  >
                    <div className="grid gap-3 small:grid-cols-2">
                      <TextField
                        label="Título"
                        value={panel.title}
                        onChange={(value) =>
                          updateSupportPanel(index, "title", value)
                        }
                      />
                      <TextField
                        label="CTA"
                        value={panel.action}
                        onChange={(value) =>
                          updateSupportPanel(index, "action", value)
                        }
                      />
                      <TextField
                        label="Link"
                        value={panel.href || ""}
                        onChange={(value) =>
                          updateSupportPanel(index, "href", value)
                        }
                      />
                    </div>
                    <TextAreaField
                      label="Texto"
                      value={panel.body}
                      rows={3}
                      onChange={(value) =>
                        updateSupportPanel(index, "body", value)
                      }
                    />
                  </EditableRow>
                ))}
              </div>
            </Section>

            <Section title="Avanzado">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => setShowAdvanced((current) => !current)}
                >
                  {showAdvanced ? "Ocultar JSON" : "Mostrar JSON"}
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={syncJsonFromForm}
                >
                  Actualizar JSON desde formulario
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={applyJsonToForm}
                >
                  Aplicar JSON al formulario
                </Button>
              </div>
              {showAdvanced ? (
                <Textarea
                  rows={20}
                  value={jsonValue}
                  onChange={(event) => setJsonValue(event.target.value)}
                  className="font-mono"
                />
              ) : null}
            </Section>
          </div>

          <div className="h-fit rounded-lg border bg-ui-bg-base overflow-hidden">
            <div className="border-b p-4">
              <Text size="small" weight="plus">
                Vista rápida
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                Preview de identidad, navegación y SEO.
              </Text>
            </div>
            <div className="grid gap-4 p-4">
              <div
                className="rounded-lg border p-4"
                style={{
                  background: form.brand.colors.background,
                  color: form.brand.colors.foreground,
                  borderColor: form.brand.colors.border,
                }}
              >
                <Text weight="plus">{form.brand.name}</Text>
                <Text size="small" className="mt-1">
                  {form.brand.tagline}
                </Text>
              </div>
              <PreviewList title="Navegación" items={previewLinks} />
              <PreviewList
                title="Footer"
                items={form.footer.columns.map(
                  (column) => `${column.title} (${column.links.length})`
                )}
              />
              <PreviewList
                title="SEO"
                items={[form.seo.title, form.seo.description]}
              />
              <PreviewList
                title="PDP"
                items={[
                  `${form.productPage?.benefits?.length || 0} beneficios`,
                  `${form.productPage?.supportPanels?.length || 0} paneles`,
                ]}
              />
            </div>
          </div>
        </div>
      </Container>
      <Toaster />
    </>
  );
};

const Section = ({
  title,
  children,
  actionLabel,
  onAction,
}: {
  title: string;
  children: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <div className="grid gap-4 rounded-lg border p-4">
    <div className="flex items-center justify-between gap-3">
      <Text size="small" leading="compact" weight="plus">
        {title}
      </Text>
      {onAction ? (
        <Button size="small" variant="secondary" onClick={onAction}>
          <Plus />
          {actionLabel}
        </Button>
      ) : null}
    </div>
    <div className="grid gap-3">{children}</div>
  </div>
);

const EditableRow = ({
  title,
  children,
  removeDisabled,
  onRemove,
}: {
  title: string;
  children: React.ReactNode;
  removeDisabled?: boolean;
  onRemove: () => void;
}) => (
  <div className="grid gap-3 rounded-lg border bg-ui-bg-subtle p-3">
    <div className="flex items-center justify-between gap-3">
      <Text size="small" leading="compact" weight="plus">
        {title}
      </Text>
      <IconButton
        size="small"
        variant="transparent"
        disabled={removeDisabled}
        onClick={onRemove}
      >
        <Trash />
      </IconButton>
    </div>
    {children}
  </div>
);

const NavigationEditorRow = ({
  link,
  index,
  level = "parent",
  children,
  draggable,
  isDragging,
  removeDisabled,
  onChange,
  onToggle,
  onRemove,
  onAddChild,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  link: LinkItem;
  index: number;
  level?: "parent" | "child";
  children?: React.ReactNode;
  draggable?: boolean;
  isDragging?: boolean;
  removeDisabled?: boolean;
  onChange: (field: keyof LinkItem, value: LinkFieldValue) => void;
  onToggle: () => void;
  onRemove: () => void;
  onAddChild?: () => void;
  onDragStart?: () => void;
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: () => void;
}) => {
  const enabled = link.enabled !== false;

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={[
        "grid gap-3 rounded-lg border p-3 transition",
        level === "child" ? "bg-ui-bg-base" : "bg-ui-bg-subtle",
        enabled ? "" : "opacity-60",
        isDragging ? "border-ui-border-interactive shadow-elevation-card-hover" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="cursor-grab rounded border bg-ui-bg-base px-2 py-1 text-xs text-ui-fg-subtle">
            Arrastrar
          </span>
          <Text size="small" leading="compact" weight="plus">
            {level === "parent" ? `Enlace ${index + 1}` : `Subenlace ${index + 1}`}
          </Text>
          <span
            className={[
              "rounded border px-2 py-1 text-xs",
              enabled
                ? "border-ui-border-base text-ui-fg-subtle"
                : "border-ui-border-error text-ui-fg-error",
            ].join(" ")}
          >
            {enabled ? "Activo" : "Inactivo"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onAddChild ? (
            <Button size="small" variant="secondary" onClick={onAddChild}>
              <Plus />
              Subenlace
            </Button>
          ) : null}
          <Button size="small" variant="secondary" onClick={onToggle}>
            {enabled ? "Desactivar" : "Activar"}
          </Button>
          <IconButton
            size="small"
            variant="transparent"
            disabled={removeDisabled}
            onClick={onRemove}
          >
            <Trash />
          </IconButton>
        </div>
      </div>
      <LinkFields link={link} onChange={onChange} />
      {children ? (
        <div className="ml-0 grid gap-2 border-l pl-3 small:ml-4">
          {children}
        </div>
      ) : null}
    </div>
  );
};

const LinkFields = ({
  link,
  onChange,
}: {
  link: LinkItem;
  onChange: (field: keyof LinkItem, value: LinkFieldValue) => void;
}) => (
  <div className="grid gap-3 small:grid-cols-2">
    <TextField
      label="Etiqueta"
      value={link.label}
      onChange={(value) => onChange("label", value)}
    />
    <TextField
      label="URL"
      value={link.href}
      onChange={(value) => onChange("href", value)}
    />
  </div>
);

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

const ColorField = ({
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
    <div className="grid grid-cols-[44px_1fr] gap-2">
      <Input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
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

const PreviewList = ({ title, items }: { title: string; items: string[] }) => (
  <div>
    <Text size="small" weight="plus">
      {title}
    </Text>
    <div className="mt-2 grid gap-1">
      {items.map((item) => (
        <Text key={item} size="small" className="text-ui-fg-subtle">
          {item}
        </Text>
      ))}
    </div>
  </div>
);

export const config = defineRouteConfig({
  label: "Brand profile",
  icon: Buildings,
});

export default BrandProfile;
