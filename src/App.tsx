import { useMemo, useState, useEffect, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
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
  FileSpreadsheet,
  FileText,
  Filter,
  Globe,
  KeyRound,
  LayoutDashboard,
  List,
  Lock,
  LogOut,
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
  User,
  WalletCards,
  X,
} from 'lucide-react';
import type { AppData, Invoice, InvoiceStatus, Project, StageId } from '@/types';
import { INVOICE_STATUSES, STAGES, invoiceStatusMeta, stageMeta } from '@/types';
import { useI18n, type Locale } from '@/lib/i18n';
import { usePwaInstall } from '@/lib/usePwaInstall';
import { cls, formatCurrency, formatCurrencyShort, formatDate, formatDateShort, relativeDeadline } from '@/lib/format';
import { useAppData } from '@/lib/storage';

// مكتبة استيراد وتصدير Excel
import * as XLSX from 'xlsx';

type View = 'dashboard' | 'projects' | 'deadlines' | 'settings';
type Modal = { kind: 'project' | 'invoice' | 'detail' | 'credentials'; projectId?: string } | null;

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
  return <div className="card p-5 relative overflow-hidden card-hover border border-neutral-100"><div className="flex items-start justify-between"><div><p className="text-sm text-neutral-500">{label}</p><p className="text-2xl font-extrabold text-neutral-900 mt-2 tracking-tight">{value}</p><p className="text-xs text-neutral-400 mt-2">{caption}</p></div><div className={cls('w-11 h-11 rounded-xl flex items-center justify-center shadow-sm', styles[color])}><Icon size={21} /></div></div><div className={cls('absolute -bottom-7 -left-5 w-20 h-20 rounded-full opacity-30', color === 'green' ? 'bg-success-100' : color === 'amber' ? 'bg-warning-100' : color === 'sky' ? 'bg-sky-100' : 'bg-primary-100')} /></div>;
}

function StageBadge({ stage, locale }: { stage: StageId; locale: Locale }) {
  const meta = stageMeta(stage);
  return <span className={cls('badge border', meta.badge)}><span className={cls('w-1.5 h-1.5 rounded-full', meta.dot)} />{stageLabel(stage, locale)}</span>;
}

function ModalShell({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><button aria-label="close" onClick={onClose} className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm transition-all" /><div className={cls('relative bg-white rounded-2xl shadow-elevated w-full max-h-[92vh] overflow-y-auto animate-scale-in border border-neutral-100', wide ? 'max-w-4xl' : 'max-w-2xl')}><div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-neutral-100 px-6 py-4 flex items-center justify-between"><h2 className="font-bold text-neutral-900 text-lg">{title}</h2><IconButton label="close" onClick={onClose}><X size={19} /></IconButton></div>{children}</div></div>;
}

function CredentialsModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (msg: string) => void }) {
  const currentUsername = localStorage.getItem('app_username') || 'admin';
  const [username, setUsername] = useState(currentUsername);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('اسم المستخدم لا يمكن أن يكون فارغاً');
      return;
    }
    if (password && password !== confirmPassword) {
      setError('كلمة المرور وتأكيدها غير متطابقين');
      return;
    }

    localStorage.setItem('app_username', username.trim());
    if (password) {
      localStorage.setItem('app_password', password);
    }
    onSuccess('تم تحديث بيانات الدخول بنجاح!');
    onClose();
  };

  return (
    <ModalShell title="تغيير اسم المستخدم والرقم السري" onClose={onClose}>
      <form onSubmit={handleSave} className="p-6 space-y-5">
        {error && (
          <div className="p-3.5 bg-red-50 border-2 border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
            <AlertCircle size={17} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
            <User size={15} className="text-emerald-700" />
            اسم المستخدم الجديد
          </span>
          <input
            type="text"
            required
            className="w-full px-4 py-3 rounded-xl border-2 border-neutral-300 focus:border-emerald-600 focus:outline-none text-sm font-semibold transition-all bg-neutral-50 focus:bg-white"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
            <KeyRound size={15} className="text-emerald-700" />
            الرقم السري الجديد (اختياري)
          </span>
          <input
            type="password"
            className="w-full px-4 py-3 rounded-xl border-2 border-neutral-300 focus:border-emerald-600 focus:outline-none text-sm font-semibold transition-all bg-neutral-50 focus:bg-white"
            placeholder="اتركه فارغاً إن لم ترغب بتغييره"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {password && (
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
              <KeyRound size={15} className="text-emerald-700" />
              تأكيد الرقم السري الجديد
            </span>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-neutral-300 focus:border-emerald-600 focus:outline-none text-sm font-semibold transition-all bg-neutral-50 focus:bg-white"
              placeholder="أعد إدخال الرقم السري الجديد"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
        )}
        <div className="flex items-center justify-start gap-3 border-t border-neutral-100 pt-5">
          <button type="submit" className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-md transition-all">
            <Check size={18} />
            <span>حفظ التغييرات</span>
          </button>
          <button type="button" className="btn-secondary btn-md shadow-2xs" onClick={onClose}>إلغاء</button>
        </div>
      </form>
    </ModalShell>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const savedUser = localStorage.getItem('app_username') || 'admin';
    const savedPass = localStorage.getItem('app_password') || '1234';

    if (username.trim() === savedUser && password === savedPass) {
      localStorage.setItem('app_authenticated', 'true');
      onLogin();
    } else {
      setError('اسم المستخدم أو الرقم السري غير صحيح!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-neutral-900 to-emerald-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-emerald-600/30 overflow-hidden p-8 animate-scale-in">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center rounded-2xl overflow-hidden shadow-md border-2 border-neutral-200 h-12 w-24 mb-4" title="الجمهورية الجزائرية الديمقراطية الشعبية">
            <div className="w-1/2 bg-emerald-600 h-full"></div>
            <div className="w-1/2 bg-white h-full relative flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-red-600 flex items-center justify-center relative">
                <span className="text-[9px] text-red-600 absolute">★</span>
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-black text-neutral-900">نظام إدارة صفقات الورشات</h1>
          <p className="text-xs text-neutral-500 mt-1 font-medium">الرجاء إدخال اسم المستخدم والرقم السري للوصول للبيانات الحساسة</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-50 border-2 border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
            <AlertCircle size={17} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
              <User size={15} className="text-emerald-700" />
              اسم المستخدم
            </span>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-neutral-300 focus:border-emerald-600 focus:outline-none text-sm font-semibold transition-all bg-neutral-50 focus:bg-white"
              placeholder="أدخل اسم المستخدم"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
              <Lock size={15} className="text-emerald-700" />
              الرقم السري (Password)
            </span>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-neutral-300 focus:border-emerald-600 focus:outline-none text-sm font-semibold transition-all bg-neutral-50 focus:bg-white"
              placeholder="أدخل الرقم السري"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm border border-emerald-600 mt-2"
          >
            <ShieldCheck size={18} />
            <span>تسجيل الدخول الآمن</span>
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-neutral-100 text-center">
          <p className="text-[11px] text-neutral-400 font-medium">البيانات الافتراضية الأولى: admin / 1234</p>
        </div>
      </div>
    </div>
  );
}

function ProjectForm({ initial, onSave, onClose }: { initial?: Project; onSave: (values: Omit<Project, 'id' | 'invoices' | 'createdAt' | 'updatedAt'>) => void; onClose: () => void }) {
  const { t, locale } = useI18n();
  const [values, setValues] = useState({ name: initial?.name ?? '', reference: initial?.reference ?? '', client: initial?.client ?? '', amount: initial?.amount?.toString() ?? '', submissionDeadline: initial?.submissionDeadline ?? '', startDate: initial?.startDate ?? '', stage: initial?.stage ?? 'consultation' as StageId, manager: initial?.manager ?? '', description: initial?.description ?? '' });
  const set = (key: keyof typeof values, value: string) => setValues((v) => ({ ...v, [key]: value }));
  const submit = (e: FormEvent) => { e.preventDefault(); onSave({ ...values, amount: Number(values.amount) || 0, stage: values.stage as StageId }); };
  const req = <b className="text-error-500">*</b>;
  return (
    <form onSubmit={submit} className="p-6 space-y-6">
      <div className="bg-neutral-100 p-4 rounded-xl border border-neutral-200 mb-2 flex items-center gap-2 text-neutral-700 shadow-2xs">
        <BriefcaseBusiness size={18} className="text-neutral-600 shrink-0" />
        <p className="text-xs font-bold tracking-wide">{t('form.addTitle') || 'معلومات الصفقة والمشروع الجديد'}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <label className="space-y-1.5 block">
          <span className="label font-semibold text-neutral-700 text-sm flex items-center gap-1.5"><BriefcaseBusiness size={15} className="text-neutral-500" />{t('form.projectName')} {req}</span>
          <input required className="input bg-neutral-50/80 border-2 border-neutral-300 focus:border-primary-500 focus:bg-white rounded-xl shadow-2xs transition-all py-2.5 px-3.5" value={values.name} onChange={(e) => set('name', e.target.value)} placeholder={t('form.projectNamePh')} />
        </label>
        <label className="space-y-1.5 block">
          <span className="label font-semibold text-neutral-700 text-sm flex items-center gap-1.5"><FileText size={15} className="text-neutral-500" />{t('form.reference')} {req}</span>
          <input required className="input bg-neutral-50/80 border-2 border-neutral-300 focus:border-primary-500 focus:bg-white rounded-xl shadow-2xs font-mono transition-all py-2.5 px-3.5" value={values.reference} onChange={(e) => set('reference', e.target.value)} placeholder={t('form.referencePh')} dir="ltr" />
        </label>
        <label className="space-y-1.5 block">
          <span className="label font-semibold text-neutral-700 text-sm flex items-center gap-1.5"><ShieldCheck size={15} className="text-neutral-500" />{t('form.client')} {req}</span>
          <input required className="input bg-neutral-50/80 border-2 border-neutral-300 focus:border-primary-500 focus:bg-white rounded-xl shadow-2xs transition-all py-2.5 px-3.5" value={values.client} onChange={(e) => set('client', e.target.value)} placeholder={t('form.clientPh')} />
        </label>
        <label className="space-y-1.5 block">
          <span className="label font-semibold text-neutral-700 text-sm flex items-center gap-1.5"><CircleDollarSign size={15} className="text-neutral-500" />{t('form.amount')} {req}</span>
          <input required min="0" type="number" className="input bg-neutral-50/80 border-2 border-neutral-300 focus:border-primary-500 focus:bg-white rounded-xl shadow-2xs font-mono transition-all py-2.5 px-3.5" value={values.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0" dir="ltr" />
        </label>
        <label className="space-y-1.5 block">
          <span className="label font-semibold text-neutral-700 text-sm flex items-center gap-1.5"><CalendarDays size={15} className="text-neutral-500" />{t('form.submissionDeadline')}</span>
          <input type="date" className="input bg-neutral-50/80 border-2 border-neutral-300 focus:border-primary-500 focus:bg-white rounded-xl shadow-2xs font-mono transition-all py-2.5 px-3.5" value={values.submissionDeadline} onChange={(e) => set('submissionDeadline', e.target.value)} dir="ltr" />
        </label>
        <label className="space-y-1.5 block">
          <span className="label font-semibold text-neutral-700 text-sm flex items-center gap-1.5"><CalendarDays size={15} className="text-neutral-500" />{t('form.startDate')}</span>
          <input type="date" className="input bg-neutral-50/80 border-2 border-neutral-300 focus:border-primary-500 focus:bg-white rounded-xl shadow-2xs font-mono transition-all py-2.5 px-3.5" value={values.startDate} onChange={(e) => set('startDate', e.target.value)} dir="ltr" />
        </label>
        <label className="space-y-1.5 block">
          <span className="label font-semibold text-neutral-700 text-sm flex items-center gap-1.5"><Filter size={15} className="text-neutral-500" />{t('form.currentStage')}</span>
          <div className="relative">
            <select className="input appearance-none bg-neutral-50/80 border-2 border-neutral-300 focus:border-primary-500 focus:bg-white rounded-xl shadow-2xs cursor-pointer transition-all py-2.5 px-3.5 w-full" value={values.stage} onChange={(e) => set('stage', e.target.value)}>
              {STAGES.map((s) => <option value={s.id} key={s.id}>{stageLabel(s.id, locale)}</option>)}
            </select>
            <ChevronDown size={17} className="absolute left-3 top-3.5 text-neutral-400 pointer-events-none" />
          </div>
        </label>
        <label className="space-y-1.5 block">
          <span className="label font-semibold text-neutral-700 text-sm flex items-center gap-1.5"><BriefcaseBusiness size={15} className="text-neutral-500" />{t('form.manager')}</span>
          <input className="input bg-neutral-50/80 border-2 border-neutral-300 focus:border-primary-500 focus:bg-white rounded-xl shadow-2xs transition-all py-2.5 px-3.5" value={values.manager} onChange={(e) => set('manager', e.target.value)} placeholder={t('form.managerPh')} />
        </label>
      </div>
      <label className="space-y-1.5 block">
        <span className="label font-semibold text-neutral-700 text-sm flex items-center gap-1.5"><Receipt size={15} className="text-neutral-500" />{t('form.notes')}</span>
        <textarea className="input bg-neutral-50/80 border-2 border-neutral-300 focus:border-primary-500 focus:bg-white rounded-xl shadow-2xs min-h-24 resize-y transition-all p-3.5" value={values.description} onChange={(e) => set('description', e.target.value)} placeholder={t('form.notesPh')} />
      </label>
      <div className="flex items-center justify-start gap-3 border-t border-neutral-100 pt-5">
        <button type="submit" className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition-all">
          <Check size={18} />
          <span>{initial ? t('form.save') : t('form.add')}</span>
        </button>
        <button type="button" className="btn-secondary btn-md shadow-2xs" onClick={onClose}>{t('form.cancel')}</button>
      </div>
    </form>
  );
}

function InvoiceForm({ onSave, onClose }: { onSave: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => void; onClose: () => void }) {
  const { t, locale } = useI18n();
  const [values, setValues] = useState({ label: t('form.newInvoice'), amount: '', status: 'drafted' as InvoiceStatus, submittedDate: '', paidDate: '', notes: '' });
  const set = (key: keyof typeof values, value: string) => setValues((v) => ({ ...v, [key]: value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ ...values, amount: Number(values.amount) || 0, status: values.status as InvoiceStatus }); }} className="p-6 space-y-6">
      <div className="bg-neutral-100 p-4 rounded-xl border border-neutral-200 mb-2 flex items-center gap-2 text-neutral-700 shadow-2xs">
        <Receipt size={18} className="text-neutral-600 shrink-0" />
        <p className="text-xs font-bold tracking-wide">{t('form.addInvoiceTitle') || 'إضافة وتفاصيل الفاتورة الجديدة'}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <label className="space-y-1.5 block">
          <span className="label font-semibold text-neutral-700 text-sm flex items-center gap-1.5"><Receipt size={15} className="text-neutral-500" />{t('form.invoiceType')}</span>
          <input required className="input bg-neutral-50/80 border-2 border-neutral-300 focus:border-primary-500 focus:bg-white rounded-xl shadow-2xs transition-all py-2.5 px-3.5" value={values.label} onChange={(e) => set('label', e.target.value)} placeholder={t('form.invoiceTypePh')} />
        </label>
        <label className="space-y-1.5 block">
          <span className="label font-semibold text-neutral-700 text-sm flex items-center gap-1.5"><CircleDollarSign size={15} className="text-neutral-500" />{t('form.invoiceAmount')}</span>
          <input required min="0" type="number" className="input bg-neutral-50/80 border-2 border-neutral-300 focus:border-primary-500 focus:bg-white rounded-xl shadow-2xs font-mono transition-all py-2.5 px-3.5" value={values.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0" dir="ltr" />
        </label>
        <label className="space-y-1.5 block">
          <span className="label font-semibold text-neutral-700 text-sm flex items-center gap-1.5"><Filter size={15} className="text-neutral-500" />{t('form.invoiceStatus')}</span>
          <div className="relative">
            <select className="input appearance-none bg-neutral-50/80 border-2 border-neutral-300 focus:border-primary-500 focus:bg-white rounded-xl shadow-2xs cursor-pointer transition-all py-2.5 px-3.5 w-full" value={values.status} onChange={(e) => set('status', e.target.value)}>
              {INVOICE_STATUSES.map((s) => <option value={s.id} key={s.id}>{invoiceStatusLabel(s.id, locale)}</option>)}
            </select>
            <ChevronDown size={17} className="absolute left-3 top-3.5 text-neutral-400 pointer-events-none" />
          </div>
        </label>
        <label className="space-y-1.5 block">
          <span className="label font-semibold text-neutral-700 text-sm flex items-center gap-1.5"><CalendarDays size={15} className="text-neutral-500" />{t('form.submittedDate')}</span>
          <input type="date" className="input bg-neutral-50/80 border-2 border-neutral-300 focus:border-primary-500 focus:bg-white rounded-xl shadow-2xs font-mono transition-all py-2.5 px-3.5" value={values.submittedDate} onChange={(e) => set('submittedDate', e.target.value)} dir="ltr" />
        </label>
        <label className="space-y-1.5 block">
          <span className="label font-semibold text-neutral-700 text-sm flex items-center gap-1.5"><CalendarDays size={15} className="text-neutral-500" />{t('form.paidDate')}</span>
          <input type="date" className="input bg-neutral-50/80 border-2 border-neutral-300 focus:border-primary-500 focus:bg-white rounded-xl shadow-2xs font-mono transition-all py-2.5 px-3.5" value={values.paidDate} onChange={(e) => set('paidDate', e.target.value)} dir="ltr" />
        </label>
      </div>
      <label className="space-y-1.5 block">
        <span className="label font-semibold text-neutral-700 text-sm flex items-center gap-1.5"><Receipt size={15} className="text-neutral-500" />{t('form.invoiceNotes')}</span>
        <textarea className="input bg-neutral-50/80 border-2 border-neutral-300 focus:border-primary-500 focus:bg-white rounded-xl shadow-2xs min-h-20 resize-y transition-all p-3.5" value={values.notes} onChange={(e) => set('notes', e.target.value)} placeholder="..." />
      </label>
      <div className="flex items-center justify-start gap-3 border-t border-neutral-100 pt-5">
        <button className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all" type="submit"><Check size={18} /><span>{t('form.addInvoice')}</span></button>
        <button type="button" className="btn-secondary btn-md shadow-2xs" onClick={onClose}>{t('form.cancel')}</button>
      </div>
    </form>
  );
}

function ProjectDetail({ project, onClose, onEdit, onDelete, onAddInvoice, onUpdateInvoice, onDeleteInvoice }: { project: Project; onClose: () => void; onEdit: () => void; onDelete: () => void; onAddInvoice: () => void; onUpdateInvoice: (id: string, patch: Partial<Invoice>) => void; onDeleteInvoice: (id: string) => void }) {
  const { t, locale } = useI18n();
  const paid = project.invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const invoiced = project.invoices.reduce((sum, i) => sum + i.amount, 0);
  const progress = Math.min(100, Math.round((paid / Math.max(1, project.amount)) * 100));
  return (
    <ModalShell title={t('detail.title')} onClose={onClose} wide>
      <div className="p-6 space-y-6">
        <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 shadow-2xs flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3"><StageBadge stage={project.stage} locale={locale} /><span className="text-xs text-neutral-600 font-mono bg-neutral-200 px-2 py-0.5 rounded border border-neutral-300" dir="ltr">{project.reference}</span></div>
            <h1 className="text-xl font-extrabold text-neutral-900">{project.name}</h1>
            <p className="text-sm text-neutral-600 mt-2 flex items-center gap-2 font-medium"><BriefcaseBusiness size={15} className="text-neutral-500" />{project.client}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-danger btn-sm flex items-center gap-1.5 shadow-sm" onClick={onDelete}><Trash2 size={15} />{t('detail.delete')}</button>
            <button className="btn-secondary btn-sm flex items-center gap-1.5 shadow-sm bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100" onClick={onEdit}><Pencil size={15} />{t('detail.edit')}</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-neutral-50/80 border border-neutral-100 rounded-xl p-4 shadow-2xs"><p className="text-xs text-neutral-500">{t('detail.contractValue')}</p><p className="font-bold text-neutral-900 mt-1">{formatCurrency(project.amount, locale)}</p></div>
          <div className="bg-neutral-50/80 border border-neutral-100 rounded-xl p-4 shadow-2xs"><p className="text-xs text-neutral-500">{t('detail.totalInvoices')}</p><p className="font-bold text-neutral-900 mt-1">{formatCurrency(invoiced, locale)}</p></div>
          <div className="bg-success-50/55 border border-success-100 rounded-xl p-4 shadow-2xs"><p className="text-xs text-success-700">{t('detail.collected')}</p><p className="font-bold text-success-700 mt-1">{formatCurrency(paid, locale)}</p></div>
          <div className="bg-warning-50/55 border border-warning-100 rounded-xl p-4 shadow-2xs"><p className="text-xs text-warning-700">{t('detail.remaining')}</p><p className="font-bold text-warning-700 mt-1">{formatCurrency(Math.max(0, project.amount - paid), locale)}</p></div>
        </div>
        <div>
          <div className="flex items-center justify-between text-sm mb-2"><span className="font-medium text-neutral-700">{t('detail.collectionProgress')}</span><span className="font-bold text-primary-600">{progress}%</span></div>
          <div className="h-2.5 rounded-full bg-neutral-100 overflow-hidden border border-neutral-200/50"><div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
        </div>
        <div className="grid md:grid-cols-3 gap-4 text-sm bg-neutral-50/50 p-4 rounded-xl border border-neutral-100">
          <div><p className="text-neutral-400 text-xs mb-1">{t('detail.responsible')}</p><p className="font-medium text-neutral-700">{project.manager || t('detail.notSet')}</p></div>
          <div><p className="text-neutral-400 text-xs mb-1">{t('detail.submissionDeadline')}</p><p className="font-medium text-neutral-700" dir="ltr">{formatDate(project.submissionDeadline, locale)}</p></div>
          <div><p className="text-neutral-400 text-xs mb-1">{t('detail.start')}</p><p className="font-medium text-neutral-700" dir="ltr">{formatDate(project.startDate, locale)}</p></div>
        </div>
        <div className="border-t border-neutral-100 pt-5">
          <SectionTitle 
            title={t('detail.invoices')} 
            subtitle={`${project.invoices.length} ${t('detail.invoicesCount')}`} 
            action={
              <button 
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all duration-200" 
                onClick={onAddInvoice}
              >
                <Plus size={16} />
                <span>{t('detail.addInvoice')}</span>
              </button>
            } 
          />
          {project.invoices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-400 bg-neutral-50/50">{t('detail.noInvoices')}</div>
          ) : (
            <div className="overflow-x-auto border border-neutral-100 rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50/70 text-neutral-500">
                    <th className="text-right font-medium py-3 px-4">{t('detail.invoiceCol')}</th>
                    <th className="text-right font-medium py-3 px-4">{t('detail.amountCol')}</th>
                    <th className="text-right font-medium py-3 px-4">{t('detail.statusCol')}</th>
                    <th className="text-right font-medium py-3 px-4">{t('detail.dateCol')}</th>
                    <th className="w-10 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {project.invoices.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-0 border-neutral-100 hover:bg-neutral-50/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-neutral-700">{inv.label}</td>
                      <td className="py-3 px-4 font-mono text-neutral-800">{formatCurrency(inv.amount, locale)}</td>
                      <td className="py-3 px-4"><select className={cls('text-xs border border-neutral-200 rounded-lg px-2.5 py-1.5 font-medium focus:ring-0 cursor-pointer shadow-2xs', invoiceStatusMeta(inv.status).badge)} value={inv.status} onChange={(e) => onUpdateInvoice(inv.id, { status: e.target.value as InvoiceStatus, paidDate: e.target.value === 'paid' ? new Date().toISOString().slice(0, 10) : inv.paidDate })}>{INVOICE_STATUSES.map((s) => <option key={s.id} value={s.id}>{invoiceStatusLabel(s.id, locale)}</option>)}</select></td>
                      <td className="py-3 px-4 text-neutral-500 font-mono text-xs" dir="ltr">{formatDateShort(inv.paidDate || inv.submittedDate, locale)}</td>
                      <td className="px-4"><IconButton label={t('detail.deleteInvoice')} danger onClick={() => onDeleteInvoice(inv.id)}><Trash2 size={15} /></IconButton></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
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
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900 border-2 border-emerald-600 rounded-2xl p-5 shadow-md flex flex-wrap items-center justify-between gap-4 text-white">
        <div>
          <h1 className="text-2xl font-black tracking-tight">{t('app.welcome')}</h1>
          <p className="text-sm text-emerald-100 mt-1 font-medium">{t('app.welcomeSub')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl overflow-hidden shadow-lg border-2 border-white/30 h-10 w-20" title="الجمهورية الجزائرية الديمقراطية الشعبية">
            <div className="w-1/2 bg-emerald-600 h-full"></div>
            <div className="w-1/2 bg-white h-full relative flex items-center justify-center">
              <div className="w-4 h-4 rounded-full border-2 border-red-600 flex items-center justify-center relative">
                <span className="text-[8px] text-red-600 absolute">★</span>
              </div>
            </div>
          </div>
          <button 
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-red-500" 
            onClick={onAdd}
          >
            <Plus size={20} className="shrink-0" />
            <span>{t('dash.addDeal')}</span>
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={BriefcaseBusiness} label={t('dash.activeProjects')} value={active.toString()} caption={`${projects.length} ${t('dash.totalFiles')}`} color="blue" />
        <StatCard icon={CircleDollarSign} label={t('dash.expectedRevenue')} value={formatCurrencyShort(expected, locale)} caption={t('dash.totalContracts')} color="sky" />
        <StatCard icon={TrendingUp} label={t('dash.collected')} value={formatCurrencyShort(collected, locale)} caption={`${invoiceCount} ${t('dash.invoicesRecorded')}`} color="green" />
        <StatCard icon={WalletCards} label={t('dash.pending')} value={formatCurrencyShort(pending, locale)} caption={t('dash.awaiting')} color="amber" />
      </div>
      <div className="grid xl:grid-cols-5 gap-6">
        <div className="card p-5 xl:col-span-3 card-hover border border-neutral-100">
          <SectionTitle title={t('dash.stageDistribution')} subtitle={t('dash.stageSub')} action={<button className="btn-ghost btn-sm flex items-center gap-1" onClick={onAdd}>{t('dash.refresh')} <RefreshCcw size={14} /></button>} />
          <div className="space-y-3">
            {statusCounts.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <div className="w-36 sm:w-48 shrink-0 flex items-center gap-2 text-sm text-neutral-600"><span className={cls('w-2 h-2 rounded-full shrink-0', s.dot)} />{stageLabel(s.id, locale)}</div>
                <div className="flex-1 h-2.5 rounded-full bg-neutral-100 overflow-hidden"><div className={cls('h-full rounded-full transition-all', s.dot)} style={{ width: `${(s.count / max) * 100}%` }} /></div>
                <span className="w-6 text-left text-sm font-semibold text-neutral-700">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5 xl:col-span-2 card-hover border border-neutral-100">
          <SectionTitle title={t('dash.financials')} subtitle={t('dash.financialsSub')} />
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2 text-sm"><span className="text-neutral-500">{t('dash.collectionRate')}</span><span className="font-bold text-success-600">{expected ? Math.round((collected / expected) * 100) : 0}%</span></div>
              <div className="h-3 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200/50"><div className="h-full bg-success-500 rounded-full" style={{ width: `${expected ? Math.min(100, (collected / expected) * 100) : 0}%` }} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-success-50/60 border border-success-100 p-4"><p className="text-xs text-success-700">{t('dash.collectedLabel')}</p><p className="text-lg font-bold text-success-800 mt-1">{formatCurrencyShort(collected, locale)}</p></div>
              <div className="rounded-xl bg-warning-50/60 border border-warning-100 p-4"><p className="text-xs text-warning-700">{t('dash.pendingLabel')}</p><p className="text-lg font-bold text-warning-800 mt-1">{formatCurrencyShort(pending, locale)}</p></div>
            </div>
          </div>
        </div>
      </div>
      <div className="card p-5 card-hover border border-neutral-100">
        <SectionTitle title={t('dash.upcoming')} subtitle={t('dash.upcomingSub')} action={<button className="btn-ghost btn-sm flex items-center gap-1" onClick={() => {}}>{t('dash.viewAll')} <ChevronLeft size={15} className="flip-x" /></button>} />
        {upcoming.length ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {upcoming.slice(0, 3).map((p) => {
              const dl = relativeDeadline(p.submissionDeadline, locale);
              return (
                <button key={p.id} className="text-right rounded-xl border border-neutral-100 hover:border-primary-200 hover:bg-primary-50/30 p-4 transition-colors card-hover bg-white" onClick={() => onViewProject(p)}>
                  <div className="flex items-start justify-between gap-2"><span className={cls('badge border', dl.tone === 'danger' ? 'bg-error-50 text-error-700 border-error-100' : dl.tone === 'warning' ? 'bg-warning-50 text-warning-700 border-warning-100' : 'bg-neutral-50 text-neutral-600 border-neutral-200')}>{dl.label}</span><CalendarDays size={17} className="text-neutral-400" /></div>
                  <p className="font-semibold text-sm text-neutral-800 mt-3 line-clamp-1">{p.name}</p>
                  <p className="text-xs text-neutral-500 mt-1">{p.client}</p>
                  <p className="text-xs text-neutral-400 mt-2 font-mono" dir="ltr">{formatDateShort(p.submissionDeadline, locale)}</p>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-neutral-400 py-6 text-center">{t('dash.noDeadlines')}</p>
        )}
      </div>
    </div>
  );
}

function ProjectsView({ projects, onView, onEdit, onAdd }: { projects: Project[]; onView: (p: Project) => void; onEdit: (p: Project) => void; onAdd: () => void }) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState(''); const [stage, setStage] = useState<StageId | 'all'>('all'); const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const filtered = useMemo(() => projects.filter((p) => { const q = query.toLowerCase(); return (!q || p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q)) && (stage === 'all' || p.stage === stage); }), [projects, query, stage]);
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900">{t('projects.title')}</h1>
          <p className="text-sm text-neutral-500 mt-1">{t('projects.sub')}</p>
        </div>
        <button 
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200" 
          onClick={onAdd}
        >
          <Plus size={20} className="shrink-0" />
          <span>{t('projects.add')}</span>
        </button>
      </div>
      <div className="card p-3 flex flex-wrap gap-3 items-center border border-neutral-100">
        <div className="relative flex-1 min-w-56"><Search size={17} className="absolute right-3 top-3 text-neutral-400" /><input className="input pr-10 border-neutral-200 focus:border-primary-500" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('projects.search')} /></div>
        <div className="relative min-w-52">
          <Filter size={16} className="absolute right-3 top-3 text-neutral-400 pointer-events-none" />
          <select className="input pr-9 appearance-none border-neutral-200 focus:border-primary-500" value={stage} onChange={(e) => setStage(e.target.value as StageId | 'all')}>
            <option value="all">{t('projects.allStages')} ({projects.length})</option>
            {STAGES.map((s) => <option value={s.id} key={s.id}>{stageLabel(s.id, locale)} ({projects.filter((p) => p.stage === s.id).length})</option>)}
          </select>
          <ChevronDown size={16} className="absolute left-3 top-3 text-neutral-400 pointer-events-none" />
        </div>
        <div className="flex bg-neutral-100 rounded-lg p-1 mr-auto border border-neutral-200/60">
          <button className={cls('p-2 rounded-md transition-colors', view === 'kanban' ? 'bg-white text-primary-600 shadow-sm font-bold' : 'text-neutral-500')} onClick={() => setView('kanban')} title={t('projects.kanban')}><LayoutDashboard size={17} /></button>
          <button className={cls('p-2 rounded-md transition-colors', view === 'table' ? 'bg-white text-primary-600 shadow-sm font-bold' : 'text-neutral-500')} onClick={() => setView('table')} title={t('projects.table')}><List size={17} /></button>
        </div>
      </div>
      {view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-3 snap-x">
          {STAGES.map((s) => {
            const items = filtered.filter((p) => p.stage === s.id);
            return (
              <div key={s.id} className="min-w-[280px] w-[280px] shrink-0 snap-start">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2"><span className={cls('w-2.5 h-2.5 rounded-full', s.dot)} /><h3 className="text-sm font-bold text-neutral-700">{stageLabel(s.id, locale)}</h3></div>
                  <span className="text-xs font-semibold text-neutral-500 bg-neutral-200/70 rounded-full px-2 py-0.5">{items.length}</span>
                </div>
                <div className="space-y-3 min-h-32 p-2 rounded-2xl bg-neutral-100/60 border border-neutral-200/50">
                  {items.map((p) => (
                    <div key={p.id} className="bg-white rounded-xl border border-neutral-200/70 p-4 shadow-soft card-hover cursor-pointer" onClick={() => onView(p)}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-medium text-neutral-400 font-mono" dir="ltr">{p.reference}</span>
                        <button onClick={(e) => { e.stopPropagation(); onEdit(p); }} className="text-neutral-400 hover:text-primary-600 p-1"><MoreHorizontal size={17} /></button>
                      </div>
                      <h4 className="font-bold text-sm text-neutral-800 mt-2 leading-6 line-clamp-2">{p.name}</h4>
                      <p className="text-xs text-neutral-500 mt-2 line-clamp-1">{p.client}</p>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-100">
                        <span className="text-xs font-bold text-neutral-700 font-mono">{formatCurrencyShort(p.amount, locale)}</span>
                        {p.submissionDeadline && <span className={cls('text-[11px] font-mono', relativeDeadline(p.submissionDeadline, locale).tone === 'danger' ? 'text-error-600' : 'text-neutral-400')}><CalendarDays size={12} className="inline ml-1" />{formatDateShort(p.submissionDeadline, locale)}</span>}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <div className="text-center py-8 text-xs text-neutral-400">{t('projects.noDeals')}</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden border border-neutral-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th className="text-right px-5 py-3 font-medium">{t('projects.col.deal')}</th>
                  <th className="text-right px-5 py-3 font-medium">{t('projects.col.client')}</th>
                  <th className="text-right px-5 py-3 font-medium">{t('projects.col.stage')}</th>
                  <th className="text-right px-5 py-3 font-medium">{t('projects.col.amount')}</th>
                  <th className="text-right px-5 py-3 font-medium">{t('projects.col.deadline')}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 border-neutral-100 hover:bg-neutral-50/70 cursor-pointer transition-colors" onClick={() => onView(p)}>
                    <td className="px-5 py-4"><p className="font-semibold text-neutral-800 max-w-xs truncate">{p.name}</p><p className="text-xs text-neutral-400 mt-1 font-mono" dir="ltr">{p.reference}</p></td>
                    <td className="px-5 py-4 text-neutral-600">{p.client}</td>
                    <td className="px-5 py-4"><StageBadge stage={p.stage} locale={locale} /></td>
                    <td className="px-5 py-4 font-semibold text-neutral-700 font-mono">{formatCurrency(p.amount, locale)}</td>
                    <td className="px-5 py-4 text-neutral-500 font-mono text-xs" dir="ltr">{formatDateShort(p.submissionDeadline, locale)}</td>
                    <td className="px-5 py-4"><IconButton label={t('projects.edit')} onClick={() => onEdit(p)}><Pencil size={15} /></IconButton></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filtered.length && <div className="p-12 text-center text-sm text-neutral-400">{t('projects.noResults')}</div>}
        </div>
      )}
    </div>
  );
}

function DeadlinesView({ projects, onView }: { projects: Project[]; onView: (p: Project) => void }) {
  const { t, locale } = useI18n();
  const reminders = projects.filter((p) => p.submissionDeadline).map((p) => ({ p, kind: 'deadline' as const, date: p.submissionDeadline! })).sort((a, b) => a.date.localeCompare(b.date));
  const unpaidInvoices = projects.flatMap((p) => p.invoices.filter((i) => i.status !== 'paid').map((i) => ({ p, i })));
  
  const urgentRemindersCount = reminders.filter((r) => { const d = relativeDeadline(r.date, locale); return d.tone === 'danger' || d.tone === 'warning'; }).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-neutral-50 border-2 border-neutral-300 rounded-2xl p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell size={22} className="text-neutral-700" />
            <h1 className="text-xl font-extrabold text-neutral-900">{t('deadlines.title')}</h1>
          </div>
          <p className="text-sm text-neutral-600 font-medium">{t('deadlines.sub')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 bg-rose-100 text-rose-800 text-xs font-bold rounded-xl border-2 border-rose-300 shadow-2xs">
            {urgentRemindersCount} {t('deadlines.upcoming30') || 'إنذارات عاجلة'}
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        <div className="card p-5 border-2 border-rose-300 bg-rose-50/70 card-hover shadow-2xs rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-rose-900">{t('deadlines.upcoming30')}</p>
              <p className="text-2xl font-black text-rose-950 mt-2">{urgentRemindersCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center shadow-2xs border border-rose-300"><AlertCircle size={22} /></div>
          </div>
        </div>
        <div className="card p-5 border-2 border-amber-300 bg-amber-50/70 card-hover shadow-2xs rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-amber-900">{t('deadlines.unpaidInvoices')}</p>
              <p className="text-2xl font-black text-amber-950 mt-2">{unpaidInvoices.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center shadow-2xs border border-amber-300"><Receipt size={22} /></div>
          </div>
        </div>
        <div className="card p-5 border-2 border-emerald-300 bg-emerald-50/70 card-hover shadow-2xs rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-emerald-900">{t('deadlines.tracked')}</p>
              <p className="text-2xl font-black text-emerald-950 mt-2">{projects.length - reminders.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-200 text-emerald-800 flex items-center justify-center shadow-2xs border border-emerald-300"><CheckCircle2 size={22} /></div>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <div className="card p-6 card-hover border-2 border-neutral-200 bg-white shadow-2xs rounded-2xl">
          <SectionTitle title={t('deadlines.submissionDeadlines')} subtitle={t('deadlines.sortedByDate')} />
          {reminders.length ? (
            <div className="space-y-3.5">
              {reminders.map(({ p, date }) => {
                const dl = relativeDeadline(date, locale);
                const isUrgent = dl.tone === 'danger' || dl.tone === 'warning';
                return (
                  <button 
                    key={p.id} 
                    onClick={() => onView(p)} 
                    className={cls(
                      'w-full flex items-center gap-3.5 p-4 rounded-xl text-right transition-all border-2 shadow-2xs',
                      isUrgent 
                        ? 'bg-rose-50/80 border-rose-300 hover:bg-rose-100 text-rose-950' 
                        : 'bg-emerald-50/60 border-emerald-300 hover:bg-emerald-100 text-emerald-950'
                    )}
                  >
                    <div className={cls('w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-2xs border', isUrgent ? 'bg-rose-200 text-rose-900 border-rose-300' : 'bg-emerald-200 text-emerald-950 border-emerald-300')}>
                      <CalendarDays size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold truncate">{p.name}</p>
                      <p className="text-xs text-neutral-600 mt-1 font-mono font-semibold" dir="ltr">{p.reference} · {formatDateShort(date, locale)}</p>
                    </div>
                    <span className={cls('text-xs shrink-0 font-bold px-3 py-1 rounded-lg border-2 shadow-2xs', isUrgent ? 'bg-rose-200/80 text-rose-900 border-rose-400' : 'bg-emerald-200/80 text-emerald-950 border-emerald-400')}>
                      {dl.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-neutral-400 text-center py-8">{t('deadlines.noDeadlines')}</p>
          )}
        </div>

        <div className="card p-6 card-hover border-2 border-neutral-200 bg-white shadow-2xs rounded-2xl">
          <SectionTitle title={t('deadlines.invoicesProcessing')} subtitle={t('deadlines.needsFollowup')} />
          {unpaidInvoices.length ? (
            <div className="space-y-3.5">
              {unpaidInvoices.map(({ p, i }) => (
                <button 
                  key={i.id} 
                  onClick={() => onView(p)} 
                  className="w-full flex items-center gap-3.5 p-4 rounded-xl bg-amber-50/80 border-2 border-amber-300 hover:bg-amber-100 text-right transition-all shadow-2xs"
                >
                  <div className="w-11 h-11 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 shadow-2xs border border-amber-300">
                    <Receipt size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-amber-950 truncate">{i.label}</p>
                    <p className="text-xs text-neutral-600 mt-1 truncate font-semibold">{p.name}</p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-sm font-black text-amber-950 font-mono">{formatCurrencyShort(i.amount, locale)}</p>
                    <span className="inline-block text-[11px] font-bold text-amber-950 bg-amber-200/80 px-2.5 py-0.5 rounded-lg border border-amber-400 mt-1">
                      {invoiceStatusLabel(i.status, locale)}
                    </span>
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

function SettingsView({ data, onImport, onReset, onLogout, onChangeCredentials }: { data: AppData; onImport: (data: AppData) => void; onReset: () => void; onLogout: () => void; onChangeCredentials: () => void }) {
  const { t, locale, setLocale } = useI18n();
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const [message, setMessage] = useState('');

  // تصدير ملفات Excel (.xlsx)
  const exportExcel = () => {
    try {
      const projectsFlat = data.projects.map((p) => ({
        [locale === 'fr' ? 'Nom du Projet' : 'اسم المشروع']: p.name,
        [locale === 'fr' ? 'Référence' : 'المرجع']: p.reference,
        [locale === 'fr' ? 'Client' : 'العميل']: p.client,
        [locale === 'fr' ? 'Montant (DZD)' : 'المبلغ (دج)']: p.amount,
        [locale === 'fr' ? 'Étape' : 'المرحلة']: stageLabel(p.stage, locale),
        [locale === 'fr' ? 'Responsable' : 'المسؤول']: p.manager,
        [locale === 'fr' ? 'Date limite' : 'تاريخ التسليم']: p.submissionDeadline,
        [locale === 'fr' ? 'Date de début' : 'تاريخ البداية']: p.startDate,
      }));

      const worksheet = XLSX.utils.json_to_sheet(projectsFlat);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, locale === 'fr' ? 'Marchés' : 'الصفقات');
      XLSX.writeFile(workbook, `mes-marches-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
      setMessage(locale === 'fr' ? 'Fichier Excel exporté avec succès !' : 'تم تصدير ملف Excel بنجاح!');
    } catch {
      setMessage(locale === 'fr' ? 'Erreur lors de l\'exportation du fichier Excel.' : 'حدث خطأ أثناء تصدير ملف Excel.');
    }
  };

  // تصدير تقرير PDF يدعم اللغة العربية عبر الطباعة المباشرة من المتصفح
  const exportPdf = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8">
          <title>${locale === 'fr' ? 'Rapport des Marchés' : 'تقرير صفقات الورشات'}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; direction: ${locale === 'ar' ? 'rtl' : 'ltr'}; text-align: ${locale === 'ar' ? 'right' : 'left'}; color: #1f2937; }
            h1 { text-align: center; color: #047857; margin-bottom: 8px; font-size: 24px; }
            .subtitle { text-align: center; color: #6b7280; font-size: 13px; margin-bottom: 25px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: ${locale === 'ar' ? 'right' : 'left'}; font-size: 13px; }
            th { background-color: #f3f4f6; color: #111827; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9fafb; }
          </style>
        </head>
        <body>
          <h1>${locale === 'fr' ? 'Rapport des Marchés et Chantiers' : 'تقرير صفقات الورشات والمشاريع'}</h1>
          <p class="subtitle">${locale === 'fr' ? 'Date du rapport :' : 'تاريخ التقرير :'} ${new Date().toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'ar-DZ')}</p>
          <table>
            <thead>
              <tr>
                <th>${locale === 'fr' ? 'Nom du Projet' : 'اسم المشروع'}</th>
                <th>${locale === 'fr' ? 'Référence' : 'المرجع'}</th>
                <th>${locale === 'fr' ? 'Client' : 'العميل'}</th>
                <th>${locale === 'fr' ? 'Montant (DZD)' : 'المبلغ (دج)'}</th>
                <th>${locale === 'fr' ? 'Étape' : 'المرحلة'}</th>
                <th>${locale === 'fr' ? 'Échéance' : 'آجال التسليم'}</th>
              </tr>
            </thead>
            <tbody>
              ${data.projects.map(p => `
                <tr>
                  <td><b>${p.name}</b></td>
                  <td dir="ltr" style="text-align:${locale === 'ar' ? 'right' : 'left'}; font-family: monospace;">${p.reference}</td>
                  <td>${p.client}</td>
                  <td style="font-family: monospace;">${p.amount.toLocaleString()}</td>
                  <td>${stageLabel(p.stage, locale)}</td>
                  <td dir="ltr" style="text-align:${locale === 'ar' ? 'right' : 'left'};">${p.submissionDeadline || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 300);

      setMessage(locale === 'fr' ? 'Fenêtre d\'impression PDF ouverte avec succès !' : 'تم فتح نافذة حفظ التقرير كـ PDF بنجاح!');
    } catch {
      setMessage(locale === 'fr' ? 'Erreur lors de l\'exportation du rapport.' : 'حدث خطأ أثناء تصدير التقرير.');
    }
  };

  // استيراد ملفات Excel (.xlsx)
  const importExcelFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const dataBuffer = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(dataBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        const importedProjects: Project[] = jsonData.map((row, index) => ({
          id: `imported_${Date.now()}_${index}`,
          name: row['اسم المشروع'] || row['Nom du Projet'] || row['name'] || 'مشروع مستورد',
          reference: row['المرجع'] || row['Référence'] || row['reference'] || `REF-${index}`,
          client: row['العميل'] || row['Client'] || row['client'] || 'غير محدد',
          amount: Number(row['المبلغ (دج)'] || row['Montant (DZD)'] || row['amount'] || 0),
          stage: 'consultation' as StageId,
          manager: row['المسؤول'] || row['Responsable'] || row['manager'] || '',
          submissionDeadline: row['تاريخ التسليم'] || row['Date limite'] || row['submissionDeadline'] || '',
          startDate: row['تاريخ البداية'] || row['Date de début'] || row['startDate'] || '',
          invoices: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));

        if (importedProjects.length) {
          onImport({ ...data, projects: [...importedProjects, ...data.projects] });
          setMessage(locale === 'fr' ? 'Fichier Excel importé et marchés ajoutés avec succès !' : 'تم استيراد ملف Excel وإضافة الصفقات بنجاح!');
        } else {
          setMessage(locale === 'fr' ? 'Le fichier est vide ou ne contient pas de colonnes compatibles.' : 'الملف فارغ أو لا يحتوي على أعمدة متوافقة.');
        }
      } catch {
        setMessage(locale === 'fr' ? 'Échec de la lecture du fichier Excel.' : 'فشل قراءة ملف Excel، تأكد من صحة الصيغة.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900 border-2 border-emerald-600 rounded-2xl p-5 shadow-md flex flex-wrap items-center justify-between gap-4 text-white">
        <div>
          <h1 className="text-2xl font-black tracking-tight">{t('settings.title')}</h1>
          <p className="text-sm text-emerald-100 mt-1 font-medium">{t('settings.sub')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl border border-red-500 shadow-sm transition-all"
          >
            <LogOut size={15} />
            <span>{locale === 'fr' ? 'Déconnexion' : 'تسجيل الخروج'}</span>
          </button>
        </div>
      </div>

      {message && <div className="p-4 rounded-xl bg-primary-50 text-primary-700 text-sm font-medium flex items-center justify-between border border-primary-100"><span>{message}</span><button onClick={() => setMessage('')}><X size={16} /></button></div>}

      <div className="card p-6 space-y-5 border-2 border-emerald-300 bg-emerald-50/40 card-hover shadow-2xs rounded-2xl">
        <h2 className="text-base font-extrabold text-emerald-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-200 text-emerald-900 border-2 border-emerald-400 flex items-center justify-center shadow-2xs">
              <KeyRound size={20} />
            </div>
            <span>{locale === 'fr' ? 'Sécurité du compte et modification des identifiants' : 'أمان الحساب وتغيير بيانات الدخول'}</span>
          </div>
          <button
            onClick={onChangeCredentials}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all border border-emerald-600 flex items-center gap-1.5"
          >
            <Pencil size={14} />
            <span>{locale === 'fr' ? 'Modifier le compte' : 'تعديل الحساب'}</span>
          </button>
        </h2>
        <p className="text-xs text-neutral-600 font-medium">
          {locale === 'fr' 
            ? 'Mettez à jour votre nom d\'utilisateur ou votre mot de passe pour protéger vos données sensibles.' 
            : 'قم بتحديث اسم المستخدم أو الرقم السري الخاص بك لحماية البيانات الحساسة.'}
        </p>
      </div>

      {/* قسم إدارة الملفات (PDF & Excel) */}
      <div className="card p-6 space-y-5 border-2 border-sky-300 bg-sky-50/40 card-hover shadow-2xs rounded-2xl">
        <h2 className="text-base font-extrabold text-sky-950 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-200 text-sky-900 border-2 border-sky-400 flex items-center justify-center shadow-2xs">
            <FileSpreadsheet size={20} />
          </div>
          <span>{locale === 'fr' ? 'Gestion et exportation des données (PDF / Excel)' : 'إدارة وتصدير بيانات الصفقات (PDF / Excel)'}</span>
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <button type="button" className="btn bg-white hover:bg-sky-100 text-sky-950 border-2 border-sky-300 py-3.5 justify-center font-bold rounded-xl shadow-2xs flex items-center gap-2 transition-all" onClick={exportExcel}>
            <FileSpreadsheet size={18} className="text-emerald-700" />
            {locale === 'fr' ? 'Exporter vers Excel (.xlsx)' : 'تصدير إلى Excel (.xlsx)'}
          </button>
          <button type="button" className="btn bg-white hover:bg-sky-100 text-sky-950 border-2 border-sky-300 py-3.5 justify-center font-bold rounded-xl shadow-2xs flex items-center gap-2 transition-all" onClick={exportPdf}>
            <FileText size={18} className="text-rose-700" />
            {locale === 'fr' ? 'Exporter le rapport PDF' : 'تصدير تقرير PDF'}
          </button>
        </div>
        <div className="pt-3 border-t-2 border-sky-200">
          <label className="w-full btn bg-white hover:bg-sky-100 text-sky-950 border-2 border-sky-300 py-3.5 justify-center cursor-pointer font-bold rounded-xl shadow-2xs flex items-center gap-2 transition-all">
            <Upload size={18} className="text-sky-700" />
            {locale === 'fr' ? 'Importer les données depuis Excel' : 'استيراد البيانات من ملف Excel'}
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={importExcelFile} />
          </label>
        </div>
      </div>

      <div className="card p-6 space-y-5 border-2 border-emerald-300 bg-emerald-50/40 card-hover shadow-2xs rounded-2xl">
        <h2 className="text-base font-extrabold text-emerald-950 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-200 text-emerald-900 border-2 border-emerald-400 flex items-center justify-center shadow-2xs">
            <Globe size={20} />
          </div>
          <span>{t('settings.language')}</span>
        </h2>
        <div className="flex gap-4">
          <button type="button" className={cls('btn flex-1 py-3.5 justify-center text-sm font-bold rounded-xl shadow-2xs border-2 transition-all', locale === 'ar' ? 'bg-emerald-700 text-white border-emerald-800 shadow-md' : 'bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-100')} onClick={() => setLocale('ar')}>العربية (Arabic)</button>
          <button type="button" className={cls('btn flex-1 py-3.5 justify-center text-sm font-bold rounded-xl shadow-2xs border-2 transition-all', locale === 'fr' ? 'bg-emerald-700 text-white border-emerald-800 shadow-md' : 'bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-100')} onClick={() => setLocale('fr')}>Français</button>
        </div>
      </div>

      {canInstall && !installed && (
        <div className="card p-6 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 text-white flex flex-wrap items-center justify-between gap-4 card-hover shadow-md border-2 border-emerald-500 rounded-2xl">
          <div><h2 className="text-lg font-bold">{t('settings.pwaTitle')}</h2><p className="text-emerald-100 text-sm mt-1">{t('settings.pwaSub')}</p></div>
          <button type="button" onClick={promptInstall} className="bg-white text-emerald-900 hover:bg-emerald-50 font-bold px-5 py-3 rounded-xl text-sm shadow-sm transition-colors flex items-center gap-2 border border-emerald-300"><MonitorSmartphone size={18} />{t('settings.install')}</button>
        </div>
      )}

      <div className="card p-6 border-2 border-red-300 space-y-4 card-hover shadow-2xs bg-red-50/50 rounded-2xl">
        <h2 className="text-base font-extrabold text-red-950 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-200 text-red-900 border-2 border-red-400 flex items-center justify-center shadow-2xs">
            <Trash2 size={20} />
          </div>
          <span>{t('settings.dangerZone')}</span>
        </h2>
        <p className="text-sm text-neutral-600 font-medium">{t('settings.resetSub')}</p>
        <button type="button" className="btn bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-5 rounded-xl shadow-2xs border border-red-500 flex items-center gap-2 transition-all" onClick={() => { if (window.confirm(t('settings.confirmReset'))) onReset(); }}><Trash2 size={18} />{t('settings.reset')}</button>
      </div>
    </div>
  );
}

export default function App() {
  const { data, updateData, resetData } = useAppData();
  const { t, locale } = useI18n();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [view, setView] = useState<View>('dashboard');
  const [modal, setModal] = useState<Modal>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const authStatus = localStorage.getItem('app_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('app_authenticated');
    setIsAuthenticated(false);
  };

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

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className={cls('min-h-screen bg-neutral-100 flex flex-col xl:flex-row text-neutral-800 font-sans', locale === 'ar' ? 'rtl' : 'ltr')} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-700 text-white px-6 py-3 rounded-2xl shadow-xl font-bold text-sm border border-emerald-500 animate-bounce flex items-center gap-2">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="mr-3 ml-1 text-emerald-200 hover:text-white"><X size={15} /></button>
        </div>
      )}

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

        <div className="pt-6 border-t border-neutral-800 mt-6 space-y-3">
          <div className="p-3.5 rounded-xl bg-neutral-800/80 border-2 border-emerald-600/60 shadow-inner flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white"></span>
              </span>
              <span className="font-bold text-emerald-300 tracking-wide">{t('app.autoSave') || 'حفظ تلقائي نشط'}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-red-600/30 border border-red-500/50 text-red-300 font-mono font-bold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              <span>LIVE</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button onClick={() => setView('settings')} title={t('nav.settings')} className="flex-1 p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-emerald-400 hover:text-emerald-300 transition-colors border border-emerald-600/30 shadow-2xs flex items-center justify-center gap-1.5 text-xs font-semibold">
              <SettingsIcon size={15} />
              <span>{locale === 'fr' ? 'Paramètres' : 'الإعدادات'}</span>
            </button>
            <button onClick={handleLogout} title={locale === 'fr' ? 'Déconnexion' : 'تسجيل الخروج'} className="p-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-800/60 transition-colors flex items-center justify-center">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        {view === 'dashboard' && <Dashboard projects={data.projects} onViewProject={(p) => setModal({ kind: 'detail', projectId: p.id })} onAdd={() => setModal({ kind: 'project' })} />}
        {view === 'projects' && <ProjectsView projects={data.projects} onView={(p) => setModal({ kind: 'detail', projectId: p.id })} onEdit={(p) => setModal({ kind: 'project', projectId: p.id })} onAdd={() => setModal({ kind: 'project' })} />}
        {view === 'deadlines' && <DeadlinesView projects={data.projects} onView={(p) => setModal({ kind: 'detail', projectId: p.id })} />}
        {view === 'settings' && <SettingsView data={data} onImport={(d) => updateData(d)} onReset={resetData} onLogout={handleLogout} onChangeCredentials={() => setModal({ kind: 'credentials' })} />}
      </main>

      {modal?.kind === 'project' && (
        <ModalShell title={modal.projectId ? t('form.editTitle') : t('form.addTitle')} onClose={() => setModal(null)}>
          <ProjectForm initial={modal.projectId ? data.projects.find((p) => p.id === modal.projectId) : undefined} onSave={saveProject} onClose={() => setModal(null)} />
        </ModalShell>
      )}

      {modal?.kind === 'detail' && currentProject && (
        <ProjectDetail project={currentProject} onClose={() => setModal(null)} onEdit={() => setModal({ kind: 'project', projectId: currentProject.id })} onDelete={() => deleteProject(currentProject.id)} onAddInvoice={() => setActiveProject(currentProject)} onUpdateInvoice={(invId, patch) => updateInvoice(currentProject.id, invId, patch)} onDeleteInvoice={(invId) => deleteInvoice(currentProject.id, invId)} />
      )}

      {modal?.kind === 'credentials' && (
        <CredentialsModal onClose={() => setModal(null)} onSuccess={(msg) => setToastMessage(msg)} />
      )}

      {activeProject && (
        <ModalShell title={t('form.addInvoiceTitle')} onClose={() => setActiveProject(null)}>
          <InvoiceForm onSave={(inv) => { addInvoice(activeProject.id, inv); setActiveProject(null); }} onClose={() => setActiveProject(null)} />
        </ModalShell>
      )}
    </div>
  );
}
