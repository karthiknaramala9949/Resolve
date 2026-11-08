import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English
import enCommon from '@/locales/en/common.json';
import enLanding from '@/locales/en/landing.json';
import enCases from '@/locales/en/cases.json';
import enDocuments from '@/locales/en/documents.json';
import enPurchases from '@/locales/en/purchases.json';
import enHelp from '@/locales/en/help.json';
import enReminders from '@/locales/en/reminders.json';
import enPrivacy from '@/locales/en/privacy.json';
import enSettings from '@/locales/en/settings.json';

// Hindi
import hiCommon from '@/locales/hi/common.json';
import hiLanding from '@/locales/hi/landing.json';
import hiCases from '@/locales/hi/cases.json';
import hiDocuments from '@/locales/hi/documents.json';
import hiPurchases from '@/locales/hi/purchases.json';
import hiHelp from '@/locales/hi/help.json';
import hiReminders from '@/locales/hi/reminders.json';
import hiPrivacy from '@/locales/hi/privacy.json';
import hiSettings from '@/locales/hi/settings.json';

// Telugu
import teCommon from '@/locales/te/common.json';
import teLanding from '@/locales/te/landing.json';
import teCases from '@/locales/te/cases.json';
import teDocuments from '@/locales/te/documents.json';
import tePurchases from '@/locales/te/purchases.json';
import teHelp from '@/locales/te/help.json';
import teReminders from '@/locales/te/reminders.json';
import tePrivacy from '@/locales/te/privacy.json';
import teSettings from '@/locales/te/settings.json';

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
    settings: enSettings,
  },
  hi: {
    common: hiCommon,
    translation: hiCommon,
    landing: hiLanding,
    cases: hiCases,
    documents: hiDocuments,
    purchases: hiPurchases,
    help: hiHelp,
    reminders: hiReminders,
    privacy: hiPrivacy,
    settings: hiSettings,
  },
  te: {
    common: teCommon,
    translation: teCommon,
    landing: teLanding,
    cases: teCases,
    documents: teDocuments,
    purchases: tePurchases,
    help: teHelp,
    reminders: teReminders,
    privacy: tePrivacy,
    settings: teSettings,
  },
};

const savedLocale =
  typeof window !== 'undefined'
    ? localStorage.getItem('resolve-one-locale') || 'en'
    : 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: savedLocale,
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
    'settings',
  ],
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
