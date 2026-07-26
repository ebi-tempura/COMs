import { useLanguage } from "../../i18n/LanguageContext";
import { LANGUAGES } from "../../i18n/translations";

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <label className="language-switcher">
      <span>{t("common.language")}</span>
      <select
        aria-label={t("common.language")}
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
      >
        <option value={LANGUAGES.ENGLISH}>{t("common.english")}</option>
        <option value={LANGUAGES.SPANISH_MX}>
          {t("common.spanishMexico")}
        </option>
      </select>
    </label>
  );
}
