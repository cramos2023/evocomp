import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesPath = path.join(__dirname, '../src/i18n/locales');
const langs = ['en', 'es', 'pt', 'fr', 'it', 'de'];

const newTranslations = {
  en: {
    nav: {
      services: "Services",
      advantage: "The EvoComp Advantage",
      security: "Enterprise Security",
      about: "About Us",
      client_workspace: "Client Workspace"
    },
    hero: {
      title_1: "Expert Compensation",
      title_2: "Consulting — Powered by",
      title_3: "Next-Gen Technology",
      subtitle: "Built for Total Rewards teams across the Americas. We deliver bank-grade, data-driven compensation decisions faster—using EvoComp's interactive scenario engine, not static spreadsheets.",
      cta_workspace: "Client Workspace",
      cta_consultation: "Book a Consultation",
      mono_text: "Not a PDF shop. Not an Excel factory. A secure decision system."
    },
    features: {
      card1_label: "Scenario Execution",
      card1_t1: "What-if pools, matrices, caps, and constraints—deterministic results.",
      card1_t2: "From modeling to execution: budget control, approvals, and governance.",
      card1_t3: "Traceability by design: decisions you can explain in audits.",
      card2_label: "Live System Status",
      card2_m1: "Loading secure tenant workspace…",
      card2_m2: "Validating JWT session token…",
      card2_m3: "Applying Row Level Security policies…",
      card2_m4: "Simulating merit cycle scenarios…",
      card2_m5: "Generating audit trail & evidence pack…",
      card3_label: "Approval Protocol",
      card3_lock: "Lock Scenario",
      card3_status: "Scenario locked • Version stamped"
    },
    manifesto: {
      t1: "The usual question is: What went wrong?",
      t2_1: "We ask: What can be optimized—",
      t2_2: "securely, measurably, fast?",
      t3: ">_ From spreadsheets to a secure decision operating system."
    },
    archive: {
      label: "Archive File 0{{num}}",
      card1_title: "Salary Scenario Modeling & Execution",
      card1_b1: "What-if scenarios across teams, countries, and pay bases.",
      card1_b2: "Pools, matrices, caps, eligibility rules—deterministic outcomes.",
      card1_b3: "Ready for approvals and controlled rollout.",
      card2_title: "Salary & Compensation Structures + Job Architecture",
      card2_b1: "Market-aligned pay bands and job leveling.",
      card2_b2: "Analytical job evaluation and architecture design.",
      card2_b3: "Consistency across geographies in the Americas.",
      card3_title: "Variable Pay Design + Bonus Calculations",
      card3_b1: "Incentive plan design with measurable levers.",
      card3_b2: "Bonus modeling and forecasting tied to performance.",
      card3_b3: "Transparent outputs for Finance and leadership."
    },
    security: {
      title: "Enterprise-Grade Security",
      c1_title: "Bank-Grade Data Protection",
      c1_desc: "Encrypted at rest and in transit. Designed to satisfy the most stringent compliance audits requested by IT and InfoSec stakeholders in large enterprises.",
      c2_title: "Backend & Authentication",
      c2_desc: "Stateless authentication validation via rigorously verified JWT tokens. Every API call requires fresh credential resolution ensuring session integrity.",
      c3_title: "Tenant Isolation (RLS)",
      c3_desc: "Strict Row Level Security implemented directly on the PostgreSQL (Supabase) engine. Cross-tenant data bleeds are mathematically impossible by design."
    },
    pricing: {
      title: "Engagement Models",
      c1_title: "Advisory Essentials",
      c1_b1: "Comp consulting engagements + secure deliverables",
      c1_b2: "Band / job architecture support",
      c1_b3: "Limited workspace access",
      c1_btn: "Request Scope",
      c2_badge: "Recommended",
      c2_title: "EvoComp Workspace",
      c2_b1: "Full scenario engine access + guided consulting",
      c2_b2: "Merit cycle execution workflows",
      c2_b3: "Audit-ready traceability and governance",
      c2_btn: "Book a Consultation",
      c3_title: "Enterprise",
      c3_b1: "Custom security posture alignment",
      c3_b2: "IT review support + controls documentation",
      c3_b3: "Multi-region operating model",
      c3_btn: "Talk to Security"
    },
    footer: {
      badge: "Operating System / Active",
      desc: "Built for auditability, tenant isolation, and bank-grade data protection.",
      sitemap: "Sitemap",
      home: "Home",
      services: "Services",
      advantage: "Advantage",
      security: "Security",
      about: "About Us",
      legal: "Legal & Locale",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      contact: "Contact",
      rights: "© {{year}} EvoComp. All rights reserved."
    }
  },
  es: {
    nav: {
      services: "Servicios",
      advantage: "La Ventaja EvoComp",
      security: "Seguridad Empresarial",
      about: "Nosotros",
      client_workspace: "Workspace"
    },
    hero: {
      title_1: "Consultoría Experta",
      title_2: "en Compensación — Impulsada por",
      title_3: "Tecnología de Próxima Generación",
      subtitle: "Construido para equipos de Recompensas Totales en América. Entregamos decisiones basadas en datos e impermeables a auditorías con mayor rapidez—usando el motor interactivo de EvoComp, no hojas de cálculo estáticas.",
      cta_workspace: "Workspace de Cliente",
      cta_consultation: "Agendar una Consulta",
      mono_text: "No somos una fábrica de PDFs o Excels. Somos un sistema de decisión."
    },
    features: {
      card1_label: "Ejecución de Escenarios",
      card1_t1: "Escenarios what-if de presupuestos, matrices, topes y reglas con resultados determinísticos.",
      card1_t2: "Del modelado a la ejecución: control de presupuestos, aprobaciones y gobernanza.",
      card1_t3: "Trazabilidad por diseño: decisiones que puedes justificar en auditorías.",
      card2_label: "Estado del Sistema",
      card2_m1: "Cargando workspace de cliente seguro…",
      card2_m2: "Validando sesión JWT…",
      card2_m3: "Aplicando políticas de seguridad Row Level Security (RLS)…",
      card2_m4: "Simulando escenarios del ciclo de mérito…",
      card2_m5: "Generando pistas de auditoría y paquete de evidencias…"
    },
    manifesto: {
      t1: "La pregunta habitual es: ¿Qué salió mal?",
      t2_1: "Nosotros preguntamos: ¿Qué se puede optimizar—",
      t2_2: "de forma segura, medible y rápida?",
      t3: ">_ De simples hojas de cálculo a un sistema operativo de decisiones."
    },
    archive: {
      label: "Archivo 0{{num}}",
      card1_title: "Modelado y Ejecución de Escenarios Salariales",
      card1_b1: "Escenarios tipo 'what-if' en equipos, países y bases de pago.",
      card1_b2: "Bolsas de presupuesto, matrices, topes, elegibilidad—resultados trazables.",
      card1_b3: "Listos para flujos de aprobación y lanzamiento controlado.",
      card2_title: "Estructuras Salariales y Arquitectura de Puestos",
      card2_b1: "Bandas salariales alineadas al mercado y valoración de puestos.",
      card2_b2: "Sistemas analíticos de evaluación de desempeño y diseño organizacional.",
      card2_b3: "Consistencia garantizada a lo largo del continente Americano.",
      card3_title: "Diseño de Pago Variable + Bonos",
      card3_b1: "Diseño de planes de incentivos con aceleradores medibles.",
      card3_b2: "Modelado de bonos atado al desempeño operacional.",
      card3_b3: "Salidas y dashboards transparentes para Finanzas y Dirección."
    },
    security: {
      title: "Seguridad de Grado Empresarial",
      c1_title: "Protección a Nivel Bancario",
      c1_desc: "Datos encriptados en reposo y tránsito. Diseñado para satisfacer las auditorías más exigentes de InfoSec y TI corporativo.",
      c2_title: "Backend e Identidad Autenticada",
      c2_desc: "Validación estricta y sin estado a través de tokens JWT. Cada petición de API exige una validación de seguridad asegurando la integridad de sesión.",
      c3_title: "Aislamiento de Clientes (RLS)",
      c3_desc: "Políticas ríspidas de Nivel de Fila implementadas directamente en el motor PostgreSQL. Por diseño es matemáticamente imposible que los datos se crucen."
    },
    pricing: {
      title: "Modelos de Interacción",
      c1_title: "Consultoría Esencial",
      c1_b1: "Horas de consultoría y modelos estratégicos a medida",
      c1_b2: "Acompañamiento en diseño e implementación de bandas / tabuladores",
      c1_b3: "Acceso limitado a lecturas en el Workspace",
      c1_btn: "Solicitar Presupuesto",
      c2_badge: "Recomendado",
      c2_title: "Workspace EvoComp",
      c2_b1: "Acompañamiento dedicado + Acceso sin limitantes al motor",
      c2_b2: "Flujos automatizados de ejecución del ciclo de mérito",
      c2_b3: "Auditorías de gobernanza exportables en pdf",
      c2_btn: "Agendar Demo Segura",
      c3_title: "Gobierno Corporativo",
      c3_b1: "Alineamiento a políticas personalizadas de infosec",
      c3_b2: "Documentación certificada de controles IT",
      c3_b3: "Modelo operativo global con bases en compliance corporativo",
      c3_btn: "Hablar con Seguridad"
    },
    footer: {
      badge: "Operating System / Activa",
      desc: "Autenticidad, segregación de base de datos multitenant, protección impenetrable de capa 4/7.",
      sitemap: "Sitemap",
      home: "Inicio",
      services: "Servicios",
      advantage: "Ventaja Competitiva",
      security: "Seguridad InfoSec",
      about: "Acerca de la Firma",
      legal: "Legales y Locales",
      privacy: "Políticas de Privacidad",
      terms: "Términos de Operación",
      contact: "Contacto",
      rights: "© {{year}} EvoComp. Derechos y patentes reservadas."
    }
  },
  pt: {
    nav: {
      services: "Serviços",
      advantage: "A Vantagem EvoComp",
      security: "Segurança de Nível Empresarial",
      about: "Sobre Nós",
      client_workspace: "Client Workspace"
    },
    hero: {
      title_1: "Consultoria Especializada",
      title_2: "em Remuneração — Impulsionada por",
      title_3: "Tecnologia de Próxima Geração",
      subtitle: "Construído para equipes de Recompensas Totais (Total Rewards) nas Américas. Entregamos decisões confiáveis, focadas em dados e invioláveis para auditorias mais rapidamente—utilizando o motor moderno da EvoComp.",
      cta_workspace: "Workspace Seguro",
      cta_consultation: "Agende uma Reunião",
      mono_text: "Não somos mais um sistema de PDfs estáticos. Garantimos segurança e escalabilidade."
    },
    features: {
      card1_label: "Execução de Cenários Multidimensionais",
      card1_t1: "Módulos predefinidos com teto financeiro e aprovações integradas.",
      card1_t2: "Do plano teórico a folha real: gerencie todo o fluxo orçamentário e legal.",
      card1_t3: "Rastreabilidade e governança desde a tela um.",
      card2_label: "Live System Logs",
      card2_m1: "Inicializando sandbox seguro…",
      card2_m2: "Verificando token de integridade JWT…",
      card2_m3: "Injetando políticas de restrição cruzada RLS…",
      card2_m4: "Aguardando payload para o ciclo de compensação…",
      card2_m5: "Registro gravado sem intercorrências…"
    },
    manifesto: {
      t1: "Muitos buscam saber: Quem errou durante o comitê?",
      t2_1: "Nós mudamos o paradigma: O que pode ser modelado—",
      t2_2: "com maior visibilidade, agilidade e proteção?",
      t3: ">_ Migre das instabilidades das planilhas para a inteligência operacional."
    },
    archive: {
      label: "Arquivo 0{{num}}",
      card1_title: "Modelagem de Ciclos de Remuneração Focado",
      card1_b1: "Visões hipotéticas ao longo de jurisdições e moedas.",
      card1_b2: "Diretrizes e matriz de consistência com resultados auditáveis.",
      card1_b3: "Workflow pronto para análise hierárquica e implantação orgânica.",
      card2_title: "Alinhamento e Estruturas Ocupacionais Sistêmicas",
      card2_b1: "Bandas salariais paramétricas vinculadas com as pesquisas.",
      card2_b2: "Design e estruturação arquitetônica.",
      card2_b3: "Homogeneidade transnacional nas Américas.",
      card3_title: "Pacotes Dinâmicos de Bônus e Variáveis",
      card3_b1: "Avaliações baseadas em indicadores quantificáveis.",
      card3_b2: "Ajuste na balança por níveis macro de performance organizacional.",
      card3_b3: "Distribuição íntegra aprovada com chave gerencial."
    },
    security: {
      title: "Segurança Implacável e Integrada",
      c1_title: "Protocolo Bancário",
      c1_desc: "A base de dados é cifrada garantindo tranquilidade máxima com base nos mais exigentes frameworks (SOC, PII constraints local).",
      c2_title: "Infraestrutura Backend e Tokens",
      c2_desc: "Uma camada de verificação Stateless de altíssima eficiência, invalidando automaticamente origens suspeitas sem perda de log.",
      c3_title: "Segregação Abstrata de Base de Dados",
      c3_desc: "Uma barreira de aço contra acesso não autorizado de multi-tenants. Vazamento é evitado no kernel do Postgres limitando os fetches as row level keys."
    },
    pricing: {
      title: "Modelos e Acordos Analíticos",
      c1_title: "Apoio Consultivo Essencial",
      c1_b1: "Horas aplicadas na estratégia tática",
      c1_b2: "Definição de steps ou grades",
      c1_b3: "Navegação por relatórios sintéticos",
      c1_btn: "Enviar Solicitação",
      c2_badge: "Recomendado",
      c2_title: "Workspace Ativo e Híbrido",
      c2_b1: "Experiências e consultoria junto a ferramentas operacionais",
      c2_b2: "Controle hierárquico sob o budget matrixizado",
      c2_b3: "Certificação em papel timbrado digitalmente auditável",
      c2_btn: "Solicite o Caso de Sucesso",
      c3_title: "Expansão Nível Corporativo",
      c3_b1: "Trilha exaustiva de adequação perante board e investidor",
      c3_b2: "Respostas ativas para tickets da TI",
      c3_b3: "Multimoeda, multipais sob umbrella do HQ",
      c3_btn: "Central de Segurança"
    },
    footer: {
      badge: "Operating System / Protegido",
      desc: "Especialismo de altíssimo nível protegido por barreiras em 360",
      sitemap: "Sitemap",
      home: "Principal",
      services: "Módulos e Serviços",
      advantage: "Fatores Critícos",
      security: "Engenharia Segura",
      about: "Quem somos Equipe",
      legal: "Guias Legais",
      privacy: "Aviso de Privacidade Global",
      terms: "Direitos e Acordos",
      contact: "Centro Integrado",
      rights: "© {{year}} EvoComp. Marca registrada."
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
    data.landing = newTranslations[lang];
    // Add extra card features in case missing in es/pt
    data.landing.features.card3_label = newTranslations[lang].features.card3_label || newTranslations.en.features.card3_label;
    data.landing.features.card3_lock = newTranslations[lang].features.card3_lock || newTranslations.en.features.card3_lock;
    data.landing.features.card3_status = newTranslations[lang].features.card3_status || newTranslations.en.features.card3_status;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Updated ${lang}/common.json`);
  }
});
