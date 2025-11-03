import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) { }

export class NearRideDto {
    @ApiProperty()
    latitude: string

    @ApiProperty()
    longitude: string
}