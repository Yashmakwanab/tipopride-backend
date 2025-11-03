import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateContactusDto } from './create-contactus.dto';

export class UpdateContactusDto {
    @ApiProperty()
    reply:string
}
