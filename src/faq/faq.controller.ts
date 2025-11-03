import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { FaqService } from './faq.service';
import { CreateFaqDto, FindFaqDto, FindFaqForAppsDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StaffRoles, UsersType } from 'src/auth/role/user.role';
import { Roles } from 'src/auth/decorators/role.decorators';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { RequirePermissions } from 'src/auth/decorators/require.permission.decorators';

@Controller('faq')
@ApiTags('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.FAQ)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @Post()
  create(@Body() createFaqDto: CreateFaqDto) {
    return this.faqService.create(createFaqDto);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.FAQ)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @Get()
  findAll(@Query() body:FindFaqDto) {
    return this.faqService.findAll(body);
  }

  
  @Get('for/apps')
  findAllForApps(@Query() body:FindFaqForAppsDto) {
    return this.faqService.findAllForApps(body);
  }


  
  
  @Get('landing/page')
  findAllLandingPage(@Query() body:FindFaqDto) {
    return this.faqService.findAll(body);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.FAQ)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.faqService.findOne(id);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.FAQ)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFaqDto: UpdateFaqDto) {
    return this.faqService.update(id, updateFaqDto);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.FAQ)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.faqService.remove(id);
  }
}
