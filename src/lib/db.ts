import { supabase } from "./supabase";
import type { Debt, Transaction, Card, AppNotification, TxType, CardBrand } from "./types";

const PALETTE = [
  "from-indigo-500 to-violet-600",
  "from-rose-500 to-pink-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-sky-500 to-blue-600",
];

export function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

const financed = (d: { principal: number; downPayment: number }) => d.principal - d.downPayment;

function db() {
  if (!supabase) throw new Error("Supabase no configurado");
  return supabase;
}

/* ------------------------ LOAD ------------------------ */

interface RawClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export async function loadWorkspace(userId: string): Promise<{
  debts: Debt[];
  cards: Card[];
  notifications: AppNotification[];
}> {
  const s = db();
  const [clientsR, debtsR, paymentsR, chargesR, feesR, cardsR, notifR] = await Promise.all([
    s.from("clients").select("id,name,email,phone").eq("admin_id", userId),
    s.from("debts").select("*").eq("admin_id", userId).order("created_at", { ascending: false }),
    s.from("payments").select("*").eq("admin_id", userId),
    s.from("extra_charges").select("*").eq("admin_id", userId),
    s.from("late_fees").select("*").eq("admin_id", userId),
    s.from("payment_methods").select("*").eq("user_id", userId).order("created_at"),
    s.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);

  const clients = new Map<string, RawClient>();
  (clientsR.data || []).forEach((c) => clients.set(c.id, c as RawClient));

  const txByDebt = new Map<string, Transaction[]>();
  const push = (debtId: string, t: Transaction) => {
    const arr = txByDebt.get(debtId) || [];
    arr.push(t);
    txByDebt.set(debtId, arr);
  };
  (paymentsR.data || []).forEach((p: any) =>
    push(p.debt_id, {
      id: p.id,
      type: p.type as TxType,
      concept: p.concept || "",
      amount: Number(p.amount),
      date: p.created_at,
      method: p.method || undefined,
      balanceBefore: Number(p.balance_before ?? 0),
      balanceAfter: Number(p.balance_after ?? 0),
    })
  );
  (chargesR.data || []).forEach((c: any) =>
    push(c.debt_id, {
      id: c.id,
      type: "charge",
      concept: c.concept || "Cargo extra",
      amount: Number(c.amount),
      date: c.created_at,
      balanceBefore: Number(c.balance_before ?? 0),
      balanceAfter: Number(c.balance_after ?? 0),
    })
  );
  (feesR.data || []).forEach((f: any) =>
    push(f.debt_id, {
      id: f.id,
      type: "interest",
      concept: `Penalización por atraso (${f.days_overdue} días)`,
      amount: Number(f.amount),
      date: f.created_at,
      balanceBefore: Number(f.balance_before ?? 0),
      balanceAfter: Number(f.balance_after ?? 0),
    })
  );

  const debts: Debt[] = (debtsR.data || []).map((d: any) => {
    const cl = clients.get(d.client_id);
    const txs = (txByDebt.get(d.id) || []).sort(
      (a, b) => +new Date(a.date) - +new Date(b.date)
    );
    return {
      id: d.id,
      category: d.category,
      debtorName: cl?.name || "Cliente",
      debtorPhone: cl?.phone || "",
      debtorEmail: cl?.email || "",
      creditorName: "Administrador",
      description: d.description || "",
      principal: Number(d.principal),
      downPayment: Number(d.down_payment),
      installments: d.installments,
      frequency: d.frequency,
      startDate: d.start_date,
      notes: d.notes || "",
      inviteCode: d.invite_code || "",
      inviteAccepted: !!d.invite_accepted,
      lateInterestEnabled: !!d.late_interest_enabled,
      dailyLateFee: Number(d.daily_late_fee),
      nextDueDate: d.next_due_date || d.start_date,
      charges: Number(d.charges_total),
      interest: Number(d.interest_total),
      totalPaid: Number(d.total_paid),
      transactions: txs,
      avatarColor: colorFor(d.id),
    };
  });

  const cards: Card[] = (cardsR.data || []).map((c: any) => ({
    id: c.id,
    brand: c.brand as CardBrand,
    last4: c.last4 || "0000",
    exp: `${String(c.exp_month || 12).padStart(2, "0")}/${String(c.exp_year || 28).slice(-2)}`,
    holder: "Titular",
    slot: c.slot,
    color:
      c.brand === "Visa"
        ? "from-indigo-600 via-violet-600 to-fuchsia-600"
        : c.brand === "Amex"
        ? "from-cyan-600 via-sky-600 to-blue-700"
        : "from-slate-800 via-slate-700 to-zinc-900",
  }));

  const notifications: AppNotification[] = (notifR.data || []).map((n: any) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body || "",
    date: n.created_at,
    read: !!n.read,
  }));

  return { debts, cards, notifications };
}

/* ------------------------ DEBTS ------------------------ */

export async function createDebtDb(userId: string, d: Debt): Promise<Debt> {
  const s = db();
  const clientId = crypto.randomUUID();
  const { error: ce } = await s
    .from("clients")
    .insert({ id: clientId, admin_id: userId, name: d.debtorName, email: d.debtorEmail, phone: d.debtorPhone });
  if (ce) throw ce;

  const { error: de } = await s
    .from("debts")
    .insert({
      id: d.id,
      admin_id: userId,
      client_id: clientId,
      category: d.category,
      description: d.description,
      principal: d.principal,
      down_payment: d.downPayment,
      installments: d.installments,
      frequency: d.frequency,
      start_date: d.startDate.slice(0, 10),
      next_due_date: d.nextDueDate.slice(0, 10),
      late_interest_enabled: d.lateInterestEnabled,
      daily_late_fee: d.dailyLateFee,
      notes: d.notes,
      invite_code: d.inviteCode,
    });
  if (de) throw de;

  return d;
}

export async function removeDebtDb(debtId: string): Promise<void> {
  const { error } = await db().from("debts").delete().eq("id", debtId);
  if (error) throw error;
}

export async function setLateInterestDb(debtId: string, on: boolean): Promise<void> {
  const { error } = await db().from("debts").update({ late_interest_enabled: on }).eq("id", debtId);
  if (error) throw error;
}

/* ------------------------ MOVEMENTS ------------------------ */

export async function addMovementDb(
  userId: string,
  debt: Debt,
  type: TxType,
  amount: number,
  concept: string,
  method: string | undefined,
  txId: string
): Promise<Transaction> {
  const s = db();
  const total = financed(debt) + debt.charges + debt.interest;
  const before = Math.max(0, total - debt.totalPaid);
  const nextCharges = type === "charge" ? debt.charges + amount : debt.charges;
  const nextInterest = type === "interest" ? debt.interest + amount : debt.interest;
  const nextPaid =
    type === "payment" || type === "extra" ? debt.totalPaid + amount : debt.totalPaid;
  const after = Math.max(0, financed(debt) + nextCharges + nextInterest - nextPaid);

  if (type === "charge") {
    const { error } = await s
      .from("extra_charges")
      .insert({ id: txId, debt_id: debt.id, admin_id: userId, concept, amount, balance_before: before, balance_after: after });
    if (error) throw error;
  } else if (type === "interest") {
    const days = Math.round(amount / (debt.dailyLateFee || 10));
    const { error } = await s
      .from("late_fees")
      .insert({ id: txId, debt_id: debt.id, admin_id: userId, days_overdue: days, amount, balance_before: before, balance_after: after });
    if (error) throw error;
  } else {
    const { error } = await s
      .from("payments")
      .insert({ id: txId, debt_id: debt.id, admin_id: userId, type, concept, amount, method, balance_before: before, balance_after: after });
    if (error) throw error;
  }

  await s
    .from("debts")
    .update({ charges_total: nextCharges, interest_total: nextInterest, total_paid: nextPaid })
    .eq("id", debt.id);

  return {
    id: txId,
    type,
    concept,
    amount,
    date: new Date().toISOString(),
    method,
    balanceBefore: before,
    balanceAfter: after,
  };
}

/* ------------------------ CARDS ------------------------ */

export async function addCardDb(userId: string, cardId: string, c: Omit<Card, "id">): Promise<void> {
  const s = db();
  if (c.slot === "primary") {
    await s.from("payment_methods").update({ slot: "secondary" }).eq("user_id", userId);
  }
  const [mm, yy] = c.exp.split("/");
  const { error } = await s.from("payment_methods").insert({
    id: cardId,
    user_id: userId,
    brand: c.brand,
    last4: c.last4,
    exp_month: Number(mm) || 12,
    exp_year: 2000 + (Number(yy) || 28),
    slot: c.slot,
  });
  if (error) throw error;
}

export async function removeCardDb(userId: string, cardId: string, makePrimaryId?: string): Promise<void> {
  const s = db();
  await s.from("payment_methods").delete().eq("id", cardId);
  if (makePrimaryId) await s.from("payment_methods").update({ slot: "primary" }).eq("id", makePrimaryId);
}

export async function setPrimaryCardDb(userId: string, cardId: string): Promise<void> {
  const s = db();
  await s.from("payment_methods").update({ slot: "secondary" }).eq("user_id", userId);
  await s.from("payment_methods").update({ slot: "primary" }).eq("id", cardId);
}

/* ------------------------ NOTIFICATIONS ------------------------ */

export async function addNotificationDb(
  userId: string,
  id: string,
  n: { type: string; title: string; body: string }
): Promise<void> {
  const { error } = await db()
    .from("notifications")
    .insert({ id, user_id: userId, type: n.type, title: n.title, body: n.body });
  if (error) throw error;
}

export async function markNotificationsReadDb(userId: string): Promise<void> {
  await db().from("notifications").update({ read: true }).eq("user_id", userId);
}
