import { IsString, IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * DTO for contact data from HubSpot
 * Used for validation before saving to database
 */
export class ContactDto {
  @IsString()
  @IsNotEmpty()
  firstname: string;

  @IsString()
  @IsNotEmpty()
  lastname: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  hubspotId?: string;
}
