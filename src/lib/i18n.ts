import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  es: {
    translation: {
      auth: {
        welcome: "Bienvenido de nuevo",
        create: "Crea tu cuenta",
        subtitle: "Administra préstamos, ventas financiadas y acuerdos privados con total claridad.",
        login: "Iniciar sesión",
        register: "Registrarse",
        email: "Email",
        password: "Contraseña",
        confirm: "Confirmar contraseña",
        remember: "Recordarme",
        forgot: "¿Olvidaste tu contraseña?",
        createBtn: "Crear cuenta",
        processing: "Procesando...",
        continueWith: "o continúa con",
        terms: "Al continuar aceptas los Términos y la Política de privacidad de 2PayBack.",
      },
      nav: {
        home: "Inicio",
        contracts: "Contratos",
        create: "Crear",
        alerts: "Alertas",
        settings: "Ajustes",
        wallet: "Billetera",
      },
      settings: {
        title: "Configuración",
        account: "Cuenta",
        notifications: "Notificaciones",
        appearance: "Apariencia",
        preferences: "Preferencias",
        security: "Seguridad",
        support: "Soporte",
        info: "Información",
        viewMode: "Modo de vista (demo)",
        logout: "Cerrar sesión",
        language: "Idioma",
        currency: "Moneda",
        dateFormat: "Formato de fecha",
        light: "Claro",
        dark: "Oscuro",
        auto: "Automático",
        profile: "Perfil",
        bankAccount: "Cuenta bancaria para recibir pagos",
        paymentMethods: "Métodos de pago",
      },
      common: {
        save: "Guardar cambios",
        cancel: "Cancelar",
        delete: "Eliminar",
        pay: "Pagar",
        add: "Agregar",
        admin: "Administrador",
        client: "Cliente",
      },
    },
  },
  en: {
    translation: {
      auth: {
        welcome: "Welcome back",
        create: "Create your account",
        subtitle: "Manage loans, financed sales and private agreements with total clarity.",
        login: "Sign in",
        register: "Sign up",
        email: "Email",
        password: "Password",
        confirm: "Confirm password",
        remember: "Remember me",
        forgot: "Forgot your password?",
        createBtn: "Create account",
        processing: "Processing...",
        continueWith: "or continue with",
        terms: "By continuing you accept 2PayBack's Terms and Privacy Policy.",
      },
      nav: {
        home: "Home",
        contracts: "Contracts",
        create: "New",
        alerts: "Alerts",
        settings: "Settings",
        wallet: "Wallet",
      },
      settings: {
        title: "Settings",
        account: "Account",
        notifications: "Notifications",
        appearance: "Appearance",
        preferences: "Preferences",
        security: "Security",
        support: "Support",
        info: "Information",
        viewMode: "View mode (demo)",
        logout: "Sign out",
        language: "Language",
        currency: "Currency",
        dateFormat: "Date format",
        light: "Light",
        dark: "Dark",
        auto: "Automatic",
        profile: "Profile",
        bankAccount: "Bank account to receive payments",
        paymentMethods: "Payment methods",
      },
      common: {
        save: "Save changes",
        cancel: "Cancel",
        delete: "Delete",
        pay: "Pay",
        add: "Add",
        admin: "Administrator",
        client: "Client",
      },
    },
  },
};

const stored = (() => {
  try {
    return JSON.parse(localStorage.getItem("2payback.prefs") || "{}").language as string | undefined;
  } catch {
    return undefined;
  }
})();

i18n.use(initReactI18next).init({
  resources,
  lng: stored || (navigator.language?.startsWith("en") ? "en" : "es"),
  fallbackLng: "es",
  interpolation: { escapeValue: false },
});

export default i18n;
