import { ApiProperty } from "@nestjs/swagger";

export class ContentPageDto{
    @ApiProperty({ 
        default: 'customer', 
        enum: ['customer', 'driver'] 
      })
      status: 'customer' | 'driver' ='driver';
  
      @ApiProperty()
      page: string;
    
      @ApiProperty()
      limit: string;
}

export class findPageDto{
  @ApiProperty({ 
      default: 'customer', 
      enum: ['customer', 'driver'] 
    })
    type: 'customer' | 'driver' ='driver';


    @ApiProperty({ 
      default: 'term_&_condition', 
      enum: ['term_&_condition', 'privacy_policy','about_us'] 
    })
    name: 'term_&_condition' | 'privacy_policy' | 'about_us'='about_us';


}