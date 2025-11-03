import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Put, UseGuards, Request } from '@nestjs/common';
import { VehicleService } from './vehicle.service';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { addVehicleDto, findVehicleDto } from './dto/vehicle.dto';
import { Roles } from 'src/auth/decorators/role.decorators';
import { StaffRoles, UsersType } from 'src/auth/role/user.role';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { RequirePermissions } from 'src/auth/decorators/require.permission.decorators';

@Controller('vehicle')
@ApiTags('Vehicle')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) { }


  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'vehicle listing' })
  @Get('types')
  FindVehicleTypes(@Request() req) {
    return this.vehicleService.findVehicleType();
  }


  @ApiOperation({ summary: 'vehicle listing' })
  @Get('types/admin')
  AdminFindVehicleTypes(@Request() req) {
    return this.vehicleService.findVehicleTypeAdmin();
  }

  @ApiOperation({ summary: 'vehicle listing' })
  @Get('active/vehicles')
  ActiveVehicles() {
    return this.vehicleService.findVehicleTypeListing();
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.VEHICLES)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Add vehicle' })
  @Post()
  create(@Body() createVehicleDto: addVehicleDto) {
    return this.vehicleService.create(createVehicleDto);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.VEHICLES)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'vehicle listing' })
  @Get()
  findAll(@Query() body: findVehicleDto) {
    return this.vehicleService.findAll(body);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.VEHICLES)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'vehicle listing' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehicleService.findOne(id);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.VEHICLES)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update vehicle' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVehicleDto: addVehicleDto) {
    return this.vehicleService.update(id, updateVehicleDto);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.VEHICLES)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Delete vehicle' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vehicleService.remove(id);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.VEHICLES)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'deactivate vehicle' })
  @Put(':id')
  deactive(@Param('id') id: string, @Query('status') status: string) {
    return this.vehicleService.deactivate(id, status);
  }
}
