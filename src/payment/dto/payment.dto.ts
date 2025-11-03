import { ApiProperty } from "@nestjs/swagger";

export enum PaymentType {
    Cash = 'cash',
    Card = 'card',
    Wallet='wallet'
}

export enum Status{
  Payment='payment',
  Skip='skip'
}
export class MakePaymentDto {
  @ApiProperty()
  booking_id: string;

  @ApiProperty({ type: String, enum: PaymentType, default: PaymentType.Card })
  payment_type: string;
}


export class MakeAdditionalPaymentDto {
  @ApiProperty()
  booking_id: string;

  @ApiProperty({ type: String, enum: Status, default: Status.Payment })
  status: string;
}
export class transferMoneyDto {
    @ApiProperty()
    amount: number

    @ApiProperty()
    destination: string
}