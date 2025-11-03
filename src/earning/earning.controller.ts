import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, Put } from '@nestjs/common';
import { EarningService } from './earning.service';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { EarningDto, EarningStatusDto, ExportEarningDto, driverMakePaymentDto } from './dto/earning.dto';
import { Roles } from 'src/auth/decorators/role.decorators';
import { StaffRoles, UsersType } from 'src/auth/role/user.role';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { RequirePermissions } from 'src/auth/decorators/require.permission.decorators';
import { log } from 'node:console';

@Controller('earning')
@ApiTags('earning')
export class EarningController {
  constructor(private readonly earningService: EarningService) { }


  @Roles(UsersType.Driver)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Driver earnings ' })
  @Get("")
  findAll(@Query() status: EarningStatusDto, @Request() req) {
    const timezone = req.headers['timezone'] || 'Australia/Sydney';
    log('timezone', timezone);
    return this.earningService.findAll(req?.payload?.user_id, status, timezone);
  }


  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.EARNINGS)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Admin earnings ' })
  @Get("admin/listing")
  AdminfindAll(@Query() body: EarningDto) {
    return this.earningService.AdminEarningListing(body);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.EARNINGS)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Admin earnings export ' })
  @Get("export/earning")
  export_earning(@Query() body: ExportEarningDto) {
    return this.earningService.export_earning(body);
  }

  @Roles(UsersType.Driver)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'driver make pending payment ' })
  @Put("make/payment")
  driver_make_pending_payment(@Query() body: driverMakePaymentDto, @Request() req) {
    return this.earningService.driver_make_payment(body, req.payload.user_id);
  }


}

