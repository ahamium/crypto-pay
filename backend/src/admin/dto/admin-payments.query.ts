import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AdminPaymentsQuery {
  @IsOptional() @IsString() status?:
    | 'pending'
    | 'submitted'
    | 'paid'
    | 'failed'
    | 'expired';
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  chainId?: number;
  @IsOptional() @IsString() from?: string; // ISO date
  @IsOptional() @IsString() to?: string; // ISO date
  @IsOptional() @IsString() q?: string; // search: invoiceId/payer/toAddress

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'status', 'amount', 'chainId'])
  sortBy?: 'createdAt' | 'status' | 'amount' | 'chainId' = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc' = 'desc';
}
