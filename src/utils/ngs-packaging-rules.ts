export type NgsPackagingRule = {
  sku: string;
  sales_unit: "unit" | "box";
  minimum_order_quantity: number;
  quantity_increment: number;
  units_per_box: number;
  boxes_per_pallet: number;
  package_weight: number;
  package_dimensions: string;
};

export const NGS_PACKAGING_RULES: NgsPackagingRule[] = [
  {
    sku: "NGS-WILD-SPACE-3-BLK",
    sales_unit: "box",
    minimum_order_quantity: 2,
    quantity_increment: 2,
    units_per_box: 1,
    boxes_per_pallet: 32,
    package_weight: 8.6,
    package_dimensions: "460 x 330 x 610 mm",
  },
  {
    sku: "NGS-WILD-SPACE-3-RED",
    sales_unit: "box",
    minimum_order_quantity: 2,
    quantity_increment: 2,
    units_per_box: 1,
    boxes_per_pallet: 32,
    package_weight: 8.6,
    package_dimensions: "460 x 330 x 610 mm",
  },
  {
    sku: "NGS-XPRESSCAM-1080-BLK",
    sales_unit: "box",
    minimum_order_quantity: 24,
    quantity_increment: 24,
    units_per_box: 24,
    boxes_per_pallet: 40,
    package_weight: 4.8,
    package_dimensions: "420 x 280 x 260 mm",
  },
  {
    sku: "NGS-XPRESSCAM-1080-WHT",
    sales_unit: "box",
    minimum_order_quantity: 24,
    quantity_increment: 24,
    units_per_box: 24,
    boxes_per_pallet: 40,
    package_weight: 4.8,
    package_dimensions: "420 x 280 x 260 mm",
  },
  {
    sku: "NGS-POWERPUMP-10W-PUR",
    sales_unit: "box",
    minimum_order_quantity: 12,
    quantity_increment: 12,
    units_per_box: 12,
    boxes_per_pallet: 64,
    package_weight: 5.4,
    package_dimensions: "360 x 240 x 220 mm",
  },
  {
    sku: "NGS-POWERPUMP-10W-RED",
    sales_unit: "box",
    minimum_order_quantity: 12,
    quantity_increment: 12,
    units_per_box: 12,
    boxes_per_pallet: 64,
    package_weight: 5.4,
    package_dimensions: "360 x 240 x 220 mm",
  },
  {
    sku: "NGS-GMX-27-WHT",
    sales_unit: "box",
    minimum_order_quantity: 2,
    quantity_increment: 2,
    units_per_box: 2,
    boxes_per_pallet: 12,
    package_weight: 14.2,
    package_dimensions: "720 x 180 x 520 mm",
  },
  {
    sku: "NGS-GMX-27-BLK",
    sales_unit: "box",
    minimum_order_quantity: 2,
    quantity_increment: 2,
    units_per_box: 2,
    boxes_per_pallet: 12,
    package_weight: 14.2,
    package_dimensions: "720 x 180 x 520 mm",
  },
  {
    sku: "NGS-GHX-600-BLK",
    sales_unit: "box",
    minimum_order_quantity: 10,
    quantity_increment: 10,
    units_per_box: 10,
    boxes_per_pallet: 48,
    package_weight: 6.1,
    package_dimensions: "580 x 390 x 340 mm",
  },
  {
    sku: "NGS-GHX-600-WHT",
    sales_unit: "box",
    minimum_order_quantity: 10,
    quantity_increment: 10,
    units_per_box: 10,
    boxes_per_pallet: 48,
    package_weight: 6.1,
    package_dimensions: "580 x 390 x 340 mm",
  },
  {
    sku: "NGS-FUNKY-KIT-BLK",
    sales_unit: "box",
    minimum_order_quantity: 12,
    quantity_increment: 12,
    units_per_box: 12,
    boxes_per_pallet: 32,
    package_weight: 10.8,
    package_dimensions: "640 x 430 x 360 mm",
  },
  {
    sku: "NGS-FUNKY-KIT-WHT",
    sales_unit: "box",
    minimum_order_quantity: 12,
    quantity_increment: 12,
    units_per_box: 12,
    boxes_per_pallet: 32,
    package_weight: 10.8,
    package_dimensions: "640 x 430 x 360 mm",
  },
  {
    sku: "NGS-EVO-MOUSE-BLK",
    sales_unit: "box",
    minimum_order_quantity: 24,
    quantity_increment: 24,
    units_per_box: 24,
    boxes_per_pallet: 72,
    package_weight: 4.2,
    package_dimensions: "430 x 300 x 250 mm",
  },
  {
    sku: "NGS-EVO-MOUSE-WHT",
    sales_unit: "box",
    minimum_order_quantity: 24,
    quantity_increment: 24,
    units_per_box: 24,
    boxes_per_pallet: 72,
    package_weight: 4.2,
    package_dimensions: "430 x 300 x 250 mm",
  },
  {
    sku: "NGS-WILD-BASH-COMPACT-BLK",
    sales_unit: "box",
    minimum_order_quantity: 6,
    quantity_increment: 6,
    units_per_box: 6,
    boxes_per_pallet: 36,
    package_weight: 7.9,
    package_dimensions: "520 x 360 x 330 mm",
  },
  {
    sku: "NGS-WILD-BASH-COMPACT-WHT",
    sales_unit: "box",
    minimum_order_quantity: 6,
    quantity_increment: 6,
    units_per_box: 6,
    boxes_per_pallet: 36,
    package_weight: 7.9,
    package_dimensions: "520 x 360 x 330 mm",
  },
];

export const getNgsPackagingRuleBySku = (sku?: string | null) => {
  if (!sku) {
    return undefined;
  }

  return NGS_PACKAGING_RULES.find((rule) => rule.sku === sku);
};

export const buildNgsPackagingFallback = (
  variant: { id: string; sku?: string | null }
) => {
  const rule = getNgsPackagingRuleBySku(variant.sku);

  if (!rule) {
    return undefined;
  }

  return {
    id: `ngs-default-${variant.id}`,
    variant_id: variant.id,
    sales_unit: rule.sales_unit,
    minimum_order_quantity: rule.minimum_order_quantity,
    quantity_increment: rule.quantity_increment,
    units_per_box: rule.units_per_box,
    boxes_per_pallet: rule.boxes_per_pallet,
    package_weight: rule.package_weight,
    package_dimensions: rule.package_dimensions,
  };
};
