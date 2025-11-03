import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCompanyDto {
    @ApiProperty()
    name:string

    @ApiProperty()
     email:string

    @ApiProperty()
    country_code:string
    
    @ApiProperty()
    phone_no:string
}

export class findCompaniesDto{

    @ApiPropertyOptional()
    search:string

    @ApiProperty()
    page:number

    @ApiProperty()
    limit:number
}
