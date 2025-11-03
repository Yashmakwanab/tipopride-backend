import { ApiProperty } from '@nestjs/swagger';

export class AddCardsDto {
  @ApiProperty()
  card_number: string;

  @ApiProperty()
  card_holder_name: string;

  @ApiProperty()
  expiry_date: string;

  @ApiProperty()
  cvv: string;

  @ApiProperty()
  payment_method_id: string;
}
export class UpdateCardDto {
  @ApiProperty()
  card_no: string;

  @ApiProperty()
  expiry_date: string;

  @ApiProperty()
  cvv: string;

  @ApiProperty()
  payment_method_id: string;
}
