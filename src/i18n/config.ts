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

import enGuide from './locales/en/guide.json';
import esGuide from './locales/es/guide.json';
import ptGuide from './locales/pt/guide.json';
import frGuide from './locales/fr/guide.json';
import deGuide from './locales/de/guide.json';
import itGuide from './locales/it/guide.json';

import enScenariosGuide from './locales/en/scenarios_guide.json';
import esScenariosGuide from './locales/es/scenarios_guide.json';
import ptScenariosGuide from './locales/pt/scenarios_guide.json';
import frScenariosGuide from './locales/fr/scenarios_guide.json';
import deScenariosGuide from './locales/de/scenarios_guide.json';
import itScenariosGuide from './locales/it/scenarios_guide.json';

// Job Evaluation specific translations
import enJobEval from '../modules/job-evaluation/translations/en.json';
import esJobEval from '../modules/job-evaluation/translations/es.json';
import ptJobEval from '../modules/job-evaluation/translations/pt.json';
import frJobEval from '../modules/job-evaluation/translations/fr.json';
import deJobEval from '../modules/job-evaluation/translations/de.json';
import itJobEval from '../modules/job-evaluation/translations/it.json';

// Job Evaluation Guide translations
import enJobEvalGuide from '../modules/job-evaluation/translations/guide/en.json';
import esJobEvalGuide from '../modules/job-evaluation/translations/guide/es.json';
import ptJobEvalGuide from '../modules/job-evaluation/translations/guide/pt.json';
import frJobEvalGuide from '../modules/job-evaluation/translations/guide/fr.json';
import deJobEvalGuide from '../modules/job-evaluation/translations/guide/de.json';
import itJobEvalGuide from '../modules/job-evaluation/translations/guide/it.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, jobEvaluation: enJobEval, jobEvaluationGuide: enJobEvalGuide, guide: enGuide, scenarios_guide: enScenariosGuide },
      es: { common: esCommon, jobEvaluation: esJobEval, jobEvaluationGuide: esJobEvalGuide, guide: esGuide, scenarios_guide: esScenariosGuide },
      pt: { common: ptCommon, jobEvaluation: ptJobEval, jobEvaluationGuide: ptJobEvalGuide, guide: ptGuide, scenarios_guide: ptScenariosGuide },
      fr: { common: frCommon, jobEvaluation: frJobEval, jobEvaluationGuide: frJobEvalGuide, guide: frGuide, scenarios_guide: frScenariosGuide },
      de: { common: deCommon, jobEvaluation: deJobEval, jobEvaluationGuide: deJobEvalGuide, guide: deGuide, scenarios_guide: deScenariosGuide },
      it: { common: itCommon, jobEvaluation: itJobEval, jobEvaluationGuide: itJobEvalGuide, guide: itGuide, scenarios_guide: itScenariosGuide },
    },
    fallbackLng: 'en',
    ns: ['common', 'guide', 'scenarios_guide', 'jobEvaluation', 'jobEvaluationGuide'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    parseMissingKeyHandler: (key) => {
      if (key.startsWith('paybands.')) {
        if (import.meta.env.DEV) {
          console.warn(`Missing i18n key: ${key}`);
          return `[MISSING] ${key}`;
        }
        return ''; // Don't show literal paybands keys in production
      }
      return key;
    }
  });

export default i18n;
// Cache-buster: 2026-03-11T06:33:00Z - Forcing HMR JSON reload for IT/DE
