import { ApiProperty } from "@nestjs/swagger";
enum CouponType {
    OneTime = 'one-time',
    InApp = 'in-app'
}
export class CreateCouponDto {

    @ApiProperty()
    code:String

    @ApiProperty()
    description:String

    @ApiProperty()
    maximum_discount_amount:String

    @ApiProperty()
    discount_percentage:Number

    @ApiProperty()
    minimum_booking_amount:String

    @ApiProperty()
    valid_upto:Number


    @ApiProperty({ enum: CouponType }) // Specify enum type for Swagger documentation
    type: CouponType;


}
export class FindCouponStatusDto{
 
  @ApiProperty({ 
    default: 'available_on_phone', 
    enum: ['available_on_phone', 'shared','shared_used'] 
  })
  status: 'available_on_phone'| 'shared'|'shared_used' = 'available_on_phone';

    @ApiProperty()
    page:number

    @ApiProperty()
    limit:number
}


export class UpdateStatusDto{
  @ApiProperty()
  id:string

  @ApiProperty()
  status:string
}
