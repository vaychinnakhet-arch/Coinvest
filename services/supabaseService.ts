import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { AppState, Partner, Project, Transaction } from '../types';

// Supabase Configuration (Hardcoded for immediate use on Vercel)
const SUPABASE_URL = "https://kpigprkxmxxtlhifzbfu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwaWdwcmt4bXh4dGxoaWZ6YmZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjkyMjgsImV4cCI6MjA4NTg0NTIyOH0.a2G3ap5gXZoT1Y4fCo4waNQnflYyFB19gJLVjQahuZ8";

// Create client
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const supabaseService = {
  getClient: () => client,
  
  isConnected: () => !!client,

  // --- Initial Load ---
  async loadData(): Promise<AppState | null> {
    if (!client) return null;

    try {
      const [partners, projects, transactions] = await Promise.all([
        client.from('partners').select('*'),
        client.from('projects').select('*'),
        client.from('transactions').select('*')
      ]);

      if (partners.error || projects.error || transactions.error) {
        console.error('Supabase Error:', { 
          partners: partners.error, 
          projects: projects.error, 
          transactions: transactions.error 
        });
        // Don't crash, just return null so app falls back to local or shows empty
        return null;
      }

      return {
        partners: partners.data as Partner[],
        projects: projects.data.map((p: any) => ({
          ...p,
          startDate: p.start_date || p.startDate
        })) as Project[],
        transactions: transactions.data.map((t: any) => ({
          ...t,
          projectId: t.project_id || t.projectId,
          partnerId: t.partner_id || t.partnerId
        })) as Transaction[]
      };
    } catch (error) {
      console.error("Supabase Load Error:", error);
      return null;
    }
  },

  // --- Realtime Subscription ---
  subscribeToChanges(
    onPartnerChange: (payload: any) => void,
    onProjectChange: (payload: any) => void,
    onTransactionChange: (payload: any) => void
  ): RealtimeChannel | null {
    if (!client) return null;

    const channel = client.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partners' }, onPartnerChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, onProjectChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, onTransactionChange)
      .subscribe();

    return channel;
  },

  // --- Granular CRUD Operations ---
  
  // Partners
  async addPartner(partner: Partner) {
    if (!client) return { error: { message: "No Supabase client" } };
    return await client.from('partners').insert(partner);
  },
  async deletePartner(id: string) {
    if (!client) return { error: { message: "No Supabase client" } };
    return await client.from('partners').delete().eq('id', id);
  },

  // Projects
  async addProject(project: Project) {
    if (!client) return { error: { message: "No Supabase client" } };
    const dbProject = {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      start_date: project.startDate
    };
    return await client.from('projects').insert(dbProject);
  },

  // Transactions
  async addTransaction(transaction: Transaction) {
    if (!client) return { error: { message: "No Supabase client" } };
    const dbTransaction = {
      id: transaction.id,
      project_id: transaction.projectId,
      partner_id: transaction.partnerId,
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date,
      note: transaction.note
    };
    return await client.from('transactions').insert(dbTransaction);
  },
  async deleteTransaction(id: string) {
    if (!client) return { error: { message: "No Supabase client" } };
    return await client.from('transactions').delete().eq('id', id);
  }
};