import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StaffRoles } from 'src/auth/role/user.role';


export class CreateStaffDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  image: string;

  @ApiProperty()
  password: string;

  @ApiProperty()
  country_code: string;

  @ApiProperty()
  phone: string;

  @ApiProperty({ type: [StaffRoles], isArray: true, required: true })
  roles: StaffRoles[];
}

export class UpdateStatusdto {
  @ApiProperty()
  id: string;

  @ApiProperty({
    default: 'active',
    enum: ['active', 'deactive'],
  })
  status: 'active' | 'deactive' = 'active';
}

export enum staffStatus {
  active = 'active',
  deactive = 'deactive'
}

export class FindStaffdto {
  @ApiProperty({ enum: staffStatus, required: false })
  status: string;

  @ApiPropertyOptional()
  search?: string;

  @ApiProperty({ default: 1 })
  pagination: number;

  @ApiProperty({ default: 1 })
  page: number;

  @ApiProperty({ default: 10 })
  limit: number;
}
