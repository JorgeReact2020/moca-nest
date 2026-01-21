import { IsValidAppId } from '@/common/validators/is-valid-app-id.validator';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateIf,
} from 'class-validator';
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

  @IsValidAppId()
  @IsNotEmpty()
  appId: string;

  @IsNumber()
  @IsNotEmpty()
  occurredAt: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(['POST', 'DELETE', 'PATCH', 'GET'])
  action: 'POST' | 'DELETE' | 'PATCH' | 'GET';

  @ValidateIf((o) => o.action === 'GET')
  @IsEmail()
  @IsString()
  emailSearch: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['CONTACT'])
  objectType: 'CONTACT';

  @IsNumber()
  @IsNotEmpty()
  attemptNumber: number;

  @ValidateIf((o) => o.action !== 'POST')
  @IsString()
  @IsNotEmpty()
  objectId: string;

  @IsNotEmpty()
  properties: MocaContactPropertiesDto;
}
