import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import {
  AlertCircle,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  CircleDollarSign,
  Download,
  FileJson,
  FileSpreadsheet,
  Filter,
  Globe,
  LayoutDashboard,
  List,
  MonitorSmartphone,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  RefreshCcw,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Upload,
  WalletCards,
  X,
} from 'lucide-react';
import type { AppData, Invoice, InvoiceStatus, Project, StageId } from '@/types';
import { INVOICE_STATUSES, STAGES, invoiceStatusMeta, stageMeta } from '@/types';
import { useAppData } from '@/lib/storage';
import { useI18n, type Locale } from '@/lib/i18n';
import { usePwaInstall } from '@/lib/usePwaInstall';
import { exportCsv, importCsv } from '@/lib/csv';
import { cls, formatCurrency, formatCurrencyShort, formatDate, formatDateShort, relativeDeadline } from '@/lib/format';

type View = 'dashboard' | 'projects' | 'deadlines' | 'settings';
type Modal = { kind: 'project' | 'invoice' | 'detail'; projectId?: string } | null;

function stageLabel(id: StageId, locale: Locale): string {
  const meta = stageMeta(id);
  return locale === 'fr' ? (meta.fr ?? meta.ar) : meta.ar;
}

function invoiceStatusLabel(id: InvoiceStatus, locale: Locale): string {
  const meta = invoiceStatusMeta(id);
  return locale === 'fr' ? (meta.fr ?? meta.ar) : meta.ar;
}

const navKeys: { id: View; key: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', key: 'nav.dashboard', icon: LayoutDashboard },
  { id: 'projects', key: 'nav.projects', icon: BriefcaseBusiness },
  { id: 'deadlines', key: 'nav.deadlines', icon: Bell },
];

function IconButton({ label, onClick, children, danger = false }: { label: string; onClick?: () => void; children: ReactNode; danger?: boolean }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className={cls('btn btn-icon', danger ? 'text-error-600 hover:bg-error-50' : 'text-neutral-500 hover:bg-neutral-100')}>{children}</button>;
}

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-4 mb-5"><div><h2 className="text-lg font-bold text-neutral-900">{title}</h2>{subtitle && <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>}</div>{action}</div>;
}

function StatCard({ icon: Icon, label, value, caption, color }: { icon: typeof BriefcaseBusiness; label: string; value: string; caption: string; color: 'blue' | 'green' | 'amber' | 'sky' }) {
  const styles = { blue: 'bg-primary-50 text-primary-600', green: 'bg-success-50 text-success-600', amber: 'bg-warning-50 text-warning-600', sky: 'bg-sky-50 text-sky-600' };
  return <div className="card p-5 relative overflow-hidden card-hover"><div className="flex items-start justify-between"><div><p className="text-sm text-neutral-500">{label}</p><p className="text-2xl font-extrabold text-neutral-900 mt-2 tracking-tight">{value}</p><p className="text-xs text-neutral-400 mt-2">{caption}</p></div><div className={cls('w-11 h-11 rounded-xl flex items-center justify-center', styles[color])}><Icon size={21} /></div></div><div className={cls('absolute -bottom-7 -left-5 w-20 h-20 rounded-full opacity-30', color === 'green' ? 'bg-success-100' : color === 'amber' ? 'bg-warning-100' : color === 'sky' ? 'bg-sky-100' : 'bg-primary-100')} /></div>;
}

function StageBadge({ stage, locale }: { stage: StageId; locale: Locale }) {
  const meta = stageMeta(stage);
  return <span className={cls('badge border', meta.badge)}><span className={cls('w-1.5 h-1.5 rounded-full', meta.dot)} />{stageLabel(stage, locale)}</span>;
}

function ModalShell({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><button aria-label="close" onClick={onClose} className="absolute inset-0 bg-neutral-950/35 backdrop-blur-[2px]" /><div className={cls('relative bg-white rounded-2xl shadow-elevated w-full max-h-[92vh] overflow-y-auto animate-scale-in', wide ? 'max-w-4xl' : 'max-w-2xl')}><div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-neutral-200 px-6 py-4 flex items-center justify-between"><h2 className="font-bold text-neutral-900">{title}</h2><IconButton label="close" onClick={onClose}><X size={19} /></IconButton></div>{children}</div></div>;
}

function ProjectForm({ initial, onSave, onClose }: { initial?: Project; onSave: (values: Omit<Project, 'id' | 'invoices' | 'createdAt' | 'updatedAt'>) => void; onClose: () => void }) {
  const { t, locale } = useI18n();
  const [values, setValues] = useState({ name: initial?.name ?? '', reference: initial?.reference ?? '', client: initial?.client ?? '', amount: initial?.amount?.toString() ?? '', submissionDeadline: initial?.submissionDeadline ?? '', startDate: initial?.startDate ?? '', stage: initial?.stage ?? 'consultation' as StageId, manager: initial?.manager ?? '', description: initial?.description ?? '' });
  const set = (key: keyof typeof values, value: string) => setValues((v) => ({ ...v, [key]: value }));
  const submit = (e: FormEvent) => { e.preventDefault(); onSave({ ...values, amount: Number(values.amount) || 0, stage: values.stage as StageId }); };
  const req = <b className="text-error-500">*</b>;
  return <form onSubmit={submit} className="p-6 space-y-5"><div className="grid md:grid-cols-2 gap-4"><label><span className="label">{t('form.projectName')} {req}</span><input required className="input" value={values.name} onChange={(e) => set('name', e.target.value)} placeholder={t('form.projectNamePh')} /></label><label><span className="label">{t('form.reference')} {req}</span><input required className="input" value={values.reference} onChange={(e) => set('reference', e.target.value)} placeholder={t('form.referencePh')} dir="ltr" /></label><label><span className="label">{t('form.client')} {req}</span><input required className="input" value={values.client} onChange={(e) => set('client', e.target.value)} placeholder={t('form.clientPh')} /></label><label><span className="label">{t('form.amount')} {req}</span><input required min="0" type="number" className="input" value={values.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0" dir="ltr" /></label><label><span className="label">{t('form.submissionDeadline')}</span><input type="date" className="input" value={values.submissionDeadline} onChange={(e) => set('submissionDeadline', e.target.value)} dir="ltr" /></label><label><span className="label">{t('form.startDate')}</span><input type="date" className="input" value={values.startDate} onChange={(e) => set('startDate', e.target.value)} dir="ltr" /></label><label><span className="label">{t('form.currentStage')}</span><div className="relative"><select className="input appearance-none" value={values.stage} onChange={(e) => set('stage', e.target.value)}>{STAGES.map((s) => <option value={s.id} key={s.id}>{stageLabel(s.id, locale)}</option>)}</select><ChevronDown size={17} className="absolute left-3 top-3.5 text-neutral-400 pointer-events-none" /></div></label><label><span className="label">{t('form.manager')}</span><input className="input" value={values.manager} onChange={(e) => set('manager', e.target.value)} placeholder={t('form.managerPh')} /></label></div><label><span className="label">{t('form.notes')}</span><textarea className="input min-h-24 resize-y" value={values.description} onChange={(e) => set('description', e.target.value)} placeholder={t('form.notesPh')} /></label><div className="flex items-center justify-start gap-3 border-t border-neutral-100 pt-5"><button type="submit" className="btn-primary btn-md"><Check size={17} />{initial ? t('form.save') : t('form.add')}</button><button type="button" className="btn-secondary btn-md" onClick={onClose}>{t('form.cancel')}</button></div></form>;
}

function InvoiceForm({ onSave, onClose }: { onSave: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => void; onClose: () => void }) {
  const { t, locale } = useI18n();
  const [values, setValues] = useState({ label: t('form.newInvoice'), amount: '', status: 'drafted' as InvoiceStatus, submittedDate: '', paidDate: '', notes: '' });
  const set = (key: keyof typeof values, value: string) => setValues((v) => ({ ...v, [key]: value }));
  return <form onSubmit={(e) => { e.preventDefault(); onSave({ ...values, amount: Number(values.amount) || 0, status: values.status as InvoiceStatus }); }} className="p-6 space-y-5"><div className="grid md:grid-cols-2 gap-4"><label><span className="label">{t('form.invoiceType')}</span><input required className="input" value={values.label} onChange={(e) => set('label', e.target.value)} placeholder={t('form.invoiceTypePh')} /></label><label><span className="label">{t('form.invoiceAmount')}</span><input required min="0" type="number" className="input" value={values.amount} onChange={(e) => set('amount', e.target.value)} dir="ltr" /></label><label><span className="label">{t('form.invoiceStatus')}</span><div className="relative"><select className="input appearance-none" value={values.status} onChange={(e) => set('status', e.target.value)}>{INVOICE_STATUSES.map((s) => <option value={s.id} key={s.id}>{invoiceStatusLabel(s.id, locale)}</option>)}</select><ChevronDown size={17} className="absolute left-3 top-3.5 text-neutral-400 pointer-events-none" /></div></label><label><span className="label">{t('form.submittedDate')}</span><input type="date" className="input" value={values.submittedDate} onChange={(e) => set('submittedDate', e.target.value)} dir="ltr" /></label><label><span className="label">{t('form.paidDate')}</span><input type="date" className="input" value={values.paidDate} onChange={(e) => set('paidDate', e.target.value)} dir="ltr" /></label></div><label><span className="label">{t('form.invoiceNotes')}</span><textarea className="input min-h-20" value={values.notes} onChange={(e) => set('notes', e.target.value)} /></label><div className="flex gap-3 border-t border-neutral-100 pt-5"><button className="btn-primary btn-md" type="submit"><Check size={17} />{t('form.addInvoice')}</button><button type="button" className="btn-secondary btn-md" onClick={onClose}>{t('form.cancel')}</button></div></form>;
}

function ProjectDetail({ project, onClose, onEdit, onDelete, onAddInvoice, onUpdateInvoice, onDeleteInvoice }: { project: Project; onClose: () => void; onEdit: () => void; onDelete: () => void; onAddInvoice: () => void; onUpdateInvoice: (id: string, patch: Partial<Invoice>) => void; onDeleteInvoice: (id: string) => void }) {
  const { t, locale } = useI18n();
  const paid = project.invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const invoiced = project.invoices.reduce((sum, i) => sum + i.amount, 0);
  const progress = Math.min(100, Math.round((paid / Math.max(1, project.amount)) * 100));
  return <ModalShell title={t('detail.title')} onClose={onClose} wide><div className="p-6 space-y-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 mb-3"><StageBadge stage={project.stage} locale={locale} /><span className="text-xs text-neutral-400" dir="ltr">{project.reference}</span></div><h1 className="text-xl font-bold text-neutral-900">{project.name}</h1><p className="text-sm text-neutral-500 mt-2 flex items-center gap-2"><BriefcaseBusiness size={15} />{project.client}</p></div><div className="flex gap-2"><button className="btn-danger btn-sm" onClick={onDelete}><Trash2 size={15} />{t('detail.delete')}</button><button className="btn-secondary btn-sm" onClick={onEdit}><Pencil size={15} />{t('detail.edit')}</button></div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3"><div className="bg-neutral-50 rounded-xl p-4"><p className="text-xs text-neutral-500">{t('detail.contractValue')}</p><p className="font-bold text-neutral-900 mt-1">{formatCurrency(project.amount, locale)}</p></div><div className="bg-neutral-50 rounded-xl p-4"><p className="text-xs text-neutral-500">{t('detail.totalInvoices')}</p><p className="font-bold text-neutral-900 mt-1">{formatCurrency(invoiced, locale)}</p></div><div className="bg-neutral-50 rounded-xl p-4"><p className="text-xs text-neutral-500">{t('detail.collected')}</p><p className="font-bold text-success-700 mt-1">{formatCurrency(paid, locale)}</p></div><div className="bg-neutral-50 rounded-xl p-4"><p className="text-xs text-neutral-500">{t('detail.remaining')}</p><p className="font-bold text-warning-700 mt-1">{formatCurrency(Math.max(0, project.amount - paid), locale)}</p></div></div><div><div className="flex items-center justify-between text-sm mb-2"><span className="font-medium text-neutral-700">{t('detail.collectionProgress')}</span><span className="font-bold text-primary-600">{progress}%</span></div><div className="h-2 rounded-full bg-neutral-100 overflow-hidden"><div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} /></div></div><div className="grid md:grid-cols-3 gap-4 text-sm"><div><p className="text-neutral-400 text-xs mb-1">{t('detail.responsible')}</p><p className="font-medium text-neutral-700">{project.manager || t('detail.notSet')}</p></div><div><p className="text-neutral-400 text-xs mb-1">{t('detail.submissionDeadline')}</p><p className="font-medium text-neutral-700">{formatDate(project.submissionDeadline, locale)}</p></div><div><p className="text-neutral-400 text-xs mb-1">{t('detail.start')}</p><p className="font-medium text-neutral-700">{formatDate(project.startDate, locale)}</p></div></div><div className="border-t border-neutral-100 pt-5"><SectionTitle title={t('detail.invoices')} subtitle={`${project.invoices.length} ${t('detail.invoicesCount')}`} action={<button className="btn-primary btn-sm" onClick={onAddInvoice}><Plus size={15} />{t('detail.addInvoice')}</button>} />{project.invoices.length === 0 ? <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-400">{t('detail.noInvoices')}</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-neutral-100 text-neutral-500"><th className="text-right font-medium py-3">{t('detail.invoiceCol')}</th><th className="text-right font-medium py-3">{t('detail.amountCol')}</th><th className="text-right font-medium py-3">{t('detail.statusCol')}</th><th className="text-right font-medium py-3">{t('detail.dateCol')}</th><th className="w-10" /></tr></thead><tbody>{project.invoices.map((inv) => <tr key={inv.id} className="border-b last:border-0 border-neutral-100"><td className="py-3 font-medium text-neutral-700">{inv.label}</td><td className="py-3">{formatCurrency(inv.amount, locale)}</td><td className="py-3"><select className={cls('text-xs border-0 rounded-lg px-2 py-1.5 font-medium focus:ring-0 cursor-pointer', invoiceStatusMeta(inv.status).badge)} value={inv.status} onChange={(e) => onUpdateInvoice(inv.id, { status: e.target.value as InvoiceStatus, paidDate: e.target.value === 'paid' ? new Date().toISOString().slice(0, 10) : inv.paidDate })}>{INVOICE_STATUSES.map((s) => <option key={s.id} value={s.id}>{invoiceStatusLabel(s.id, locale)}</option>)}</select></td><td className="py-3 text-neutral-500">{formatDateShort(inv.paidDate || inv.submittedDate, locale)}</td><td><IconButton label={t('detail.deleteInvoice')} danger onClick={() => onDeleteInvoice(inv.id)}><Trash2 size={15} /></IconButton></td></tr>)}</tbody></table></div>}</div></div></ModalShell>;
}

function Dashboard({ projects, onViewProject, onAdd }: { projects: Project[]; onViewProject: (p: Project) => void; onAdd: () => void }) {
  const { t, locale } = useI18n();
  const active = projects.filter((p) => p.stage !== 'invoicing').length;
  const expected = projects.reduce((s, p) => s + p.amount, 0);
  const collected = projects.reduce((s, p) => s + p.invoices.filter((i) => i.status === 'paid').reduce((a, i) => a + i.amount, 0), 0);
  const pending = Math.max(0, expected - collected);
  const invoiceCount = projects.reduce((s, p) => s + p.invoices.length, 0);
  const statusCounts = STAGES.map((stage) => ({ ...stage, count: projects.filter((p) => p.stage === stage.id).length }));
  const max = Math.max(1, ...statusCounts.map((s) => s.count));
  const upcoming = projects.filter((p) => p.submissionDeadline).sort((a, b) => (a.submissionDeadline ?? '').localeCompare(b.submissionDeadline ?? '')).slice(0, 5);
  return <div className="space-y-6 animate-fade-in"><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">{t('app.welcome')}</h1><p className="text-sm text-neutral-500 mt-1">{t('app.welcomeSub')}</p></div><button className="btn-primary btn-md" onClick={onAdd}><Plus size={17} />{t('dash.addDeal')}</button></div><div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4"><StatCard icon={BriefcaseBusiness} label={t('dash.activeProjects')} value={active.toString()} caption={`${projects.length} ${t('dash.totalFiles')}`} color="blue" /><StatCard icon={CircleDollarSign} label={t('dash.expectedRevenue')} value={formatCurrencyShort(expected, locale)} caption={t('dash.totalContracts')} color="sky" /><StatCard icon={TrendingUp} label={t('dash.collected')} value={formatCurrencyShort(collected, locale)} caption={`${invoiceCount} ${t('dash.invoicesRecorded')}`} color="green" /><StatCard icon={WalletCards} label={t('dash.pending')} value={formatCurrencyShort(pending, locale)} caption={t('dash.awaiting')} color="amber" /></div><div className="grid xl:grid-cols-5 gap-6"><div className="card p-5 xl:col-span-3 card-hover"><SectionTitle title={t('dash.stageDistribution')} subtitle={t('dash.stageSub')} action={<button className="btn-ghost btn-sm" onClick={onAdd}>{t('dash.refresh')} <RefreshCcw size={14} /></button>} /><div className="space-y-3">{statusCounts.map((s) => <div key={s.id} className="flex items-center gap-3"><div className="w-36 sm:w-48 shrink-0 flex items-center gap-2 text-sm text-neutral-600"><span className={cls('w-2 h-2 rounded-full shrink-0', s.dot)} />{stageLabel(s.id, locale)}</div><div className="flex-1 h-2.5 rounded-full bg-neutral-100 overflow-hidden"><div className={cls('h-full rounded-full transition-all', s.dot)} style={{ width: `${(s.count / max) * 100}%` }} /></div><span className="w-6 text-left text-sm font-semibold text-neutral-700">{s.count}</span></div>)}</div></div><div className="card p-5 xl:col-span-2 card-hover"><SectionTitle title={t('dash.financials')} subtitle={t('dash.financialsSub')} /><div className="space-y-5"><div><div className="flex items-center justify-between mb-2 text-sm"><span className="text-neutral-500">{t('dash.collectionRate')}</span><span className="font-bold text-success-600">{expected ? Math.round((collected / expected) * 100) : 0}%</span></div><div className="h-3 bg-neutral-100 rounded-full overflow-hidden"><div className="h-full bg-success-500 rounded-full" style={{ width: `${expected ? Math.min(100, (collected / expected) * 100) : 0}%` }} /></div></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-success-50 p-4"><p className="text-xs text-success-700">{t('dash.collectedLabel')}</p><p className="text-lg font-bold text-success-800 mt-1">{formatCurrencyShort(collected, locale)}</p></div><div className="rounded-xl bg-warning-50 p-4"><p className="text-xs text-warning-700">{t('dash.pendingLabel')}</p><p className="text-lg font-bold text-warning-800 mt-1">{formatCurrencyShort(pending, locale)}</p></div></div></div></div></div><div className="card p-5 card-hover"><SectionTitle title={t('dash.upcoming')} subtitle={t('dash.upcomingSub')} action={<button className="btn-ghost btn-sm" onClick={() => {}}>{t('dash.viewAll')} <ChevronLeft size={15} className="flip-x" /></button>} />{upcoming.length ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{upcoming.slice(0, 3).map((p) => { const dl = relativeDeadline(p.submissionDeadline, locale); return <button key={p.id} className="text-right rounded-xl border border-neutral-100 hover:border-primary-200 hover:bg-primary-50/40 p-4 transition-colors card-hover" onClick={() => onViewProject(p)}><div className="flex items-start justify-between gap-2"><span className={cls('badge', dl.tone === 'danger' ? 'bg-error-50 text-error-700' : dl.tone === 'warning' ? 'bg-warning-50 text-warning-700' : 'bg-neutral-100 text-neutral-600')}>{dl.label}</span><CalendarDays size={17} className="text-neutral-400" /></div><p className="font-semibold text-sm text-neutral-800 mt-3 line-clamp-1">{p.name}</p><p className="text-xs text-neutral-500 mt-1">{p.client}</p><p className="text-xs text-neutral-400 mt-2">{formatDateShort(p.submissionDeadline, locale)}</p></button>; })}</div> : <p className="text-sm text-neutral-400 py-6 text-center">{t('dash.noDeadlines')}</p>}</div></div>;
}

function ProjectsView({ projects, onView, onEdit, onAdd }: { projects: Project[]; onView: (p: Project) => void; onEdit: (p: Project) => void; onAdd: () => void }) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState(''); const [stage, setStage] = useState<StageId | 'all'>('all'); const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const filtered = useMemo(() => projects.filter((p) => { const q = query.toLowerCase(); return (!q || p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q)) && (stage === 'all' || p.stage === stage); }), [projects, query, stage]);
  return <div className="space-y-5 animate-fade-in"><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-extrabold text-neutral-900">{t('projects.title')}</h1><p className="text-sm text-neutral-500 mt-1">{t('projects.sub')}</p></div><button className="btn-primary btn-md" onClick={onAdd}><Plus size={17} />{t('projects.add')}</button></div><div className="card p-3 flex flex-wrap gap-3 items-center"><div className="relative flex-1 min-w-56"><Search size={17} className="absolute right-3 top-3 text-neutral-400" /><input className="input pr-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('projects.search')} /></div><div className="relative min-w-52"><Filter size={16} className="absolute right-3 top-3 text-neutral-400 pointer-events-none" /><select className="input pr-9 appearance-none" value={stage} onChange={(e) => setStage(e.target.value as StageId | 'all')}><option value="all">{t('projects.allStages')} ({projects.length})</option>{STAGES.map((s) => <option value={s.id} key={s.id}>{stageLabel(s.id, locale)} ({projects.filter((p) => p.stage === s.id).length})</option>)}</select><ChevronDown size={16} className="absolute left-3 top-3 text-neutral-400 pointer-events-none" /></div><div className="flex bg-neutral-100 rounded-lg p-1 mr-auto"><button className={cls('p-2 rounded-md transition-colors', view === 'kanban' ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-500')} onClick={() => setView('kanban')} title={t('projects.kanban')}><LayoutDashboard size={17} /></button><button className={cls('p-2 rounded-md transition-colors', view === 'table' ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-500')} onClick={() => setView('table')} title={t('projects.table')}><List size={17} /></button></div></div>{view === 'kanban' ? <div className="flex gap-4 overflow-x-auto pb-3 snap-x">{STAGES.map((s) => { const items = filtered.filter((p) => p.stage === s.id); return <div key={s.id} className="min-w-[280px] w-[280px] shrink-0 snap-start"><div className="flex items-center justify-between mb-3 px-1"><div className="flex items-center gap-2"><span className={cls('w-2.5 h-2.5 rounded-full', s.dot)} /><h3 className="text-sm font-bold text-neutral-700">{stageLabel(s.id, locale)}</h3></div><span className="text-xs font-semibold text-neutral-400 bg-neutral-100 rounded-full px-2 py-0.5">{items.length}</span></div><div className="space-y-3 min-h-32 p-2 rounded-2xl bg-neutral-100/70">{items.map((p) => <div key={p.id} className="bg-white rounded-xl border border-neutral-200/70 p-4 shadow-soft card-hover cursor-pointer" onClick={() => onView(p)}><div className="flex items-start justify-between gap-2"><span className="text-[10px] font-medium text-neutral-400" dir="ltr">{p.reference}</span><button onClick={(e) => { e.stopPropagation(); onEdit(p); }} className="text-neutral-400 hover:text-primary-600"><MoreHorizontal size={17} /></button></div><h4 className="font-bold text-sm text-neutral-800 mt-2 leading-6 line-clamp-2">{p.name}</h4><p className="text-xs text-neutral-500 mt-2 line-clamp-1">{p.client}</p><div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-100"><span className="text-xs font-semibold text-neutral-700">{formatCurrencyShort(p.amount, locale)}</span>{p.submissionDeadline && <span className={cls('text-[11px]', relativeDeadline(p.submissionDeadline, locale).tone === 'danger' ? 'text-error-600' : 'text-neutral-400')}><CalendarDays size={12} className="inline ml-1" />{formatDateShort(p.submissionDeadline, locale)}</span>}</div></div>)}{items.length === 0 && <div className="text-center py-8 text-xs text-neutral-400">{t('projects.noDeals')}</div>}</div></div>})}</div> : <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-neutral-50"><tr className="border-b border-neutral-200"><th className="text-right px-5 py-3 font-medium text-neutral-500">{t('projects.col.deal')}</th><th className="text-right px-5 py-3 font-medium text-neutral-500">{t('projects.col.client')}</th><th className="text-right px-5 py-3 font-medium text-neutral-500">{t('projects.col.stage')}</th><th className="text-right px-5 py-3 font-medium text-neutral-500">{t('projects.col.amount')}</th><th className="text-right px-5 py-3 font-medium text-neutral-500">{t('projects.col.deadline')}</th><th className="px-5 py-3" /></tr></thead><tbody>{filtered.map((p) => <tr key={p.id} className="border-b last:border-0 border-neutral-100 hover:bg-neutral-50/70 cursor-pointer" onClick={() => onView(p)}><td className="px-5 py-4"><p className="font-semibold text-neutral-800 max-w-xs truncate">{p.name}</p><p className="text-xs text-neutral-400 mt-1" dir="ltr">{p.reference}</p></td><td className="px-5 py-4 text-neutral-600">{p.client}</td><td className="px-5 py-4"><StageBadge stage={p.stage} locale={locale} /></td><td className="px-5 py-4 font-semibold text-neutral-700">{formatCurrency(p.amount, locale)}</td><td className="px-5 py-4 text-neutral-500">{formatDateShort(p.submissionDeadline, locale)}</td><td className="px-5 py-4"><IconButton label={t('projects.edit')} onClick={() => onEdit(p)}><Pencil size={15} /></IconButton></td></tr>)}</tbody></table></div>{!filtered.length && <div className="p-12 text-center text-sm text-neutral-400">{t('projects.noResults')}</div>}</div>}</div>;
}

function DeadlinesView({ projects, onView }: { projects: Project[]; onView: (p: Project) => void }) {
  const { t, locale } = useI18n();
  const reminders = projects.filter((p) => p.submissionDeadline).map((p) => ({ p, kind: 'deadline' as const, date: p.submissionDeadline! })).sort((a, b) => a.date.localeCompare(b.date));
  const unpaidInvoices = projects.flatMap((p) => p.invoices.filter((i) => i.status !== 'paid').map((i) => ({ p, i })));
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-neutral-900">{t('deadlines.title')}</h1>
        <p className="text-sm text-neutral-500 mt-1">{t('deadlines.sub')}</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5 border-r-4 border-r-error-400 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">{t('deadlines.upcoming30')}</p>
              <p className="text-2xl font-bold text-neutral-900 mt-2">{reminders.filter((r) => { const d = relativeDeadline(r.date, locale); return d.tone === 'danger' || d.tone === 'warning'; }).length}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-error-50 text-error-600 flex items-center justify-center"><AlertCircle size={21} /></div>
          </div>
        </div>
        <div className="card p-5 border-r-4 border-r-warning-400 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">{t('deadlines.unpaidInvoices')}</p>
              <p className="text-2xl font-bold text-neutral-900 mt-2">{unpaidInvoices.length}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-warning-50 text-warning-600 flex items-center justify-center"><Receipt size={21} /></div>
          </div>
        </div>
        <div className="card p-5 border-r-4 border-r-success-400 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">{t('deadlines.tracked')}</p>
              <p className="text-2xl font-bold text-neutral-900 mt-2">{projects.length - reminders.length}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-success-50 text-success-600 flex items-center justify-center"><CheckCircle2 size={21} /></div>
          </div>
        </div>
      </div>
      <div className="grid xl:grid-cols-2 gap-6">
        <div className="card p-5 card-hover">
          <SectionTitle title={t('deadlines.submissionDeadlines')} subtitle={t('deadlines.sortedByDate')} />
          {reminders.length ? (
            <div className="space-y-2">
              {reminders.map(({ p, date }) => {
                const dl = relativeDeadline(date, locale);
                return (
                  <button key={p.id} onClick={() => onView(p)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 text-right transition-colors">
                    <div className={cls('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', dl.tone === 'danger' ? 'bg-error-50 text-error-600' : dl.tone === 'warning' ? 'bg-warning-50 text-warning-600' : 'bg-neutral-100 text-neutral-500')}><CalendarDays size={17} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-700 truncate">{p.name}</p>
                      <p className="text-xs text-neutral-400 mt-1">{p.reference} · {formatDateShort(date, locale)}</p>
                    </div>
                    <span className={cls('text-xs shrink-0', dl.tone === 'danger' ? 'text-error-600' : dl.tone === 'warning' ? 'text-warning-600' : 'text-neutral-400')}>{dl.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-neutral-400 text-center py-8">{t('deadlines.noDeadlines')}</p>
          )}
        </div>
        <div className="card p-5 card-hover">
          <SectionTitle title={t('deadlines.invoicesProcessing')} subtitle={t('deadlines.needsFollowup')} />
          {unpaidInvoices.length ? (
            <div className="space-y-2">
              {unpaidInvoices.map(({ p, i }) => (
                <button key={i.id} onClick={() => onView(p)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 text-right transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-warning-50 text-warning-600 flex items-center justify-center shrink-0"><Receipt size={17} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-700 truncate">{i.label}</p>
                    <p className="text-xs text-neutral-400 mt-1 truncate">{p.name}</p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-sm font-semibold text-neutral-700">{formatCurrencyShort(i.amount, locale)}</p>
                    <p className="text-xs text-neutral-400 mt-1">{invoiceStatusLabel(i.status, locale)}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-400 text-center py-8">{t('deadlines.allPaid')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsView({ data, onImport, onReset }: { data: AppData; onImport: (data: AppData) => void; onReset: () => void }) {
  const { t, locale, setLocale } = useI18n();
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const [message, setMessage] = useState('');

  const download = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  const exportJson = () => download(JSON.stringify(data, null, 2), `mes-marches-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  const exportCsvFile = () => download(exportCsv(data.projects), `mes-marches-projects-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');

  const importFile = (e: ChangeEvent<HTMLInputElement>, isJson: boolean) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (isJson) {
          const parsed = JSON.parse(text);
          if (parsed && Array.isArray(parsed.projects)) { onImport(parsed); setMessage(t('settings.importSuccess')); }
        } else {
          const imported = importCsv(text);
          if (imported.length) { onImport({ ...data, projects: [...imported, ...data.projects] }); setMessage(t('settings.importSuccess')); }
        }
      } catch { setMessage(t('settings.importError')); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-neutral-900">{t('settings.title')}</h1>
        <p className="text-sm text-neutral-500 mt-1">{t('settings.sub')}</p>
      </div>

      {message && <div className="p-4 rounded-xl bg-primary-50 text-primary-700 text-sm font-medium flex items-center justify-between"><span>{message}</span><button onClick={() => setMessage('')}><X size={16} /></button></div>}

      <div className="card p-6 space-y-5 card-hover">
        <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2"><Globe className="text-primary-600" size={18} />{t('settings.language')}</h2>
        <div className="flex gap-3">
          <button type="button" className={cls('btn flex-1 py-3 justify-center text-sm', locale === 'ar' ? 'btn-primary' : 'btn-secondary')} onClick={() => setLocale('ar')}>العربية (Arabic)</button>
          <button type="button" className={cls('btn flex-1 py-3 justify-center text-sm', locale === 'fr' ? 'btn-primary' : 'btn-secondary')} onClick={() => setLocale('fr')}>Français</button>
        </div>
      </div>

      <div className="card p-6 space-y-5 card-hover">
        <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2"><ShieldCheck className="text-success-600" size={18} />{t('settings.data')}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <button type="button" className="btn btn-secondary py-3 justify-center" onClick={exportJson}><Download size={17} />{t('settings.exportJson')}</button>
          <button type="button" className="btn btn-secondary py-3 justify-center" onClick={exportCsvFile}><FileSpreadsheet size={17} />{t('settings.exportCsv')}</button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
          <label className="btn btn-secondary py-3 justify-center cursor-pointer"><Upload size={17} />{t('settings.importJson')}<input type="file" accept=".json" className="hidden" onChange={(e) => importFile(e, true)} /></label>
          <label className="btn btn-secondary py-3 justify-center cursor-pointer"><FileJson size={17} />{t('settings.importCsv')}<input type="file" accept=".csv" className="hidden" onChange={(e) => importFile(e, false)} /></label>
        </div>
      </div>

      {canInstall && !installed && (
        <div className="card p-6 bg-gradient-to-br from-primary-500 to-primary-700 text-white flex flex-wrap items-center justify-between gap-4 card-hover">
          <div><h2 className="text-lg font-bold">{t('settings.pwaTitle')}</h2><p className="text-primary-100 text-sm mt-1">{t('settings.pwaSub')}</p></div>
          <button type="button" onClick={promptInstall} className="bg-white text-primary-700 hover:bg-primary-50 font-semibold px-5 py-2.5 rounded-xl text-sm shadow-sm transition-colors flex items-center gap-2"><MonitorSmartphone size={17} />{t('settings.install')}</button>
        </div>
      )}

      <div className="card p-6 border-error-100 space-y-4 card-hover">
        <h2 className="text-base font-bold text-error-700 flex items-center gap-2"><Trash2 size={18} />{t('settings.dangerZone')}</h2>
        <p className="text-sm text-neutral-500">{t('settings.resetSub')}</p>
        <button type="button" className="btn btn-danger btn-md" onClick={() => { if (window.confirm(t('settings.confirmReset'))) onReset(); }}><Trash2 size={17} />{t('settings.reset')}</button>
      </div>
    </div>
  );
}

export default function App() {
  const { data, updateData, resetData } = useAppData();
  const { t, locale } = useI18n();
  const [view, setView] = useState<View>('dashboard');
  const [modal, setModal] = useState<Modal>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const currentProject = useMemo(() => {
    if (!modal || modal.kind !== 'detail' || !modal.projectId) return null;
    return data.projects.find((p) => p.id === modal.projectId) || null;
  }, [modal, data.projects]);

  const saveProject = (values: Omit<Project, 'createdAt' | 'id' | 'invoices' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    if (modal?.kind === 'project' && modal.projectId) {
      updateData({ ...data, projects: data.projects.map((p) => (p.id === modal.projectId ? { ...p, ...values, updatedAt: now } : p)) });
    } else {
      const newProj: Project = { ...values, id: `proj_${Date.now()}`, invoices: [], createdAt: now, updatedAt: now };
      updateData({ ...data, projects: [newProj, ...data.projects] });
    }
    setModal(null);
  };

  const deleteProject = (id: string) => {
    if (!window.confirm(t('detail.confirmDelete'))) return;
    updateData({ ...data, projects: data.projects.filter((p) => p.id !== id) });
    setModal(null);
  };

  const addInvoice = (projectId: string, invoice: Omit<Invoice, 'createdAt' | 'id'>) => {
    const inv: Invoice = { ...invoice, id: `inv_${Date.now()}`, createdAt: new Date().toISOString() };
    updateData({ ...data, projects: data.projects.map((p) => (p.id === projectId ? { ...p, invoices: [inv, ...p.invoices], updatedAt: new Date().toISOString() } : p)) });
  };

  const updateInvoice = (projectId: string, invoiceId: string, patch: Partial<Invoice>) => {
    updateData({ ...data, projects: data.projects.map((p) => (p.id === projectId ? { ...p, invoices: p.invoices.map((i) => (i.id === invoiceId ? { ...i, ...patch } : i)), updatedAt: new Date().toISOString() } : p)) });
  };

  const deleteInvoice = (projectId: string, invoiceId: string) => {
    updateData({ ...data, projects: data.projects.map((p) => (p.id === projectId ? { ...p, invoices: p.invoices.filter((i) => i.id !== invoiceId), updatedAt: new Date().toISOString() } : p)) });
  };

  return (
    <div className={cls('min-h-screen bg-slate-200 flex flex-col xl:flex-row text-neutral-800 font-sans', locale === 'ar' ? 'rtl' : 'ltr')} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <aside className="xl:w-72 bg-neutral-900 text-white p-6 flex flex-col justify-between shrink-0 shadow-lg">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white shadow-md">
              <BriefcaseBusiness size={21} />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight">{t('app.title')}</h1>
              <p className="text-xs text-neutral-400">{t('app.subtitle')}</p>
            </div>
          </div>
          <nav className="space-y-1">
            {navKeys.map(({ id, key, icon: Icon }) => (
              <button key={id} onClick={() => setView(id)} className={cls('w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all', view === id ? 'bg-primary-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/70')}>
                <Icon size={19} />
                {t(key)}
              </button>
            ))}
          </nav>
        </div>
        <div className="pt-6 border-t border-neutral-800/80 mt-6 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" /><span>{t('app.autoSave')}</span></div>
          <button onClick={() => setView('settings')} title={t('nav.settings')} className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"><SettingsIcon size={17} /></button>
        </div>
      </aside>

      <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        {view === 'dashboard' && <Dashboard projects={data.projects} onViewProject={(p) => setModal({ kind: 'detail', projectId: p.id })} onAdd={() => setModal({ kind: 'project' })} />}
        {view === 'projects' && <ProjectsView projects={data.projects} onView={(p) => setModal({ kind: 'detail', projectId: p.id })} onEdit={(p) => setModal({ kind: 'project', projectId: p.id })} onAdd={() => setModal({ kind: 'project' })} />}
        {view === 'deadlines' && <DeadlinesView projects={data.projects} onView={(p) => setModal({ kind: 'detail', projectId: p.id })} />}
        {view === 'settings' && <SettingsView data={data} onImport={(d) => updateData(d)} onReset={resetData} />}
      </main>

      {modal?.kind === 'project' && (
        <ModalShell title={modal.projectId ? t('form.editTitle') : t('form.addTitle')} onClose={() => setModal(null)}>
          <ProjectForm initial={modal.projectId ? data.projects.find((p) => p.id === modal.projectId) : undefined} onSave={saveProject} onClose={() => setModal(null)} />
        </ModalShell>
      )}

      {modal?.kind === 'detail' && currentProject && (
        <ProjectDetail project={currentProject} onClose={() => setModal(null)} onEdit={() => setModal({ kind: 'project', projectId: currentProject.id })} onDelete={() => deleteProject(currentProject.id)} onAddInvoice={() => setActiveProject(currentProject)} onUpdateInvoice={(invId, patch) => updateInvoice(currentProject.id, invId, patch)} onDeleteInvoice={(invId) => deleteInvoice(currentProject.id, invId)} />
      )}

      {activeProject && (
        <ModalShell title={t('form.addInvoiceTitle')} onClose={() => setActiveProject(null)}>
          <InvoiceForm onSave={(inv) => { addInvoice(activeProject.id, inv); setActiveProject(null); }} onClose={() => setActiveProject(null)} />
        </ModalShell>
      )}
    </div>
  );
}
