import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesPath = path.join(__dirname, '../src/i18n/locales');
const langs = ['en', 'es', 'pt', 'fr', 'it', 'de'];

const newTranslations = {
  en: {
    header: {
      title: "EvoComp Workspace",
      subtitle: "Secure Tenant Environment",
      badge: "WORKSPACE ACTIVE",
      logout: "Secure Sign Out"
    },
    hero: {
      welcome: "Welcome to your ",
      highlight: "Strategic Hub",
      desc: "Select a module to enter the secure environment. Your current session isolates all operations strictly to your tenant data architecture."
    },
    modules: {
      m1: {
        title: "Compensation Scenarios",
        desc: "Model, simulate, and execute merit cycles across teams and geographies with audit-ready deterministic outputs."
      },
      m2: {
        title: "Pay Bands & Structures",
        desc: "Establish market-aligned pay bands, analytical job leveling, and structured compensation consistency."
      },
      m3: {
        title: "Job Architecture & Evaluation",
        desc: "Design analytical job structures, levels, and mappings to ensure internal equity and market alignment."
      },
      m4: {
        title: "Variable Pay",
        desc: "Design incentive plans with measurable levers, matrix thresholds, and performance-based outcomes."
      },
      m5: {
        title: "Bonus Calculations",
        desc: "Forecast, model, and distribute variable compensation based on complex performance metrics."
      },
      badges: {
        active: "Active",
        concept: "Concept"
      },
      actions: {
        launch: "Launch Module",
        preview: "Preview Roadmap"
      }
    }
  },
  es: {
    header: {
      title: "EvoComp Workspace",
      subtitle: "Entorno Seguro del Cliente",
      badge: "WORKSPACE ACTIVO",
      logout: "Cerrar Sesión Segura"
    },
    hero: {
      welcome: "Bienvenido a tu ",
      highlight: "Hub Estratégico",
      desc: "Selecciona un módulo para ingresar al entorno seguro. Tu sesión actual aísla todas las operaciones estrictamente a la arquitectura de datos de tu organización (tenant)."
    },
    modules: {
      m1: {
        title: "Escenarios de Compensación",
        desc: "Modela, simula y ejecuta ciclos de mérito en todos los equipos y geografías con resultados determinísticos listos para auditoría."
      },
      m2: {
        title: "Bandas Salariales y Estructuras",
        desc: "Establece bandas de pago alineadas al mercado, valoración analítica de puestos y consistencia en la compensación."
      },
      m3: {
        title: "Arquitectura y Evaluación de Puestos",
        desc: "Diseña estructuras analíticas de puestos, niveles y mapeos para asegurar equidad interna y alineación de mercado."
      },
      m4: {
        title: "Pago Variable",
        desc: "Diseña planes de incentivos con aceleradores medibles, matrices de umbrales y resultados basados en desempeño."
      },
      m5: {
        title: "Cálculo de Bonos",
        desc: "Pronostica, modela y distribuye compensación variable basada en métricas de desempeño complejas."
      },
      badges: {
        active: "Activo",
        concept: "Concepto"
      },
      actions: {
        launch: "Iniciar Módulo",
        preview: "Ver Roadmap"
      }
    }
  },
  pt: {
    header: {
      title: "EvoComp Workspace",
      subtitle: "Ambiente Seguro do Cliente",
      badge: "WORKSPACE ATIVO",
      logout: "Sair com Segurança"
    },
    hero: {
      welcome: "Bem-vindo ao seu ",
      highlight: "Hub Estratégico",
      desc: "Selecione um módulo para entrar no ambiente seguro. Sua sessão atual isola todas as operações estritamente à arquitetura de dados do seu tenant."
    },
    modules: {
      m1: {
        title: "Cenários de Remuneração",
        desc: "Modele, simule e execute ciclos de mérito em equipes e geografias com resultados determinísticos prontos para auditoria."
      },
      m2: {
        title: "Faixas Salariais e Estruturas",
        desc: "Estabeleça faixas de pagamento alinhadas ao mercado, nivelamento analítico de cargos e consistência estrutural."
      },
      m3: {
        title: "Arquitetura e Avaliação de Cargos",
        desc: "Projete estruturas de cargos, níveis e mapeamentos para garantir equidade interna e alinhamento de mercado."
      },
      m4: {
        title: "Remuneração Variável",
        desc: "Projete planos de incentivo com alavancas mensuráveis, matrizes de limites e resultados baseados em desempenho."
      },
      m5: {
        title: "Cálculo de Bônus",
        desc: "Faça previsões, modele e distribua remuneração variável com base em métricas de desempenho complexas."
      },
      badges: {
        active: "Ativo",
        concept: "Conceito"
      },
      actions: {
        launch: "Iniciar Módulo",
        preview: "Ver Roadmap"
      }
    }
  }
};

// Fill out the remaining 3 languages with english baseline
langs.forEach(lang => {
  if (!newTranslations[lang]) {
    newTranslations[lang] = newTranslations.en;
  }
});

Object.keys(newTranslations).forEach(lang => {
  const filePath = path.join(localesPath, lang, 'common.json');
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data.workspace_hub = newTranslations[lang];
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Updated ${lang}/common.json with workspace_hub`);
  }
});
