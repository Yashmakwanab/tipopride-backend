import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { MakeAdditionalPaymentDto, MakePaymentDto, transferMoneyDto } from './dto/payment.dto';
import { Roles } from 'src/auth/decorators/role.decorators';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { UsersType } from 'src/auth/role/user.role';


@Controller('payment')
@ApiTags("payment")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Add cards by customer' })
  @Post("make-paymnet")
  make_payment(@Body() body: MakePaymentDto, @Request() req) {
    return this.paymentService.make_payment(body, req);
  }

  @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Add cards by customer' })
  @Post("make/payment/additional")
  make_payment_addititonal(@Body() body: MakeAdditionalPaymentDto, @Request() req) {
    return this.paymentService.make_payment_additional(body, req.user);
  }


  @ApiOperation({ summary: 'stripe webhoook' })
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @Post('webhook')
  webhook(@Request() req: Request, @Body() body: any) {
    return this.paymentService.webhook(req.headers, body);
  }
}
