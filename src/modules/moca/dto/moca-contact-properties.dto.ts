import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for contact properties
 * Contains the contact fields that can be synchronized between Moca and HubSpot
 */
export class MocaContactPropertiesDto {
  @ApiProperty({
    description: 'Contact email address',
    example: 'john.doe@example.com',
    required: false,
  })
  @IsString()
  @IsOptional()
  email: string;

  @ApiProperty({
    description: 'Contact first name',
    example: 'John',
    required: false,
  })
  @IsString()
  @IsOptional()
  firstname: string;

  @ApiProperty({
    description: 'Contact last name',
    example: 'Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  lastname: string;
}
