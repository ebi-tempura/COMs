import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getLocale,
  LANGUAGES,
  translate,
  translateGroupedValue,
  translateMapValue,
  translateWorkflowMessage,
} from "./translations";

const STORAGE_KEY = "comsLanguage";
const LanguageContext = createContext(null);

function getInitialLanguage() {
  if (typeof window === "undefined") {
    return LANGUAGES.ENGLISH;
  }

  const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
  if (Object.values(LANGUAGES).includes(storedLanguage)) {
    return storedLanguage;
  }

  return window.navigator.language?.toLowerCase().startsWith("es")
    ? LANGUAGES.SPANISH_MX
    : LANGUAGES.ENGLISH;
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage);
  const locale = getLocale(language);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key, variables) => translate(language, key, variables),
    [language]
  );

  const statusLabel = useCallback(
    (status) => translateMapValue(language, "statusLabels", status),
    [language]
  );

  const roleLabel = useCallback(
    (role) => translateMapValue(language, "roleLabels", role),
    [language]
  );

  const actionLabel = useCallback(
    (action) => translateMapValue(language, "actionLabels", action),
    [language]
  );

  const fieldLabel = useCallback(
    (field) => translateMapValue(language, "fieldLabels", field),
    [language]
  );

  const valueLabel = useCallback(
    (groupName, value) => translateGroupedValue(language, groupName, value),
    [language]
  );

  const userName = useCallback(
    (userOrName) => {
      if (typeof userOrName === "string") {
        return translateMapValue(language, "userNamesByName", userOrName);
      }

      if (!userOrName) {
        return "";
      }

      const translatedById = translateMapValue(
        language,
        "userNames",
        userOrName.id
      );

      return translatedById !== userOrName.id
        ? translatedById
        : translateMapValue(
            language,
            "userNamesByName",
            userOrName.name
          );
    },
    [language]
  );

  const displayValue = useCallback(
    (value) => {
      if (value === null || value === undefined || value === "") {
        return t("common.none");
      }

      if (typeof value === "object") {
        return JSON.stringify(value);
      }

      const text = String(value);
      const mappedValues = [
        statusLabel(text),
        roleLabel(text),
        valueLabel("priority", text),
        valueLabel("category", text),
        valueLabel("workOrderType", text),
        valueLabel("supplierType", text),
        valueLabel("paymentMethod", text),
        userName(text),
      ];

      return mappedValues.find((mapped) => mapped !== text) ?? text;
    },
    [roleLabel, statusLabel, t, userName, valueLabel]
  );

  const workflowMessage = useCallback(
    (message) => translateWorkflowMessage(language, message),
    [language]
  );

  const formatCurrency = useCallback(
    (value, currency = "MXN") =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(Number(value) || 0),
    [locale]
  );

  const formatDateTime = useCallback(
    (timestamp) => {
      if (!timestamp) {
        return t("common.unknownTime");
      }

      return new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(timestamp));
    },
    [locale, t]
  );

  const value = useMemo(
    () => ({
      language,
      locale,
      setLanguage,
      t,
      statusLabel,
      roleLabel,
      actionLabel,
      fieldLabel,
      valueLabel,
      userName,
      displayValue,
      workflowMessage,
      formatCurrency,
      formatDateTime,
    }),
    [
      actionLabel,
      displayValue,
      fieldLabel,
      formatCurrency,
      formatDateTime,
      language,
      locale,
      roleLabel,
      statusLabel,
      t,
      userName,
      valueLabel,
      workflowMessage,
    ]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}
