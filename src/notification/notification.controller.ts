import { Controller, Delete, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { notifyPagination } from './dto/notification.dto';
import { AuthGuard } from 'src/auth/guard/auth.guard';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'get notification' })
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @Get()
  async notification(@Query() payload: notifyPagination, @Request() req): Promise<any> {
    return this.notificationService.getNotification(payload, req.payload.user_id)
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'mark all as read' })
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @Patch()
  async readAllNotification(@Request() req) {
    return this.notificationService.readAllNotification(req?.payload?.user_id)
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'mark notification as read' })
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @Patch(':id')
  async readNotification(@Param("id") id: string, @Request() req) {
    return this.notificationService.readNotification(id, req?.payload?.user_id)
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'mark notification as deleted' })
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @Delete(':id')
  async deleteNotification(@Param("id") id: string, @Request() req) {
    return this.notificationService.deleteNotification(id, req?.payload?.user_id)
  }
}
