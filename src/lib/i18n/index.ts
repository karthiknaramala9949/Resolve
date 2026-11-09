import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English Resource Bundles
import enCommon from '@/locales/en/common.json';
import enLanding from '@/locales/en/landing.json';
import enCases from '@/locales/en/cases.json';
import enDocuments from '@/locales/en/documents.json';
import enPurchases from '@/locales/en/purchases.json';
import enHelp from '@/locales/en/help.json';
import enReminders from '@/locales/en/reminders.json';
import enPrivacy from '@/locales/en/privacy.json';

export const resources = {
  en: {
    common: enCommon,
    translation: enCommon,
    landing: enLanding,
    cases: enCases,
    documents: enDocuments,
    purchases: enPurchases,
    help: enHelp,
    reminders: enReminders,
    privacy: enPrivacy,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: [
    'common',
    'translation',
    'landing',
    'cases',
    'documents',
    'purchases',
    'help',
    'reminders',
    'privacy',
  ],
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
