import { AppState, Partner, Project, Transaction } from '../types';

const SCRIPT_URL_KEY = 'google_sheet_script_url';

// Default active Google Apps Script Web App URL for Coinvest
export const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyzG6zXxcjjE22xuV6x8aAJIvzyGZrQjb8xxaUX89WTjvVU5f4werbEeutRqVfJCl0/exec';

// Defunct script URLs that return 404
const DEFUNCT_SCRIPT_URLS = [
  'https://script.google.com/macros/s/AKfycbyPwuNKXlQz07PIIf5ckBeTv6Ix_RfUFjgPc7AaMnZKOFMJa4CMwza7_72DFETNK_0/exec',
];

export const googleSheetsService = {
  // Config: Read custom URL, query param, env var, or fallback to default production script URL
  getUrl: (): string => {
    try {
      // 1. URL parameter (?sync=... or ?scriptUrl=...) for quick cross-device link sharing
      if (typeof window !== 'undefined' && window.location?.search) {
        const params = new URLSearchParams(window.location.search);
        const paramUrl = params.get('sync') || params.get('scriptUrl');
        if (paramUrl && paramUrl.startsWith('http') && !DEFUNCT_SCRIPT_URLS.includes(paramUrl.trim())) {
          localStorage.setItem(SCRIPT_URL_KEY, paramUrl.trim());
          return paramUrl.trim();
        }
      }

      // 2. Vite environment variable if set
      const envUrl = (import.meta as any).env?.VITE_GOOGLE_SCRIPT_URL;
      if (envUrl && typeof envUrl === 'string' && envUrl.startsWith('http') && !DEFUNCT_SCRIPT_URLS.includes(envUrl.trim())) {
        return envUrl.trim();
      }

      // 3. LocalStorage
      const stored = localStorage.getItem(SCRIPT_URL_KEY);
      if (stored !== null) {
        const trimmed = stored.trim();
        if (DEFUNCT_SCRIPT_URLS.includes(trimmed)) {
          localStorage.removeItem(SCRIPT_URL_KEY);
          return DEFAULT_SCRIPT_URL;
        }
        if (trimmed === 'local' || trimmed === 'offline') {
          return ''; // User explicitly selected offline/local mode
        }
        if (trimmed.length > 0) {
          return trimmed;
        }
      }

      // 4. Default to live verified Google Apps Script cloud URL
      return DEFAULT_SCRIPT_URL;
    } catch {
      return DEFAULT_SCRIPT_URL;
    }
  },
  
  setUrl: (url: string) => {
    try {
      if (!url || !url.trim() || DEFUNCT_SCRIPT_URLS.includes(url.trim())) {
        localStorage.removeItem(SCRIPT_URL_KEY);
      } else {
        localStorage.setItem(SCRIPT_URL_KEY, url.trim());
      }
    } catch {
      // ignore
    }
  },

  resetUrl: () => {
    try {
      // Explicitly mark as local mode
      localStorage.setItem(SCRIPT_URL_KEY, 'local');
    } catch {
      // ignore
    }
  },

  restoreDefaultUrl: () => {
    try {
      localStorage.removeItem(SCRIPT_URL_KEY);
    } catch {
      // ignore
    }
  },
  
  isConnected: (): boolean => {
    const url = googleSheetsService.getUrl();
    return !!url && url.startsWith('http');
  },

  // Helper for requests
  async request(action: string, data: any = null) {
    const url = this.getUrl();
    if (!url) return { error: "Google Apps Script URL not configured" };

    try {
      // We use POST for everything to utilize the unified handleRequest in GAS.
      // CRITICAL: Content-Type must be "text/plain" to avoid browser sending an OPTIONS preflight request (CORS check).
      // This is the most reliable way to talk to GAS Web Apps.
      const response = await fetch(url, {
        method: 'POST',
        redirect: "follow", 
        headers: {
            'Content-Type': 'text/plain', 
        },
        body: JSON.stringify({ action, data }),
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return { error: "Google Apps Script Web App not found (404). Please verify your Web App URL." };
        }
        return { error: `Server responded with status: ${response.status}` };
      }

      const text = await response.text();
      if (text.includes("Page not found") || text.includes("unable to open the file")) {
        return { error: "Google Apps Script Web App not found (404). Please ensure access is set to 'Anyone'." };
      }

      try {
        const result = JSON.parse(text);
        return result;
      } catch {
        return { error: "Invalid JSON response from Google Sheets Web App" };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown Error";
      return { error: msg };
    }
  },

  // --- Operations ---

  async loadData(): Promise<AppState | null> {
    if (!this.isConnected()) return null;

    // Use the unified request method (POST) for stability
    const result = await this.request('getData');

    if (result.error) {
      console.warn("Load Data Warning (using local data):", result.error);
      return null;
    }

    // Data sanity check
    if (!result.partners && !result.projects) {
      console.warn("Received incomplete data:", result);
      return null;
    }

    return {
      partners: result.partners || [],
      projects: result.projects || [],
      transactions: result.transactions || []
    };
  },

  async testConnection(customUrl?: string): Promise<{ success: boolean; message: string }> {
    const url = (customUrl !== undefined ? customUrl : this.getUrl()).trim();
    if (!url) {
      return { success: false, message: 'ยังไม่ได้ระบุ Google Apps Script URL' };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'getData' }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, message: 'ไม่พบ Web App ที่ URL นี้ (404 Not Found) กรุณาตรวจสอบ URL หรือการ Deploy ใหม่' };
        }
        return { success: false, message: `เซิร์ฟเวอร์ตอบกลับรหัส: ${response.status}` };
      }

      const text = await response.text();
      if (text.includes("Page not found") || text.includes("unable to open the file")) {
        return { success: false, message: 'ไม่พบ Google Apps Script Web App (404) กรุณาตรวจสอบสิทธิ์ (Anyone)' };
      }

      const result = JSON.parse(text);
      if (result.error) {
        return { success: false, message: `เกิดข้อผิดพลาดจาก Apps Script: ${result.error}` };
      }

      return { success: true, message: 'เชื่อมต่อ Google Sheets สำเร็จเรียบร้อย!' };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบ URL' };
    }
  },

  async importData(data: AppState) {
    // Send the entire state to be overwritten on the sheet
    return this.request('importData', data);
  },

  async addPartner(partner: Partner) {
    return this.request('addPartner', partner);
  },

  async updatePartner(partner: Partner) {
    return this.request('updatePartner', partner);
  },

  async deletePartner(id: string) {
    return this.request('deletePartner', { id });
  },

  async addProject(project: Project) {
    return this.request('addProject', project);
  },

  async addTransaction(transaction: Transaction) {
    return this.request('addTransaction', transaction);
  },

  async updateTransaction(transaction: Transaction) {
    return this.request('updateTransaction', transaction);
  },

  async deleteTransaction(id: string) {
    return this.request('deleteTransaction', { id });
  }
};