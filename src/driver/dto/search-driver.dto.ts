import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class DriverForChatByDispatcherDto {

    @Transform(({ value }) => parseInt(value))
    @ApiProperty({ required: false, default: 1 })
    @IsNumber()
    @IsOptional()
    pagination: number;

    @Transform(({ value }) => parseInt(value))
    @ApiProperty({ required: false, default: 10 })
    @IsNumber()
    @IsOptional()
    limit: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    search?: string;

}