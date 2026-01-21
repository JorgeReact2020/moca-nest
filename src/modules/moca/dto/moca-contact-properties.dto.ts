import { IsString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator';

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
export class MocaContactPropertiesDto {
  @IsString()
  @IsOptional()
  email: string;

  @IsString()
  @IsOptional()
  firstname: string;

  @IsString()
  @IsOptional()
  lastname: string;
}
