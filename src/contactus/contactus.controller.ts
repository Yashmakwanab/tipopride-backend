import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ContactusService } from './contactus.service';
import { CreateContactusDto, FindContactUsDto } from './dto/create-contactus.dto';
import { UpdateContactusDto } from './dto/update-contactus.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { Roles } from 'src/auth/decorators/role.decorators';
import { StaffRoles, UsersType } from 'src/auth/role/user.role';
import { RequirePermissions } from 'src/auth/decorators/require.permission.decorators';

@Controller('contactus')
@ApiTags('contact us')
export class ContactusController {
  constructor(private readonly contactusService: ContactusService) { }

  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Post()
  create(@Body() createContactusDto: CreateContactusDto, @Request() req) {
    return this.contactusService.create(createContactusDto, req.payload);
  }


  @Post('web')
  createForWeb(@Body() createContactusDto: CreateContactusDto) {
    return this.contactusService.createForWeb(createContactusDto);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.CONTACT)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Get()
  findAll(@Query() body: FindContactUsDto) {
    return this.contactusService.findAll(body);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.CONTACT)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contactusService.findOne(id);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.CONTACT)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateContactusDto: UpdateContactusDto, @Request() req) {
    return this.contactusService.update(id, updateContactusDto, req);
  }


  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.CONTACT)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Patch(':id')
  delete(@Param('id') id: string) {
    return this.contactusService.delete(id);
  }
}
