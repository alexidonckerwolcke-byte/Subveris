type StripeObjectReference = string | { id?: string | null } | null | undefined;

type StripePaymentIntentReference =
  | string
  | { id?: string | null; latest_charge?: StripeObjectReference }
  | null
  | undefined;

type InvoicePayment = {
  status?: string;
  payment?: {
    charge?: StripeObjectReference;
    payment_intent?: StripePaymentIntentReference;
  };
};

type InvoicePaymentDetails = {
  charge?: StripeObjectReference;
  payment_intent?: StripePaymentIntentReference;
  payments?: {
    data?: InvoicePayment[];
  };
};

function getReferenceId(reference: StripeObjectReference): string | null {
  if (typeof reference === "string") return reference;
  return reference && typeof reference.id === "string" ? reference.id : null;
}

export function getInvoicePaymentReferences(
  invoice: InvoicePaymentDetails,
  supplementalPayments: InvoicePayment[] = [],
): {
  chargeId: string | null;
  paymentIntentId: string | null;
} {
  const paidPayments = [
    ...(invoice.payments?.data ?? []),
    ...supplementalPayments,
  ].filter((payment) => payment.status === "paid");
  const paidPaymentIntent = paidPayments.find((payment) => payment.payment?.payment_intent)
    ?.payment?.payment_intent;
  const paidChargePayment = paidPayments.find((payment) => payment.payment?.charge)
    ?.payment?.charge;
  const paymentIntent = invoice.payment_intent ?? paidPaymentIntent;
  const charge = invoice.charge
    ?? (typeof invoice.payment_intent === "object" ? invoice.payment_intent?.latest_charge : null)
    ?? (typeof paidPaymentIntent === "object" ? paidPaymentIntent?.latest_charge : null)
    ?? paidChargePayment;

  return {
    chargeId: getReferenceId(charge),
    paymentIntentId: getReferenceId(paymentIntent),
  };
}
