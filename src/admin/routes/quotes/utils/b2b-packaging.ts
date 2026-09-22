type Metadata = Record<string, unknown> | null | undefined;

export type QuoteLineWithPackaging = {
  id?: string;
  title?: string;
  product_title?: string;
  variant_title?: string;
  variant_sku?: string | null;
  quantity?: number;
  unit_price?: number;
  total?: number;
  metadata?: Metadata;
};

export type QuoteLinePackaging = {
  purchaseUnit: "unit" | "box";
  packageQuantity: number;
  unitsPerBox: number;
  unitQuantity: number;
  boxesPerPallet?: number;
  packageWeight?: number;
  packageDimensions?: string;
  packageVolumeM3?: number;
  totalWeight?: number;
  volumetricWeight?: number;
  billableWeight?: number;
  palletShare?: number;
};

export type CarrierRateEstimate = {
  carrier: string;
  service: string;
  zone: string;
  transitDays: string;
  billableWeight: number;
  estimatedCost: number;
  notes: string;
  recommended?: boolean;
};

const toNumber = (value: unknown) => {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0
    ? Math.floor(numberValue)
    : undefined;
};

const getLineQuantity = (item: QuoteLineWithPackaging) =>
  Number(item.quantity || (item as any).detail?.quantity || 0);

const parseDimensionsMm = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  const parts = value
    .toLowerCase()
    .replace(/mm|cm|m/g, "")
    .split(/[x×*]/)
    .map((part) => Number(part.trim().replace(",", ".")))
    .filter((part) => Number.isFinite(part) && part > 0);

  if (parts.length < 3) {
    return undefined;
  }

  const [length, width, height] = parts;

  return {
    length,
    width,
    height,
    volumeM3: (length * width * height) / 1_000_000_000,
  };
};

export const getQuoteLinePackaging = (
  metadata: Metadata,
  quantity: number
): QuoteLinePackaging | undefined => {
  const purchaseUnit = metadata?.purchase_unit;
  const unitsPerBox = toNumber(metadata?.units_per_box);
  const rawPackageQuantity = toNumber(metadata?.package_quantity);
  const packageWeight = toNumber(metadata?.package_weight);
  const boxesPerPallet = toNumber(metadata?.boxes_per_pallet);
  const packageDimensions =
    typeof metadata?.package_dimensions === "string"
      ? metadata.package_dimensions
      : undefined;

  if ((purchaseUnit !== "box" && purchaseUnit !== "unit") || !unitsPerBox) {
    return undefined;
  }

  if (purchaseUnit === "box" && !rawPackageQuantity) {
    return undefined;
  }

  const packageQuantity = purchaseUnit === "box" ? rawPackageQuantity ?? 0 : 0;
  const calculatedUnitQuantity =
    purchaseUnit === "box" && packageQuantity && unitsPerBox
      ? packageQuantity * unitsPerBox
      : quantity;
  const estimatedBoxes =
    purchaseUnit === "box" && packageQuantity
      ? packageQuantity
      : quantity / unitsPerBox;
  const dimensions = parseDimensionsMm(packageDimensions);
  const packageVolumeM3 = dimensions?.volumeM3;
  const totalWeight = packageWeight ? packageWeight * estimatedBoxes : undefined;
  const totalVolumeM3 = packageVolumeM3
    ? packageVolumeM3 * estimatedBoxes
    : undefined;
  const volumetricWeight = totalVolumeM3 ? totalVolumeM3 * 250 : undefined;
  const billableWeight =
    Math.max(totalWeight || 0, volumetricWeight || 0) || undefined;

  return {
    purchaseUnit,
    packageQuantity,
    unitsPerBox,
    unitQuantity: calculatedUnitQuantity,
    boxesPerPallet,
    packageWeight,
    packageDimensions,
    packageVolumeM3,
    totalWeight,
    volumetricWeight,
    billableWeight,
    palletShare: boxesPerPallet ? estimatedBoxes / boxesPerPallet : undefined,
  };
};

export const formatQuotePackagingLine = (packaging: QuoteLinePackaging) =>
  packaging.purchaseUnit === "unit"
    ? `${packaging.unitQuantity} uds sueltas`
    : `${packaging.packageQuantity} cajas x ${packaging.unitsPerBox} uds = ${packaging.unitQuantity} uds`;

export const formatQuotePackagingDetails = (packaging: QuoteLinePackaging) =>
  [
    packaging.totalWeight
      ? `${packaging.totalWeight.toFixed(1)} kg estimados`
      : null,
    packaging.packageDimensions,
    packaging.packageVolumeM3
      ? `${packaging.packageVolumeM3.toFixed(3)} m3/caja`
      : null,
    packaging.boxesPerPallet
      ? `${packaging.boxesPerPallet} cajas/pallet`
      : null,
  ]
    .filter(Boolean)
    .join(" - ");

export const getQuotePackagingSummary = (
  items: QuoteLineWithPackaging[] | null | undefined
) =>
  (items || []).reduce(
    (summary, item) => {
      const quantity = getLineQuantity(item);
      const packaging = getQuoteLinePackaging(item.metadata, quantity);

      if (!packaging) {
        summary.totalUnits += quantity;
        summary.looseUnits += quantity;
        return summary;
      }

      summary.totalUnits += packaging.unitQuantity;

      if (packaging.purchaseUnit === "box") {
        summary.boxes += packaging.packageQuantity;
        summary.boxedUnits += packaging.unitQuantity;
      } else {
        summary.looseUnits += packaging.unitQuantity;
      }

      summary.estimatedWeight += packaging.totalWeight ?? 0;
      summary.estimatedVolume +=
        (packaging.packageVolumeM3 ?? 0) *
        (packaging.unitQuantity / packaging.unitsPerBox);
      summary.billableWeight += packaging.billableWeight ?? 0;

      if (packaging.palletShare) {
        summary.palletShare += packaging.palletShare;
      }

      return summary;
    },
    {
      boxes: 0,
      boxedUnits: 0,
      looseUnits: 0,
      totalUnits: 0,
      estimatedWeight: 0,
      estimatedVolume: 0,
      billableWeight: 0,
      palletShare: 0,
    }
  );

export const estimateShipmentMode = (summary: {
  boxes: number;
  palletShare: number;
  estimatedWeight: number;
  billableWeight: number;
}) => {
  if (summary.palletShare >= 0.75 || summary.billableWeight >= 120) {
    return "Pallet / carga parcial";
  }

  if (summary.boxes >= 4 || summary.billableWeight >= 35) {
    return "Paqueteria multi-bulto";
  }

  return "Paqueteria estandar";
};

export const estimateFreightCost = (summary: {
  boxes: number;
  palletShare: number;
  billableWeight: number;
}) => {
  return getRecommendedCarrierRate(summary)?.estimatedCost ?? 0;
};

export const estimateCarrierRates = (
  summary: {
    boxes: number;
    palletShare: number;
    estimatedWeight?: number;
    billableWeight: number;
  },
  zone = "Peninsula"
): CarrierRateEstimate[] => {
  const billableWeight = Math.max(summary.billableWeight || 0, 1);
  const boxes = Math.max(summary.boxes || 0, 1);
  const palletCount = Math.max(Math.ceil(summary.palletShare || 0), 0);
  const isPallet = summary.palletShare >= 0.75 || billableWeight >= 120;
  const isMultiParcel = summary.boxes >= 4 || billableWeight >= 35;
  const lowerZone = zone.toLowerCase();
  const zoneMultiplier =
    lowerZone.includes("canarias") || lowerZone.includes("internacional")
      ? 1.85
      : lowerZone.includes("baleares")
        ? 1.35
        : 1;

  const rates: CarrierRateEstimate[] = [
    {
      carrier: "SEUR Industrial",
      service: isPallet
        ? "Pallet 24/48h"
        : isMultiParcel
          ? "Multi-bulto"
          : "Paqueteria 24h",
      zone,
      transitDays: zoneMultiplier > 1.3 ? "48-96h" : "24-48h",
      billableWeight,
      estimatedCost: Math.round(
        (9.5 + boxes * 3.2 + billableWeight * 0.28) * zoneMultiplier
      ),
      notes: "Mejor opcion para bulto pequeno y entregas rápidas.",
      recommended: !isPallet && !isMultiParcel,
    },
    {
      carrier: "DHL Freight",
      service: isPallet ? "EuroConnect pallet" : "Parcel Connect B2B",
      zone,
      transitDays: zoneMultiplier > 1.3 ? "72-120h" : "48-72h",
      billableWeight,
      estimatedCost: Math.round(
        (18 + boxes * 4.4 + billableWeight * 0.24) * zoneMultiplier
      ),
      notes: "Equilibrio para multi-bulto y entregas regionales.",
      recommended: isMultiParcel && !isPallet,
    },
    {
      carrier: "DB Schenker",
      service: "Pallet System",
      zone,
      transitDays: zoneMultiplier > 1.3 ? "72-120h" : "48-96h",
      billableWeight,
      estimatedCost: Math.round(
        (62 + Math.max(palletCount, 1) * 48 + billableWeight * 0.18) *
          zoneMultiplier
      ),
      notes: "Recomendado para pallet, volumen alto o carga parcial.",
      recommended: isPallet,
    },
  ];

  if (!rates.some((rate) => rate.recommended)) {
    const cheapest = rates.reduce((best, rate) =>
      rate.estimatedCost < best.estimatedCost ? rate : best
    );
    cheapest.recommended = true;
  }

  return rates.sort((left, right) => left.estimatedCost - right.estimatedCost);
};

export const getRecommendedCarrierRate = (
  summary: {
    boxes: number;
    palletShare: number;
    estimatedWeight?: number;
    billableWeight: number;
  },
  zone = "Peninsula"
) => {
  const rates = estimateCarrierRates(summary, zone);

  return rates.find((rate) => rate.recommended) || rates[0];
};

const escapeCsv = (value: unknown) => {
  const stringValue = String(value ?? "");

  if (
    stringValue.includes(",") ||
    stringValue.includes("\n") ||
    stringValue.includes('"')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

export const quoteItemsToCsv = (
  items: QuoteLineWithPackaging[] | null | undefined
) => {
  const headers = [
    "Item ID",
    "Product",
    "Variant",
    "SKU",
    "Quantity",
    "Unit Price",
    "Line Total",
    "Purchase Unit",
    "Packages",
    "Units Per Box",
    "Total Units",
    "Estimated Weight",
    "Package Dimensions",
    "Boxes Per Pallet",
  ];

  const rows = (items || []).map((item) => {
    const quantity = getLineQuantity(item);
    const packaging = getQuoteLinePackaging(item.metadata, quantity);

    return [
      item.id,
      item.product_title || item.title,
      item.variant_title,
      item.variant_sku,
      quantity,
      item.unit_price,
      item.total,
      packaging?.purchaseUnit ?? "unit",
      packaging?.packageQuantity ?? "",
      packaging?.unitsPerBox ?? "",
      packaging?.unitQuantity ?? item.quantity,
      packaging?.totalWeight ? packaging.totalWeight.toFixed(1) : "",
      packaging?.packageDimensions ?? "",
      packaging?.boxesPerPallet ?? "",
    ].map(escapeCsv);
  });

  return [headers, ...rows].map((row) => row.join(",")).join("\n");
};
