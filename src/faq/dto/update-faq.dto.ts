import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateFaqDto } from './create-faq.dto';

export class UpdateFaqDto {
    @ApiProperty()
    question:string
    @ApiProperty()
    answer:string
}
