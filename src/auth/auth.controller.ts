import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards, Put, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto, FileUploadDto, ResendOtpDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { CreateCustomerDto, SocialLoginDto, VerifyEmailDto, VerifyPhone, becomeDriverDto, editProfileDto } from 'src/customer/dto/create-customer.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from './guard/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @ApiOperation({ summary: 'driver signup from webapp' })
  @Post('become/driver')
  async becomeDriver(@Body() body: becomeDriverDto, @Request() req) {
    return await this.authService.becomeDriver(body);
  }

  @ApiOperation({ summary: 'driver update before signup' })
  @Patch('edit-profile/web/driver')
  async updateDriver(@Body() body: becomeDriverDto, @Request() req) {
    return await this.authService.updateDriver(body, req);
  }

  @ApiOperation({ summary: 'Signup and login for driver and customer' })
  @Post('continue-with-phone')
  async continueWithPhone(
    @Body() createCustomerDto: CreateCustomerDto,
    @Request() req,
  ) {
    return await this.authService.continue_with_phone(createCustomerDto, req);
  }

  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'Verify phone for driver and customer' })
  @Post('verify-phone')
  async verifyPhone(@Body() verifyphoneDto: VerifyPhone, @Request() req) {
    return await this.authService.verify_phone(verifyphoneDto, req);
  }

  @ApiOperation({ summary: 'social login for driver and customer' })
  @Post('social-login')
  async socialLogin(@Body() body: SocialLoginDto) {
    return await this.authService.social_login(body);
  }

  @ApiOperation({ summary: 'Verify email for driver and customer' })
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @Put('verify-email')
  async verify_email(@Request() req, @Body() body: VerifyEmailDto) {
    return await this.authService.verify_email(req.payload, body, req);
  }

  @ApiOperation({ summary: 'Verify edit phone for driver and customer' })
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @Put('verify-edit-phone')
  async verify_edit_phone(@Request() req, @Body() body: VerifyEmailDto) {
    return await this.authService.verify_edit_phone(req.payload, body, req);
  }

  @ApiOperation({ summary: 'get profile for driver and customer' })
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @Get('get-profile')
  async getProfile(@Request() req) {
    return await this.authService.getProfile(req.payload);
  }

  @ApiOperation({ summary: 'edit profile for driver and customer' })
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @Put('edit-profile')
  async editProfile(@Request() req, @Body() body: editProfileDto) {
    return await this.authService.editProfile(req.payload, body, req);
  }

  @ApiOperation({ summary: 'Delete account for driver and customer' })
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @Put('delete/account')
  async dltAccount(@Request() req) {
    return await this.authService.delete_account(req.payload, req);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'logout' })
  @ApiResponse({ status: 201, description: 'LogOut Successfully!' })
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @Delete('/logout')
  logOut(@Request() req) {
    return this.authService.logOut(req, req.payload);
  }

  // @ApiOperation({summary:"edit profile for driver and customer"})
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @Put('update/fcm/token')
  async updateFcmToken(@Request() req, @Query('token') token: string) {
    return await this.authService.UpdateFcmToken(req.payload.user_id, token);
  }

  @Patch('resend/phone')
  async resendOnPhone(@Body() body: ResendOtpDto) {
    const type = 'phone'
    return await this.authService.resendOtp(type, body);
  }

  @Patch('resend/email')
  async resendOnEmail(@Body() body: ResendOtpDto) {
    const type = 'email'
    return await this.authService.resendOtp(type, body);
  }
}
