export class InvoiceResponse {
  invoiceId!: string;
  status!: 'pending' | 'paid' | 'expired' | 'failed';
  chainId!: number;
  tokenAddress!: string;
  tokenSymbol!: string;
  amount!: string; // string to avoid float issues
  toAddress!: string;
  expiresAt?: string;
  createdAt!: string;
}
