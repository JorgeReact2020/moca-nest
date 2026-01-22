import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for contact properties
 * Contains the contact fields that can be synchronized between Moca and HubSpot
 */
export class MocaContactPropertiesDto {
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
  @IsString()
  @IsIn([
    'HCP',
    'Researcher',
    'Group Admin',
    'Group Member',
    'POI',
    'Academic',
    'Individual',
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
    example: 'true',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['true', 'false'])
  certification_status: string;
}
