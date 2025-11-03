import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  Put,
  Query,
} from '@nestjs/common';
import { DriverService } from './driver.service';
import { DocUpdateDto, DriverStatusDto, EditCommission, EditvehicleDetailDto, SetExpiryDateDto, UpdateDriverBlockStatusDto, UpdateDriverRequestDto, UpdateDriverStatusDto, UpdateLocationDto, driverVehicleListingDto, findDriverDto, findDriverRequestDto, licence_update, payoutTransactionHistory, vehicleDetailDto, exportDriverDto } from './dto/driver.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { Roles } from 'src/auth/decorators/role.decorators';
import { StaffRoles, UsersType } from 'src/auth/role/user.role';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { RequirePermissions } from 'src/auth/decorators/require.permission.decorators';
import { DriverForChatByDispatcherDto } from './dto/search-driver.dto';

@Controller('driver')
@ApiTags('Driver')
export class DriverController {
  constructor(private readonly driverService: DriverService) { }

  @ApiOperation({ summary: 'Get available drivers list - available for chat ' })
  @Get('search')
  listOfDriverForChatByDispatcher(@Query() dto: DriverForChatByDispatcherDto, @Request() req) {
    console.log("INNNN")
    return this.driverService.listOfDriverForChatByDispatcher(req, dto);
  }

  @Roles(UsersType.Driver)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'update driver location' })
  @Put('update/location')
  UpdateDriverLocation(@Query() body: UpdateLocationDto, @Request() req) {
    return this.driverService.UpdateDriverLocation(body, req.payload.user_id);
  }

  @Roles(UsersType.Driver)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: ' Driver make vehicle active' })
  @Put('make/vehicle/active/:id')
  make_vehicle_active(@Param('id') id: string, @Request() req) {
    return this.driverService.MakeVehicleActive(id, req.payload.user_id);
  }

  @Roles(UsersType.Driver)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Driver set our vehicle detail' })
  @Post('set-vehicle-detail')
  vehicle_detail(@Body() vehicleDetailDto: vehicleDetailDto, @Request() req) {
    return this.driverService.set_vehicle_details(
      vehicleDetailDto,
      req.payload,
      req,
    );
  }

  @Roles(UsersType.admin, UsersType.Staff)
  // @RequirePermissions(StaffRoles.all)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Driver set our vehicle detail' })
  @Get('payout/history')
  driverPayoutHistory(@Query() body: payoutTransactionHistory) {
    return this.driverService.driverPayoutTransaction(body)
  }

  @Roles(UsersType.Driver)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Driver set our vehicle detail' })
  @Put('edit-vehicle-detail')
  edit_vehicle_detail(
    @Body() vehicleDetailDto: EditvehicleDetailDto,
    @Request() req,
  ) {
    return this.driverService.edit_vehicle_details(
      vehicleDetailDto,
      req.payload.user_id,
    );
  }

  @Roles(UsersType.Driver)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Driver set our vehicle detail' })
  @Put('edit-licence')
  edit_licence(@Body() licence_update: licence_update, @Request() req) {
    return this.driverService.edit_licence(licence_update, req.payload.user_id);
  }


  @Roles(UsersType.admin, UsersType.Staff)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Put('edit/commision')
  driverCommision(@Body() body: EditCommission) {
    return this.driverService.editCommision(body)
  }

  @Roles(UsersType.Driver)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Driver vehicle listing ' })
  @Get('get-all-vehicle')
  get_vehicles(@Request() req) {
    return this.driverService.get_all_vehicle(req.payload.user_id, req);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Driver vehicle listing ' })
  @Get('driver/vehicle/listing/:id')
  get_driver_vehicles(
    @Param('id') id: string,
    @Query() body: driverVehicleListingDto,
  ) {
    return this.driverService.get_driver_vehicles(id, body);
  }

  @Roles(UsersType.Driver)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Driver vehicle listing ' })
  @Get('get-vehicle-detail/:id')
  find_vehicle_detail(@Param('id') id: string, @Request() req) {
    return this.driverService.get_vehicle_detail(id, req);
  }

  @Roles(UsersType.Driver)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Driver get our document detail ' })
  @Get('get-document-detail')
  find_document_detail(@Request() req) {
    return this.driverService.get_document_detail(req.payload.user_id, req);
  }

  @Roles(UsersType.Driver)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Driver go online & offline ' })
  @Put('go-online/offline')
  go_online(@Request() req, @Body() body: DriverStatusDto) {
    return this.driverService.go_online(req.payload.user_id, body, req);
  }


  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher, StaffRoles.DRIVERS)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'All driver listing for admin' })
  @Get('export')
  exportAll(@Query() body: exportDriverDto) {
    return this.driverService.ExportAllwithStatus(body);
  }


  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher, StaffRoles.DRIVERS)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'All driver listing for admin' })
  @Get(':status')
  findAll(@Query() body: findDriverDto) {
    return this.driverService.FindAllwithStatus(body);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  //@RequirePermissions(StaffRoles.dispatcher)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: ' customer detail for admin' })
  @Get('detail/:id')
  findOne(@Param('id') id: string) {
    return this.driverService.driver_details(id);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: ' driver booking list for admin' })
  @Get('bookings/list/:id')
  driver_bookings(
    @Param('id') id: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.driverService.driver_booking_list(id, page, limit);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: ' driver booking list for admin' })
  @Get('vehicle/detail/:id')
  driver_vehicle_detail(@Param('id') id: string) {
    return this.driverService.driver_vehicle_detail(id);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.DRIVERSREQUESTED)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'driver request  listing for admin' })
  @Get('request/listing')
  DriverRequests(@Query() body: findDriverRequestDto) {
    return this.driverService.FindDriverRequests(body);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.DOCSUPDATED)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'update docs driver listing for admin' })
  @Get('update/docs/request')
  UpdateDocsRequests(@Query() body: DocUpdateDto) {
    return this.driverService.UpdatedDocsRequests(body);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update driver request for admin' })
  @Put('request')
  DriverRequestUpdate(@Body() body: UpdateDriverRequestDto) {
    return this.driverService.UpdateDriverRequests(body);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update driver status for admin' })
  @Put('active/deactive')
  DriverStatusUpdate(@Body() body: UpdateDriverStatusDto) {
    return this.driverService.update_driver_active_deactive(body);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update driver status for admin' })
  @Put('block/unblock')
  DriverStatusUpdateBlock(@Body() body: UpdateDriverBlockStatusDto) {
    return this.driverService.update_driver_block_unblock(body);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update driver status for admin' })
  @Post('set/expiry/date/:id')
  SetExpiryDate(@Param('id') id: string, @Body() body: SetExpiryDateDto) {
    return this.driverService.SetExpiryDate(body, id);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'update docs driver listing for admin' })
  @Get('earnings/:id')
  driver_earnings(@Param('id') id: string) {
    return this.driverService.drivers_earnings(id);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Driver Active vehicle ' })
  @Get('active/vehicle')
  driver_active_vehicle(@Request() req) {
    return this.driverService.DriverActiveVehicle(req.payload.user_id);
  }

  @Put('check/expiry/date')
  check_expiry_date() {
    return this.driverService.check_Expiry_date();
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'vehicle update history' })

  @Get('vehicle/history/:id')
  vehicle_history(
    @Param('id') id: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.driverService.DocUpdateHistory(id, page, limit);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'admin driver payout list ' })
  @Get('driver/payout/listing')
  availableDriver() {
    return this.driverService.driverPayoutList();
  }

}