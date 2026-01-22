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
  @IsString()
  @IsOptional()
  email: string;
  //==========================

  @ApiProperty({
    description: 'Contact first name',
    example: 'John',
    required: false,
  })
  @IsString()
  @IsOptional()
  firstname: string;
  //==========================
  @ApiProperty({
    description: 'Contact last name',
    example: 'Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  lastname: string;
  //==========================
  @ApiProperty({
    description: "Type de l'institution",
    example: 'University',
    required: false,
  })
  @IsString()
  @IsOptional()
  ct_institution_type: string;
  //==========================
  @ApiProperty({
    description: 'Moca certification ID',
    example: 'true',
    required: false,
  })
  @IsIn(['true', 'false'])
  @IsString()
  @IsOptional()
  ct_certification_moca_id: string;
  //==========================
  @ApiProperty({
    description: 'Moca opt-in status',
    example: 'true',
    required: false,
  })
  @IsIn(['true', 'false'])
  @IsString()
  @IsOptional()
  ct_opt_in_status: string;
  //==========================
  @ApiProperty({
    description: 'Certification date',
    example: '01-01-2024',
    required: false,
  })
  @IsString()
  @IsOptional()
  ct_certification_date: string;
  //==========================
  @ApiProperty({
    description: 'Free training type',
    example: 'Academic',
    required: false,
  })
  @IsIn(['Academic', 'POI'])
  @IsString()
  @IsOptional()
  ct_free_training_type: string;
  //==========================
  @ApiProperty({
    description: 'Certification group',
    example: 'Member',
    required: false,
  })
  @IsIn(['Admin', 'Member'])
  @IsString()
  @IsOptional()
  ct_certification_group: string;
  //==========================
  @ApiProperty({
    description: 'User role',
    example: 'Researcher',
    required: false,
  })
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
  @IsString()
  @IsOptional()
  ct_user_role: string;
  //==========================
  @ApiProperty({
    description: 'Date they registered',
    example: '2024-01-01',
    required: false,
  })
  @IsString()
  @IsOptional()
  date_they_registered: string;
  //==========================
  @ApiProperty({
    description: 'Certification status',
    example: 'true',
    required: false,
  })
  @IsIn(['true', 'false'])
  @IsString()
  @IsOptional()
  certification_status: string;
}
