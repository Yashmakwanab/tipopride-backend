import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ContentPageService } from './content-page.service';
import { CreateContentPageDto } from './dto/create-content-page.dto';
import { UpdateContentPageDto } from './dto/update-content-page.dto';
import { ContentPageDto, findPageDto } from './dto/content.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/role.decorators';
import { StaffRoles, UsersType } from 'src/auth/role/user.role';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { RequirePermissions } from 'src/auth/decorators/require.permission.decorators';

@Controller('content-page')
@ApiTags('pages')
export class ContentPageController {
  constructor(private readonly contentPageService: ContentPageService) {}

 
  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.CONTENT)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @Get()
  findAll(@Query() body:ContentPageDto) {
    return this.contentPageService.findAll(body);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.CONTENT)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contentPageService.findOne(id);
  }

 
  @Get('/:type/:slug')
  find_with_name(@Query() body:findPageDto) {
    return this.contentPageService.find_with_name(body);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.CONTENT)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateContentPageDto: UpdateContentPageDto) {
    return this.contentPageService.update(id, updateContentPageDto);
  }

 
}
