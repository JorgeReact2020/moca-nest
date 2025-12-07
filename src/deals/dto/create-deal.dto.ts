import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUUID,
} from 'class-validator';

export class CreateDealDto {
  @IsString()
  @IsNotEmpty()
  hubspotId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  stage?: string | null;

  @IsNumber()
  @IsOptional()
  amount?: number | null;

  @IsBoolean()
  @IsOptional()
  hasLineItems?: boolean;

  @IsUUID()
  @IsNotEmpty()
  contactId: string;
}
