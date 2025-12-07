import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsUUID,
} from 'class-validator';

export class CreateLineItemDto {
  @IsString()
  @IsNotEmpty()
  hubspotId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @IsOptional()
  price?: number | null;

  @IsString()
  @IsOptional()
  productId?: string | null;

  @IsUUID()
  @IsNotEmpty()
  dealId: string;
}
