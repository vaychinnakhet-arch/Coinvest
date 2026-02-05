export interface Partner {
  id: string;
  name: string;
  avatar: string; // Emoji or URL
  color: string;
}

export enum TransactionType {
  INVESTMENT = 'INVESTMENT', // Money put IN by partner
  INCOME = 'INCOME',         // Revenue from project
  EXPENSE = 'EXPENSE',       // Cost of project
  WITHDRAWAL = 'WITHDRAWAL', // Money taken OUT by partner
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'planning';
  startDate: string;
}

export interface Transaction {
  id: string;
  projectId: string;
  partnerId?: string; // Required for INVESTMENT/WITHDRAWAL, Optional for INCOME/EXPENSE
  type: TransactionType;
  amount: number;
  date: string;
  note: string;
}

export interface AppState {
  partners: Partner[];
  projects: Project[];
  transactions: Transaction[];
}

export type ViewState = 'DASHBOARD' | 'PROJECTS' | 'PARTNERS' | 'SETTINGS';