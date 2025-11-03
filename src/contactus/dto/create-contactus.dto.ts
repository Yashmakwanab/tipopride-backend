import { Prop } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";

export class CreateContactusDto {


  @ApiProperty()
  name:String

  @ApiProperty()
  email:String

    @ApiProperty()
    message:String
}

export class FindContactUsDto {

    @ApiProperty({ 
      default: 'pending', 
      enum: ['pending', 'replied'] 
    })
    status: 'pending' | 'replied' ='replied';
    @ApiProperty()
    page: string;
  
    @ApiProperty()
    limit: string;
  }