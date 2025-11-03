import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { CardService } from './card.service';
import {  AddCardsDto, UpdateCardDto } from './dto/card.dto';
import { Roles } from 'src/auth/decorators/role.decorators';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { UsersType } from 'src/auth/role/user.role';

@Controller('card')
@ApiTags("card")
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary:'Add cards by customer' })
  @Post()
  create(@Body() body: AddCardsDto,@Request() req) {
    return this.cardService.create(body,req.payload);
  }

  @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary:'get all customer card' })
  @Get()
  findAll(@Request() req) {
    return this.cardService.findAll(req.payload);
  }
  
  @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary:'get card detail' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cardService.findOne(id);
  }

  @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary:'Update card ' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCardDto: UpdateCardDto,@Request() req) {
    return this.cardService.update(id, updateCardDto,req);
  }

  @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard,RolesGuard)
  @ApiOperation({ summary:'Delete card ' })
  @Delete(':id')
  remove(@Param('id') id: string,@Request()req) {
    return this.cardService.remove(id,req);
  }
}
