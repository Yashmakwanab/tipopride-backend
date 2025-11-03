import { ApiProperty } from '@nestjs/swagger';

export class CreateConnectionDto {
  @ApiProperty()
  booking_id: string;

  @ApiProperty()
  receiver: string;

  @ApiProperty()
  scope: string;

}
export class SendMessageDto {
  @ApiProperty()
  connection_id: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  receiver: string;

  @ApiProperty()
  type: string
}
export class GetMessageDto {
  @ApiProperty()
  connection_id: string;
  @ApiProperty()
  booking_id: string;

}
export class BookingListDto {
  @ApiProperty()
  booking_id: string;
}

export class ChatListDto {
  @ApiProperty({ description: 'search with driver and customer name ', required: false })
  search: string;
  @ApiProperty({ default: '1' })
  pagination: string;
  @ApiProperty({ default: '10' })
  limit: string;
}

export class LeaveConnectionDto {
  @ApiProperty()
  connection_id: string;

}