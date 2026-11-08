import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppData, Project, Invoice } from '@/types';
import { nowISO, uid } from './format';

const STORAGE_KEY = 'procurement-data-v1';

const EMPTY: AppData = { projects: [], version: 1 };

function seed(): AppData {
  const t = nowISO();
  const inv = (
    label: string,
    amount: number,
    status: Invoice['status'],
    submittedDate?: string,
    paidDate?: string,
  ): Invoice => ({ id: uid(), label, amount, status, submittedDate, paidDate, createdAt: t });

  const projects: Project[] = [
    {
      id: uid(),
      name: 'تهيئة الطريق الرابط بين الطريق السيار والمنطقة الصناعية',
      reference: 'AO/DTW/2025/014',
      client: 'مديرية الأشغال العمومية - ولاية الجزائر',
      amount: 485_000_000,
      submissionDeadline: '2026-11-20',
      startDate: '2026-01-15',
      stage: 'execution',
      manager: 'م. كريم بن عيسى',
      description: 'أشغال تهيئة وتعبيد بطول 12 كلم مع إنجاز جسور تصريف المياه.',
      invoices: [
        inv('فاتورة الدفع المقدم (Avance)', 48_500_000, 'paid', '2026-01-20', '2026-02-05'),
        inv('حساب الوضعية الأولى', 120_000_000, 'validated', '2026-06-10'),
        inv('حساب الوضعية الثانية', 140_000_000, 'submitted', '2026-09-15'),
      ],
      createdAt: t,
      updatedAt: t,
    },
    {
      id: uid(),
      name: 'ترميم ثانوية الأمانة بوادي سلي',
      reference: 'MP/OWS/2026/003',
      client: 'بلدية وادي سلي',
      amount: 72_500_000,
      submissionDeadline: '2026-11-12',
      stage: 'bid_preparation',
      manager: 'م. سمية حمداني',
      description: 'أشمال ترميم وتوسعة ثانوية مع تجهيز المخبر العلمي.',
      invoices: [],
      createdAt: t,
      updatedAt: t,
    },
    {
      id: uid(),
      name: 'تزويد المركز الاستشفائي بالأجهزة الطبية',
      reference: 'AMI/CHU/2025/078',
      client: 'المركز الاستشفائي الجامعي - وهران',
      amount: 156_000_000,
      submissionDeadline: '2025-10-01',
      startDate: '2025-12-01',
      stage: 'provisional_reception',
      manager: 'م. ياسين قويدر',
      description: 'تزويد الأجهزة الطبية الثقيلة وتركيبها.',
      invoices: [
        inv('الدفع المقدم', 15_600_000, 'paid', '2025-12-05', '2026-01-10'),
        inv('فاتورة التسليم الجزئي', 90_000_000, 'paid', '2026-03-01', '2026-04-15'),
      ],
      createdAt: t,
      updatedAt: t,
    },
    {
      id: uid(),
      name: 'رقمنة الأرشيف البلدي - المرحلة الثانية',
      reference: 'AO/AR/2026/021',
      client: 'بلدية حسين داي',
      amount: 34_800_000,
      submissionDeadline: '2026-12-05',
      stage: 'consultation',
      manager: 'م. ليلى مرزوق',
      description: 'مسح ورقمنة الأرشيف الإداري مع تجهيز نظام إدارة الكتروني.',
      invoices: [],
      createdAt: t,
      updatedAt: t,
    },
    {
      id: uid(),
      name: 'إنجاز محطة ضخ المياه الصالحة للشرب',
      reference: 'SE/BL/2025/045',
      client: 'مديرية الموارد المائية - ولاية البليدة',
      amount: 230_000_000,
      startDate: '2025-09-01',
      stage: 'invoicing',
      manager: 'م. كريم بن عيسى',
      description: 'إنجاز محطة ضخ مع التجهيزات الكهروميكانيكية.',
      invoices: [
        inv('الدفع المقدم', 23_000_000, 'paid', '2025-09-10', '2025-10-01'),
        inv('الوضعية الأولى', 80_000_000, 'paid', '2025-12-20', '2026-02-01'),
        inv('الفاتورة النهائية', 127_000_000, 'validated', '2026-08-10'),
      ],
      createdAt: t,
      updatedAt: t,
    },
    {
      id: uid(),
      name: 'صيانة الشبكة العمومية للإنارة',
      reference: 'AO/EP/2026/011',
      client: 'مديرية التوزيع - سونلغاز',
      amount: 98_000_000,
      submissionDeadline: '2026-10-28',
      stage: 'award',
      manager: 'م. سمية حمداني',
      description: 'أشمال صيانة وتجديد شبكة الإنارة العمومية.',
      invoices: [],
      createdAt: t,
      updatedAt: t,
    },
  ];
  return { projects, version: 1 };
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return s;
    }
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed || !Array.isArray(parsed.projects)) return { ...EMPTY, projects: [] };
    return parsed;
  } catch {
    return { ...EMPTY, projects: [] };
  }
}

export function useAppData() {
  const [data, setData] = useState<AppData>(() => load());
  const skipPersist = useRef(false);

  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore quota errors */
    }
  }, [data]);

  const addProject = useCallback((p: Omit<Project, 'id' | 'invoices' | 'createdAt' | 'updatedAt'>) => {
    const t = nowISO();
    const project: Project = { ...p, id: uid(), invoices: [], createdAt: t, updatedAt: t };
    setData((d) => ({ ...d, projects: [project, ...d.projects] }));
    return project.id;
  }, []);

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    setData((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: nowISO() } : p,
      ),
    }));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setData((d) => ({ ...d, projects: d.projects.filter((p) => p.id !== id) }));
  }, []);

  const addInvoice = useCallback((projectId: string, inv: Omit<Invoice, 'id' | 'createdAt'>) => {
    const invoice: Invoice = { ...inv, id: uid(), createdAt: nowISO() };
    setData((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id === projectId
          ? { ...p, invoices: [...p.invoices, invoice], updatedAt: nowISO() }
          : p,
      ),
    }));
  }, []);

  const updateInvoice = useCallback((projectId: string, invoiceId: string, patch: Partial<Invoice>) => {
    setData((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              invoices: p.invoices.map((i) => (i.id === invoiceId ? { ...i, ...patch } : i)),
              updatedAt: nowISO(),
            }
          : p,
      ),
    }));
  }, []);

  const deleteInvoice = useCallback((projectId: string, invoiceId: string) => {
    setData((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id === projectId
          ? { ...p, invoices: p.invoices.filter((i) => i.id !== invoiceId), updatedAt: nowISO() }
          : p,
      ),
    }));
  }, []);

  const replaceAll = useCallback((next: AppData) => {
    skipPersist.current = false;
    setData({ ...next, version: 1, projects: Array.isArray(next.projects) ? next.projects : [] });
  }, []);

  const resetAll = useCallback(() => {
    setData({ projects: [], version: 1 });
  }, []);

  return {
    data,
    addProject,
    updateProject,
    deleteProject,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    replaceAll,
    resetAll,
  };
}

export type AppDataApi = ReturnType<typeof useAppData>;
