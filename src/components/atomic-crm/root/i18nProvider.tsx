import { mergeTranslations } from "ra-core";
import polyglotI18nProvider from "ra-i18n-polyglot";
import englishMessages from "ra-language-english";
const authEnglishMessages = {
  auth: {
    password_reset: "Check your emails for a Reset Password message.",
  },
};

export const i18nProvider = polyglotI18nProvider(
  () => {
    return mergeTranslations(englishMessages, authEnglishMessages);
  },
  "en",
  [{ locale: "en", name: "English" }],
  { allowMissing: true },
);
