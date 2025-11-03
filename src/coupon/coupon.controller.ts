import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Put } from '@nestjs/common';
import { CouponService } from './coupon.service';
import { CreateCouponDto, FindCouponStatusDto, UpdateStatusDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/role.decorators';
import { StaffRoles, UsersType } from 'src/auth/role/user.role';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { RequirePermissions } from 'src/auth/decorators/require.permission.decorators';

@Controller('coupon')
@ApiTags('Coupon')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.COUPONS)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary: 'Add coupon by admin' })
  @Post()
  create(@Body() createCouponDto: CreateCouponDto) {
    return this.couponService.create(createCouponDto);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.COUPONS)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary: 'Coupon listing' })
  @Get()
  findAll(@Query() body:FindCouponStatusDto) {
    return this.couponService.findAll(body);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.COUPONS)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary: 'Coupon listing' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.couponService.findOne(id);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.COUPONS)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary: 'Update coupon by admin' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCouponDto: UpdateCouponDto) {
    return this.couponService.update(id, updateCouponDto);
  }


  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.COUPONS)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary: 'Update coupon by admin' })
  @Put('update/status')
  update_status(@Query() body: UpdateStatusDto) {
    return this.couponService.update_status(body);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.COUPONS)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary: 'delete coupon by admin' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.couponService.remove(id);
  }
}
