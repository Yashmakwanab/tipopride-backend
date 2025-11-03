import { ApiProperty } from '@nestjs/swagger';

export class AddSurchargeDateDto {
  @ApiProperty()
  type: string;

  @ApiProperty()
  vehicle_id: string;

  @ApiProperty()
  no_of_driver: number;

  @ApiProperty()
  date: number;

  @ApiProperty()
  start_time: string;

  @ApiProperty()
  end_time: string;
}


  
