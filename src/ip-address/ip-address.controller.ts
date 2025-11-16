import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { IpAddressService } from './ip-address.service';
import { CreateIpAddressDto } from './dto/create-ip-address.dto';
import { UpdateIpAddressDto } from './dto/update-ip-addressdto';
import { QueryIpAddressDto } from './dto/query-ip-address.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/role.decorators';
import { UsersType } from 'src/auth/role/user.role';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';

@Controller('ip-address')
@ApiTags('ip-address')

export class IpAddressController {
  constructor(private readonly ipAddressService: IpAddressService) {}

  @Roles(UsersType.admin, UsersType.Staff)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary: 'Create Ipaddress' })
  @Post()
  create(
    @Body() createIpAddressDto: CreateIpAddressDto
  ) {
    createIpAddressDto.created_by = "system";
    return this.ipAddressService.create(createIpAddressDto);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary: 'Ipaddress list' })
  @Get()
  findAll(@Query() queryDto: QueryIpAddressDto) {
    return this.ipAddressService.findAll(queryDto);
  }

  @ApiOperation({ summary: 'Ipaddress detail' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ipAddressService.findOne(id);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary: 'Update Ipaddress' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateIpAddressDto: UpdateIpAddressDto
  ) {
    return this.ipAddressService.update(id, updateIpAddressDto);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary: 'Delete Ipaddress' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ipAddressService.remove(id);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary: 'Delete multiple Ipaddress' })
  @Post('delete-many')
  removeMany(@Body() body: { ids: string[] }) {
    return this.ipAddressService.removeMany(body.ids);
  }
}
