import { PartialType } from '@nestjs/mapped-types';
import { CreateIpAddressDto } from './create-ip-address.dto';
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateIpAddressDto extends PartialType(CreateIpAddressDto) {
  @ApiPropertyOptional()
  updated_by?: string;
}
