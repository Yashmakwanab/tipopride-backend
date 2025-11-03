import { Body, Controller, Get, Post, Put, Request, UseGuards } from '@nestjs/common';
import { BankService } from './bank.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AddBankDto, editBankDto } from './dto/bank.dto';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { UsersType } from 'src/auth/role/user.role';
import { Roles } from 'src/auth/decorators/role.decorators';
import { RolesGuard } from 'src/auth/guard/role.guard';

@ApiTags('bank')
@Controller('bank')
export class BankController {
  constructor(private readonly bankService: BankService) { }

  @Roles(UsersType.Driver)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary: 'add bank' })
  @Post()
  addBank(@Body() body: AddBankDto, @Request() req) {
    return this.bankService.addBank(body, req.payload.user_id,req)
  }

  @Roles(UsersType.Driver)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary: 'add bank' })
  @Get()
  GetBank( @Request() req) {
    return this.bankService.get_bank_detail( req.payload.user_id)
  }

   @Roles(UsersType.Driver)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary: 'add bank' })
  @Put()
  editBank(@Body() body: editBankDto, @Request() req) {
    return this.bankService.editBank(body, req.payload.user_id,req)
  }
}
