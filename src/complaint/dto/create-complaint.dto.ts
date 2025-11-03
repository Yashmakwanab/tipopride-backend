import { ApiProperty } from '@nestjs/swagger';

export class CreateComplaintDto {
  @ApiProperty()
  booking_id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  image: string;
}

export class FindComplaintDto {

 
  @ApiProperty()
  page: string;

  @ApiProperty()
  limit: string;
}
