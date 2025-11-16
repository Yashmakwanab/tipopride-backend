import { ApiProperty } from '@nestjs/swagger';

export class SignInDto {
  @ApiProperty()
  type: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  password: string;

  @ApiProperty()
  fcm_token: string

  @ApiProperty()
  ipAddress: string;
}

export enum notification_to {
  Customers = 'customer',
  Drivers = 'driver',
  selected_customer = 'selected_customer',
  selected_driver = 'selected_driver',
}
export enum notification_via {
  email = 'email',
  push = 'push',
}
export class NotificationDto {
  @ApiProperty({ type: String, enum: notification_to })
  send_notification_to: string;

  @ApiProperty({ type: [String] }) // Use an array to represent multiple emails
  selected_ids: string[];

  @ApiProperty({ type: String, enum: notification_via })
  send_notification_via: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;
}

export class AdminPasswordDto {
  @ApiProperty()
  current_password: string

  @ApiProperty()
  new_password: string
}

export class UpdateTaxAmount {
  @ApiProperty()
  amount: number


}

export class AdminPayoutExportDto {
  @ApiProperty()
  start_date: number

  @ApiProperty()
  end_date: number
}
