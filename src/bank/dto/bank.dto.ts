import { ApiProperty } from "@nestjs/swagger";

export class AddBankDto {

  @ApiProperty()
  first_name: string

  @ApiProperty()
  last_name: string

  @ApiProperty()
  country: string

  @ApiProperty()
  account_number: string

  // @ApiProperty()
  // ssn_last4_number: string

  @ApiProperty()
  tax_file_number: string

  // @ApiProperty()
  // routing_number: string 

  @ApiProperty()
  bsb_number: string // Use BSB number here for Aus

  @ApiProperty()
  date_of_birth: string

  @ApiProperty()
  file: string

  @ApiProperty({
    type: Object, properties: {
      city: { type: 'string' },
      postal_code: { type: 'string' },
      line1: { type: 'string' },
      state: { type: 'string' }
    }, required: false
  })
  address: { city: string, postal_code: string, line1: string, line2: string, state: string }

  @ApiProperty({ required: false })
  country_code: string

  @ApiProperty({ required: false })
  phone: string

  

}

export class editBankDto {
  @ApiProperty()
  bank_id:string

  @ApiProperty()
  first_name: string

  @ApiProperty()
  last_name: string

  @ApiProperty()
  country: string

  @ApiProperty()
  account_number: string

  // @ApiProperty()
  // ssn_last4_number: string

  @ApiProperty()
  tax_file_number: string

  // @ApiProperty()
  // routing_number: string 

  @ApiProperty()
  bsb_number: string // Use BSB number here for Aus

  @ApiProperty()
  date_of_birth: string

  @ApiProperty()
  file: string

  @ApiProperty({
    type: Object, properties: {
      city: { type: 'string' },
      postal_code: { type: 'string' },
      line1: { type: 'string' },
      state: { type: 'string' }
    }, required: false
  })
  address: { city: string, postal_code: string, line1: string, line2: string, state: string }

  @ApiProperty({ required: false })
  country_code: string

  @ApiProperty({ required: false })
  phone: string

  

}