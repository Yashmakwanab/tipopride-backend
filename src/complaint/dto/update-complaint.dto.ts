import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateComplaintDto } from './create-complaint.dto';

export class UpdateComplaintDto {
    @ApiProperty()
    reply:string
}

export class UpdateToPendingDto {
    @ApiProperty()
    admin_remark:string
}
