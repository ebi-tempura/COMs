export const TERMS_VERSION = "2026-10-26";

export default function TermsAndConditions() {
  return (
    <>
      <h2>Terms and Conditions</h2>

      <h3>Your data stays yours</h3>
      <p>
        COMs processes building, user, and supplier information only to
        provide, secure, and support the service, follow the customer's
        instructions, or meet legal obligations.
      </p>
      <p>
        We do not sell or rent this information, use it for advertising,
        approach suppliers for business, or share user and supplier
        contacts for marketing.
      </p>
      <p>
        Service providers may process information only as necessary to
        deliver the service, subject to confidentiality and restrictions
        on independent use.
      </p>

      <h3>Protection of the platform</h3>
      <p>
        Except where permitted by applicable law or authorized in
        writing, you must not copy, distribute, reverse engineer,
        decompile, or attempt to extract the platform's source code.
        You must not use its proprietary code or confidential
        information to create or help create a competing product.
      </p>

      <p>Version: {TERMS_VERSION}</p>
    </>
  );
}