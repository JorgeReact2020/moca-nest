import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidAppId', async: false })
@Injectable()
export class IsValidAppIdConstraint implements ValidatorConstraintInterface {
  constructor(private configService: ConfigService) {}

  validate(value: any): boolean {
    const validAppId = this.configService.get<string>('config.appid', '');
    return typeof value === 'string' && value === validAppId;
  }

  defaultMessage(): string {
    // Generic message - doesn't expose valid values
    return 'INVALID APPLICATION IDENTIFIER';
  }
}

export function IsValidAppId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidAppId',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidAppIdConstraint,
    });
  };
}
