import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Put, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminPasswordDto, AdminPayoutExportDto, NotificationDto, SignInDto, UpdateTaxAmount } from './dto/admin.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { Roles } from 'src/auth/decorators/role.decorators';
import { StaffRoles, UsersType } from 'src/auth/role/user.role';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { RequirePermissions } from 'src/auth/decorators/require.permission.decorators';


@Controller('admin')
@ApiTags('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @ApiOperation({ summary: 'signin by admin' })
  @Post()
  create(@Body() signInDto: SignInDto) {
    return this.adminService.login(signInDto);
  }


  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get profile' })
  @ApiBearerAuth('authorization')
  @Get("profile")
  async getProfile(@Request() req) {
    return await this.adminService.get_admin_profile(req.payload);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.DASHBOARD)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get profile' })
  @ApiBearerAuth('authorization')
  @Get("dashboard")
  async dashboard() {
    return await this.adminService.dashboard_count();
  }


  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.NOTIFICATION, StaffRoles.dispatcher)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'sent notification' })
  @ApiBearerAuth('authorization')
  @Post("notifiation")
  async sent_notification(@Body() body: NotificationDto) {
    return await this.adminService.sent_notification(body);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Change password' })
  @ApiBearerAuth('authorization')
  @Put("change/password")
  async AdminChangePasword(@Request() req, @Body() body: AdminPasswordDto) {
    return await this.adminService.AdminChangePassword(body, req.payload.user_id);
  }


  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.PAYOUT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'admin payout' })
  @ApiBearerAuth('authorization')
  @Get("payout")
  async AdminPayout(@Request() req) {
    return await this.adminService.AdminPayout();
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.TAX)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'Admin update tax amount' })
  @Put("update-tax")
  async UpdateTax(@Request() req, @Body() body: UpdateTaxAmount) {
    return await this.adminService.UpdateTax(body, req.payload.user_id);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.TAX)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'Tax transaction history' })
  @Get("tax-transaction-history")
  async TaxTransactionHistory(@Query('page') page: number, @Query('limit') limit: number) {
    return await this.adminService.TaxTransactionHistory(page, limit);
  }


  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.TAX)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'Tax detail' })
  @Get("total-tax-detail")
  async taxDetail(@Request() req) {
    return await this.adminService.total_tax_amount(req.payload.user_id);
  }

  @Roles(UsersType.admin)
  // @RequirePermissions(StaffRoles.all)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'admin payout export' })
  @ApiBearerAuth('authorization')
  @Get("payout/export")
  async AdminPayoutExport(@Request() req, @Query() body: AdminPayoutExportDto) {
    return await this.adminService.AdminPayoutExport(body);
  }


  @Roles(UsersType.admin)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'Pay to app.. drivers list' })
  @Get("pay-to-App-list")
  async pay_to_driver_list(@Request() req, @Query('page') page: number, @Query('limit') limit: number) {
    return await this.adminService.PayToAppList(page, limit);
  }


  @Roles(UsersType.admin)
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Free drivers' })
  @ApiBearerAuth('authorization')
  @Get("free/drivers")
  async freeDrivers(@Request() req) {
    return await this.adminService.freeDrivers();
  }

}

