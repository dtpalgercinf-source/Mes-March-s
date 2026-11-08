import type { AppData, Invoice, InvoiceStatus, Project, StageId } from '@/types';

function escapeCsv(value: string | number | undefined | null): string {
  const s = value === undefined || value === null ? '' : String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportCsv(data: AppData): string {
  const headers = [
    'name', 'reference', 'client', 'amount', 'submissionDeadline', 'startDate',
    'stage', 'manager', 'description', 'invoiceLabel', 'invoiceAmount',
    'invoiceStatus', 'invoiceSubmittedDate', 'invoicePaidDate', 'invoiceNotes',
  ];
  const rows: string[] = [headers.join(',')];
  for (const p of data.projects) {
    if (p.invoices.length === 0) {
      rows.push([
        escapeCsv(p.name), escapeCsv(p.reference), escapeCsv(p.client), escapeCsv(p.amount),
        escapeCsv(p.submissionDeadline), escapeCsv(p.startDate), escapeCsv(p.stage),
        escapeCsv(p.manager), escapeCsv(p.description),
        '', '', '', '', '', '',
      ].join(','));
    } else {
      for (const inv of p.invoices) {
        rows.push([
          escapeCsv(p.name), escapeCsv(p.reference), escapeCsv(p.client), escapeCsv(p.amount),
          escapeCsv(p.submissionDeadline), escapeCsv(p.startDate), escapeCsv(p.stage),
          escapeCsv(p.manager), escapeCsv(p.description),
          escapeCsv(inv.label), escapeCsv(inv.amount), escapeCsv(inv.status),
          escapeCsv(inv.submittedDate), escapeCsv(inv.paidDate), escapeCsv(inv.notes),
        ].join(','));
      }
    }
  }
  return rows.join('\n');
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',' || c === ';') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); field = ''; row = [];
      } else field += c;
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const VALID_STAGES: StageId[] = ['consultation', 'bid_preparation', 'award', 'contract', 'execution', 'provisional_reception', 'final_reception', 'invoicing'];
const VALID_STATUSES: InvoiceStatus[] = ['drafted', 'submitted', 'validated', 'paid'];

function coerceStage(v: string): StageId {
  return VALID_STAGES.includes(v as StageId) ? (v as StageId) : 'consultation';
}
function coerceStatus(v: string): InvoiceStatus {
  return VALID_STATUSES.includes(v as InvoiceStatus) ? (v as InvoiceStatus) : 'drafted';
}

export function importCsv(text: string): AppData {
  const rows = parseCsv(text).filter((r) => r.length > 1 && r.some((c) => c.trim() !== ''));
  if (rows.length < 2) throw new Error('empty');
  const header = rows[0].map((h) => h.trim());
  const idx = (key: string) => header.indexOf(key);
  const dataRows = rows.slice(1);

  const projects: Project[] = [];
  const t = new Date().toISOString();
  let currentKey = '';
  let current: Project | null = null;

  for (const r of dataRows) {
    const name = r[idx('name')] ?? '';
    const reference = r[idx('reference')] ?? '';
    const key = `${name}||${reference}`;
    if (key !== currentKey) {
      current = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
        name, reference,
        client: r[idx('client')] ?? '',
        amount: Number(r[idx('amount')]) || 0,
        submissionDeadline: r[idx('submissionDeadline')] || undefined,
        startDate: r[idx('startDate')] || undefined,
        stage: coerceStage(r[idx('stage')] ?? ''),
        manager: r[idx('manager')] ?? '',
        description: r[idx('description')] || undefined,
        invoices: [],
        createdAt: t,
        updatedAt: t,
      };
      projects.push(current);
      currentKey = key;
    }
    const invLabel = r[idx('invoiceLabel')] ?? '';
    if (invLabel.trim() !== '' && current) {
      const invoice: Invoice = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
        label: invLabel,
        amount: Number(r[idx('invoiceAmount')]) || 0,
        status: coerceStatus(r[idx('invoiceStatus')] ?? ''),
        submittedDate: r[idx('invoiceSubmittedDate')] || undefined,
        paidDate: r[idx('invoicePaidDate')] || undefined,
        notes: r[idx('invoiceNotes')] || undefined,
        createdAt: t,
      };
      current.invoices.push(invoice);
    }
  }
  return { projects, version: 1 };
}
