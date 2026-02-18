import { AppState, Partner, Project, Transaction } from '../types';

const SCRIPT_URL_KEY = 'google_sheet_script_url';
// Default URL confirmed by user
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyPwuNKXlQz07PIIf5ckBeTv6Ix_RfUFjgPc7AaMnZKOFMJa4CMwza7_72DFETNK_0/exec';

export const googleSheetsService = {
  // Config: Use LocalStorage if set, otherwise use the embedded Default URL
  getUrl: () => localStorage.getItem(SCRIPT_URL_KEY) || DEFAULT_SCRIPT_URL,
  
  setUrl: (url: string) => localStorage.setItem(SCRIPT_URL_KEY, url),

  resetUrl: () => localStorage.removeItem(SCRIPT_URL_KEY),
  
  isConnected: () => !!(localStorage.getItem(SCRIPT_URL_KEY) || DEFAULT_SCRIPT_URL),

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
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Google Sheets API Error:", error);
      return { error: error instanceof Error ? error.message : "Unknown Error" };
    }
  },

  // --- Operations ---

  async loadData(): Promise<AppState | null> {
    // Use the unified request method (POST) for stability
    const result = await this.request('getData');

    if (result.error) {
      console.error("Load Data Failed:", result.error);
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

  async importData(data: AppState) {
    // Send the entire state to be overwritten on the sheet
    return this.request('importData', data);
  },

  async addPartner(partner: Partner) {
    return this.request('addPartner', partner);
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