import { ApiProperty } from "@nestjs/swagger";

export class CreateAuthDto { }
export class FileUploadDto {
    @ApiProperty({ type: 'string', format: 'binary' })
    file: Express.Multer.File;
}

export class ResendOtpDto {
    @ApiProperty({ required: false })
    email: string;
}