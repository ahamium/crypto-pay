export type InvoiceResponse = {
  invoiceId: string;
  status: 'pending' | 'paid' | 'expired' | 'failed';
  chainId: number;
  tokenAddress: string;
  tokenSymbol: string;
  amount: string;
  toAddress: string;
  createdAt: string;
  expiresAt?: string;
  txHash?: string;
  payerAddress?: string;
  decimals?: number;
};
