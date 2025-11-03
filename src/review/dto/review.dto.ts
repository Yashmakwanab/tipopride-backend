import { ApiProperty } from "@nestjs/swagger";

export class AddReviewDto{
    @ApiProperty()
    booking_id:string

    @ApiProperty()
    rate:number

    @ApiProperty()
    description:string
}