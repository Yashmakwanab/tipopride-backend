import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { addMoneyDto } from './dto/wallet.dto';
import { Roles } from 'src/auth/decorators/role.decorators';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersType } from 'src/auth/role/user.role';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';


@Controller('wallet')
@ApiTags('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary:'Add money to wallet by customer' })
  @Post()
  create(@Body() body: addMoneyDto,@Request() req) {
    return this.walletService.create(body,req.payload.user_id);
  }

  @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary:'get all transaction '})
  @Get()
  findAll(@Request() req,@Query('page') page:number,@Query('limit') limit:number) {
    return this.walletService.findAll(req.payload.user_id,page,limit);
  }

}
