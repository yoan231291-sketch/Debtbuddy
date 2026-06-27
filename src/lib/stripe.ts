import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { supabase, stripePublishableKey } from "./supabase";

export const isStripeConfigured = Boolean(stripePublishableKey);

let _stripe: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePublishableKey) return Promise.resolve(null);
  if (!_stripe) _stripe = loadStripe(stripePublishableKey);
  return _stripe;
}

interface PaymentIntentResult {
  clientSecret: string;
  status: string;
  id: string;
}

interface SetupIntentResult {
  clientSecret: string;
  customerId: string;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase.functions.invoke("stripe-payment", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error as string);
  return data as T;
}

export function createPaymentIntent(
  amount: number,
  opts: { debtId?: string; customerId?: string; paymentMethodId?: string; currency?: string } = {}
): Promise<PaymentIntentResult> {
  return invoke<PaymentIntentResult>({ action: "payment-intent", amount, ...opts });
}

export function createSetupIntent(
  opts: { email?: string; customerId?: string } = {}
): Promise<SetupIntentResult> {
  return invoke<SetupIntentResult>({ action: "setup-intent", ...opts });
}
