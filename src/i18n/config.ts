import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files (we will create these next)
import enCommon from './locales/en/common.json';
import esCommon from './locales/es/common.json';
import ptCommon from './locales/pt/common.json';
import frCommon from './locales/fr/common.json';
import deCommon from './locales/de/common.json';
import itCommon from './locales/it/common.json';

// Job Evaluation specific translations
import enJobEval from '../modules/job-evaluation/translations/en.json';
import esJobEval from '../modules/job-evaluation/translations/es.json';
import ptJobEval from '../modules/job-evaluation/translations/pt.json';
import frJobEval from '../modules/job-evaluation/translations/fr.json';
import deJobEval from '../modules/job-evaluation/translations/de.json';
import itJobEval from '../modules/job-evaluation/translations/it.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, jobEvaluation: enJobEval },
      es: { common: esCommon, jobEvaluation: esJobEval },
      pt: { common: ptCommon, jobEvaluation: ptJobEval },
      fr: { common: frCommon, jobEvaluation: frJobEval },
      de: { common: deCommon, jobEvaluation: deJobEval },
      it: { common: itCommon, jobEvaluation: itJobEval },
    },
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
