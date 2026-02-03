import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { MocaContactPropertiesDto } from './moca-contact-properties.dto';

/**
 * DTO for Supabase webhook payload
 *
 * Supabase sends database change events with this structure.
 * See: https://supabase.com/docs/guides/database/webhooks#payload
 *
 * Example INSERT payload:
 * {
 *   "type": "INSERT",
 *   "table": "profiles",
 *   "schema": "public",
 *   "record": {
 *     "id": "user@example.com",
 *     "email": "user@example.com",
 *     "firstname": "John",
 *     "lastname": "Doe"
 *   },
 *   "old_record": null
 * }
 *
 * Example UPDATE payload:
 * {
 *   "type": "UPDATE",
 *   "table": "profiles",
 *   "schema": "public",
 *   "record": {
 *     "id": "user@example.com",
 *     "firstname": "Jane"
 *   },
 *   "old_record": {
 *     "id": "user@example.com",
 *     "firstname": "John"
 *   }
 * }
 *
 * Example DELETE payload:
 * {
 *   "type": "DELETE",
 *   "table": "profiles",
 *   "schema": "public",
 *   "record": null,
 *   "old_record": {
 *     "id": "user@example.com",
 *     "email": "user@example.com"
 *   }
 * }
 */
export class SupabaseWebhookDto {
  //============================================

  @ApiProperty({
    description: 'The type of database operation',
    example: 'INSERT',
    enum: ['INSERT', 'UPDATE', 'DELETE'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['INSERT', 'UPDATE', 'DELETE'])
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  //============================================
  @ApiProperty({
    description: 'The table name where the change occurred',
    example: 'profile',
  })
  @IsString()
  @IsNotEmpty()
  table: string;

  //============================================
  @ApiProperty({
    description: 'The database schema',
    example: 'public',
  })
  @IsString()
  @IsNotEmpty()
  schema: string;

  //============================================
  @ApiProperty({
    description: 'The new record data (null for DELETE operations)',
    required: false,
    type: MocaContactPropertiesDto,
  })
  @ValidateIf((o: SupabaseWebhookDto) => o.type !== 'DELETE')
  @ValidateNested()
  @Type(() => MocaContactPropertiesDto)
  @IsNotEmpty()
  record: MocaContactPropertiesDto | null;
  //============================================

  @ApiProperty({
    description: 'The old record data (null for INSERT operations)',
    required: false,
    type: MocaContactPropertiesDto,
  })
  @ValidateIf((o: SupabaseWebhookDto) => o.type !== 'INSERT')
  @ValidateNested()
  @Type(() => MocaContactPropertiesDto)
  old_record: MocaContactPropertiesDto | null;
  //============================================
}
