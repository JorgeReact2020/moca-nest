import { IsValidAppId } from '@/common/validators/is-valid-app-id.validator';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { MocaContactPropertiesDto } from './moca-contact-properties.dto';

/**
 * DTO for a single HubSpot webhook event
 *
 * HubSpot sends an ARRAY of these objects directly (not wrapped)
 *
 * Example payload from HubSpot:
 * [
 *   {
 *     "eventId": 714285774,
 *     "subscriptionId": 4849549,
 *     "portalId": 50687303,
 *     "appId": 25681700,
 *     "occurredAt": 1765043528476,
 *     "subscriptionType": "contact.propertyChange",
 *     "attemptNumber": 0,
 *     "objectId": 173595202426,
 *     "propertyName": "firstname",
 *     "propertyValue": "Briane",
 *     "changeSource": "CRM_UI",
 *     "sourceId": "userId:10202051"
 *   }
 * ]
 */
export class MocaWebhookEventDto {
  @ApiProperty({
    description: 'Unique event identifier',
    example: 714285774,
    type: Number,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  eventId: number;

  @ApiProperty({
    description: 'SECRET Application ID - Required for all CONTACT actions',
    example: '25681700',
    type: String,
    required: true,
  })
  @IsValidAppId()
  @IsNotEmpty()
  appId: string;

  @ApiProperty({
    description: 'Timestamp when the event occurred',
    example: 1765043528476,
    type: Number,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  occurredAt: number;

  @ApiProperty({
    description: 'Action type for the webhook event',
    enum: ['POST', 'DELETE', 'PATCH', 'GET'],
    example: 'POST',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['POST', 'DELETE', 'PATCH', 'GET'])
  action: 'POST' | 'DELETE' | 'PATCH' | 'GET';

  @ApiProperty({
    description: 'Email to search for (required only for GET action)',
    example: 'john.doe@example.com',
    required: false,
  })
  @ValidateIf((o: MocaWebhookEventDto) => o.action === 'GET')
  @IsEmail()
  @IsString()
  emailSearch: string;

  @ApiProperty({
    description: 'Type of object being affected',
    enum: ['CONTACT'],
    example: 'CONTACT',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['CONTACT'])
  objectType: 'CONTACT';

  @ApiProperty({
    description: 'Number of delivery attempts for this webhook',
    example: 0,
    type: Number,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  attemptNumber: number;

  @ApiProperty({
    description:
      'ID of the contact object (required for PATCH, DELETE actions)',
    example: '173595202426',
    required: false,
  })
  @ValidateIf((o: MocaWebhookEventDto) => o.action !== 'POST')
  @IsString()
  @IsNotEmpty()
  objectId: string;

  @ApiProperty({
    description: 'Contact properties (required for PATCH, POST actions)',
    type: () => MocaContactPropertiesDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => MocaContactPropertiesDto)
  @IsNotEmpty()
  properties: MocaContactPropertiesDto;
}
