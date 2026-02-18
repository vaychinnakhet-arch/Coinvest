// This service is deprecated in favor of Google Sheets.
// Keeping file as placeholder to avoid breaking old imports during transition, 
// but functionally it is disabled and requires no dependencies.

export const supabaseService = {
  getClient: () => null,
  isConnected: () => false,
  loadData: async () => null,
  subscribeToChanges: () => null,
  addPartner: async () => ({ error: { message: "Supabase disabled" } }),
  deletePartner: async () => ({ error: { message: "Supabase disabled" } }),
  addProject: async () => ({ error: { message: "Supabase disabled" } }),
  addTransaction: async () => ({ error: { message: "Supabase disabled" } }),
  updateTransaction: async () => ({ error: { message: "Supabase disabled" } }),
  deleteTransaction: async () => ({ error: { message: "Supabase disabled" } })
};