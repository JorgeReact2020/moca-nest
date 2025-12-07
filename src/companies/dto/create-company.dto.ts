import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  hubspotId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  domain?: string | null;

  @IsUUID()
  @IsNotEmpty()
  contactId: string;
}
