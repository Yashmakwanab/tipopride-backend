import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateIpAddressDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  address: string;

  @ApiPropertyOptional()
  created_by: string;
}
