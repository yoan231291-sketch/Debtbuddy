export type Role = "admin" | "client";
export type Frequency = "weekly" | "biweekly" | "monthly";
export type TxType = "payment" | "extra" | "charge" | "interest";
export type CardBrand = "Visa" | "Mastercard" | "Amex";

export interface Transaction {
  id: string;
  type: TxType;
  concept: string;
  amount: number;
  date: string;
  method?: string;
  balanceBefore: number;
  balanceAfter: number;
}

export interface Card {
  id: string;
  brand: CardBrand;
  last4: string;
  exp: string;
  holder: string;
  slot: "primary" | "secondary";
  color: string;
}

export interface Debt {
  id: string;
  category: "loan" | "vehicle";
  debtorName: string;
  debtorPhone: string;
  debtorEmail: string;
  creditorName: string;
  description: string;
  principal: number;
  downPayment: number;
  installments: number;
  frequency: Frequency;
  startDate: string;
  notes: string;
  inviteCode: string;
  inviteAccepted: boolean;
  lateInterestEnabled: boolean;
  dailyLateFee: number;
  nextDueDate: string;
  charges: number;
  interest: number;
  totalPaid: number;
  transactions: Transaction[];
  avatarColor: string;
}

export interface AppNotification {
  id: string;
  type: TxType | "invite";
  title: string;
  body: string;
  date: string;
  read: boolean;
}

export interface Toast {
  id: string;
  title: string;
  desc?: string;
  variant: "success" | "info" | "warn";
}
