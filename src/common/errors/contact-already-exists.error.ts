import { ConflictException } from '@nestjs/common';

export class ContactAlreadyExistsError extends ConflictException {
  constructor(
    public readonly email: string,
  ) {
    super({
      message: 'Contact already exists in HubSpot',
      email,
      errorCode: 'CONTACT_ALREADY_EXISTS',
    });
  }
}
