import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
export enum Status {
    Weekly = 'weekly',
    total = 'total',
    
  }

export class EarningStatusDto{
    @ApiProperty({ required: false, enum: Status })
    status: string
  
}

export class EarningDto{
  @ApiProperty()
  status:string

 @ApiPropertyOptional()
 start_date:number
 
 @ApiPropertyOptional()
 end_date:number

 @ApiProperty()
 page:number
 
 @ApiProperty()
 limit:number 
}

export class ExportEarningDto{

 @ApiPropertyOptional()
 start_date:number
 
 @ApiPropertyOptional()
 end_date:number

}


export class driverMakePaymentDto{
  @ApiProperty()
  amount:number

  @ApiProperty()
  payment_method_id:string

  @ApiProperty()
  week_start:number

  @ApiProperty()
  week_end:number


}



 