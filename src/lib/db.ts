import Dexie from 'dexie';
import CryptoJS from 'crypto-js';

export class SecureDatabase extends Dexie {
  projects: Dexie.Table<any, string>;
  invoices: Dexie.Table<any, string>;

  constructor() {
    super('DZSuiviSecureDB');
    
    // تعريف الجداول والفهارس الأساسية
    this.version(1).stores({
      projects: 'id, reference, client, stage',
      invoices: 'id, projectId, status'
    });

    this.projects = this.table('projects');
    this.invoices = this.table('invoices');
  }
}

export const db = new SecureDatabase();

// مفتاح التشفير المؤقت (يُحفظ في الـ RAM أثناء جلسة العمل فقط)
let activeSecretKey = '';

export function setEncryptionKey(password: string) {
  activeSecretKey = password;
}

// دالة لتشفير البيانات الحساسة قبل تخزينها
export function encryptData(dataObject: any): string {
  if (!activeSecretKey) throw new Error('مفتاح التشفير غير متوفر!');
  const jsonString = JSON.stringify(dataObject);
  return CryptoJS.AES.encrypt(jsonString, activeSecretKey).toString();
}

// دالة لفك التشفير عند جلب البيانات
export function decryptData(encryptedString: string): any {
  try {
    if (!activeSecretKey || !encryptedString) return encryptedString;
    const bytes = CryptoJS.AES.decrypt(encryptedString, activeSecretKey);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedString);
  } catch (e) {
    console.error('فشل فك التشفير:', e);
    return null;
  }
}
