import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty()
  country_code: string;

  @ApiProperty()
  phone: string;

  @ApiProperty({ default: 'customer', enum: ['customer', 'driver'] })
  type: 'customer' | 'driver' = 'customer';
}

export class VerifyPhone {
  @ApiProperty()
  otp: string;

  @ApiProperty()
  fcm_token: string;

  @ApiProperty()
  device_type: string;
}

export class editProfileDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  image: string;

  @ApiProperty()
  country_code: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  sos_contact: string;

  @ApiProperty()
  language: string;

  @ApiProperty()
  police_check: string;

  @ApiProperty()
  network_name: string;

  @ApiProperty()
  abn_number: string;

  @ApiProperty()
  licence_front_image: string;

  @ApiProperty()
  licence_back_image: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  otp: string;
}

export class GuestLoginDto {
  @ApiProperty()
  email: string;
}
export class CustomerAddressDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  lat: string;

  @ApiProperty()
  long: string;

  @ApiProperty({ default: 'home', enum: ['home', 'work'] })
  type: 'home' | 'work' = 'home';
}
export class SocialLoginDto {
  @ApiProperty()
  token: string;

  @ApiProperty({ default: 'customer', enum: ['customer', 'driver'] })
  type: 'customer' | 'driver' = 'customer';

  @ApiProperty()
  social_type: string;
  @ApiProperty()
  fcm_token: string;
  @ApiProperty()
  device_type: string;
}

export class findCustomerDto {

  @ApiProperty({
    default: 'active',
    enum: ['active', 'block', 'deleted']
  })
  status: 'active' | 'block' | 'deleted' = 'deleted';


  @ApiPropertyOptional()
  search?: string;

  @ApiProperty({ default: 1 })
  page: number;

  @ApiProperty({ default: 10 })
  limit: number;
}

export class exportCustomerDto {

  @ApiProperty({
    default: 'active',
    enum: ['active', 'block', 'deleted']
  })
  status: 'active' | 'block' | 'deleted' = 'deleted';


  @ApiPropertyOptional()
  search?: string;
}

export class UpdateCustomerStatustDto {
  @ApiProperty()
  id: string;

  @ApiProperty({
    default: 'deactive',
    enum: ['active', 'deactive'],
  })
  status: 'active' | 'deactive' = 'active';

  @ApiPropertyOptional()
  reason: string;
}

export class BlockCustomerDto {
  @ApiProperty()
  id: string;

  @ApiProperty({
    default: 'block',
    enum: ['block', 'unblock'],
  })
  status: 'block' | 'unblock' = 'block';

  @ApiPropertyOptional()
  reason: string;
}

export class becomeDriverDto {
  @ApiProperty()
  country_code: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  police_check: string;

  @ApiProperty()
  network_name: string;

  @ApiProperty()
  abn_number: string;

  @ApiProperty()
  licence_front_image: string;

  @ApiProperty()
  licence_back_image: string;

  @ApiProperty()
  image: string;
}
