export type StageId =
  | 'consultation'
  | 'bid_preparation'
  | 'award'
  | 'contract'
  | 'execution'
  | 'provisional_reception'
  | 'final_reception'
  | 'invoicing';

export type InvoiceStatus = 'drafted' | 'submitted' | 'validated' | 'paid';

export interface Invoice {
  id: string;
  label: string;
  amount: number;
  status: InvoiceStatus;
  submittedDate?: string;
  paidDate?: string;
  notes?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  reference: string;
  client: string;
  amount: number;
  submissionDeadline?: string;
  startDate?: string;
  stage: StageId;
  manager: string;
  description?: string;
  invoices: Invoice[];
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  projects: Project[];
  version: number;
}

export interface StageMeta {
  id: StageId;
  ar: string;
  fr?: string;
  order: number;
  color: string;
  dot: string;
  badge: string;
}

export const STAGES: StageMeta[] = [
  {
    id: 'consultation',
    ar: 'الإعلان / الاستشارة',
    fr: 'Consultation',
    order: 0,
    color: 'text-sky-700',
    dot: 'bg-sky-500',
    badge: 'bg-sky-50 text-sky-700 border border-sky-200',
  },
  {
    id: 'bid_preparation',
    ar: 'تحضير العرض وإيداعه',
    fr: 'Préparation & Dépôt',
    order: 1,
    color: 'text-indigo-700',
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  },
  {
    id: 'award',
    ar: 'المنح وتبليغ النشر',
    fr: 'Attribution',
    order: 2,
    color: 'text-violet-700',
    dot: 'bg-violet-500',
    badge: 'bg-violet-50 text-violet-700 border border-violet-200',
  },
  {
    id: 'contract',
    ar: 'إمضاء العقد وأمر الخدمة',
    fr: "Contrat & Ordre de Service",
    order: 3,
    color: 'text-blue-700',
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  {
    id: 'execution',
    ar: 'مرحلة الإنجاز والتنفيذ',
    fr: 'Exécution',
    order: 4,
    color: 'text-amber-700',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  {
    id: 'provisional_reception',
    ar: 'الاستلام المؤقت',
    fr: 'Réception Provisoire',
    order: 5,
    color: 'text-teal-700',
    dot: 'bg-teal-500',
    badge: 'bg-teal-50 text-teal-700 border border-teal-200',
  },
  {
    id: 'final_reception',
    ar: 'الاستلام النهائي وضمان حسن التنفيذ',
    fr: 'Réception Définitive',
    order: 6,
    color: 'text-emerald-700',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  {
    id: 'invoicing',
    ar: 'الفوترة وتسديد كامل المستحقات',
    fr: 'Facturation & Paiement',
    order: 7,
    color: 'text-green-700',
    dot: 'bg-green-500',
    badge: 'bg-green-50 text-green-700 border border-green-200',
  },
];

export const INVOICE_STATUSES: { id: InvoiceStatus; ar: string; fr: string; badge: string }[] = [
  { id: 'drafted', ar: 'محررة', fr: 'Rédigée', badge: 'bg-neutral-100 text-neutral-700 border border-neutral-200' },
  { id: 'submitted', ar: 'مودعة لدى الخزينة / المصلحة', fr: 'Déposée au Trésor', badge: 'bg-amber-50 text-amber-700 border border-amber-200' },
  { id: 'validated', ar: 'مؤشرة', fr: 'Visée', badge: 'bg-sky-50 text-sky-700 border border-sky-200' },
  { id: 'paid', ar: 'مسددة', fr: 'Payée', badge: 'bg-success-50 text-success-700 border border-success-200' },
];

export function stageMeta(id: StageId): StageMeta {
  return STAGES.find((s) => s.id === id) ?? STAGES[0];
}

export function invoiceStatusMeta(id: InvoiceStatus) {
  return INVOICE_STATUSES.find((s) => s.id === id) ?? INVOICE_STATUSES[0];
}
