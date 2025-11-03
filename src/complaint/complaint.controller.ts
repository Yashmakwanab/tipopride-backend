import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, Put } from '@nestjs/common';
import { ComplaintService } from './complaint.service';
import { CreateComplaintDto, FindComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto, UpdateToPendingDto } from './dto/update-complaint.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { Roles } from 'src/auth/decorators/role.decorators';
import { StaffRoles, UsersType } from 'src/auth/role/user.role';
import { RequirePermissions } from 'src/auth/decorators/require.permission.decorators';

@Controller('complaint')
@ApiTags('complaint')
export class ComplaintController {
  constructor(private readonly complaintService: ComplaintService) {}


  // @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @Post()
  create(@Body() createComplaintDto: CreateComplaintDto,@Request() req) {
    return this.complaintService.create(createComplaintDto,req.payload);
  }

  
  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.COMPLAINTS)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @Get()
  findAll(@Query() body:FindComplaintDto) {
    return this.complaintService.findAll(body);
  }


   @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.COMPLAINTS)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.complaintService.findOne(id);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.COMPLAINTS)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateComplaintDto: UpdateComplaintDto, @Request() req) {
    return this.complaintService.update(id, updateComplaintDto, req);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.COMPLAINTS)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @Put('update_to_pending/:id')
  update_to_pending(@Param('id') id: string,@Body()body:UpdateToPendingDto) {
    return this.complaintService.update_to_pending(id,body);
  }

}
