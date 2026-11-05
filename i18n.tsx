import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'ar' | 'fr';

const LOCALE_KEY = 'procurement-locale';

type Dict = Record<string, string>;

const ar: Dict = {
  // app
  'app.title': 'مناقصاتي',
  'app.subtitle': 'إدارة الصفقات العمومية',
  'app.welcome': 'مرحباً بك، إليك ملخص نشاطك',
  'app.welcomeSub': 'تابع تقدم صفقاتك والمستحقات المالية في مكان واحد.',
  'app.autoSave': 'الحفظ التلقائي مفعل',
  'app.localData': 'بياناتك محفوظة محلياً على هذا الجهاز.',
  'app.system': 'النظام',
  'app.home': 'الرئيسية',
  'app.manager': 'مدير المشاريع',
  'app.admin': 'مسؤول النظام',

  // nav
  'nav.dashboard': 'نظرة عامة',
  'nav.projects': 'الصفقات والمشاريع',
  'nav.deadlines': 'المواعيد والتنبيهات',
  'nav.settings': 'الإعدادات والنسخ الاحتياطي',

  // dashboard
  'dash.activeProjects': 'المشاريع النشطة',
  'dash.totalFiles': 'إجمالي الملفات',
  'dash.expectedRevenue': 'القيمة المتوقعة',
  'dash.totalContracts': 'القيمة الإجمالية للعقود',
  'dash.collected': 'الإيرادات المحصلة',
  'dash.invoicesRecorded': 'فاتورة مسجلة',
  'dash.pending': 'المستحقات المعلقة',
  'dash.awaiting': 'بانتظار التحصيل',
  'dash.stageDistribution': 'توزيع مراحل الصفقات',
  'dash.stageSub': 'نظرة سريعة على جميع مراحل دورة الصفقة',
  'dash.refresh': 'تحديث',
  'dash.financials': 'مؤشرات مالية',
  'dash.financialsSub': 'ملخص المستحقات والتحصيل',
  'dash.collectionRate': 'نسبة التحصيل',
  'dash.collectedLabel': 'تم تحصيله',
  'dash.pendingLabel': 'قيد التحصيل',
  'dash.upcoming': 'أقرب آجال الإيداع',
  'dash.upcomingSub': 'المواعيد النهائية للصفقات القادمة',
  'dash.viewAll': 'عرض الكل',
  'dash.noDeadlines': 'لا توجد آجال مسجلة',
  'dash.addDeal': 'إضافة صفقة جديدة',

  // projects
  'projects.title': 'الصفقات والمشاريع',
  'projects.sub': 'إدارة وتتبع دورة حياة الصفقات العمومية.',
  'projects.add': 'إضافة صفقة',
  'projects.search': 'ابحث بالاسم، العميل أو رقم المرجع...',
  'projects.allStages': 'كل المراحل',
  'projects.kanban': 'عرض المراحل',
  'projects.table': 'عرض القائمة',
  'projects.col.deal': 'الصفقة',
  'projects.col.client': 'المصلحة المتعاقدة',
  'projects.col.stage': 'المرحلة',
  'projects.col.amount': 'القيمة',
  'projects.col.deadline': 'آخر أجل',
  'projects.noResults': 'لا توجد نتائج مطابقة للبحث',
  'projects.noDeals': 'لا توجد صفقات',
  'projects.edit': 'تعديل',

  // deadlines
  'deadlines.title': 'المواعيد والتنبيهات',
  'deadlines.sub': 'لا تفوّت أي موعد نهائي أو مستحق مالي.',
  'deadlines.upcoming30': 'آجال قريبة (30 يوم)',
  'deadlines.unpaidInvoices': 'فواتير غير مسددة',
  'deadlines.tracked': 'تمت متابعتها',
  'deadlines.submissionDeadlines': 'مواعيد إيداع العروض',
  'deadlines.sortedByDate': 'مرتبة حسب أقرب تاريخ',
  'deadlines.invoicesProcessing': 'الفواتير قيد المعالجة',
  'deadlines.needsFollowup': 'تحتاج إلى متابعة أو تحصيل',
  'deadlines.noDeadlines': 'لا توجد مواعيد مسجلة',
  'deadlines.allPaid': 'جميع الفواتير مسددة',

  // settings
  'settings.title': 'الإعدادات والنسخ الاحتياطي',
  'settings.sub': 'تحكم في بيانات النظام واحفظ نسخة احتياطية آمنة.',
  'settings.language': 'اللغة',
  'settings.languageSub': 'اختر لغة واجهة التطبيق.',
  'settings.exportImport': 'تصدير واستيراد البيانات',
  'settings.exportImportSub': 'احفظ نسخة من جميع الصفقات والفواتير على جهازك، واسترجعها عند الحاجة.',
  'settings.exportJson': 'تصدير نسخة JSON',
  'settings.importJson': 'استيراد نسخة JSON',
  'settings.exportCsv': 'تصدير CSV',
  'settings.importCsv': 'استيراد CSV',
  'settings.installApp': 'تثبيت التطبيق على الجهاز',
  'settings.installAppSub': 'ثبّت هذا التطبيق على الكومبيوتر لاستخدامه كبرنامج مستقل دون الحاجة للمتصفح.',
  'settings.install': 'تثبيت التطبيق',
  'settings.installed': 'التطبيق مثبّت',
  'settings.storage': 'ملخص التخزين المحلي',
  'settings.storageSub': 'يتم حفظ بياناتك تلقائياً في هذا المتصفح دون إرسالها إلى أي خادم.',
  'settings.projectCount': 'عدد الصفقات',
  'settings.invoiceCount': 'عدد الفواتير',
  'settings.dangerZone': 'مسح جميع البيانات',
  'settings.dangerSub': 'احذف كل الصفقات والفواتير من هذا المتصفح. لا يمكن التراجع عن هذا الإجراء.',
  'settings.clearData': 'مسح البيانات',
  'settings.exportSuccess': 'تم تصدير نسخة احتياطية من البيانات بنجاح',
  'settings.importSuccess': 'تم استيراد البيانات بنجاح',
  'settings.importError': 'تعذر قراءة الملف. تأكد أنه ملف صالح.',
  'settings.confirmClear': 'هل أنت متأكد من حذف جميع البيانات؟',

  // forms / modals
  'form.addDeal': 'إضافة صفقة جديدة',
  'form.editDeal': 'تعديل بيانات الصفقة',
  'form.projectName': 'اسم المشروع',
  'form.projectNamePh': 'مثال: تهيئة الطريق الولائي',
  'form.reference': 'رقم المرجع / الاستشارة',
  'form.referencePh': 'AO/DTW/2026/001',
  'form.client': 'المصلحة المتعاقدة / العميل',
  'form.clientPh': 'المديرية أو البلدية',
  'form.amount': 'المبلغ الإجمالي TTC (دج)',
  'form.submissionDeadline': 'آخر أجل لإيداع العرض',
  'form.startDate': 'تاريخ بداية الإنجاز',
  'form.currentStage': 'المرحلة الحالية',
  'form.manager': 'المسؤول عن الملف',
  'form.managerPh': 'اسم المسؤول',
  'form.notes': 'ملاحظات ووصف المشروع',
  'form.notesPh': 'أضف وصفاً مختصراً أو ملاحظات هامة...',
  'form.save': 'حفظ التعديلات',
  'form.add': 'إضافة الصفقة',
  'form.cancel': 'إلغاء',
  'form.required': 'إلزامي',

  'form.invoiceType': 'نوع الفاتورة',
  'form.invoiceTypePh': 'الوضعية الأولى / الفاتورة النهائية',
  'form.invoiceAmount': 'المبلغ (دج)',
  'form.invoiceStatus': 'حالة الفاتورة',
  'form.submittedDate': 'تاريخ الإيداع',
  'form.paidDate': 'تاريخ التسديد',
  'form.invoiceNotes': 'ملاحظات',
  'form.addInvoice': 'إضافة الفاتورة',
  'form.newInvoice': 'فاتورة جديدة',

  // detail
  'detail.title': 'تفاصيل الصفقة',
  'detail.delete': 'حذف',
  'detail.edit': 'تعديل',
  'detail.contractValue': 'قيمة العقد',
  'detail.totalInvoices': 'إجمالي الفواتير',
  'detail.collected': 'المحصل',
  'detail.remaining': 'المتبقي',
  'detail.collectionProgress': 'نسبة التحصيل',
  'detail.responsible': 'المسؤول',
  'detail.notSet': 'غير محدد',
  'detail.submissionDeadline': 'آخر أجل للإيداع',
  'detail.start': 'بداية الإنجاز',
  'detail.invoices': 'متابعة الفواتير والمستحقات',
  'detail.invoicesCount': 'فواتير مسجلة',
  'detail.addInvoice': 'إضافة فاتورة',
  'detail.noInvoices': 'لا توجد فواتير مسجلة لهذا المشروع',
  'detail.invoiceCol': 'الفاتورة',
  'detail.amountCol': 'المبلغ',
  'detail.statusCol': 'الحالة',
  'detail.dateCol': 'التاريخ',
  'detail.deleteInvoice': 'حذف الفاتورة',
  'detail.confirmDelete': 'حذف الصفقة',
  'detail.confirmDeleteInvoice': 'حذف هذه الفاتورة؟',
  'detail.addInvoiceTo': 'إضافة فاتورة',

  // relative
  'rel.overdue': 'متأخر',
  'rel.days': 'يوم',
  'rel.today': 'اليوم',
  'rel.in': 'بعد',

  // misc
  'common.dzCurrency': 'دج',
};

const fr: Dict = {
  'app.title': 'Mes Marchés',
  'app.subtitle': 'Gestion des Marchés Publics',
  'app.welcome': 'Bienvenue, voici votre activité',
  'app.welcomeSub': 'Suivez l\'avancement de vos marchés et créances en un seul endroit.',
  'app.autoSave': 'Sauvegarde automatique activée',
  'app.localData': 'Vos données sont stockées localement sur cet appareil.',
  'app.system': 'Système',
  'app.home': 'Accueil',
  'app.manager': 'Chef de Projets',
  'app.admin': 'Administrateur',

  'nav.dashboard': 'Tableau de bord',
  'nav.projects': 'Marchés & Projets',
  'nav.deadlines': 'Échéances & Alertes',
  'nav.settings': 'Paramètres & Sauvegarde',

  'dash.activeProjects': 'Projets actifs',
  'dash.totalFiles': 'dossiers au total',
  'dash.expectedRevenue': 'Valeur attendue',
  'dash.totalContracts': 'Valeur totale des contrats',
  'dash.collected': 'Revenus encaissés',
  'dash.invoicesRecorded': 'factures enregistrées',
  'dash.pending': 'Créances en attente',
  'dash.awaiting': 'En attente d\'encaissement',
  'dash.stageDistribution': 'Répartition par étape',
  'dash.stageSub': 'Vue d\'ensemble du cycle de vie des marchés',
  'dash.refresh': 'Actualiser',
  'dash.financials': 'Indicateurs financiers',
  'dash.financialsSub': 'Synthèse des créances et encaissements',
  'dash.collectionRate': 'Taux d\'encaissement',
  'dash.collectedLabel': 'Encaissé',
  'dash.pendingLabel': 'En attente',
  'dash.upcoming': 'Prochaines échéances',
  'dash.upcomingSub': 'Dates limites des marchés à venir',
  'dash.viewAll': 'Voir tout',
  'dash.noDeadlines': 'Aucune échéance enregistrée',
  'dash.addDeal': 'Nouveau marché',

  'projects.title': 'Marchés & Projets',
  'projects.sub': 'Gérez et suivez le cycle de vie des marchés publics.',
  'projects.add': 'Ajouter un marché',
  'projects.search': 'Rechercher par nom, client ou référence...',
  'projects.allStages': 'Toutes les étapes',
  'projects.kanban': 'Vue Kanban',
  'projects.table': 'Vue liste',
  'projects.col.deal': 'Marché',
  'projects.col.client': 'Entité contractante',
  'projects.col.stage': 'Étape',
  'projects.col.amount': 'Montant',
  'projects.col.deadline': 'Échéance',
  'projects.noResults': 'Aucun résultat ne correspond à la recherche',
  'projects.noDeals': 'Aucun marché',
  'projects.edit': 'Modifier',

  'deadlines.title': 'Échéances & Alertes',
  'deadlines.sub': 'Ne manquez aucune échéance ou créance.',
  'deadlines.upcoming30': 'Échéances proches (30 j)',
  'deadlines.unpaidInvoices': 'Factures impayées',
  'deadlines.tracked': 'Suivis',
  'deadlines.submissionDeadlines': 'Échéances de dépôt',
  'deadlines.sortedByDate': 'Triées par date la plus proche',
  'deadlines.invoicesProcessing': 'Factures en traitement',
  'deadlines.needsFollowup': 'Nécessitent un suivi ou encaissement',
  'deadlines.noDeadlines': 'Aucune échéance enregistrée',
  'deadlines.allPaid': 'Toutes les factures sont payées',

  'settings.title': 'Paramètres & Sauvegarde',
  'settings.sub': 'Gérez vos données et conservez une sauvegarde sûre.',
  'settings.language': 'Langue',
  'settings.languageSub': 'Choisissez la langue de l\'interface.',
  'settings.exportImport': 'Exporter et importer les données',
  'settings.exportImportSub': 'Enregistrez une copie de tous les marchés et factures sur votre appareil, et restaurez-la au besoin.',
  'settings.exportJson': 'Exporter en JSON',
  'settings.importJson': 'Importer un JSON',
  'settings.exportCsv': 'Exporter en CSV',
  'settings.importCsv': 'Importer un CSV',
  'settings.installApp': 'Installer l\'application',
  'settings.installAppSub': 'Installez cette application sur votre ordinateur pour l\'utiliser comme un logiciel autonome, sans navigateur.',
  'settings.install': 'Installer l\'application',
  'settings.installed': 'Application installée',
  'settings.storage': 'Stockage local',
  'settings.storageSub': 'Vos données sont enregistrées automatiquement dans ce navigateur, sans serveur.',
  'settings.projectCount': 'Nombre de marchés',
  'settings.invoiceCount': 'Nombre de factures',
  'settings.dangerZone': 'Effacer toutes les données',
  'settings.dangerSub': 'Supprime tous les marchés et factures de ce navigateur. Action irréversible.',
  'settings.clearData': 'Effacer les données',
  'settings.exportSuccess': 'Sauvegarde exportée avec succès',
  'settings.importSuccess': 'Données importées avec succès',
  'settings.importError': 'Impossible de lire le fichier. Vérifiez qu\'il est valide.',
  'settings.confirmClear': 'Êtes-vous sûr de vouloir effacer toutes les données ?',

  'form.addDeal': 'Nouveau marché',
  'form.editDeal': 'Modifier le marché',
  'form.projectName': 'Nom du projet',
  'form.projectNamePh': 'Ex: Aménagement de la route',
  'form.reference': 'Référence / N° consultation',
  'form.referencePh': 'AO/DTW/2026/001',
  'form.client': 'Entité contractante / Client',
  'form.clientPh': 'Direction ou commune',
  'form.amount': 'Montant total TTC (DZD)',
  'form.submissionDeadline': 'Date limite de dépôt',
  'form.startDate': 'Date de début des travaux',
  'form.currentStage': 'Étape actuelle',
  'form.manager': 'Responsable du dossier',
  'form.managerPh': 'Nom du responsable',
  'form.notes': 'Notes et description',
  'form.notesPh': 'Ajoutez une description ou des notes importantes...',
  'form.save': 'Enregistrer',
  'form.add': 'Ajouter le marché',
  'form.cancel': 'Annuler',
  'form.required': 'requis',

  'form.invoiceType': 'Type de facture',
  'form.invoiceTypePh': '1er situation / Facture finale',
  'form.invoiceAmount': 'Montant (DZD)',
  'form.invoiceStatus': 'Statut de la facture',
  'form.submittedDate': 'Date de dépôt',
  'form.paidDate': 'Date de paiement',
  'form.invoiceNotes': 'Notes',
  'form.addInvoice': 'Ajouter la facture',
  'form.newInvoice': 'Nouvelle facture',

  'detail.title': 'Détails du marché',
  'detail.delete': 'Supprimer',
  'detail.edit': 'Modifier',
  'detail.contractValue': 'Valeur du contrat',
  'detail.totalInvoices': 'Total factures',
  'detail.collected': 'Encaissé',
  'detail.remaining': 'Restant',
  'detail.collectionProgress': 'Taux d\'encaissement',
  'detail.responsible': 'Responsable',
  'detail.notSet': 'Non défini',
  'detail.submissionDeadline': 'Date limite de dépôt',
  'detail.start': 'Début des travaux',
  'detail.invoices': 'Suivi des factures et créances',
  'detail.invoicesCount': 'factures enregistrées',
  'detail.addInvoice': 'Ajouter une facture',
  'detail.noInvoices': 'Aucune facture enregistrée pour ce marché',
  'detail.invoiceCol': 'Facture',
  'detail.amountCol': 'Montant',
  'detail.statusCol': 'Statut',
  'detail.dateCol': 'Date',
  'detail.deleteInvoice': 'Supprimer la facture',
  'detail.confirmDelete': 'Supprimer le marché',
  'detail.confirmDeleteInvoice': 'Supprimer cette facture ?',
  'detail.addInvoiceTo': 'Ajouter une facture',

  'rel.overdue': 'En retard',
  'rel.days': 'jours',
  'rel.today': 'Aujourd\'hui',
  'rel.in': 'Dans',

  'common.dzCurrency': 'DZD',
};

const DICTS: Record<Locale, Dict> = { ar, fr };

interface I18nValue {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  t: (key: string) => string;
  setLocale: (locale: Locale) => void;
  toggle: () => void;
}

const I18nContext = createContext<I18nValue | null>(null);

function detectInitial(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY) as Locale | null;
    if (saved === 'ar' || saved === 'fr') return saved;
  } catch { /* ignore */ }
  return 'ar';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectInitial());

  useEffect(() => {
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    try { localStorage.setItem(LOCALE_KEY, locale); } catch { /* ignore */ }
  }, [locale]);

  const t = useCallback((key: string) => DICTS[locale][key] ?? DICTS.ar[key] ?? key, [locale]);
  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);
  const toggle = useCallback(() => setLocaleState((p) => (p === 'ar' ? 'fr' : 'ar')), []);

  const value = useMemo<I18nValue>(() => ({ locale, dir: locale === 'ar' ? 'rtl' : 'ltr', t, setLocale, toggle }), [locale, t, setLocale, toggle]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
