import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
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
  @IsNumber()
  @IsNotEmpty()
  eventId: number;

  @IsString()
  @IsNotEmpty()
  appId: 'MOCA-SYNC';

  @IsNumber()
  @IsNotEmpty()
  occurredAt: number;

  @IsString()
  @IsNotEmpty()
  action: 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  @IsString()
  @IsNotEmpty()
  objectType: 'CONTACT';

  @IsNumber()
  @IsNotEmpty()
  attemptNumber: number;

  @IsString()
  @IsOptional()
  objectId: string;

  @IsNotEmpty()
  properties: MocaContactPropertiesDto;
}
