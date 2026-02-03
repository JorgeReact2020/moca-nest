import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDefined, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * Transform empty strings to null
 * Useful for optional fields that might receive "" from the database
 */
const TransformEmptyToNull = () =>
  Transform(({ value }: { value: unknown }) => (value === '' ? null : value));

/**
 * Transform booleans to string representation
 * Converts true → "true", false → "false", keeps strings as-is, null/undefined → null
 */
const TransformBooleanToString = () =>
  Transform(({ value }: { value: unknown }) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'boolean') return String(value);
    return value;
  });

/**
 * DTO for contact properties
 * Contains the contact fields that can be synchronized between Moca and HubSpot
 */
export class MocaContactPropertiesDto {
  //==========================
  @ApiProperty({
    description: 'Unique identifier from database ex. 454548',
    required: true,
  })
  @Transform(({ value }: { value: number }) => {
    return String(value);
  })
  @IsInt()
  @IsDefined()
  id: number;
  //==========================

  @ApiProperty({
    description: 'Contact email address',
    example: 'john.doe@example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  email: string;
  //==========================

  @ApiProperty({
    description: 'Country',
    example: 'Canada',
    required: false,
  })
  @IsOptional()
  @IsString()
  country?: string;
  //==========================

  @ApiProperty({
    description: 'Creation timestamp from Supabase',
    example: '2026-02-03T20:03:54.638753+00:00',
    required: false,
  })
  @IsOptional()
  @IsString()
  created_at?: string;
  //==========================

  @ApiProperty({
    description: 'Registration date',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  registration_date?: string;
  //==========================

  @ApiProperty({
    description: 'Contact first name',
    example: 'John',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstname: string;
  //==========================
  @ApiProperty({
    description: 'Contact last name',
    example: 'Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastname: string;
  //==========================
  @ApiProperty({
    description: "Type de l'institution",
    example: 'University',
    required: false,
  })
  @IsOptional()
  @IsString()
  ct_institution_type: string;
  //==========================
  @ApiProperty({
    description: 'Moca certification ID',
    example: 'true',
    required: false,
  })
  @IsOptional()
  @TransformEmptyToNull()
  @TransformBooleanToString()
  @IsString()
  @IsIn(['true', 'false'])
  ct_certification_moca_id: string;
  //==========================
  @ApiProperty({
    description: 'Moca opt-in status',
    example: 'true',
    required: false,
  })
  @IsOptional()
  @TransformEmptyToNull()
  @TransformBooleanToString()
  @IsString()
  @IsIn(['true', 'false'])
  ct_opt_in_status: string;
  //==========================
  @ApiProperty({
    description: 'Certification date',
    example: '01-01-2024',
    required: false,
  })
  @IsOptional()
  @IsString()
  ct_certification_date: string;
  //==========================
  @ApiProperty({
    description: 'Free training type',
    example: 'Academic',
    required: false,
  })
  @IsOptional()
  @TransformEmptyToNull()
  @IsString()
  @IsIn(['Academic', 'POI'])
  ct_free_training_type: string;
  //==========================
  @ApiProperty({
    description: 'Certification group',
    example: 'Member',
    required: false,
  })
  @IsOptional()
  @TransformEmptyToNull()
  @IsString()
  @IsIn(['Admin', 'Member'])
  ct_certification_group: string;
  //==========================
  @ApiProperty({
    description: 'User role',
    example: 'Researcher',
    required: false,
  })
  @IsOptional()
  @TransformEmptyToNull()
  @IsString()
  @IsIn([
    'HCP',
    'Researcher',
    'Group Admin',
    'Group Member',
    'POI',
    'Academic',
    'Individual',
    'Student',
    'None',
  ])
  ct_user_role: string;
  //==========================
  @ApiProperty({
    description: 'Date they registered',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsString()
  date_they_registered: string;
  //==========================
  @ApiProperty({
    description: 'Certification status',
    example: 'Certified',
    required: false,
  })
  @IsOptional()
  @TransformEmptyToNull()
  @IsString()
  certification_status: string;
}
