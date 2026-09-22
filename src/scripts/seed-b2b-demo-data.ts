import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
} from "@medusajs/framework/utils";
import { createCartWorkflow } from "@medusajs/core-flows";
import { CATALOG_RULES_MODULE } from "../modules/catalog-rules";
import { COMPANY_MODULE } from "../modules/company";
import { PRODUCT_PACKAGING_MODULE } from "../modules/product-packaging";
import { QUOTE_MODULE } from "../modules/quote";
import { buildNgsPackagingFallback } from "../utils/ngs-packaging-rules";
import { createQuoteMessageWorkflow } from "../workflows/quote/workflows/create-quote-message";
import { createRequestForQuoteWorkflow } from "../workflows/quote/workflows/create-request-for-quote";
import { merchantSendQuoteWorkflow } from "../workflows/quote/workflows/merchant-send-quote";
import { customerAcceptQuoteWorkflow } from "../workflows/quote/workflows/customer-accept-quote";
import { createApprovalsWorkflow } from "../workflows/approval/workflows/create-approvals";
import { ApprovalType } from "../types";

type DemoCompany = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  segment: string;
  spendingLimit: number;
  taxId: string;
  onboardingStatus: "pending" | "approved" | "rejected";
  paymentTerms: "prepaid" | "bank_transfer" | "net_30" | "net_60" | "credit";
};

const demoCompanies: DemoCompany[] = [
  {
    name: "Iberia Pro Installers",
    email: "compras@iberia-pro-installers.demo",
    phone: "+34 910 000 101",
    address: "Calle de Alcala 125",
    city: "Madrid",
    state: "Madrid",
    zip: "28009",
    country: "ES",
    segment: "instalador",
    spendingLimit: 25000,
    taxId: "ESB88100101",
    onboardingStatus: "approved",
    paymentTerms: "net_30",
  },
  {
    name: "Distribuciones Norte Audio",
    email: "pedidos@dnaudio.demo",
    phone: "+34 944 000 202",
    address: "Gran Via 38",
    city: "Bilbao",
    state: "Bizkaia",
    zip: "48009",
    country: "ES",
    segment: "distribuidor",
    spendingLimit: 60000,
    taxId: "ESB48200202",
    onboardingStatus: "approved",
    paymentTerms: "net_60",
  },
  {
    name: "Retail Campus Group",
    email: "it-procurement@retail-campus.demo",
    phone: "+34 933 000 303",
    address: "Avinguda Diagonal 640",
    city: "Barcelona",
    state: "Barcelona",
    zip: "08017",
    country: "ES",
    segment: "cuenta_key",
    spendingLimit: 12000,
    taxId: "ESB08300303",
    onboardingStatus: "approved",
    paymentTerms: "bank_transfer",
  },
  {
    name: "Sergio Components Manufacturing",
    email: "alta@sergio-components.demo",
    phone: "+34 976 000 404",
    address: "Poligono Plaza nave 18",
    city: "Zaragoza",
    state: "Zaragoza",
    zip: "50197",
    country: "ES",
    segment: "fabricante",
    spendingLimit: 18000,
    taxId: "ESB50200404",
    onboardingStatus: "pending",
    paymentTerms: "net_30",
  },
  {
    name: "Obras Audio Levante",
    email: "compras@obras-audio-levante.demo",
    phone: "+34 963 000 505",
    address: "Avenida del Puerto 212",
    city: "Valencia",
    state: "Valencia",
    zip: "46024",
    country: "ES",
    segment: "constructora",
    spendingLimit: 9000,
    taxId: "ESB46200505",
    onboardingStatus: "rejected",
    paymentTerms: "prepaid",
  },
];

const demoStockBySku: Record<
  string,
  {
    free: number;
    reserved: number;
    eta: string;
    ean: string;
    tariffCode: string;
  }
> = {
  "NGS-WILD-BASH-COMPACT-BLK": {
    free: 126,
    reserved: 48,
    eta: "24/48h",
    ean: "8435430621018",
    tariffCode: "85182100",
  },
  "NGS-WILD-BASH-COMPACT-WHT": {
    free: 34,
    reserved: 18,
    eta: "72h",
    ean: "8435430621025",
    tariffCode: "85182100",
  },
  "NGS-EVO-MOUSE-BLK": {
    free: 1840,
    reserved: 420,
    eta: "stock inmediato",
    ean: "8435430622015",
    tariffCode: "84716070",
  },
  "NGS-EVO-MOUSE-WHT": {
    free: 960,
    reserved: 240,
    eta: "stock inmediato",
    ean: "8435430622022",
    tariffCode: "84716070",
  },
  "NGS-XPRESSCAM-1080-BLK": {
    free: 310,
    reserved: 90,
    eta: "24/48h",
    ean: "8435430623012",
    tariffCode: "85258900",
  },
  "NGS-GHX-600-BLK": {
    free: 72,
    reserved: 110,
    eta: "reposición 7 dias",
    ean: "8435430624019",
    tariffCode: "85183000",
  },
};

const demoQuoteScenarios = [
  {
    key: "iberia-instalacion-horeca-pendiente-cliente",
    companyEmail: "compras@iberia-pro-installers.demo",
    sku: "NGS-WILD-BASH-COMPACT-BLK",
    quantity: 24,
    status: "pending_customer",
    customerMessage:
      "Necesitamos 24 unidades para instalaciones Horeca en Madrid. Confirmad disponibilidad 24/48h y precio por proyecto.",
    merchantMessage:
      "Oferta preparada con entrega en dos tandas y descuento demo de instalador aplicado.",
  },
  {
    key: "dn-audio-reposicion-it-pendiente-cliente",
    companyEmail: "pedidos@dnaudio.demo",
    sku: "NGS-EVO-MOUSE-BLK",
    quantity: 144,
    status: "pending_customer",
    customerMessage:
      "Pedido recurrente para renovación IT. Necesitamos precio por lote y condiciones para reposición mensual.",
    merchantMessage:
      "Tarifa demo de distribuidor aplicada para lote de 144 uds. Pendiente aprobación de compras.",
  },
  {
    key: "retail-campus-webcams-pendiente-comercial",
    companyEmail: "it-procurement@retail-campus.demo",
    sku: "NGS-XPRESSCAM-1080-BLK",
    quantity: 40,
    status: "pending_merchant",
    customerMessage:
      "Solicitud para equipar salas de reunión. Valorar alternativa con stock inmediato y plazo por campus.",
    merchantMessage:
      "Pendiente de revisión comercial: validar stock reservado y condiciones logísticas.",
  },
  {
    key: "iberia-historico-aceptado-audio",
    companyEmail: "compras@iberia-pro-installers.demo",
    sku: "NGS-GHX-600-BLK",
    quantity: 32,
    status: "accepted",
    customerMessage:
      "Reposición ya aprobada para técnicos de campo. Necesitamos mantener este pedido como histórico demo.",
    merchantMessage:
      "Presupuesto aceptado. Pedido histórico preparado para mostrar recompra y trazabilidad de cuenta.",
  },
  {
    key: "dn-audio-historico-aceptado-mouse",
    companyEmail: "pedidos@dnaudio.demo",
    sku: "NGS-EVO-MOUSE-BLK",
    quantity: 288,
    status: "accepted",
    customerMessage:
      "Pedido recurrente para distribución norte. Confirmar precio de lote y condiciones Net 60.",
    merchantMessage:
      "Presupuesto aceptado con tarifa de distribuidor. Disponible como histórico para demo.",
  },
];

export default async function seed_b2b_demo_data({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const companyModule = container.resolve<any>(COMPANY_MODULE);
  const catalogRulesModule = container.resolve<any>(CATALOG_RULES_MODULE);
  const productModule = container.resolve<any>(Modules.PRODUCT);

  logger.info("Seeding extended B2B demo data...");

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "metadata",
      "categories.id",
      "categories.name",
      "collection.id",
      "variants.id",
      "variants.sku",
      "variants.title",
    ],
    pagination: {
      take: 100,
      skip: 0,
    },
  });

  if (!products.length) {
    logger.warn("B2B demo seed skipped; no products found.");
    return;
  }

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
    pagination: {
      take: 10,
      skip: 0,
    },
  });
  const region = regions.find((item: any) => item.currency_code === "eur");

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
    pagination: {
      take: 10,
      skip: 0,
    },
  });
  const salesChannel = salesChannels[0];

  const companies = await seedCompanies(companyModule, demoCompanies);
  await seedDemoCustomers(container, link, companies, logger);
  await seedOperationalStock(productModule, products, logger);
  await seedCatalogRules({
    catalogRulesModule,
    products,
    companies,
    regionId: region?.id,
    salesChannelId: salesChannel?.id,
    logger,
  });
  await seedPromotionsAndPriceLists(container, logger);
  await seedDemoQuotes({
    container,
    products,
    companies,
    regionId: region?.id,
    salesChannelId: salesChannel?.id,
    logger,
  });
  await seedDemoApprovalScenario({
    container,
    products,
    companies,
    regionId: region?.id,
    salesChannelId: salesChannel?.id,
    logger,
  });

  logger.info("Finished seeding extended B2B demo data.");
}

async function seedCompanies(companyModule: any, companies: DemoCompany[]) {
  const existingCompanies = await companyModule.listCompanies({});
  const existingByEmail = new Map<string, any>(
    existingCompanies.map((company: any) => [company.email, company])
  );
  const createdOrExisting: any[] = [];

  for (const company of companies) {
    const existing = existingByEmail.get(company.email);
    const roleSpendingLimits = buildRoleSpendingLimits(company);
    const defaultPaymentMethod =
      company.paymentTerms === "bank_transfer"
        ? "transferencia_bancaria"
        : "credito_empresa";
    const companyData = {
      name: company.name,
      email: company.email,
      phone: company.phone,
      address: company.address,
      city: company.city,
      state: company.state,
      zip: company.zip,
      country: company.country,
      currency_code: "eur",
      tax_id: company.taxId,
      sector: company.segment,
      onboarding_status: company.onboardingStatus,
      payment_terms: company.paymentTerms,
      default_payment_method: defaultPaymentMethod,
      saved_payment_methods: buildSavedPaymentMethods(defaultPaymentMethod),
      role_spending_limits: roleSpendingLimits,
      spending_limit_reset_frequency: "monthly",
    };

    if (existing) {
      const updated = await companyModule
        .updateCompanies({
          id: existing.id,
          ...companyData,
        })
        .catch(() => existing);
      await ensureDemoRoleEmployees(companyModule, updated, roleSpendingLimits);
      createdOrExisting.push(updated);
      continue;
    }

    const created = await companyModule.createCompanies(companyData);
    await ensureDemoRoleEmployees(companyModule, created, roleSpendingLimits);

    createdOrExisting.push(created);
  }

  return createdOrExisting;
}

function buildRoleSpendingLimits(company: DemoCompany) {
  if (company.email === "compras@iberia-pro-installers.demo") {
    return {
      buyer: 2000,
      approver: 15000,
      company_admin: 50000,
      readonly: 0,
    };
  }

  return {
    buyer: Math.round(company.spendingLimit / 4),
    approver: Math.round(company.spendingLimit / 2),
    company_admin: company.spendingLimit,
    readonly: 0,
  };
}

function buildSavedPaymentMethods(defaultPaymentMethod: string) {
  return [
    {
      id: "transferencia_bancaria",
      type: "bank_transfer",
      label: "Transferencia bancaria",
      last4: null,
      is_default: defaultPaymentMethod === "transferencia_bancaria",
    },
    {
      id: "credito_empresa",
      type: "company_credit",
      label: "Crédito empresa",
      last4: null,
      is_default: defaultPaymentMethod === "credito_empresa",
    },
    {
      id: "tarjeta_corporativa",
      type: "corporate_card",
      label: "Tarjeta corporativa",
      last4: "4242",
      is_default: defaultPaymentMethod === "tarjeta_corporativa",
    },
    {
      id: "recibo_domiciliado",
      type: "direct_debit",
      label: "Recibo domiciliado",
      last4: "1234",
      is_default: defaultPaymentMethod === "recibo_domiciliado",
    },
  ];
}

async function ensureDemoRoleEmployees(
  companyModule: any,
  company: any,
  roleSpendingLimits: Record<string, number>
) {
  const employees = await companyModule.listEmployees({
    company_id: company.id,
  });
  const byRole = new Map<string, any>(
    employees.map((employee: any) => [
      employee.role || (employee.is_admin ? "company_admin" : "buyer"),
      employee,
    ])
  );
  const roles = [
    { role: "company_admin", is_admin: true, status: "active" },
    { role: "buyer", is_admin: false, status: "active" },
    { role: "approver", is_admin: false, status: "active" },
    { role: "readonly", is_admin: false, status: "invited" },
  ];

  for (const roleConfig of roles) {
    const existing = byRole.get(roleConfig.role);
    const input = {
      company_id: company.id,
      spending_limit: roleSpendingLimits[roleConfig.role] || 0,
      is_admin: roleConfig.is_admin,
      role: roleConfig.role,
      status: roleConfig.status,
      invitation_email:
        roleConfig.status === "invited"
          ? `tecnico+${company.id.slice(-6)}@demo.ngs`
          : undefined,
      invitation_token:
        roleConfig.status === "invited" ? `demo-${company.id}` : undefined,
      invited_at: roleConfig.status === "invited" ? new Date() : undefined,
    };

    if (existing) {
      await companyModule
        .updateEmployees({
          id: existing.id,
          ...input,
        })
        .catch(() => undefined);
      continue;
    }

    await companyModule.createEmployees(input);
  }
}

async function seedDemoCustomers(
  container: MedusaContainer,
  link: any,
  companies: any[],
  logger: any
) {
  const customerModule = container.resolve<any>(Modules.CUSTOMER);
  const authModule = container.resolve<any>(Modules.AUTH);
  const companyModule = container.resolve<any>(COMPANY_MODULE);
  const pg = container.resolve<any>(ContainerRegistrationKeys.PG_CONNECTION);
  const existingCustomers = await customerModule.listCustomers({});
  const existingByEmail = new Map(
    existingCustomers.map((customer: any) => [customer.email, customer])
  );

  for (const company of companies) {
    const employees = await companyModule.listEmployees({
      company_id: company.id,
    });
    const activeEmployees = employees.filter(
      (employee: any) => employee.status !== "invited"
    );

    if (!activeEmployees.length) {
      continue;
    }

    for (const employee of activeEmployees) {
      const role = employee.role || (employee.is_admin ? "company_admin" : "buyer");
      const roleSlug = role === "company_admin" ? "admin" : role;
      const email = company.email.replace("@", `+${roleSlug}@`);
      const existing = existingByEmail.get(email) as any;
      const customer =
        existing ||
        (await customerModule.createCustomers({
          email,
          first_name: company.name.split(" ")[0],
          last_name: formatDemoRole(role),
          has_account: true,
          metadata: {
            demo_seed: true,
            company_name: company.name,
            b2b_role: role,
            demo_password: "Demo123!",
          },
        }));

      if (existing?.has_account === false) {
        await pg.raw(
          `update "customer" set "has_account" = true, "updated_at" = now() where "id" = ?`,
          [existing.id]
        );
      }

      await ensureDemoCustomerAuthIdentity({
        authModule,
        query: container.resolve(ContainerRegistrationKeys.QUERY),
        customer,
        email,
        role,
        logger,
      });

      await link
        .create({
          [COMPANY_MODULE]: {
            employee_id: employee.id,
          },
          [Modules.CUSTOMER]: {
            customer_id: customer.id,
          },
        })
        .catch(() => {
          logger.warn(`Could not link demo customer ${email} to employee.`);
        });
    }
  }
}

async function ensureDemoCustomerAuthIdentity({
  authModule,
  query,
  customer,
  email,
  role,
  logger,
}: {
  authModule: any;
  query: any;
  customer: any;
  email: string;
  role: string;
  logger: any;
}) {
  const {
    data: [providerIdentity],
  } = await query.graph({
    entity: "provider_identity",
    fields: ["id"],
    filters: {
      provider: "emailpass",
      entity_id: email,
    },
  });

  if (providerIdentity) {
    return;
  }

  try {
    const Scrypt = require("scrypt-kdf");
    const passwordHash = await Scrypt.kdf("Demo123!", {
      logN: 15,
      r: 8,
      p: 1,
    });

    await authModule.createAuthIdentities({
      provider_identities: [
        {
          provider: "emailpass",
          entity_id: email,
          provider_metadata: {
            password: passwordHash.toString("base64"),
          },
          user_metadata: {
            role: role === "company_admin" ? "company_admin" : role,
          },
        },
      ],
      app_metadata: {
        customer_id: customer.id,
      },
    });
  } catch (error) {
    logger.warn(
      `Could not create demo auth identity for ${email} (${(error as Error).message}).`
    );
  }
}

function formatDemoRole(role: string) {
  const labels: Record<string, string> = {
    company_admin: "Admin",
    approver: "Aprobador",
    buyer: "Comprador",
    readonly: "Lectura",
  };

  return labels[role] || "Comprador";
}

async function seedOperationalStock(
  productModule: any,
  products: any[],
  logger: any
) {
  for (const product of products) {
    const variants = product.variants || [];
    const matchedStock = variants
      .map((variant: any) => demoStockBySku[variant.sku])
      .filter(Boolean);

    if (!matchedStock.length) {
      continue;
    }

    const free = matchedStock.reduce((acc: number, item: any) => acc + item.free, 0);
    const reserved = matchedStock.reduce(
      (acc: number, item: any) => acc + item.reserved,
      0
    );
    const eta = matchedStock.some((item: any) => item.eta.includes("7"))
      ? "reposición 7 dias"
      : matchedStock.some((item: any) => item.eta.includes("72"))
      ? "72h"
      : "24/48h";

    await productModule
      .updateProducts({
        id: product.id,
        metadata: {
          ...(product.metadata || {}),
          demo_seed: true,
          stock_free: free,
          stock_reserved: reserved,
          stock_eta: eta,
          b2b_stock_status:
            free > 250 ? "alto" : free > 50 ? "medio" : "bajo",
          b2b_logistics_note: "Stock operativo demo para portal B2B",
        },
      })
      .catch(() => {
        logger.warn(`Could not update stock metadata for ${product.title}.`);
      });
  }
}

async function seedCatalogRules({
  catalogRulesModule,
  products,
  companies,
  regionId,
  salesChannelId,
  logger,
}: {
  catalogRulesModule: any;
  products: any[];
  companies: any[];
  regionId?: string;
  salesChannelId?: string;
  logger: any;
}) {
  const existingRules = await catalogRulesModule.listCatalogRules({}).catch(
    (error: Error) => {
      logger.warn(
        `Catalog rules demo seed skipped; module table is not ready (${error.message}).`
      );
      return null;
    }
  );

  if (!existingRules) {
    return;
  }

  const existingNames = new Set(existingRules.map((rule: any) => rule.name));
  const productByHandle = new Map(products.map((product) => [product.handle, product]));
  const audioCategory = products
    .flatMap((product) => product.categories || [])
    .find((category) => category.name === "Audio");
  const mouseVariant = products
    .flatMap((product) => product.variants || [])
    .find((variant) => variant.sku === "NGS-EVO-MOUSE-BLK");
  const bashProduct = productByHandle.get("ngs-wild-bash-compact");
  const installerCompany = companies.find((company) =>
    String(company.email).includes("iberia-pro-installers")
  );

  const rules = [
    {
      name: "Demo - Audio requiere presupuesto por proyecto",
      description:
        "Productos de audio profesional pasan por presupuesto para validar proyecto, disponibilidad y condiciones.",
      status: "active",
      priority: 10,
      rule_type: "quote",
      target_type: "category",
      target_id: audioCategory?.id,
      effect_type: "requires_quote",
      region_id: regionId,
      sales_channel_id: salesChannelId,
      metadata: {
        demo_seed: true,
        scenario: "quote_required_by_category",
      },
    },
    {
      name: "Demo - Instaladores 12% dto audio",
      description:
        "Descuento comercial para instaladores sobre la categoría Audio.",
      status: "active",
      priority: 20,
      rule_type: "price",
      target_type: "category",
      target_id: audioCategory?.id,
      company_id: installerCompany?.id,
      effect_type: "discount_percentage",
      discount_percentage: 12,
      minimum_quantity: 6,
      region_id: regionId,
      metadata: {
        demo_seed: true,
        scenario: "company_discount",
      },
    },
    {
      name: "Demo - EVO Mouse precio fijo lote",
      description: "Precio fijo por volumen para renovación de puestos IT.",
      status: "active",
      priority: 30,
      rule_type: "price",
      target_type: "variant",
      target_id: mouseVariant?.id,
      effect_type: "fixed_price",
      fixed_price: 8.6,
      minimum_quantity: 96,
      region_id: regionId,
      metadata: {
        demo_seed: true,
        scenario: "fixed_price_by_variant",
      },
    },
    {
      name: "Demo - WILD BASH surtido premium",
      description:
        "Producto demo para mostrar surtidos controlados en canal premium.",
      status: "active",
      priority: 40,
      rule_type: "assortment",
      target_type: "product",
      target_id: bashProduct?.id,
      effect_type: "show_only",
      region_id: regionId,
      metadata: {
        demo_seed: true,
        scenario: "assortment_visibility",
      },
    },
  ].filter((rule) => rule.target_id);

  for (const rule of rules) {
    if (existingNames.has(rule.name)) {
      continue;
    }

    await catalogRulesModule.createCatalogRules(rule).catch(() => {
      logger.warn(`Could not create catalog rule ${rule.name}.`);
    });
  }
}

async function seedPromotionsAndPriceLists(
  container: MedusaContainer,
  logger: any
) {
  await tryCreatePromotion(container, logger);
  await tryCreatePriceList(container, logger);
}

async function tryCreatePromotion(container: MedusaContainer, logger: any) {
  const promotionModuleName = (Modules as any).PROMOTION || "promotion";
  const promotionModule = container.resolve<any>(promotionModuleName, {
    allowUnregistered: true,
  });

  if (!promotionModule?.createPromotions) {
    logger.warn("Promotion module not available for demo seed; skipped.");
    return;
  }

  const existing = await promotionModule.listPromotions({ code: "B2BDEMO10" });

  if (existing.length) {
    return;
  }

  await promotionModule
    .createPromotions({
      code: "B2BDEMO10",
      campaign_id: null,
      is_automatic: false,
      type: "standard",
      status: "active",
      application_method: {
        type: "percentage",
        target_type: "items",
        allocation: "each",
        value: 10,
        max_quantity: 9999,
        currency_code: "eur",
      },
      metadata: {
        demo_seed: true,
        description: "10% demo para pedido B2B validado",
      },
    })
    .catch((error: Error) => {
      logger.warn(`Could not create B2BDEMO10 promotion (${error.message}).`);
    });
}

async function tryCreatePriceList(container: MedusaContainer, logger: any) {
  const pricingModule = container.resolve<any>(ModuleRegistrationName.PRICING, {
    allowUnregistered: true,
  });

  if (!pricingModule?.createPriceLists) {
    logger.warn("Pricing module not available for demo seed; skipped.");
    return;
  }

  const existing = await pricingModule.listPriceLists({
    title: "Demo tarifa distribuidor B2B",
  });

  if (existing.length) {
    return;
  }

  await pricingModule
    .createPriceLists([
      {
        title: "Demo tarifa distribuidor B2B",
        description:
          "Tarifa simulada para distribuidores, complementaria a catalog rules.",
        status: "active",
        type: "sale",
        rules: {},
        prices: [],
      },
    ])
    .catch((error: Error) => {
      logger.warn(`Could not create demo B2B price list (${error.message}).`);
    });
}

async function seedDemoQuotes({
  container,
  products,
  companies,
  regionId,
  salesChannelId,
  logger,
}: {
  container: MedusaContainer;
  products: any[];
  companies: any[];
  regionId?: string;
  salesChannelId?: string;
  logger: any;
}) {
  if (!regionId) {
    logger.warn("Quote demo seed skipped; no EUR region found.");
    return;
  }

  const customerModule = container.resolve<any>(Modules.CUSTOMER);
  const productPackagingModule = container.resolve<any>(
    PRODUCT_PACKAGING_MODULE
  );
  const quoteModule = container.resolve<any>(QUOTE_MODULE, {
    allowUnregistered: true,
  });

  if (!quoteModule?.listQuotes) {
    logger.warn("Quote module not available for demo seed; skipped.");
    return;
  }

  const existingQuotes = await quoteModule.listQuotes({});
  const customers = await customerModule.listCustomers({});
  const customersByEmail = new Map<string, any>(
    customers.map((customer: any) => [customer.email, customer])
  );
  const variantBySku = new Map<string, any>(
    products
      .flatMap((product) => product.variants || [])
      .map((variant: any) => [variant.sku, variant])
  );
  const variantIds = Array.from(variantBySku.values()).map(
    (variant: any) => variant.id
  );
  const storedPackaging = variantIds.length
    ? await productPackagingModule.listProductPackagings({
        variant_id: variantIds,
      })
    : [];
  const packagingByVariantId = new Map<string, any>(
    storedPackaging.map((packaging: any) => [packaging.variant_id, packaging])
  );

  for (const scenario of demoQuoteScenarios) {
    const company = companies.find(
      (item) => item.email === scenario.companyEmail
    );
    const customer = customersByEmail.get(
      scenario.companyEmail.replace("@", "+buyer@")
    );
    const variant = variantBySku.get(scenario.sku);
    const packaging =
      packagingByVariantId.get(variant?.id) ||
      buildNgsPackagingFallback({
        id: variant?.id,
        sku: variant?.sku,
      });

    if (!company || !customer || !variant) {
      logger.warn(`Quote demo seed skipped for ${scenario.sku}; data missing.`);
      continue;
    }

    const hasOpenDemoQuote = existingQuotes.some(
      (quote: any) =>
        quote.customer_id === customer.id &&
        ["pending_merchant", "pending_customer"].includes(quote.status)
    );
    const hasAcceptedDemoQuote = existingQuotes.some(
      (quote: any) =>
        quote.customer_id === customer.id && quote.status === "accepted"
    );

    if (scenario.status === "accepted" && hasAcceptedDemoQuote) {
      continue;
    }

    if (scenario.status !== "accepted" && hasOpenDemoQuote) {
      continue;
    }

    try {
      const { result: cart } = await createCartWorkflow(container).run({
        input: {
          region_id: regionId,
          sales_channel_id: salesChannelId,
          customer_id: customer.id,
          email: customer.email,
          currency_code: "eur",
          shipping_address: {
            first_name: company.name,
            last_name: "Compras",
            address_1: company.address,
            city: company.city || "Madrid",
            province: company.state,
            country_code: "es",
            postal_code: company.zip,
            phone: company.phone,
          },
          billing_address: {
            first_name: company.name,
            last_name: "Compras",
            address_1: company.address,
            city: company.city || "Madrid",
            province: company.state,
            country_code: "es",
            postal_code: company.zip,
            phone: company.phone,
          },
          items: [
            {
              variant_id: variant.id,
              quantity: scenario.quantity,
              metadata: buildQuoteLinePackagingMetadata(
                packaging,
                scenario.quantity
              ),
            },
          ],
          metadata: {
            demo_seed: true,
            company_id: company.id,
            quote_scenario: scenario.key,
            quote_sku: scenario.sku,
            po_number:
              scenario.status === "accepted"
                ? `PO-DEMO-${scenario.key.slice(0, 8).toUpperCase()}`
                : undefined,
            cost_center:
              company.email === "compras@iberia-pro-installers.demo"
                ? "INST-MADRID"
                : "COMPRAS-B2B",
            payment_terms: company.payment_terms || company.paymentTerms,
            selected_payment_method:
              company.default_payment_method || "credito_empresa",
          },
        },
      });

      const {
        result: { quote },
      } = await createRequestForQuoteWorkflow(container).run({
        input: {
          cart_id: cart.id,
          customer_id: customer.id,
        },
      });

      await createQuoteMessageWorkflow(container).run({
        input: {
          quote_id: quote.id,
          customer_id: customer.id,
          text: scenario.customerMessage,
        },
      });

      await createQuoteMessageWorkflow(container).run({
        input: {
          quote_id: quote.id,
          admin_id: "demo-admin",
          text: scenario.merchantMessage,
        },
      });

      if (scenario.status === "pending_customer" || scenario.status === "accepted") {
        await merchantSendQuoteWorkflow(container).run({
          input: {
            quote_id: quote.id,
          },
        });
      }

      if (scenario.status === "accepted") {
        await customerAcceptQuoteWorkflow(container).run({
          input: {
            quote_id: quote.id,
            customer_id: customer.id,
          },
        });
      }
    } catch (error) {
      logger.warn(
        `Could not create demo quote for ${scenario.sku} (${(error as Error).message}).`
      );
    }
  }
}

async function seedDemoApprovalScenario({
  container,
  products,
  companies,
  regionId,
  salesChannelId,
  logger,
}: {
  container: MedusaContainer;
  products: any[];
  companies: any[];
  regionId?: string;
  salesChannelId?: string;
  logger: any;
}) {
  if (!regionId) {
    logger.warn("Approval demo seed skipped; no EUR region found.");
    return;
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const customerModule = container.resolve<any>(Modules.CUSTOMER);
  const productPackagingModule = container.resolve<any>(
    PRODUCT_PACKAGING_MODULE
  );
  const company = companies.find(
    (item) => item.email === "compras@iberia-pro-installers.demo"
  );
  const [buyer] = await customerModule.listCustomers({
    email: "compras+buyer@iberia-pro-installers.demo",
  });
  const variant = products
    .flatMap((product) => product.variants || [])
    .find((item: any) => item.sku === "NGS-WILD-BASH-COMPACT-BLK");

  if (!company || !buyer || !variant) {
    logger.warn("Approval demo seed skipped; Iberia buyer or product missing.");
    return;
  }

  const { data: existingCarts } = await query.graph({
    entity: "cart",
    fields: ["id", "metadata", "approval_status.*"],
    filters: {
      customer_id: buyer.id,
    },
    pagination: {
      take: 50,
      skip: 0,
    },
  });

  const hasDemoApproval = existingCarts.some(
    (cart: any) =>
      cart.metadata?.demo_approval_scenario === "iberia-buyer-over-limit" &&
      cart.approval_status?.status === "pending"
  );

  if (hasDemoApproval) {
    return;
  }

  const [packaging] = await productPackagingModule
    .listProductPackagings({ variant_id: variant.id })
    .catch(() => []);
  const quantity = 36;

  try {
    const { result: cart } = await createCartWorkflow(container).run({
      input: {
        region_id: regionId,
        sales_channel_id: salesChannelId,
        customer_id: buyer.id,
        email: buyer.email,
        currency_code: "eur",
        shipping_address: {
          first_name: company.name,
          last_name: "Almacén central",
          address_1: company.address,
          city: company.city || "Madrid",
          province: company.state,
          country_code: "es",
          postal_code: company.zip,
          phone: company.phone,
        },
        billing_address: {
          first_name: company.name,
          last_name: "Administración",
          address_1: company.address,
          city: company.city || "Madrid",
          province: company.state,
          country_code: "es",
          postal_code: company.zip,
          phone: company.phone,
        },
        items: [
          {
            variant_id: variant.id,
            quantity,
            metadata: buildQuoteLinePackagingMetadata(
              packaging ||
                buildNgsPackagingFallback({
                  id: variant.id,
                  sku: variant.sku,
                }),
              quantity
            ),
          },
        ],
        metadata: {
          demo_seed: true,
          demo_approval_scenario: "iberia-buyer-over-limit",
          company_id: company.id,
          cost_center: "MAD-ALM-01",
          po_number: "PO-DEMO-2000",
          payment_terms: "net_30",
          selected_payment_method: "credito_empresa",
        },
      },
    });

    await createApprovalsWorkflow(container).run({
      input: {
        cart_id: cart.id,
        type: ApprovalType.ADMIN,
        created_by: buyer.id,
      },
    });
  } catch (error) {
    logger.warn(
      `Could not create demo approval scenario (${(error as Error).message}).`
    );
  }
}

function buildQuoteLinePackagingMetadata(
  packaging: any,
  quantity: number
): Record<string, unknown> {
  if (!packaging?.units_per_box || packaging.sales_unit !== "box") {
    return {
      purchase_unit: "unit",
    };
  }

  const unitsPerBox = Number(packaging.units_per_box);
  const packageQuantity = Math.ceil(quantity / unitsPerBox);

  return {
    purchase_unit: "box",
    package_quantity: packageQuantity,
    units_per_box: unitsPerBox,
    boxes_per_pallet: packaging.boxes_per_pallet,
    package_weight: packaging.package_weight,
    package_dimensions: packaging.package_dimensions,
  };
}
