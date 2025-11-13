import {
  IsInt,
  IsString,
  IsOptional,
  IsNumberString,
  IsEthereumAddress,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsInt()
  chainId!: number;

  /** "0x0" (string) for native, else ERC20 address */
  @IsString()
  tokenAddress!: string;

  @IsNumberString() // send as string to keep precision; backend will convert
  amount!: string;

  /** where payment should be received */
  @IsEthereumAddress()
  toAddress!: string;

  /** optional meta */
  @IsOptional()
  description?: string;

  /** optional expire seconds */
  @IsOptional()
  expireSeconds?: number;
}
