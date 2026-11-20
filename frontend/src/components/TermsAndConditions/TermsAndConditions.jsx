import { useLanguage } from "../../i18n/LanguageContext";
export const TERMS_VERSION = "2026-10-26";

export default function TermsAndConditions() {
  const { ui } = useLanguage();
  return (
    <>
      <h2>{ui("Terms and Conditions")}</h2>

      <h3>{ui("Your data stays yours")}</h3>
      <p>
        {ui("COMs processes building, user, and supplier information only to provide, secure, and support the service, follow the customer's instructions, or meet legal obligations.")}
      </p>
      <p>
        {ui("We do not sell or rent this information, use it for advertising, approach suppliers for business, or share user and supplier contacts for marketing.")}
      </p>
      <p>
        {ui("Service providers may process information only as necessary to deliver the service, subject to confidentiality and restrictions on independent use.")}
      </p>

      <h3>{ui("Protection of the platform")}</h3>
      <p>
        {ui("Except where permitted by applicable law or authorized in writing, you must not copy, distribute, reverse engineer, decompile, or attempt to extract the platform's source code. You must not use its proprietary code or confidential information to create or help create a competing product.")}
      </p>

      <p>{ui("Version:")} {TERMS_VERSION}</p>
    </>
  );
}