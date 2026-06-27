export type Role = "admin" | "client";
export type Frequency = "weekly" | "biweekly" | "monthly";
export type TxType = "payment" | "extra" | "charge" | "interest";
export type CardBrand = "Visa" | "Mastercard" | "Amex" | "Discover" | "Card";

export type BankStatus = "none" | "pending" | "verified" | "connected";

export interface BankAccount {
  status: BankStatus;
  holder: string;
  bankName: string;
  last4: string;
}

export interface Prefs {
  notifPayments: boolean;
  notifReminders: boolean;
  notifCharges: boolean;
  theme: "light" | "dark" | "auto";
  language: "es" | "en";
  currency: "USD" | "EUR" | "MXN" | "DOP";
  dateFormat: "dmy" | "mdy" | "ymd";
}

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

export type ContractTemplate = "vehicle_sale" | "personal_loan" | "payment_agreement" | "custom";
export type ContractStatus = "draft" | "pending_signature" | "signed" | "completed" | "cancelled";

export interface Contract {
  id: string;
  template: ContractTemplate;
  title: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  description: string;
  terms: string;
  totalAmount: number;
  downPayment: number;
  financedAmount: number;
  installments: number;
  frequency: Frequency;
  startDate: string;
  endDate: string;
  dailyLateFee: number;
  status: ContractStatus;
  adminSignature?: string;
  clientSignature?: string;
  adminSignedAt?: string;
  clientSignedAt?: string;
  debtId?: string;
  createdAt: string;
}
