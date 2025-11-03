import { ApiProperty } from "@nestjs/swagger";

export class addMoneyDto{
@ApiProperty()
amount:number

@ApiProperty()
payment_method_id:string
}