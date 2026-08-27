import { AppState, Transaction, TransactionType } from '../types';

export const isInternalTransfer = (note = '') =>
  /(?:ให้ยืม\/โอนไปโครงการ:|รับเงินยืม\/โอนจากโครงการ:|ปรับปรุงรายการ\) โอนไปโครงการ:|ปรับปรุงรายการ\) รับเงินโอนจากโครงการ:)/.test(note);

export const getCashImpact = (transaction: Transaction) => {
  if (transaction.type === TransactionType.INVESTMENT) return transaction.amount;
  if (transaction.partnerId) return 0;
  return transaction.type === TransactionType.INCOME ? transaction.amount : -transaction.amount;
};

export const getFinancialSummary = (
  data: Pick<AppState, 'transactions'>,
  transactions: Transaction[] = data.transactions,
) => {
  const operatingTransactions = transactions.filter(t => !isInternalTransfer(t.note));

  const totalInvestment = operatingTransactions
    .filter(t => t.type === TransactionType.INVESTMENT)
    .reduce((sum, t) => sum + t.amount, 0);

  const partnerPaidExpenses = operatingTransactions
    .filter(t => t.type === TransactionType.EXPENSE && Boolean(t.partnerId))
    .reduce((sum, t) => sum + t.amount, 0);

  const partnerWithdrawals = operatingTransactions
    .filter(t => t.type === TransactionType.INCOME && Boolean(t.partnerId))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = operatingTransactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = operatingTransactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const shareholderFunds = totalInvestment + partnerPaidExpenses - partnerWithdrawals;
  const netCashFlow = totalIncome - totalExpense;
  const availableCash = shareholderFunds + netCashFlow;

  return {
    availableCash,
    shareholderFunds,
    totalInvestment,
    partnerPaidExpenses,
    partnerWithdrawals,
    totalIncome,
    totalExpense,
    netCashFlow,
  };
};

export const formatMoney = (value: number, fractionDigits = 0) =>
  new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
