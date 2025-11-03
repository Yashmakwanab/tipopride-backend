import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Roles } from 'src/auth/decorators/role.decorators';
import { UsersType } from 'src/auth/role/user.role';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { ChatListDto } from './dto/chat.dto';


@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  //  @Roles(UsersType.)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @Get('list')
  @ApiOperation({ summary: 'chat list' })
  connetionList(@Query() body: ChatListDto, @Request() req) {
    return this.chatService.connetionList(body, req?.payload?.user_id);
  }

}
