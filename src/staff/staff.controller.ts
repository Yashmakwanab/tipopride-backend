import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Put, UseGuards, Request } from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto, FindStaffdto, UpdateStatusdto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/role.decorators';
import { StaffRoles, UsersType } from 'src/auth/role/user.role';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { RequirePermissions } from 'src/auth/decorators/require.permission.decorators';

@ApiTags('staff')
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) { }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.STAFF)
  @Roles(UsersType.admin)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Post('admin')
  create(@Body() createStaffDto: CreateStaffDto) {
    return this.staffService.create(createStaffDto);
  }


  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.STAFF)
  @Roles(UsersType.admin)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('admin')
  findAll(@Query() body: FindStaffdto) {
    return this.staffService.findAll(body);
  }


  @Roles(UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('profile')
  profile(@Request() req) {
    return this.staffService.dispatureDetails(req?.payload?.user_id);
  }

  @Roles(UsersType.admin,UsersType.Staff)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Get(':id/admin')
  findOne(@Param('id') id: string) {
    return this.staffService.dispatureDetails(id);
  }


  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.STAFF)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Patch(':id/admin')
  update(@Param('id') id: string, @Body() updateStaffDto: UpdateStaffDto) {
    return this.staffService.update(id, updateStaffDto);
  }

  @Roles(UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Patch('profile')
  updateProfile(@Body() updateStaffDto: UpdateStaffDto, @Request() req) {
    return this.staffService.update(req?.payload?.user_id, updateStaffDto);
  }


  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.STAFF)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.staffService.remove(id);
  }


  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.STAFF)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Put(':id/activeOrDeactive')
  UpdateStatus(@Param('id') id: string) {
    return this.staffService.update_status(id);
  }
}
