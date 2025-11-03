import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto, findCompaniesDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Roles } from 'src/auth/decorators/role.decorators';
import { StaffRoles, UsersType } from 'src/auth/role/user.role';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { RequirePermissions } from 'src/auth/decorators/require.permission.decorators';

@Controller('company')
@ApiTags('company')

export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}


  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher,StaffRoles.COMPANY)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary: 'Create company' })
  @Post()
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companyService.create(createCompanyDto);
  }

  
  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher,StaffRoles.COMPANY)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary: 'Companies list' })
  @Get()
  findAll(@Query() findCompaniesDto:findCompaniesDto) {
    return this.companyService.findAll(findCompaniesDto);
  }

  
  
  @ApiOperation({ summary: 'company detail' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companyService.findOne(id);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher,StaffRoles.COMPANY)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary: 'Update company' })
  @Patch(':id')
  update(@Param('id')id:string,@Body() createCompanyDto: CreateCompanyDto) {
    return this.companyService.update(id,createCompanyDto);
  }


  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher,StaffRoles.COMPANY)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary: 'delete company' })
  @Delete(':id')
  delete(@Param('id')id:string) {
    return this.companyService.remove(id);
  }


}
