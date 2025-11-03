import { ApiProperty } from "@nestjs/swagger"

export class notifyPagination {

    @ApiProperty({ required: false, default: 1, description: "pagination number" })
    unread_pagination: number

    @ApiProperty({ required: false, default: 10, description: "select the limit how much user want to see in first and another page" })
    unread_limit: number

    @ApiProperty({ required: false, default: 1, description: "pagination number" })
    pagination: number

    @ApiProperty({ required: false, default: 10, description: "select the limit how much user want to see in first and another page" })
    limit: number
}