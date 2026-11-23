import Dexie from 'dexie';
import CryptoJS from 'crypto-js';

interface MetaRecord {
  key: string;
  value: string;
}

export class SecureDatabase extends Dexie {
  projects: Dexie.Table<any, string>;
  invoices: Dexie.Table<any, string>;
  meta: Dexie.Table<MetaRecord, string>;

  constructor() {
    super('DZSuiviSecureDB');

    this.version(1).stores({
      projects: 'id, reference, client, stage',
      invoices: 'id, projectId, status',
    });

    this.version(2).stores({
      projects: 'id, reference, client, stage',
      invoices: 'id, projectId, status',
      meta: 'key',
    });

    this.projects = this.table('projects');
    this.invoices = this.table('invoices');
    this.meta = this.table('meta');
  }
}

export const db = new SecureDatabase();

const SALT_STORAGE_KEY = 'dz_suivi_kdf_salt';
const VERIFIER_STORAGE_KEY = 'dz_suivi_auth_verifier';
const SECURE_STORE_KEY = 'secure_procurement_data';

// مفتاح التشفير المشتق في الذاكرة المؤقتة (RAM) فقط
let derivedSecretKey = '';

function getOrCreateSalt(): string {
  let salt = localStorage.getItem(SALT_STORAGE_KEY);
  if (!salt) {
    salt = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
    localStorage.setItem(SALT_STORAGE_KEY, salt);
  }
  return salt;
}

function deriveKeyFromPassword(password: string, saltHex: string): string {
  const salt = CryptoJS.enc.Hex.parse(saltHex);
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 10000,
  }).toString(CryptoJS.enc.Hex);
}

function createVerifier(derivedKeyHex: string): string {
  return CryptoJS.SHA256(`dz_suivi_verifier:${derivedKeyHex}`).toString(CryptoJS.enc.Hex);
}

/**
 * تهيئة مفتاح التشفير من كلمة المرور، مع التحقق منها وحفظ بصمة التحقق عند الحاجة
 */
export function setEncryptionKey(password: string, options?: { registerOrUpdate?: boolean }): boolean {
  if (!password) {
    derivedSecretKey = '';
    return false;
  }

  const salt = getOrCreateSalt();
  const candidateKey = deriveKeyFromPassword(password, salt);
  const candidateVerifier = createVerifier(candidateKey);
  const existingVerifier = localStorage.getItem(VERIFIER_STORAGE_KEY);

  if (!existingVerifier || options?.registerOrUpdate) {
    localStorage.setItem(VERIFIER_STORAGE_KEY, candidateVerifier);
    derivedSecretKey = candidateKey;
    return true;
  }

  if (existingVerifier !== candidateVerifier) {
    return false;
  }

  derivedSecretKey = candidateKey;
  return true;
}

export function clearEncryptionKey(): void {
  derivedSecretKey = '';
}

export function encryptData(dataObject: any): string {
  if (!derivedSecretKey) throw new Error('مفتاح التشفير غير متوفر!');
  const jsonString = JSON.stringify(dataObject);
  return CryptoJS.AES.encrypt(jsonString, derivedSecretKey).toString();
}

export function decryptData(encryptedString: string): any {
  try {
    if (!derivedSecretKey || !encryptedString) return null;
    const bytes = CryptoJS.AES.decrypt(encryptedString, derivedSecretKey);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedString) return null;
    return JSON.parse(decryptedString);
  } catch (e) {
    console.error('فشل فك التشفير:', e);
    return null;
  }
}

/**
 * حفظ البيانات المشفرة في Dexie مع نسخة احتياطية متوافقة
 */
export async function saveEncryptedAppData(dataObject: any): Promise<void> {
  const encrypted = encryptData(dataObject);
  await db.meta.put({ key: SECURE_STORE_KEY, value: encrypted });
  localStorage.setItem(SECURE_STORE_KEY, encrypted);
}

/**
 * قراءة البيانات المشفرة من Dexie أولاً ثم localStorage كبديل
 */
export async function loadEncryptedAppData(): Promise<any> {
  const record = await db.meta.get(SECURE_STORE_KEY);
  const raw = record?.value || localStorage.getItem(SECURE_STORE_KEY);
  if (!raw) return null;
  return decryptData(raw);
}

/**
 * مسح البيانات المشفرة من Dexie و localStorage عند إعادة التعيين
 */
export async function clearEncryptedAppData(): Promise<void> {
  await db.meta.delete(SECURE_STORE_KEY);
  localStorage.removeItem(SECURE_STORE_KEY);
}
