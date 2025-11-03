import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { SurchargeService } from './surcharge.service';
import { AddSurchargeDateDto } from './dto/surcharge.dto';
import { Roles } from 'src/auth/decorators/role.decorators';
import { StaffRoles, UsersType } from 'src/auth/role/user.role';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { RequirePermissions } from 'src/auth/decorators/require.permission.decorators';


@Controller('surcharge')
@ApiTags('surcharge')
export class SurchargeController {
  constructor(private readonly surchargeService: SurchargeService) { }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.SURCHARGE)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Post()
  create(@Body() body: AddSurchargeDateDto) {
    return this.surchargeService.create(body);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.SURCHARGE)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Get()
  findAll(@Query('status') status: string) {
    return this.surchargeService.findAll(status);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.SURCHARGE)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.surchargeService.findOne(id);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.SURCHARGE)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: AddSurchargeDateDto) {
    return this.surchargeService.update(id, body);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.SURCHARGE)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.surchargeService.remove(id);
  }


  @Roles(UsersType.admin)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Get('active/surcharge/history')
  ActiveSurcahargeHistory(@Query('page') page: number, @Query('limit') limit: number) {
    return this.surchargeService.ActiveSurchargeHistory(page, limit);
  }
}
