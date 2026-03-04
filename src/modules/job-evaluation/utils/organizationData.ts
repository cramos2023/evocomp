
// Organization field data and options

// Define the available options for each field
export const COUNTRIES = [
  "USA", "Argentina", "Bolivia", "Brazil", "Chile", "Colombia", 
  "Costa Rica", "Ecuador", "El Salvador", "Guatemala", "Mexico", 
  "Nicaragua", "Honduras", "Paraguay", "Panama", "Peru", 
  "Uruguay", "Venezuela"
];

export const ORG_SIZES = Array.from({ length: 20 }, (_, i) => i + 1);

export const DIRECT_REPORTS_OPTIONS = ["Yes", "No"];

export const CAREER_STREAMS = {
  Yes: ["Management"],
  No: ["Professional", "Business Support / Core Jobs"]
};

export const CAREER_FUNCTIONS = [
  "Customer Services",
  "Finance",
  "General Management",
  "Human Resources",
  "Information Technology",
  "Marketing",
  "Operations",
  "Sales"
];

export const JOB_FAMILIES = {
  "Customer Services": [
    "Contact Center - Back Line",
    "Contact Center - Front Line",
    "Customer Services Generalists",
    "Customer Services Process Management",
    "Key Account Management"
  ],
  "Finance": [
    "Controlling",
    "Credit & Collections (OTC)",
    "Finance Generalists",
    "General Ledger Accounting (RTR)"
  ],
  "General Management": [
    "General Management Generalists"
  ],
  "Human Resources": [
    "Compensation & Benefits",
    "Employee/Industrial Relations",
    "HR Generalists",
    "HR Programs & Performance",
    "Resourcing",
    "Talent Management"
  ],
  "Information Technology": [
    "Customer Facing IT",
    "IT Applications Development & Integration",
    "IT Generalists",
    "IT Infrastructure & Systems Administration"
  ],
  "Marketing": [
    "Marketing Generalists"
  ],
  "Operations": [
    "Customer Operations",
    "Customs & Trade Compliance",
    "Gateway Operations",
    "Health, Safety & Environment",
    "Import & Export Operations",
    "Network & Transport Planning/Design",
    "Ops Generalists",
    "Ops Process & Performance",
    "Security",
    "Service Quality",
    "Technical Engineering",
    "Warehouse & Manual Handling"
  ],
  "Sales": [
    "Business Development",
    "Commercial/Pricing",
    "Customer/Account Management",
    "Field Sales",
    "Retail",
    "Sales Administration/Sales Support",
    "Sales Generalists",
    "Tele Sales"
  ]
};

export const CAREER_LEVELS = {
  "Management": [
    "M1.4 Function Head - Country",
    "M2.1 Team Leader",
    "M2.2 Team Supervisor",
    "M2.3 Junior Manager",
    "M2.4 Manager",
    "M2.5 Senior Manager"
  ],
  "Professional": [
    "P1 Entry Professional",
    "P2 Experienced Professional",
    "P3 Senior Professional",
    "P4 Specialist Professional"
  ],
  "Business Support / Core Jobs": [
    "SC1 Entry Business Support/Core Jobs",
    "SC2 Experienced Business Support/Core Jobs",
    "SC3 Senior Business Support/Core Jobs"
  ]
};
