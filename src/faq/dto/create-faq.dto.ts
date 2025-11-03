import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateFaqDto {
    @ApiProperty()
    question:string

    @ApiProperty()
    answer:string

    @ApiProperty()
    type:string
}

export class FindFaqDto {

    @ApiProperty({ 
      default: 'customer', 
      enum: ['customer', 'driver'] 
    })
    status: 'customer' | 'driver' ='driver';

    @ApiPropertyOptional()
    search: string;

    @ApiProperty()
    page: string;
  
    @ApiProperty()
    limit: string;
  }

  export class FindFaqForAppsDto {

    @ApiProperty({ 
      default: 'customer', 
      enum: ['customer', 'driver'] 
    })
    status: 'customer' | 'driver' ='driver';


  }