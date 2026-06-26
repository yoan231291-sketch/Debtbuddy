import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Bell,
  Settings as SettingsIcon,
  LayoutGrid,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Share2,
  Download,
  Receipt,
  TrendingUp,
  AlertTriangle,
  CircleDollarSign,
  Banknote,
  Percent,
  Calendar,
  Phone,
  User,
  ShieldCheck,
  LogOut,
  ChevronDown,
  Sparkles,
  Car,
  HandCoins,
  Clock,
  CheckCircle2,
  Trash2,
  Send,
  Star,
  Fingerprint,
  type LucideIcon,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import * as dbsvc from "./lib/db";
import type {
  Role,
  Frequency,
  TxType,
  CardBrand,
  Transaction,
  Card,
  Debt,
  AppNotification,
  Toast,
} from "./lib/types";

/* ============================== TYPES ============================== */

/* ============================== HELPERS ============================== */

const uid = (p = "") =>
  p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

const newId = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : uid();

const inviteCode = () =>
  Array.from({ length: 9 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".charAt(Math.floor(Math.random() * 32))
  ).join("");

const money = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

const daysOverdue = (due: string) => {
  const ms = Date.now() - new Date(due).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
};

const freqLabel: Record<Frequency, string> = {
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
};

const financed = (d: Debt) => d.principal - d.downPayment;
const currentTotal = (d: Debt) => financed(d) + d.charges + d.interest;
const balance = (d: Debt) => Math.max(0, currentTotal(d) - d.totalPaid);
const progress = (d: Debt) => {
  const t = currentTotal(d);
  return t <= 0 ? 0 : Math.min(100, (d.totalPaid / t) * 100);
};
const installmentAmount = (d: Debt) => financed(d) / d.installments;
const lastPayment = (d: Debt) =>
  [...d.transactions]
    .filter((t) => t.type === "payment" || t.type === "extra")
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))[0];

const txMeta: Record<
  TxType,
  { label: string; icon: LucideIcon; tint: string; sign: string }
> = {
  payment: {
    label: "Pago",
    icon: ArrowDownLeft,
    tint: "text-emerald-500 bg-emerald-500/10",
    sign: "+",
  },
  extra: {
    label: "Abono Libre",
    icon: Sparkles,
    tint: "text-sky-500 bg-sky-500/10",
    sign: "+",
  },
  charge: {
    label: "Cargo Extra",
    icon: Plus,
    tint: "text-amber-500 bg-amber-500/10",
    sign: "+",
  },
  interest: {
    label: "Interés",
    icon: Percent,
    tint: "text-rose-500 bg-rose-500/10",
    sign: "+",
  },
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const daysFromNow = (n: number) =>
  new Date(Date.now() + n * 86_400_000).toISOString();

/* ============================== MOCK DATA ============================== */

const CREDITOR_NAME = "Yoan Rodríguez";

function seedDebts(): Debt[] {
  const carlos: Debt = {
    id: "d1",
    category: "vehicle",
    debtorName: "Carlos Méndez",
    debtorPhone: "+52 55 1234 5678",
    debtorEmail: "carlos.mendez@gmail.com",
    creditorName: CREDITOR_NAME,
    description: "Honda Civic 2019 — venta financiada",
    principal: 12000,
    downPayment: 2000,
    installments: 20,
    frequency: "monthly",
    startDate: daysFromNow(-150),
    notes: "Vehículo entregado con documentación al día.",
    inviteCode: inviteCode(),
    inviteAccepted: true,
    lateInterestEnabled: true,
    dailyLateFee: 10,
    nextDueDate: daysFromNow(-4),
    charges: 350,
    interest: 40,
    totalPaid: 0,
    transactions: [],
    avatarColor: "from-indigo-500 to-violet-600",
  };
  carlos.transactions = [
    tx("payment", "Cuota #1", 500, daysFromNow(-148), "Visa •••• 4242", 10390, 9890),
    tx("payment", "Cuota #2", 500, daysFromNow(-118), "Visa •••• 4242", 9890, 9390),
    tx("charge", "Seguro vehicular", 350, daysFromNow(-100), undefined, 9390, 9740),
    tx("payment", "Cuota #3", 500, daysFromNow(-88), "Mastercard •••• 8210", 9740, 9240),
    tx("extra", "Abono libre", 800, daysFromNow(-60), "Visa •••• 4242", 9240, 8440),
    tx("payment", "Cuota #4", 500, daysFromNow(-58), "Visa •••• 4242", 8440, 7940),
    tx("interest", "Penalización por atraso (4 días)", 40, daysFromNow(-2), undefined, 7940, 7980),
  ];
  carlos.totalPaid = 2800;

  const lucia: Debt = {
    id: "d2",
    category: "vehicle",
    debtorName: "Lucía Fernández",
    debtorPhone: "+52 55 9876 5432",
    debtorEmail: "lucia.fdz@gmail.com",
    creditorName: CREDITOR_NAME,
    description: "Nissan Versa 2021 — vendido a familiar",
    principal: 9000,
    downPayment: 1500,
    installments: 15,
    frequency: "biweekly",
    startDate: daysFromNow(-90),
    notes: "Acuerdo familiar, sin penalización por ahora.",
    inviteCode: inviteCode(),
    inviteAccepted: true,
    lateInterestEnabled: false,
    dailyLateFee: 10,
    nextDueDate: daysFromNow(6),
    charges: 0,
    interest: 0,
    totalPaid: 0,
    transactions: [],
    avatarColor: "from-rose-500 to-pink-600",
  };
  lucia.transactions = [
    tx("payment", "Cuota #1", 500, daysFromNow(-82), "Visa •••• 4242", 7500, 7000),
    tx("payment", "Cuota #2", 500, daysFromNow(-68), "Visa •••• 4242", 7000, 6500),
    tx("extra", "Abono libre", 300, daysFromNow(-40), "Mastercard •••• 8210", 6500, 6200),
    tx("payment", "Cuota #3", 500, daysFromNow(-26), "Visa •••• 4242", 6200, 5700),
  ];
  lucia.totalPaid = 1800;

  const diego: Debt = {
    id: "d3",
    category: "loan",
    debtorName: "Diego Ramírez",
    debtorPhone: "+52 55 4455 6677",
    debtorEmail: "diego.ramirez@gmail.com",
    creditorName: CREDITOR_NAME,
    description: "Préstamo personal para emprendimiento",
    principal: 4000,
    downPayment: 0,
    installments: 8,
    frequency: "weekly",
    startDate: daysFromNow(-30),
    notes: "Préstamo amistoso.",
    inviteCode: inviteCode(),
    inviteAccepted: false,
    lateInterestEnabled: false,
    dailyLateFee: 10,
    nextDueDate: daysFromNow(2),
    charges: 0,
    interest: 0,
    totalPaid: 0,
    transactions: [],
    avatarColor: "from-emerald-500 to-teal-600",
  };
  diego.transactions = [
    tx("payment", "Cuota #1", 500, daysFromNow(-23), "Visa •••• 4242", 4000, 3500),
    tx("payment", "Cuota #2", 500, daysFromNow(-16), "Visa •••• 4242", 3500, 3000),
  ];
  diego.totalPaid = 1000;

  return [carlos, lucia, diego];
}

function tx(
  type: TxType,
  concept: string,
  amount: number,
  date: string,
  method: string | undefined,
  balanceBefore: number,
  balanceAfter: number
): Transaction {
  return { id: uid("tx_"), type, concept, amount, date, method, balanceBefore, balanceAfter };
}

const seedNotifications: AppNotification[] = [
  {
    id: uid(),
    type: "payment",
    title: "Pago recibido",
    body: "Carlos Méndez pagó " + money(500) + " — Cuota #4",
    date: daysFromNow(-58),
    read: false,
  },
  {
    id: uid(),
    type: "interest",
    title: "Interés agregado",
    body: "Penalización por atraso de " + money(40) + " aplicada a Carlos Méndez",
    date: daysFromNow(-2),
    read: false,
  },
  {
    id: uid(),
    type: "charge",
    title: "Cargo agregado",
    body: "Seguro vehicular " + money(350) + " añadido a Carlos Méndez",
    date: daysFromNow(-100),
    read: true,
  },
  {
    id: uid(),
    type: "invite",
    title: "Invitación aceptada",
    body: "Lucía Fernández aceptó tu solicitud de deuda",
    date: daysFromNow(-88),
    read: true,
  },
  {
    id: uid(),
    type: "payment",
    title: "Pago pendiente",
    body: "Diego Ramírez tiene una cuota próxima a vencer",
    date: daysFromNow(-1),
    read: false,
  },
];

/* ============================== STORE / CONTEXT ============================== */

interface Store {
  dark: boolean;
  toggleDark: () => void;
  role: Role;
  setRole: (r: Role) => void;
  user: { email: string; name: string };
  debts: Debt[];
  cards: Card[];
  notifications: AppNotification[];
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  addDebt: (d: Debt) => void;
  applyPayment: (debtId: string, type: TxType, amount: number, concept: string, method?: string) => Transaction;
  setLateInterest: (debtId: string, on: boolean) => void;
  applyAccruedInterest: (debtId: string) => void;
  setPrimaryCard: (cardId: string) => void;
  addCard: (c: Omit<Card, "id">) => void;
  removeCard: (cardId: string) => void;
  readAllNotifications: () => void;
  pushNotification: (n: Omit<AppNotification, "id" | "date" | "read">) => void;
  removeDebt: (id: string) => void;
  resetData: () => void;
  logout: () => void;
}

const StoreCtx = createContext<Store | null>(null);
const useStore = () => {
  const s = useContext(StoreCtx);
  if (!s) throw new Error("Store missing");
  return s;
};

/* ============================== PRIMITIVES ============================== */

function cx(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(" ");
}

function Button({
  children,
  onClick,
  variant = "primary",
  className,
  type = "button",
  disabled,
  full,
  size = "md",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  full?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all active:scale-[.97] disabled:opacity-50 disabled:pointer-events-none select-none";
  const sizes = {
    sm: "text-xs px-3 py-2",
    md: "text-sm px-4 py-3",
    lg: "text-base px-5 py-3.5",
  };
  const variants = {
    primary:
      "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:brightness-110",
    secondary:
      "bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 shadow-md",
    outline:
      "border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5",
    ghost:
      "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5",
    danger:
      "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-600/25 hover:brightness-110",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(base, sizes[size], variants[variant], full && "w-full", className)}
    >
      {children}
    </button>
  );
}

function Card3({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cx(
        "rounded-3xl border border-slate-200/70 dark:border-white/[.06] bg-white dark:bg-slate-900/60 shadow-sm shadow-slate-200/40 dark:shadow-black/20 backdrop-blur",
        onClick && "cursor-pointer hover:shadow-md transition-shadow",
        className
      )}
    >
      {children}
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition";

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={cx(
        "relative h-7 w-12 rounded-full transition-colors",
        on ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
      )}
    >
      <span
        className={cx(
          "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all",
          on ? "left-6" : "left-1"
        )}
      />
    </button>
  );
}

function Avatar({ name, color, size = 44 }: { name: string; color: string; size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cx(
        "grid place-items-center rounded-2xl bg-gradient-to-br font-bold text-white shadow-inner shrink-0",
        color
      )}
    >
      <span style={{ fontSize: size * 0.34 }}>{initials(name)}</span>
    </div>
  );
}

function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "emerald" | "amber" | "rose" | "indigo";
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
      <div
        className="relative h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-all duration-700 ease-out"
        style={{ width: `${value}%` }}
      >
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      </div>
    </div>
  );
}

function Modal({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl animate-slide-up dark:bg-slate-900 sm:max-w-md sm:rounded-3xl sm:animate-scale-in no-scrollbar">
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function BrandLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-14 w-14" }[size];
  const t = { sm: "text-lg", md: "text-xl", lg: "text-3xl" }[size];
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cx(
          "grid place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30",
          s
        )}
      >
        <HandCoins className={size === "lg" ? "h-7 w-7" : "h-5 w-5"} />
      </div>
      <span className={cx("font-extrabold tracking-tight text-slate-900 dark:text-white", t)}>
        2Pay<span className="text-indigo-600 dark:text-indigo-400">Back</span>
      </span>
    </div>
  );
}

/* ============================== INSTALL PROMPT ============================== */

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    if (standalone) return;
    if (localStorage.getItem("2payback.installDismissed")) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    const onInstalled = () => setShow(false);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);

    const isIos = /iphone|ipad|ipod/i.test(nav.userAgent) && !/crios|fxios/i.test(nav.userAgent);
    if (isIos) {
      setIos(true);
      setShow(true);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("2payback.installDismissed", "1");
  };
  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setShow(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[55] px-4 pb-4 pt-2 animate-slide-up">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
          <HandCoins className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Instala 2PayBack</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {ios
              ? "Toca Compartir ⬆️ y luego 'Añadir a inicio'."
              : "Añádela a tu pantalla de inicio para acceso rápido."}
          </p>
        </div>
        {!ios && (
          <Button size="sm" onClick={install}>
            <Download className="h-4 w-4" /> Instalar
          </Button>
        )}
        <button
          onClick={dismiss}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ============================== TOASTS ============================== */

function ToastHost() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur animate-fade-in dark:border-white/10 dark:bg-slate-900/95"
        >
          <div
            className={cx(
              "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
              t.variant === "success" && "bg-emerald-500/15 text-emerald-500",
              t.variant === "info" && "bg-indigo-500/15 text-indigo-500",
              t.variant === "warn" && "bg-amber-500/15 text-amber-500"
            )}
          >
            {t.variant === "success" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : t.variant === "warn" ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.title}</p>
            {t.desc && <p className="text-xs text-slate-500 dark:text-slate-400">{t.desc}</p>}
          </div>
          <button onClick={() => dismissToast(t.id)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ============================== AUTH ============================== */

function AuthScreen({ onAuth }: { onAuth: (email: string) => void }) {
  const { dark, toggleDark, toast } = useStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [remember, setRemember] = useState(true);
  const [forgot, setForgot] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) {
      onAuth(email || "demo@2payback.app");
      return;
    }
    if (mode === "register" && pw !== pw2) {
      toast({ title: "Las contraseñas no coinciden", variant: "warn" });
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password: pw });
        if (error) throw error;
        if (!data.session) {
          toast({
            title: "Revisa tu correo",
            desc: "Te enviamos un enlace para confirmar tu cuenta.",
            variant: "info",
          });
        }
      }
    } catch (err) {
      toast({ title: "No se pudo continuar", desc: (err as Error).message, variant: "warn" });
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: "google" | "apple") => {
    if (!isSupabaseConfigured || !supabase) {
      onAuth(provider + ".user@2payback.app");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) toast({ title: "No se pudo conectar", desc: error.message, variant: "warn" });
  };

  const resetPassword = async (target: string) => {
    if (!isSupabaseConfigured || !supabase) {
      setForgot(false);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: window.location.origin,
    });
    toast(
      error
        ? { title: "Error", desc: error.message, variant: "warn" }
        : { title: "Enlace enviado", desc: "Revisa tu correo.", variant: "success" }
    );
    setForgot(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-indigo-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl" />

      <button
        onClick={toggleDark}
        className="absolute right-5 top-5 z-10 grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white/70 text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
      >
        {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo size="lg" />
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta"}
          </h1>
          <p className="mt-1.5 max-w-xs text-sm text-slate-500 dark:text-slate-400">
            Administra préstamos, ventas financiadas y acuerdos privados con total claridad.
          </p>
        </div>

        <Card3 className="p-5 sm:p-6">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/60">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cx(
                  "rounded-xl py-2.5 text-sm font-semibold transition",
                  mode === m
                    ? "bg-white text-slate-900 shadow dark:bg-slate-900 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                {m === "login" ? "Iniciar sesión" : "Registrarse"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3.5">
            <Field label="Email" icon={Mail}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </Field>

            <Field label="Contraseña" icon={Lock}>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            {mode === "register" && (
              <Field label="Confirmar contraseña" icon={Lock}>
                <Input
                  type="password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
            )}

            <div className="flex items-center justify-between pt-0.5">
              <button
                type="button"
                onClick={() => setRemember((r) => !r)}
                className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                <span
                  className={cx(
                    "grid h-5 w-5 place-items-center rounded-md border transition",
                    remember
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-300 dark:border-slate-600"
                  )}
                >
                  {remember && <Check className="h-3.5 w-3.5" />}
                </span>
                Recordarme
              </button>
              <button
                type="button"
                onClick={() => setForgot(true)}
                className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <Button type="submit" full size="lg" className="mt-1" disabled={busy}>
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Procesando...
                </>
              ) : (
                <>
                  {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            <span className="text-xs font-medium text-slate-400">o continúa con</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => oauth("google")}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[.97] dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-200"
            >
              <GoogleIcon /> Google
            </button>
            <button
              onClick={() => oauth("apple")}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[.97] dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-200"
            >
              <AppleIcon /> Apple
            </button>
          </div>
        </Card3>

        <p className="mt-6 text-center text-xs text-slate-400">
          Al continuar aceptas los Términos y la Política de privacidad de 2PayBack.
        </p>
      </div>

      <Modal open={forgot} onClose={() => setForgot(false)} title="Recuperar contraseña">
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
        </p>
        <Field label="Email" icon={Mail}>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
          />
        </Field>
        <Button full size="lg" className="mt-4" onClick={() => resetPassword(email)}>
          <Send className="h-4 w-4" /> Enviar enlace
        </Button>
      </Modal>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current text-slate-900 dark:text-white">
      <path d="M16.36 1.43c0 1.15-.42 2.28-1.26 3.1-.84.83-2.21 1.47-3.36 1.38-.13-1.1.43-2.27 1.2-3.02.85-.85 2.32-1.47 3.42-1.46ZM20.5 17.1c-.6 1.36-.89 1.97-1.66 3.17-1.08 1.67-2.6 3.75-4.49 3.76-1.67.02-2.1-1.09-4.37-1.07-2.27.01-2.74 1.09-4.41 1.08-1.89-.02-3.33-1.9-4.41-3.57C-1.34 16.8-1.66 11.5.3 8.68c1.39-2 3.58-3.18 5.64-3.18 2.1 0 3.42 1.15 5.15 1.15 1.68 0 2.7-1.15 5.13-1.15 1.84 0 3.79 1 5.18 2.73-4.55 2.49-3.81 8.99-.9 8.87Z" />
    </svg>
  );
}

/* ============================== ROLE SWITCH ============================== */

function RoleSwitch() {
  const { role, setRole } = useStore();
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/60">
      <button
        onClick={() => setRole("admin")}
        className={cx(
          "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition",
          role === "admin"
            ? "bg-white text-slate-900 shadow dark:bg-slate-900 dark:text-white"
            : "text-slate-500 dark:text-slate-400"
        )}
      >
        <ArrowDownLeft className="h-4 w-4" /> Administrador
      </button>
      <button
        onClick={() => setRole("client")}
        className={cx(
          "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition",
          role === "client"
            ? "bg-white text-slate-900 shadow dark:bg-slate-900 dark:text-white"
            : "text-slate-500 dark:text-slate-400"
        )}
      >
        <ArrowUpRight className="h-4 w-4" /> Cliente
      </button>
    </div>
  );
}

/* ============================== DASHBOARD ============================== */

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <Card3 className="p-4">
      <div className={cx("mb-3 grid h-10 w-10 place-items-center rounded-2xl", tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>
    </Card3>
  );
}

function Dashboard({ onOpen, onCreate }: { onOpen: (id: string) => void; onCreate: () => void }) {
  const { role, debts } = useStore();
  const isAdmin = role === "admin";

  const totalOutstanding = debts.reduce((s, d) => s + balance(d), 0);
  const totalCollected = debts.reduce((s, d) => s + d.totalPaid, 0);
  const overdue = debts.filter((d) => daysOverdue(d.nextDueDate) > 0).length;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isAdmin ? "Total por cobrar" : "Total que debes"}
        </p>
        <h1 className="mt-0.5 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {money(totalOutstanding)}
        </h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge tone="emerald">
            <TrendingUp className="h-3 w-3" /> {money(totalCollected)} recibidos
          </Badge>
          {overdue > 0 && (
            <Badge tone="rose">
              <AlertTriangle className="h-3 w-3" /> {overdue} con atraso
            </Badge>
          )}
          <Badge tone="indigo">{debts.length} acuerdos</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={isAdmin ? "Por cobrar" : "Por pagar"}
          value={money(totalOutstanding)}
          icon={CircleDollarSign}
          tone="bg-indigo-500/10 text-indigo-500"
        />
        <StatCard
          label="Recibido"
          value={money(totalCollected)}
          icon={Banknote}
          tone="bg-emerald-500/10 text-emerald-500"
        />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          {isAdmin ? "Me deben" : "Debo"}
        </h2>
        {isAdmin && (
          <button
            onClick={onCreate}
            className="flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400"
          >
            <Plus className="h-4 w-4" /> Nueva deuda
          </button>
        )}
      </div>

      <div className="space-y-3">
        {debts.length === 0 ? (
          <Card3 className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-500">
              <HandCoins className="h-7 w-7" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Sin deudas todavía</p>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Crea tu primera deuda para empezar a gestionar pagos.
              </p>
            </div>
            {isAdmin && (
              <Button onClick={onCreate}>
                <Plus className="h-4 w-4" /> Crear deuda
              </Button>
            )}
          </Card3>
        ) : (
          debts.map((d) => (
            <DebtRow key={d.id} debt={d} role={role} onClick={() => onOpen(d.id)} />
          ))
        )}
      </div>
    </div>
  );
}

function DebtRow({ debt, role, onClick }: { debt: Debt; role: Role; onClick: () => void }) {
  const isAdmin = role === "admin";
  const od = daysOverdue(debt.nextDueDate);
  const pct = progress(debt);
  return (
    <Card3 className="p-4" onClick={onClick}>
      <div className="flex items-center gap-3">
        <Avatar name={debt.debtorName} color={debt.avatarColor} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold text-slate-900 dark:text-white">{debt.debtorName}</p>
            {debt.category === "vehicle" && (
              <Car className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            )}
          </div>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{debt.description}</p>
        </div>
        <div className="text-right">
          <p className="font-extrabold text-slate-900 dark:text-white">{money(balance(debt))}</p>
          {od > 0 ? (
            <Badge tone="rose">{od}d atraso</Badge>
          ) : (
            <Badge tone="emerald">Al día</Badge>
          )}
        </div>
      </div>

      <div className="mt-3.5">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-500 dark:text-slate-400">
            {pct.toFixed(1)}% pagado
          </span>
          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <Calendar className="h-3 w-3" />
            {fmtDate(debt.nextDueDate)}
          </span>
        </div>
        <ProgressBar value={pct} />
      </div>

      {!isAdmin && (
        <div className="mt-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Cuota siguiente</p>
            <p className="font-bold text-slate-900 dark:text-white">
              {money(installmentAmount(debt))}
            </p>
          </div>
          <Button size="sm" onClick={onClick}>
            <CreditCard className="h-4 w-4" /> Pagar
          </Button>
        </div>
      )}
    </Card3>
  );
}

/* ============================== CREATE DEBT ============================== */

function CreateDebt({ onBack, onCreated }: { onBack: () => void; onCreated: (d: Debt) => void }) {
  const { addDebt, toast, pushNotification } = useStore();
  const [f, setF] = useState({
    debtorName: "",
    debtorPhone: "",
    debtorEmail: "",
    description: "",
    principal: "",
    downPayment: "0",
    installments: "12",
    frequency: "monthly" as Frequency,
    startDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [created, setCreated] = useState<Debt | null>(null);
  const colors = [
    "from-indigo-500 to-violet-600",
    "from-rose-500 to-pink-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-sky-500 to-blue-600",
  ];

  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const d: Debt = {
      id: newId(),
      category: /auto|carro|veh|honda|nissan|toyota|moto/i.test(f.description) ? "vehicle" : "loan",
      debtorName: f.debtorName || "Nuevo deudor",
      debtorPhone: f.debtorPhone,
      debtorEmail: f.debtorEmail,
      creditorName: CREDITOR_NAME,
      description: f.description || "Deuda privada",
      principal: Number(f.principal) || 0,
      downPayment: Number(f.downPayment) || 0,
      installments: Math.max(1, Number(f.installments) || 1),
      frequency: f.frequency,
      startDate: new Date(f.startDate).toISOString(),
      notes: f.notes,
      inviteCode: inviteCode(),
      inviteAccepted: false,
      lateInterestEnabled: false,
      dailyLateFee: 10,
      nextDueDate: daysFromNow(
        f.frequency === "weekly" ? 7 : f.frequency === "biweekly" ? 15 : 30
      ),
      charges: 0,
      interest: 0,
      totalPaid: 0,
      transactions: [],
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
    };
    addDebt(d);
    pushNotification({
      type: "invite",
      title: "Deuda creada",
      body: `Se generó una invitación para ${d.debtorName}`,
    });
    toast({ title: "Deuda creada", desc: "Comparte la invitación con el cliente.", variant: "success" });
    setCreated(d);
  };

  if (created) {
    const link = `https://2payback.app/invite/${created.inviteCode}`;
    const wa = `https://wa.me/?text=${encodeURIComponent(
      `Hola ${created.debtorName} 👋 Te he enviado una solicitud de deuda en 2PayBack. Ingresa aquí para verla: ${link}`
    )}`;
    return (
      <div className="space-y-5">
        <ScreenHeader title="Invitación lista" onBack={() => onCreated(created)} />
        <Card3 className="overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-center text-white">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-white/20">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold">¡Deuda registrada!</h3>
            <p className="mt-1 text-sm text-white/80">
              Envía el enlace a {created.debtorName} para que acepte.
            </p>
          </div>
          <div className="space-y-4 p-5">
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 dark:border-white/15 dark:bg-slate-800/50">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Link de invitación
              </p>
              <p className="break-all text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                {link}
              </p>
            </div>
            <a href={wa} target="_blank" rel="noreferrer" className="block">
              <Button full size="lg" className="bg-gradient-to-r from-emerald-500 to-green-600 shadow-emerald-600/25">
                <WhatsAppIcon /> Compartir por WhatsApp
              </Button>
            </a>
            <Button full variant="outline" onClick={() => onCreated(created)}>
              Ver detalle de la deuda
            </Button>
          </div>
        </Card3>
      </div>
    );
  }

  const principal = Number(f.principal) || 0;
  const down = Number(f.downPayment) || 0;
  const inst = Math.max(1, Number(f.installments) || 1);
  const perInstallment = (principal - down) / inst;

  return (
    <div className="space-y-5">
      <ScreenHeader title="Crear deuda" onBack={onBack} />
      <form onSubmit={submit} className="space-y-4">
        <Card3 className="space-y-3.5 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Cliente</p>
          <Field label="Nombre del cliente" icon={User}>
            <Input value={f.debtorName} onChange={(e) => set("debtorName", e.target.value)} placeholder="Ej. Carlos Méndez" required />
          </Field>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="Teléfono" icon={Phone}>
              <Input value={f.debtorPhone} onChange={(e) => set("debtorPhone", e.target.value)} placeholder="+52 ..." />
            </Field>
            <Field label="Email" icon={Mail}>
              <Input type="email" value={f.debtorEmail} onChange={(e) => set("debtorEmail", e.target.value)} placeholder="correo@email.com" />
            </Field>
          </div>
          <Field label="Descripción" icon={Receipt}>
            <Input value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Ej. Honda Civic 2019 financiado" />
          </Field>
        </Card3>

        <Card3 className="space-y-3.5 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Términos</p>
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Monto total" icon={CircleDollarSign}>
              <Input type="number" value={f.principal} onChange={(e) => set("principal", e.target.value)} placeholder="0" required />
            </Field>
            <Field label="Pago inicial" icon={Banknote}>
              <Input type="number" value={f.downPayment} onChange={(e) => set("downPayment", e.target.value)} placeholder="0" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Cantidad de cuotas" icon={LayoutGrid}>
              <Input type="number" value={f.installments} onChange={(e) => set("installments", e.target.value)} placeholder="12" />
            </Field>
            <Field label="Fecha de inicio" icon={Calendar}>
              <Input type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </Field>
          </div>
          <Field label="Frecuencia" icon={Clock}>
            <div className="grid grid-cols-3 gap-2">
              {(["monthly", "biweekly", "weekly"] as Frequency[]).map((fr) => (
                <button
                  key={fr}
                  type="button"
                  onClick={() => set("frequency", fr)}
                  className={cx(
                    "rounded-2xl border py-2.5 text-sm font-semibold transition",
                    f.frequency === fr
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300"
                  )}
                >
                  {freqLabel[fr]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Notas">
            <textarea
              value={f.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Detalles del acuerdo..."
              className={inputCls}
            />
          </Field>
          {principal > 0 && (
            <div className="rounded-2xl bg-indigo-500/5 p-3 text-sm dark:bg-indigo-500/10">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Monto financiado</span>
                <span className="font-bold">{money(principal - down)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Cada cuota ({freqLabel[f.frequency].toLowerCase()})</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {money(perInstallment)}
                </span>
              </div>
            </div>
          )}
        </Card3>

        <Button type="submit" full size="lg">
          <Plus className="h-4 w-4" /> Crear deuda
        </Button>
      </form>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M.06 24l1.69-6.16a11.87 11.87 0 0 1-1.59-5.95C.16 5.34 5.5 0 12.06 0a11.82 11.82 0 0 1 8.41 3.49 11.82 11.82 0 0 1 3.48 8.42c0 6.56-5.34 11.9-11.9 11.9a11.9 11.9 0 0 1-5.69-1.45L.06 24Zm6.6-3.8c1.68.99 3.28 1.59 5.4 1.59 5.45 0 9.89-4.43 9.89-9.88a9.86 9.86 0 0 0-9.88-9.89C6.6 2.02 2.17 6.45 2.17 11.9c0 2.23.65 3.9 1.75 5.65l-1 3.66 3.74-.98ZM17.4 14.6c-.07-.12-.27-.2-.56-.34-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.66.15-.2.3-.76.96-.93 1.16-.17.2-.34.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.66-1.6-.91-2.19-.24-.57-.48-.5-.66-.5l-.56-.01a1.1 1.1 0 0 0-.8.37c-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.69.25-1.28.18-1.41Z" />
    </svg>
  );
}

/* ============================== DEBT DETAIL ============================== */

function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      {onBack && (
        <button
          onClick={onBack}
          className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      <h1 className="flex-1 text-lg font-bold text-slate-900 dark:text-white">{title}</h1>
      {right}
    </div>
  );
}

function MetricRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className={cx("text-sm font-bold text-slate-900 dark:text-white", accent)}>{value}</span>
    </div>
  );
}

function DebtDetail({ debtId, onBack }: { debtId: string; onBack: () => void }) {
  const {
    role,
    debts,
    cards,
    applyPayment,
    setLateInterest,
    applyAccruedInterest,
    removeDebt,
    toast,
  } = useStore();
  const debt = debts.find((d) => d.id === debtId);
  const [receipt, setReceipt] = useState<Transaction | null>(null);
  const [payModal, setPayModal] = useState<null | "installment" | "extra" | "charge">(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!debt) return null;
  const isAdmin = role === "admin";
  const pct = progress(debt);
  const od = daysOverdue(debt.nextDueDate);
  const lp = lastPayment(debt);
  const sortedTx = [...debt.transactions].sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="Detalle de deuda"
        onBack={onBack}
        right={
          <Badge tone={od > 0 ? "rose" : "emerald"}>
            {od > 0 ? `${od}d atraso` : "Al día"}
          </Badge>
        }
      />

      <Card3 className="overflow-hidden">
        <div className={cx("bg-gradient-to-br p-5 text-white", debt.avatarColor)}>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 font-bold">
              {initials(debt.debtorName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold">{debt.debtorName}</p>
              <p className="truncate text-sm text-white/80">{debt.description}</p>
            </div>
          </div>
          <div className="mt-5">
            <p className="text-sm text-white/80">Balance pendiente</p>
            <p className="text-3xl font-extrabold tracking-tight">{money(balance(debt))}</p>
          </div>
        </div>

        <div className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Progreso de pago
            </span>
            <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
              {pct.toFixed(1)}%
            </span>
          </div>
          <ProgressBar value={pct} />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {money(debt.totalPaid)} de {money(currentTotal(debt))} pagados
          </p>
        </div>
      </Card3>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Monto original" value={money(financed(debt))} icon={CircleDollarSign} tone="bg-indigo-500/10 text-indigo-500" />
        <StatCard label="Total pagado" value={money(debt.totalPaid)} icon={Banknote} tone="bg-emerald-500/10 text-emerald-500" />
        <StatCard label="Intereses" value={money(debt.interest)} icon={Percent} tone="bg-rose-500/10 text-rose-500" />
        <StatCard label="Cargos extra" value={money(debt.charges)} icon={Plus} tone="bg-amber-500/10 text-amber-500" />
      </div>

      <Card3 className="p-4">
        <MetricRow label="Balance pendiente" value={money(balance(debt))} accent="text-indigo-600 dark:text-indigo-400" />
        <div className="h-px bg-slate-100 dark:bg-white/5" />
        <MetricRow
          label="Último pago recibido"
          value={lp ? `${money(lp.amount)} · ${fmtDate(lp.date)}` : "Sin pagos"}
        />
        <div className="h-px bg-slate-100 dark:bg-white/5" />
        <MetricRow label="Próxima fecha de pago" value={fmtDate(debt.nextDueDate)} accent={od > 0 ? "text-rose-500" : undefined} />
        <div className="h-px bg-slate-100 dark:bg-white/5" />
        <MetricRow label="Frecuencia" value={freqLabel[debt.frequency]} />
      </Card3>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button size="lg" onClick={() => setPayModal("installment")}>
          <CreditCard className="h-4 w-4" /> Pagar Cuota
        </Button>
        <Button size="lg" variant="outline" onClick={() => setPayModal("extra")}>
          <Sparkles className="h-4 w-4" /> Pago Extra
        </Button>
      </div>

      {isAdmin && (
        <Card3 className="space-y-4 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Herramientas del administrador
          </p>
          <Button full variant="outline" onClick={() => setPayModal("charge")}>
            <Plus className="h-4 w-4" /> Agregar Cargo Extra
          </Button>

          <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500/10 text-rose-500">
                  <Percent className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Penalización por retraso
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {money(debt.dailyLateFee)} diarios por atraso
                  </p>
                </div>
              </div>
              <Toggle on={debt.lateInterestEnabled} onChange={(v) => setLateInterest(debt.id, v)} />
            </div>
            {debt.lateInterestEnabled && (
              <div className="mt-3 space-y-2 rounded-xl bg-rose-500/5 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Días vencidos</span>
                  <span className="font-bold text-slate-900 dark:text-white">{od} días</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Interés por aplicar</span>
                  <span className="font-bold text-rose-500">{money(od * debt.dailyLateFee)}</span>
                </div>
                <Button
                  full
                  size="sm"
                  variant="danger"
                  disabled={od <= 0}
                  onClick={() => applyAccruedInterest(debt.id)}
                >
                  Aplicar interés acumulado
                </Button>
              </div>
            )}
          </div>
        </Card3>
      )}

      {/* History */}
      <div>
        <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">
          Historial de transacciones
        </h2>
        <Card3 className="divide-y divide-slate-100 dark:divide-white/5">
          {sortedTx.length === 0 && (
            <p className="p-5 text-center text-sm text-slate-400">Sin movimientos todavía</p>
          )}
          {sortedTx.map((t) => {
            const m = txMeta[t.type];
            const Icon = m.icon;
            return (
              <button
                key={t.id}
                onClick={() => setReceipt(t)}
                className="flex w-full items-center gap-3 p-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-white/[.03]"
              >
                <div className={cx("grid h-10 w-10 place-items-center rounded-2xl", m.tint)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {t.concept}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {fmtDate(t.date)} · {fmtTime(t.date)} · {m.label}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={cx(
                      "text-sm font-bold",
                      t.type === "payment" || t.type === "extra"
                        ? "text-emerald-500"
                        : "text-slate-900 dark:text-white"
                    )}
                  >
                    {m.sign}
                    {money(t.amount)}
                  </p>
                  <p className="text-[11px] text-slate-400">recibo</p>
                </div>
              </button>
            );
          })}
        </Card3>
      </div>

      <Button full variant="outline" className="text-rose-500" onClick={() => setConfirmDelete(true)}>
        <Trash2 className="h-4 w-4" /> Eliminar deuda
      </Button>

      <PaymentModal
        kind={payModal}
        debt={debt}
        cards={cards}
        onClose={() => setPayModal(null)}
        onDone={(t) => {
          setPayModal(null);
          setReceipt(t);
        }}
        applyPayment={applyPayment}
      />

      <ReceiptModal receipt={receipt} debt={debt} onClose={() => setReceipt(null)} />

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Eliminar deuda">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          ¿Seguro que quieres eliminar la deuda de <b className="text-slate-900 dark:text-white">{debt.debtorName}</b>?
          Esta acción no se puede deshacer y se borrará todo su historial.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              removeDebt(debt.id);
              toast({ title: "Deuda eliminada", desc: debt.debtorName, variant: "info" });
              setConfirmDelete(false);
              onBack();
            }}
          >
            <Trash2 className="h-4 w-4" /> Eliminar
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ============================== PAYMENT MODAL ============================== */

function PaymentModal({
  kind,
  debt,
  cards,
  onClose,
  onDone,
  applyPayment,
}: {
  kind: null | "installment" | "extra" | "charge";
  debt: Debt;
  cards: Card[];
  onClose: () => void;
  onDone: (t: Transaction) => void;
  applyPayment: Store["applyPayment"];
}) {
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [cardId, setCardId] = useState(cards.find((c) => c.slot === "primary")?.id || cards[0]?.id);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (kind === "installment") {
      setAmount(installmentAmount(debt).toFixed(2));
      setConcept("Pago de cuota");
    } else if (kind === "extra") {
      setAmount("");
      setConcept("Abono libre");
    } else if (kind === "charge") {
      setAmount("");
      setConcept("");
    }
  }, [kind, debt]);

  if (!kind) return null;

  const isCharge = kind === "charge";
  const card = cards.find((c) => c.id === cardId);
  const chargeExamples = ["Seguro", "Repuesto", "Multa", "Dinero prestado", "Combustible", "Otros"];

  const titles = {
    installment: "Pagar Cuota",
    extra: "Pago Extra",
    charge: "Agregar Cargo Extra",
  };

  const submit = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    setProcessing(true);
    setTimeout(() => {
      const type: TxType = isCharge ? "charge" : kind === "extra" ? "extra" : "payment";
      const t = applyPayment(
        debt.id,
        type,
        amt,
        concept || titles[kind],
        isCharge ? undefined : card ? `${card.brand} •••• ${card.last4}` : undefined
      );
      setProcessing(false);
      onDone(t);
    }, 1100);
  };

  return (
    <Modal open={!!kind} onClose={onClose} title={titles[kind]}>
      <div className="space-y-4">
        <Field label="Monto" icon={CircleDollarSign}>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
        </Field>

        <Field label="Concepto" icon={Receipt}>
          <Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Concepto del movimiento" />
        </Field>

        {isCharge && (
          <div className="flex flex-wrap gap-2">
            {chargeExamples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setConcept(ex)}
                className={cx(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  concept === ex
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300"
                )}
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {!isCharge && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <CreditCard className="h-3.5 w-3.5" /> Tarjeta a utilizar
            </p>
            <div className="space-y-2">
              {cards.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500 dark:border-white/15 dark:text-slate-400">
                  No payment methods added yet. Agrega una tarjeta en "Mi billetera".
                </div>
              )}
              {cards.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCardId(c.id)}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition",
                    cardId === c.id
                      ? "border-indigo-600 bg-indigo-500/5"
                      : "border-slate-200 dark:border-white/10"
                  )}
                >
                  <div className={cx("grid h-9 w-12 place-items-center rounded-lg bg-gradient-to-br text-white", c.color)}>
                    <BrandMark brand={c.brand} small />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {c.brand} •••• {c.last4}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {c.slot === "primary" ? "Principal" : "Secundaria"} · Exp {c.exp}
                    </p>
                  </div>
                  {cardId === c.id && <Check className="h-5 w-5 text-indigo-600" />}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Balance actual</span>
            <span className="font-semibold">{money(balance(debt))}</span>
          </div>
          <div className="mt-1 flex justify-between text-slate-900 dark:text-white">
            <span>Balance después</span>
            <span className="font-bold">
              {money(
                Math.max(
                  0,
                  isCharge ? balance(debt) + (Number(amount) || 0) : balance(debt) - (Number(amount) || 0)
                )
              )}
            </span>
          </div>
        </div>

        <Button full size="lg" disabled={processing || !amount} onClick={submit} variant={isCharge ? "danger" : "primary"}>
          {processing ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Procesando...
            </>
          ) : (
            <>
              {isCharge ? <Plus className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              {isCharge ? "Agregar cargo" : "Procesar pago"}
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
}

/* ============================== RECEIPT ============================== */

function ReceiptModal({
  receipt,
  debt,
  onClose,
}: {
  receipt: Transaction | null;
  debt: Debt;
  onClose: () => void;
}) {
  const { toast } = useStore();
  if (!receipt) return null;
  const m = txMeta[receipt.type];
  const pdfData = {
    brand: "2PayBack",
    txId: receipt.id.toUpperCase(),
    date: fmtDate(receipt.date),
    time: fmtTime(receipt.date),
    client: debt.debtorName,
    admin: debt.creditorName,
    concept: receipt.concept,
    typeLabel: m.label,
    method: receipt.method || "—",
    amount: money(receipt.amount),
    balanceBefore: money(receipt.balanceBefore),
    balanceAfter: money(receipt.balanceAfter),
    status: "Completado",
  };
  return (
    <Modal open={!!receipt} onClose={onClose}>
      <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white">
          <div className="flex items-center justify-between">
            <BrandLogo size="sm" />
            <Badge tone="emerald">
              <CheckCircle2 className="h-3 w-3" /> Completado
            </Badge>
          </div>
          <p className="mt-4 text-sm text-white/80">Recibo de {m.label.toLowerCase()}</p>
          <p className="text-3xl font-extrabold">{money(receipt.amount)}</p>
        </div>
        <div className="space-y-1 bg-white p-5 dark:bg-slate-900">
          <ReceiptRow label="ID Transacción" value={receipt.id.toUpperCase()} mono />
          <ReceiptRow label="Fecha" value={fmtDate(receipt.date)} />
          <ReceiptRow label="Hora" value={fmtTime(receipt.date)} />
          <ReceiptRow label="Cliente" value={debt.debtorName} />
          <ReceiptRow label="Administrador" value={debt.creditorName} />
          <ReceiptRow label="Concepto" value={receipt.concept} />
          <ReceiptRow label="Tipo" value={m.label} />
          <ReceiptRow label="Método de pago" value={receipt.method || "—"} />
          <ReceiptRow label="Balance anterior" value={money(receipt.balanceBefore)} />
          <ReceiptRow label="Balance nuevo" value={money(receipt.balanceAfter)} />
          <div className="my-3 border-t border-dashed border-slate-200 dark:border-white/10" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Estado</span>
            <Badge tone="emerald">
              <CheckCircle2 className="h-3 w-3" /> Completado
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 bg-white p-5 pt-0 dark:bg-slate-900">
          <Button
            variant="outline"
            onClick={async () => {
              const { downloadReceiptPdf } = await import("./lib/pdf");
              downloadReceiptPdf(pdfData);
              toast({ title: "PDF descargado", desc: "Recibo guardado en tu dispositivo.", variant: "success" });
            }}
          >
            <Download className="h-4 w-4" /> Descargar PDF
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              const { shareReceiptPdf } = await import("./lib/pdf");
              const shared = await shareReceiptPdf(pdfData);
              toast({
                title: shared ? "Recibo compartido" : "PDF descargado",
                desc: shared ? "Enviado correctamente." : "Tu dispositivo no soporta compartir; se descargó.",
                variant: "success",
              });
            }}
          >
            <Share2 className="h-4 w-4" /> Compartir PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ReceiptRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={cx(
          "truncate text-right text-sm font-semibold text-slate-900 dark:text-white",
          mono && "font-mono text-xs"
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* ============================== WALLET ============================== */

function BrandMark({ brand, small }: { brand: CardBrand; small?: boolean }) {
  if (brand === "Visa")
    return <span className={cx("font-extrabold italic", small ? "text-xs" : "text-lg")}>VISA</span>;
  if (brand === "Amex")
    return <span className={cx("font-extrabold", small ? "text-[9px]" : "text-sm")}>AMEX</span>;
  return (
    <div className="flex items-center">
      <span className={cx("rounded-full bg-red-500", small ? "h-3 w-3" : "h-5 w-5")} />
      <span className={cx("-ml-1.5 rounded-full bg-amber-400/90", small ? "h-3 w-3" : "h-5 w-5")} />
    </div>
  );
}

function Wallet2({ onBack }: { onBack: () => void }) {
  const { cards, setPrimaryCard, addCard, removeCard, toast } = useStore();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ brand: "Visa" as CardBrand, number: "", exp: "", holder: CREDITOR_NAME });

  const primary = cards.find((c) => c.slot === "primary");
  const secondary = cards.find((c) => c.slot === "secondary");

  const save = () => {
    const digits = form.number.replace(/\D/g, "");
    const last4 = digits.slice(-4) || "0000";
    addCard({
      brand: form.brand,
      last4,
      exp: form.exp || "12/28",
      holder: form.holder || CREDITOR_NAME,
      slot: cards.length === 0 ? "primary" : "secondary",
      color:
        form.brand === "Visa"
          ? "from-indigo-600 via-violet-600 to-fuchsia-600"
          : form.brand === "Amex"
          ? "from-cyan-600 via-sky-600 to-blue-700"
          : "from-slate-800 via-slate-700 to-zinc-900",
    });
    toast({ title: "Tarjeta agregada", variant: "success" });
    setAdding(false);
    setForm({ brand: "Visa", number: "", exp: "", holder: CREDITOR_NAME });
  };

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="Mi billetera"
        onBack={onBack}
        right={
          <button
            onClick={() => setAdding(true)}
            className="grid h-10 w-10 place-items-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Gestiona tus dos tarjetas: principal y secundaria. Cámbialas según el pago.
      </p>

      <div className="space-y-4">
        {cards.length === 0 && (
          <Card3 className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-500">
              <CreditCard className="h-7 w-7" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">No payment methods added yet.</p>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Agrega una tarjeta para empezar a registrar pagos.
              </p>
            </div>
            <Button onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Add Payment Method
            </Button>
          </Card3>
        )}
        {cards.map((c) => (
          <div key={c.id} className="animate-fade-in">
            <div
              className={cx(
                "relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-xl",
                c.color
              )}
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
              <div className="absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-white/5" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/70">
                    {c.slot === "primary" ? "Tarjeta Principal" : "Tarjeta Secundaria"}
                  </p>
                  {c.slot === "primary" && (
                    <Badge tone="indigo">
                      <Star className="h-3 w-3 fill-current" /> Activa
                    </Badge>
                  )}
                </div>
                <div className="grid h-9 w-12 place-items-center rounded-lg bg-white/15">
                  <BrandMark brand={c.brand} />
                </div>
              </div>
              <div className="relative mt-7 flex items-center gap-3">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="flex gap-1">
                      {[0, 1, 2, 3].map((j) => (
                        <span key={j} className="h-1.5 w-1.5 rounded-full bg-white/70" />
                      ))}
                    </span>
                  ))}
                </div>
                <span className="text-lg font-semibold tracking-widest">{c.last4}</span>
              </div>
              <div className="relative mt-4 flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase text-white/60">Titular</p>
                  <p className="text-sm font-semibold">{c.holder}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-white/60">Expira</p>
                  <p className="text-sm font-semibold">{c.exp}</p>
                </div>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant={c.slot === "primary" ? "secondary" : "outline"}
                className="flex-1"
                onClick={() => {
                  setPrimaryCard(c.id);
                  toast({ title: "Tarjeta activa actualizada", desc: `${c.brand} •••• ${c.last4}`, variant: "info" });
                }}
              >
                <Check className="h-4 w-4" />
                {c.slot === "primary" ? "Tarjeta para pago" : "Usar para pago"}
              </Button>
              {cards.length > 1 && (
                <Button size="sm" variant="ghost" onClick={() => removeCard(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {primary && secondary && (
        <Card3 className="flex items-center gap-3 p-4">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-500">
            <CreditCard className="h-5 w-5" />
          </div>
          <p className="flex-1 text-sm text-slate-600 dark:text-slate-300">
            Alterna tu tarjeta activa entre <b>{primary.brand}</b> y <b>{secondary.brand}</b>.
          </p>
          <Button
            size="sm"
            onClick={() => {
              setPrimaryCard(secondary.id);
              toast({ title: "Tarjetas alternadas", desc: `Activa: ${secondary.brand} •••• ${secondary.last4}`, variant: "info" });
            }}
          >
            Alternar
          </Button>
        </Card3>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Agregar tarjeta">
        <div className="space-y-4">
          <Field label="Marca" icon={CreditCard}>
            <div className="grid grid-cols-3 gap-2">
              {(["Visa", "Mastercard", "Amex"] as CardBrand[]).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, brand: b }))}
                  className={cx(
                    "rounded-2xl border py-2.5 text-sm font-semibold transition",
                    form.brand === b
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300"
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Número de tarjeta" icon={CreditCard}>
            <Input
              value={form.number}
              onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
              placeholder="4242 4242 4242 4242"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Expiración" icon={Calendar}>
              <Input value={form.exp} onChange={(e) => setForm((f) => ({ ...f, exp: e.target.value }))} placeholder="MM/AA" />
            </Field>
            <Field label="Titular" icon={User}>
              <Input value={form.holder} onChange={(e) => setForm((f) => ({ ...f, holder: e.target.value }))} />
            </Field>
          </div>
          <Button full size="lg" onClick={save}>
            <Plus className="h-4 w-4" /> Guardar tarjeta
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ============================== NOTIFICATIONS ============================== */

function Notifications({ onBack }: { onBack: () => void }) {
  const { notifications, readAllNotifications } = useStore();
  useEffect(() => {
    const t = setTimeout(readAllNotifications, 800);
    return () => clearTimeout(t);
  }, []);

  const iconFor = (type: AppNotification["type"]) => {
    if (type === "invite") return { icon: CheckCircle2, tint: "text-violet-500 bg-violet-500/10" };
    return txMeta[type as TxType] || { icon: Bell, tint: "text-slate-500 bg-slate-500/10" };
  };

  return (
    <div className="space-y-5">
      <ScreenHeader title="Notificaciones" onBack={onBack} />
      <Card3 className="divide-y divide-slate-100 dark:divide-white/5">
        {notifications.map((n) => {
          const { icon: Icon, tint } = iconFor(n.type);
          return (
            <div key={n.id} className="flex items-start gap-3 p-4">
              <div className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-2xl", tint)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{n.title}</p>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-indigo-500" />}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{n.body}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {fmtDate(n.date)} · {fmtTime(n.date)}
                </p>
              </div>
            </div>
          );
        })}
      </Card3>
    </div>
  );
}

/* ============================== SETTINGS ============================== */

function SettingsScreen({ onBack, onWallet }: { onBack: () => void; onWallet: () => void }) {
  const { user, dark, toggleDark, logout, cards, resetData, toast } = useStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const rows: { icon: LucideIcon; label: string; desc: string; onClick?: () => void; right?: ReactNode }[] = [
    { icon: User, label: "Perfil", desc: user.email },
    { icon: CreditCard, label: "Métodos de pago", desc: `${cards.length} tarjetas registradas`, onClick: onWallet },
    {
      icon: Bell,
      label: "Notificaciones",
      desc: "Pagos, cargos e intereses",
      right: <Toggle on onChange={() => {}} />,
    },
    {
      icon: dark ? Moon : Sun,
      label: "Apariencia",
      desc: dark ? "Modo oscuro" : "Modo claro",
      right: <Toggle on={dark} onChange={toggleDark} />,
    },
    { icon: ShieldCheck, label: "Seguridad", desc: "Contraseña y biometría", right: <Fingerprint className="h-5 w-5 text-slate-400" /> },
  ];

  return (
    <div className="space-y-5">
      <ScreenHeader title="Configuración" onBack={onBack} />

      <Card3 className="p-5">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} color="from-indigo-500 to-violet-600" size={56} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-slate-900 dark:text-white">{user.name}</p>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Rol activo</p>
          <RoleSwitch />
        </div>
      </Card3>

      <Card3 className="divide-y divide-slate-100 dark:divide-white/5">
        {rows.map((r) => (
          <button
            key={r.label}
            onClick={r.onClick}
            className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-slate-50 dark:hover:bg-white/[.03]"
          >
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300">
              <r.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{r.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{r.desc}</p>
            </div>
            {r.right || <ChevronRight className="h-5 w-5 text-slate-300" />}
          </button>
        ))}
      </Card3>

      <Button full variant="outline" className="text-rose-500" onClick={() => setConfirmReset(true)}>
        <Trash2 className="h-4 w-4" /> Borrar todas las deudas de ejemplo
      </Button>

      <Button full variant="danger" onClick={logout}>
        <LogOut className="h-4 w-4" /> Cerrar sesión
      </Button>
      <p className="pb-2 text-center text-xs text-slate-400">2PayBack v1.0 · Hecho con 💜</p>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Borrar datos de ejemplo">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Se eliminarán <b className="text-slate-900 dark:text-white">todas las deudas</b> y notificaciones
          para que empieces desde cero con tus datos reales. Tus tarjetas se conservan.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => setConfirmReset(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              resetData();
              toast({ title: "Datos borrados", desc: "Empieza a crear tus deudas reales.", variant: "success" });
              setConfirmReset(false);
              onBack();
            }}
          >
            <Trash2 className="h-4 w-4" /> Borrar todo
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ============================== SHELL / NAV ============================== */

type Screen = "dashboard" | "create" | "detail" | "wallet" | "notifications" | "settings";

function AppShell() {
  const { role, dark, toggleDark, notifications, user } = useStore();
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [selected, setSelected] = useState<string | null>(null);
  const unread = notifications.filter((n) => !n.read).length;

  const go = (s: Screen) => setScreen(s);
  const openDebt = (id: string) => {
    setSelected(id);
    setScreen("detail");
  };

  const navItems: { key: Screen; icon: LucideIcon; label: string }[] = [
    { key: "dashboard", icon: LayoutGrid, label: "Inicio" },
    { key: "wallet", icon: CreditCard, label: "Tarjetas" },
    { key: "create", icon: Plus, label: "Crear" },
    { key: "notifications", icon: Bell, label: "Alertas" },
    { key: "settings", icon: SettingsIcon, label: "Ajustes" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <BrandLogo size="sm" />
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300"
            >
              {dark ? <Sun className="h-4.5 w-4.5 h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => go("notifications")}
              className="relative grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                  {unread}
                </span>
              )}
            </button>
            <button onClick={() => go("settings")}>
              <Avatar name={user.name} color="from-indigo-500 to-violet-600" size={36} />
            </button>
          </div>
        </div>
        {screen === "dashboard" && (
          <div className="mx-auto max-w-2xl px-4 pb-3">
            <RoleSwitch />
          </div>
        )}
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-5">
        <div key={screen + (selected || "")} className="animate-fade-in">
          {screen === "dashboard" && <Dashboard onOpen={openDebt} onCreate={() => go("create")} />}
          {screen === "create" && (
            <CreateDebt onBack={() => go("dashboard")} onCreated={(d) => openDebt(d.id)} />
          )}
          {screen === "detail" && selected && (
            <DebtDetail debtId={selected} onBack={() => go("dashboard")} />
          )}
          {screen === "wallet" && <Wallet2 onBack={() => go("dashboard")} />}
          {screen === "notifications" && <Notifications onBack={() => go("dashboard")} />}
          {screen === "settings" && (
            <SettingsScreen onBack={() => go("dashboard")} onWallet={() => go("wallet")} />
          )}
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 bg-white/90 backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-2">
          {navItems.map((it) => {
            const active = screen === it.key;
            if (it.key === "create") {
              return (
                <button
                  key={it.key}
                  onClick={() => go("create")}
                  className="grid h-12 w-12 -translate-y-3 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/40 active:scale-95"
                >
                  <Plus className="h-6 w-6" />
                </button>
              );
            }
            return (
              <button
                key={it.key}
                onClick={() => go(it.key)}
                className={cx(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 transition",
                  active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"
                )}
              >
                <div className="relative">
                  <it.icon className="h-5 w-5" />
                  {it.key === "notifications" && unread > 0 && (
                    <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-rose-500" />
                  )}
                </div>
                <span className="text-[10px] font-semibold">{it.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* ============================== ROOT ============================== */

const STORAGE_KEY = "2payback.state.v1";
const persisted: {
  dark?: boolean;
  debts?: Debt[];
  cards?: Card[];
  notifications?: AppNotification[];
} = (() => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
})();

export default function App() {
  const [dark, setDark] = useState(persisted.dark ?? true);
  const [authed, setAuthed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("admin");
  const [user, setUser] = useState({ email: "", name: "Administrador" });
  const [debts, setDebts] = useState<Debt[]>(isSupabaseConfigured ? [] : persisted.debts ?? seedDebts());
  const [cards, setCards] = useState<Card[]>(isSupabaseConfigured ? [] : persisted.cards ?? []);
  const [notifications, setNotifications] = useState<AppNotification[]>(
    isSupabaseConfigured ? [] : persisted.notifications ?? seedNotifications
  );
  const [toasts, setToasts] = useState<Toast[]>([]);
  const cloud = isSupabaseConfigured && !!userId;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const enter = async (u: { id: string; email?: string; user_metadata?: Record<string, unknown> }) => {
      setUserId(u.id);
      setUser({
        email: u.email ?? "",
        name: (u.user_metadata?.full_name as string) ?? (u.user_metadata?.name as string) ?? u.email ?? "Administrador",
      });
      setAuthed(true);
      try {
        const ws = await dbsvc.loadWorkspace(u.id);
        setDebts(ws.debts);
        setCards(ws.cards);
        setNotifications(ws.notifications);
      } catch (e) {
        toast({ title: "No se pudo cargar tus datos", desc: String((e as Error).message), variant: "warn" });
      }
    };
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) enter(data.session.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        enter(session.user);
      } else {
        setUserId(null);
        setAuthed(false);
        setDebts([]);
        setCards([]);
        setNotifications([]);
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const payload = isSupabaseConfigured
        ? { dark }
        : { dark, debts, cards, notifications };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota errors */
    }
  }, [dark, debts, cards, notifications]);

  const toast = (t: Omit<Toast, "id">) => {
    const id = uid();
    setToasts((p) => [...p, { ...t, id }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 3600);
  };

  const persistErr = (e: unknown) =>
    toast({ title: "No se pudo sincronizar", desc: String((e as Error).message), variant: "warn" });

  const pushNotification: Store["pushNotification"] = (n) => {
    const id = newId();
    setNotifications((p) => [{ ...n, id, date: new Date().toISOString(), read: false }, ...p]);
    if (cloud && userId) dbsvc.addNotificationDb(userId, id, n).catch(() => {});
  };

  const applyPayment: Store["applyPayment"] = (debtId, type, amount, concept, method) => {
    const current = debts.find((d) => d.id === debtId);
    const before = current ? balance(current) : 0;
    const txId = newId();
    const next: Debt | undefined = current && {
      ...current,
      charges: type === "charge" ? current.charges + amount : current.charges,
      interest: type === "interest" ? current.interest + amount : current.interest,
      totalPaid: type === "payment" || type === "extra" ? current.totalPaid + amount : current.totalPaid,
    };
    const after = next ? balance(next) : 0;
    const result: Transaction = {
      id: txId,
      type,
      concept,
      amount,
      date: new Date().toISOString(),
      method,
      balanceBefore: before,
      balanceAfter: after,
    };
    setDebts((prev) =>
      prev.map((d) =>
        d.id === debtId && next ? { ...next, transactions: [...d.transactions, result] } : d
      )
    );
    if (cloud && userId && current)
      dbsvc.addMovementDb(userId, current, type, amount, concept, method, txId).catch(persistErr);
    const labels: Record<TxType, { title: string; variant: Toast["variant"]; notif: string }> = {
      payment: { title: "Pago procesado", variant: "success", notif: "Pago recibido" },
      extra: { title: "Abono libre registrado", variant: "success", notif: "Pago recibido" },
      charge: { title: "Cargo agregado", variant: "warn", notif: "Cargo agregado" },
      interest: { title: "Interés aplicado", variant: "warn", notif: "Interés agregado" },
    };
    const l = labels[type];
    toast({ title: l.title, desc: `${money(amount)} · ${concept}`, variant: l.variant });
    pushNotification({ type, title: l.notif, body: `${money(amount)} · ${concept}` });
    return result;
  };

  const setLateInterest: Store["setLateInterest"] = (debtId, on) => {
    setDebts((prev) => prev.map((d) => (d.id === debtId ? { ...d, lateInterestEnabled: on } : d)));
    if (cloud) dbsvc.setLateInterestDb(debtId, on).catch(persistErr);
  };

  const applyAccruedInterest: Store["applyAccruedInterest"] = (debtId) => {
    const d = debts.find((x) => x.id === debtId);
    if (!d) return;
    const od = daysOverdue(d.nextDueDate);
    if (od <= 0) return;
    applyPayment(debtId, "interest", od * d.dailyLateFee, `Penalización por atraso (${od} días)`);
  };

  const setPrimaryCard: Store["setPrimaryCard"] = (cardId) => {
    setCards((prev) => prev.map((c) => ({ ...c, slot: c.id === cardId ? "primary" : "secondary" })));
    if (cloud && userId) dbsvc.setPrimaryCardDb(userId, cardId).catch(persistErr);
  };

  const addCard: Store["addCard"] = (c) => {
    const id = newId();
    if (c.slot === "primary") setCards((p) => p.map((x) => ({ ...x, slot: "secondary" })));
    setCards((p) => [...p, { ...c, id }]);
    if (cloud && userId) dbsvc.addCardDb(userId, id, c).catch(persistErr);
  };

  const removeCard: Store["removeCard"] = (cardId) => {
    let newPrimary: string | undefined;
    setCards((prev) => {
      const left = prev.filter((c) => c.id !== cardId);
      if (left.length && !left.some((c) => c.slot === "primary")) {
        left[0] = { ...left[0], slot: "primary" };
        newPrimary = left[0].id;
      }
      return [...left];
    });
    if (cloud && userId) dbsvc.removeCardDb(userId, cardId, newPrimary).catch(persistErr);
  };

  const store: Store = {
    dark,
    toggleDark: () => setDark((d) => !d),
    role,
    setRole,
    user,
    debts,
    cards,
    notifications,
    toasts,
    toast,
    dismissToast: (id) => setToasts((p) => p.filter((x) => x.id !== id)),
    addDebt: (d) => {
      setDebts((p) => [d, ...p]);
      if (cloud && userId) dbsvc.createDebtDb(userId, d).catch(persistErr);
    },
    applyPayment,
    setLateInterest,
    applyAccruedInterest,
    setPrimaryCard,
    addCard,
    removeCard,
    readAllNotifications: () => {
      setNotifications((p) => p.map((n) => ({ ...n, read: true })));
      if (cloud && userId) dbsvc.markNotificationsReadDb(userId).catch(() => {});
    },
    pushNotification,
    removeDebt: (id) => {
      setDebts((p) => p.filter((d) => d.id !== id));
      if (cloud) dbsvc.removeDebtDb(id).catch(persistErr);
    },
    resetData: () => {
      const ids = debts.map((d) => d.id);
      setDebts([]);
      setNotifications([]);
      if (cloud && userId) {
        ids.forEach((id) => dbsvc.removeDebtDb(id).catch(() => {}));
        dbsvc.markNotificationsReadDb(userId).catch(() => {});
      }
    },
    logout: () => {
      if (isSupabaseConfigured && supabase) supabase.auth.signOut();
      setAuthed(false);
      toast({ title: "Sesión cerrada", variant: "info" });
    },
  };

  return (
    <StoreCtx.Provider value={store}>
      <ToastHost />
      <InstallPrompt />
      {authed ? (
        <AppShell />
      ) : (
        <AuthScreen
          onAuth={(email) => {
            setUser((u) => ({ ...u, email }));
            setAuthed(true);
            toast({ title: "¡Bienvenido a 2PayBack!", variant: "success" });
          }}
        />
      )}
    </StoreCtx.Provider>
  );
}
