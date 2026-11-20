import Card from "../../components/common/Card";
import LanguageSwitcher from "../../components/common/LanguageSwitcher";
import { useLanguage } from "../../i18n/LanguageContext";

export default function Settings() {
  const { t } = useLanguage();

  return (
    <>
      <header className="page-header">
        <h1>{t("nav.settings")}</h1>
      </header>
      <Card>
        <LanguageSwitcher />
      </Card>
    </>
  );
}
