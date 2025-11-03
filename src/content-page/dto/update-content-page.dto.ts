import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateContentPageDto } from './create-content-page.dto';

export class UpdateContentPageDto  {
    @ApiProperty()
    description:string
}
