import { CheckCircleSolid } from "@medusajs/icons";
import {
  Button,
  Container,
  Heading,
  Text,
  toast,
  Toaster,
  usePrompt,
} from "@medusajs/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useOrderPreview } from "../../../hooks/api";
import {
  useQuote,
  useRejectQuote,
  useSendQuote,
} from "../../../hooks/api/quotes";
import { formatAmount } from "../../../utils";
import {
  CostBreakdown,
  QuoteDetailsHeader,
  QuoteItems,
  QuoteTotal,
} from "../components/quote-details";
import { QuoteMessages } from "../components/quote-messages";
import {
  estimateCarrierRates,
  estimateFreightCost,
  estimateShipmentMode,
  getQuotePackagingSummary,
} from "../utils/b2b-packaging";

const QuoteDetails = () => {
  const { quoteId } = useParams();
  const [showSendQuote, setShowSendQuote] = useState(false);
  const [showRejectQuote, setShowRejectQuote] = useState(false);
  const prompt = usePrompt();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { quote, isLoading } = useQuote(quoteId!, {
    fields:
      "*draft_order.customer,*draft_order.customer.employee,*draft_order.customer.employee.company",
  });

  const { order: preview, isLoading: isPreviewLoading } = useOrderPreview(
    quote?.draft_order_id!,
    {},
    { enabled: !!quote?.draft_order_id }
  );

  const { mutateAsync: sendQuote, isPending: isSendingQuote } = useSendQuote(
    quoteId!
  );

  const { mutateAsync: rejectQuote, isPending: isRejectingQuote } =
    useRejectQuote(quoteId!);

  useEffect(() => {
    if (["pending_merchant", "customer_rejected"].includes(quote?.status!)) {
      setShowSendQuote(true);
    } else {
      setShowSendQuote(false);
    }

    if (
      ["customer_rejected", "merchant_rejected", "accepted"].includes(
        quote?.status!
      )
    ) {
      setShowRejectQuote(false);
    } else {
      setShowRejectQuote(true);
    }
  }, [quote]);

  const handleSendQuote = async () => {
    const res = await prompt({
      title: "¿Enviar presupuesto?",
      description:
        "Vas a enviar este presupuesto al cliente. ¿Quieres continuar?",
      confirmText: t("actions.continue"),
      cancelText: t("actions.cancel"),
      variant: "confirmation",
    });

    if (res) {
      await sendQuote(
        {},
        {
          onSuccess: () => toast.success("Presupuesto enviado al cliente"),
          onError: (e) => toast.error(e.message),
        }
      );
    }
  };

  const handleRejectQuote = async () => {
    const res = await prompt({
      title: "¿Rechazar presupuesto?",
      description:
        "Vas a rechazar este presupuesto del cliente. ¿Quieres continuar?",
      confirmText: t("actions.continue"),
      cancelText: t("actions.cancel"),
      variant: "confirmation",
    });

    if (res) {
      await rejectQuote(void 0, {
        onSuccess: () =>
          toast.success("Presupuesto rechazado"),
        onError: (e) => toast.error(e.message),
      });
    }
  };

  const handleExportCsv = () => {
    const link = document.createElement("a");

    link.href = `/admin/quotes/${quote.id}/export`;
    link.download = `presupuesto-${quote.id}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (isLoading || !quote) {
    return <></>;
  }

  if (isPreviewLoading) {
    return <></>;
  }

  if (!isPreviewLoading && !preview) {
    throw "preview not found";
  }

  const packagingSummary = getQuotePackagingSummary(
    quote.draft_order?.items || []
  );
  const shipmentMode = estimateShipmentMode(packagingSummary);
  const estimatedFreight = estimateFreightCost(packagingSummary);
  const carrierRates = estimateCarrierRates(packagingSummary);
  const quoteCustomer = quote.draft_order?.customer || quote.customer;
  const quoteEmployee = quoteCustomer?.employee || quote.customer?.employee;
  const quoteCompany = quoteEmployee?.company;
  const quoteCurrency =
    (quoteCompany?.currency_code as string) ||
    quote.draft_order?.currency_code ||
    "EUR";
  const spendingLimit = Number(quoteEmployee?.spending_limit || 0);

  return (
    <div className="flex flex-col gap-y-3">
      <div className="flex flex-col gap-x-4 lg:flex-row xl:items-start">
        <div className="flex w-full flex-col gap-y-3">
          {quote.status === "accepted" && (
            <Container className="divide-y divide-dashed p-0">
              <div className="flex items-center justify-between px-6 py-4">
                <Text className="txt-compact-small">
                  <CheckCircleSolid className="inline-block mr-2 text-green-500 text-lg" />
                  Presupuesto aceptado por el cliente. El pedido ya está listo
                  para procesarse.
                </Text>

                <Button
                  size="small"
                  onClick={() => navigate(`/orders/${quote.draft_order_id}`)}
                >
                  Ver pedido
                </Button>
              </div>
            </Container>
          )}

          <Container className="divide-y divide-dashed p-0">
            <QuoteDetailsHeader quote={quote} />
            <QuoteItems order={quote.draft_order} preview={preview!} />
            <CostBreakdown order={quote.draft_order} />
            <QuoteTotal order={quote.draft_order} preview={preview!} />

            {(showRejectQuote || showSendQuote) && (
              <div className="bg-ui-bg-subtle flex items-center justify-end gap-x-2 rounded-b-xl px-4 py-4">
                <Button
                  size="small"
                  variant="secondary"
                  onClick={handleExportCsv}
                >
                    Exportar CSV
                </Button>

                {showRejectQuote && (
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => handleRejectQuote()}
                    disabled={isSendingQuote}
                  >
                    Rechazar presupuesto
                  </Button>
                )}

                {showSendQuote && (
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => handleSendQuote()}
                    disabled={isSendingQuote}
                  >
                    Enviar presupuesto
                  </Button>
                )}
              </div>
            )}
          </Container>

          <QuoteMessages quote={quote} preview={preview!} />
        </div>

        <div className="mt-2 flex w-full max-w-[100%] flex-col gap-y-3 xl:mt-0 xl:max-w-[400px]">
          <Container className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
              <Heading level="h2">Logística B2B</Heading>
            </div>
            <div className="grid gap-3 px-6 py-4">
              <PackagingMetric
                label="Bultos"
                value={`${packagingSummary.boxes} cajas`}
              />
              <PackagingMetric
                label="Unidades"
                value={`${packagingSummary.totalUnits} uds`}
              />
              <PackagingMetric
                label="Peso estimado"
                value={`${packagingSummary.estimatedWeight.toFixed(1)} kg`}
              />
              <PackagingMetric
                label="Volumen estimado"
                value={`${packagingSummary.estimatedVolume.toFixed(3)} m3`}
              />
              <PackagingMetric
                label="Peso facturable"
                value={`${packagingSummary.billableWeight.toFixed(1)} kg`}
              />
              <PackagingMetric
                label="Ocupacion pallet"
                value={`${packagingSummary.palletShare.toFixed(2)} pallets`}
              />
              <PackagingMetric label="Expedicion" value={shipmentMode} />
              <PackagingMetric
                label="Transporte demo"
                value={formatAmount(
                  estimatedFreight,
                  quote.draft_order?.currency_code || "EUR"
                )}
              />
              <div className="grid gap-2 rounded-md border bg-ui-bg-subtle p-3">
                <Text size="xsmall" weight="plus">
                  Transportistas simulados
                </Text>
                {carrierRates.slice(0, 3).map((rate) => (
                  <div
                    key={rate.carrier}
                    className="flex items-start justify-between gap-3"
                  >
                    <div>
                      <Text size="small" weight="plus">
                        {rate.carrier}
                      </Text>
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        {rate.service} - {rate.transitDays}
                        {rate.recommended ? " - recomendada" : ""}
                      </Text>
                    </div>
                    <Text size="small" weight="plus">
                      {formatAmount(
                        rate.estimatedCost,
                        quote.draft_order?.currency_code || "EUR"
                      )}
                    </Text>
                  </div>
                ))}
              </div>
              <Text size="xsmall" className="text-ui-fg-muted">
                Estimación basada en cajas, dimensiones, peso real y peso
                volumetrico. Sustituible por tarifas reales de transportista.
              </Text>
            </div>
          </Container>

          <Container className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
              <Heading level="h2">Cliente</Heading>
            </div>

            <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
              <Text size="small" weight="plus" leading="compact">
                Email
              </Text>

              {quoteCustomer?.id ? (
                <Link
                  className="text-sm text-pretty text-blue-500"
                  to={`/customers/${quoteCustomer.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {quoteCustomer.email || "-"}
                </Link>
              ) : (
                <Text size="small" leading="compact" className="text-pretty">
                  {quoteCustomer?.email || "-"}
                </Text>
              )}
            </div>

            <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
              <Text size="small" weight="plus" leading="compact">
                Teléfono
              </Text>

              <Text size="small" leading="compact" className="text-pretty">
                {quoteCustomer?.phone || "-"}
              </Text>
            </div>

            <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
              <Text size="small" weight="plus" leading="compact">
                Limite de gasto
              </Text>

              <Text size="small" leading="compact" className="text-pretty">
                {formatAmount(
                  Number.isFinite(spendingLimit) ? spendingLimit : 0,
                  quoteCurrency
                )}
              </Text>
            </div>
          </Container>

          <Container className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
              <Heading level="h2">Empresa</Heading>
            </div>

            <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
              <Text size="small" weight="plus" leading="compact">
                Nombre
              </Text>

              {quoteCompany?.id ? (
                <Link
                  className="text-sm text-pretty text-blue-500"
                  to={`/companies/${quoteCompany.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {quoteCompany.name || "-"}
                </Link>
              ) : (
                <Text size="small" leading="compact" className="text-pretty">
                  {quoteCompany?.name || "-"}
                </Text>
              )}
            </div>
          </Container>
        </div>
      </div>

      <Toaster />
    </div>
  );
};

export default QuoteDetails;

const PackagingMetric = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="flex items-center justify-between gap-3 rounded-md border bg-ui-bg-subtle px-3 py-2">
    <Text size="small" leading="compact" className="text-ui-fg-subtle">
      {label}
    </Text>
    <Text size="small" leading="compact" weight="plus">
      {value}
    </Text>
  </div>
);
