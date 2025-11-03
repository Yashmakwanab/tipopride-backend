import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, Query, Put } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { BlockCustomerDto, CustomerAddressDto, GuestLoginDto, UpdateCustomerStatustDto, findCustomerDto , exportCustomerDto } from './dto/create-customer.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { StaffRoles, UsersType } from 'src/auth/role/user.role';
import { Roles } from 'src/auth/decorators/role.decorators';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { RequirePermissions } from 'src/auth/decorators/require.permission.decorators';
import { NearRideDto } from './dto/update-customer.dto';

@Controller('customer')
@ApiTags('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) { }

  @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Customer add our home address and work address' })
  @Post('address')
  AddAddress(@Body() CustomerAddressDto: CustomerAddressDto, @Request() req) {
    return this.customerService.add_address(
      CustomerAddressDto,
      req.payload.user_id,
    );
  }

  @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Customer delete our home address and work address',
  })
  @Delete('address/:id')
  delete_Address(@Param('id') id: string) {
    return this.customerService.delete_address(id);
  }

  @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Customer get our home address and work address' })
  @Get('address')
  get_Address(@Request() req) {
    return this.customerService.get_customer_address(req.payload.user_id);
  }

  @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Customer get our home address and work address' })
  @Get('near_rides')
  near_rides(@Query() body: NearRideDto) {
    return this.customerService.near_me_rides(body)
  }

  @ApiBearerAuth('authorization')
  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher, StaffRoles.CUSTOMERS)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'All customer listing for admin' })
  @Get('')
  findAll(@Query() body: findCustomerDto) {
    return this.customerService.FindAllwithStatus(body);
  }


  @ApiBearerAuth('authorization')
  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher, StaffRoles.CUSTOMERS)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'All customer listing for admin to export' })
  @Get('export')
  exportAll(@Query() body: exportCustomerDto) {
    return this.customerService.FindAllToExportwithStatus(body);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher, StaffRoles.STAFF, StaffRoles.CUSTOMERS)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: ' customer detail for admin' })
  @Get('detail/:id')
  findOne(@Param('id') id: string) {
    return this.customerService.customer_details(id);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher, StaffRoles.CUSTOMERS)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: ' customer detail for admin' })
  @Get('bookings/:id')
  customer_booking(
    @Param('id') id: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.customerService.customer_bookings(id, page, limit);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher, StaffRoles.CUSTOMERS)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update driver status for admin' })
  @Put('block/deactive')
  CustomerStatusUpdate(@Body() body: UpdateCustomerStatustDto) {
    return this.customerService.update_customer_active_deactive(body);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher, StaffRoles.CUSTOMERS)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update driver status for admin' })
  @Put('block/unblock')
  block(@Body() body: BlockCustomerDto) {
    return this.customerService.block(body);
  }
}
