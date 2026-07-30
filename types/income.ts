export const incomeRecipients = ["創平", "優希"] as const;

export type IncomeRecipient = (typeof incomeRecipients)[number];

export interface MonthlyIncome {
  id: string;
  group_id: string;
  recipient: IncomeRecipient;
  amount: number;
  target_month: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}
