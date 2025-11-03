import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Put,
  Patch,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import {
  AddtipDto,
  AvailableCouponDto,
  UpdateTipPaymentTypeDto,
  BookingStatusDto,
  CalculateVehiclePriceDto,
  CancelBookingDto,
  CreateBookingDto,
  RideStatus,
  ScheduleBookingDto,
  UpdateBookingDto,
  findBookingDto,
  CreateBookingByDispatcherDto,
  DispatcherGetBookingsDto,
  DriverIdDto,
  AssignDriverDto,
  CreateBookingByWebApp,
  sendMail,
  NotifyDto,
  DriverListOnDispatcherForAssignDto,
  BookingPaidUnpaidListDto,
} from './dto/booking.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { Roles } from 'src/auth/decorators/role.decorators';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { StaffRoles, UsersType } from 'src/auth/role/user.role';
import { RequirePermissions } from 'src/auth/decorators/require.permission.decorators';

@Controller('booking')
@ApiTags('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) { }

  @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Customer Create booking' })
  @Post()
  create(@Body() createBookingDto: CreateBookingDto, @Request() req) {
    return this.bookingService.create(createBookingDto, req.user._id);
  }

  @Roles(UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'booking list created by dispather' })
  @Get('/dispatcher')
  dispatcherBookingList(
    @Query() payload: DispatcherGetBookingsDto,
    @Request() req,
  ) {
    return this.bookingService.dispatcherBookingList(
      payload,
      req?.payload?.user_id,
    );
  }

  @Roles(UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'schedule booking list ' })
  @Get('scheduled/dispatcher')
  scheduledBookingList(@Query() payload: DispatcherGetBookingsDto, @Request() req) {
    return this.bookingService.scheduledBookingList(payload, req.payload.user_id);
  }

  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher)
  @ApiOperation({ summary: 'create booking for company by dispatcher' })
  @Post('dispatcher')
  createBookingByDispatcher(
    @Body() createBookingDto: CreateBookingByDispatcherDto,
    @Request() req,
  ) {
    return this.bookingService.createBookingByDispatcher(createBookingDto, req.payload.user_id);
  }

  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher)
  @ApiOperation({ summary: 'update booking for company by dispatcher' })
  @Patch('dispatcher/:id')
  updateBookingByDispatcher(
    @Param('id') id: string,
    @Body() createBookingDto: CreateBookingByDispatcherDto,
    @Request() req,
  ) {
    return this.bookingService.updateBookingByDispatcher(id, createBookingDto, req.payload.user_id);
  }

  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher)
  @ApiOperation({ summary: 'update booking for company by dispatcher' })
  @Patch('driver_earning/:id')
  updateDriverIncomeByDispatcher(
    @Param('id') id: string,
    @Body() createBookingDto: CreateBookingByDispatcherDto,
    @Request() req,
  ) {
    return this.bookingService.updateDriverIncomeByDispatcher(id, createBookingDto);
  }

  @ApiOperation({ summary: 'create booking for guest user by webapp' })
  @Post('web/app')
  createBookingByWebApp(@Body() createBookingDto: CreateBookingByWebApp) {
    return this.bookingService.createBookingBywebApp(createBookingDto);
  }

  @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @Post('schedule_booking')
  @ApiOperation({ summary: 'Customer Create Schedule booking ' })
  schedule_booking(@Body() body: ScheduleBookingDto, @Request() req) {
    return this.bookingService.schedule_booking(body, req?.payload?.user_id);
  }

  @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @Patch('schedule_booking/readynow/:id')
  @ApiOperation({ summary: 'ready now scheduled' })
  schedule_booking_ready_now(@Param() id: string, @Request() req) {
    return this.bookingService.ready_now_schedule_booking(id, req?.payload?.user_id);
  }

  @Roles(UsersType.Customer, UsersType.Staff)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Customer update stops  ' })
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @Request() req,
  ) {
    return this.bookingService.update(updateBookingDto, id);
  }

  // @Roles(UsersType.Staff)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'get available drivers also via available for booking ' })
  @Get('/driver/dispatcher')
  availableDriverforThisBooking(@Query() payload: DriverIdDto, @Request() req) {
    return this.bookingService.availableDriverforThisBooking(
      payload?.id,
      payload,
      req
    );
  }

  @Roles(UsersType.Staff)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'get available drivers also via available for booking ' })
  @Get('waitingForDriver/dispatcher')
  waitingForDriver(@Query() payload: DriverIdDto) {
    return this.bookingService.waitingForDriver(payload);
  }

  // @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get booking detail for Customer & Driver ' })
  @Get(':id')
  view_booking(@Param('id') id: string, @Request() req) {
    return this.bookingService.get_booking(id, req.payload);
  }

  @ApiOperation({ summary: 'Get booking activity ' })
  @Get('booking-activity/:id')
  view_booking_logs(@Param('id') id: string, @Request() req) {
    return this.bookingService.get_booking_logs(id, req.payload);
  }

  @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Customer check available rides' })
  @Post('available-rides')
  Available_rides(@Body() body: CalculateVehiclePriceDto, @Request() req) {
    return this.bookingService.available_rides(body, req.payload.user_id);
  }


  @ApiOperation({ summary: 'webapp vehicle pricing' })
  @Post('web/vehicle/pricing')
  webAppVehiclePricing(@Body() body: CalculateVehiclePriceDto) {
    return this.bookingService.webAppVehiclePricing(body);
  }


  @Roles(UsersType.Staff)
  @ApiBearerAuth('authorization')
  @RequirePermissions(StaffRoles.dispatcher)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Customer check available rides' })
  @Post('available-rides/dispatcher')
  availableRides(@Body() body: CalculateVehiclePriceDto) {
    return this.bookingService.availableRides(body);
  }

  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Available Coupons for booking' })
  @Get('available/coupons')
  Available_coupons(@Query() body: AvailableCouponDto, @Request() req) {
    return this.bookingService.available_coupons(body, req.payload.user_id);
  }

  @Roles(UsersType.Customer, UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'apply promo code for booking' })
  @Get('apply/promo/code')
  promo_code(@Query('promo_code') promo_code: string, @Request() req) {
    return this.bookingService.ApplyPromoCode(
      promo_code,
      req,
      req.payload.user_id,
    );
  }

  @Roles(UsersType.Driver)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Driver accept booking request' })
  @Put('accept-booking/:id')
  Accept_booking(@Param('id') id: string, @Request() req) {
    return this.bookingService.accept_booking(id, req.payload.user_id);
  }

  @Roles(UsersType.Driver)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Driver decline booking request' })
  @Put('decline-booking/:id')
  decline_booking(@Param('id') id: string, @Request() req) {
    return this.bookingService.decline_booking(id, req.payload.user_id);
  }

  @Roles(UsersType.Driver)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Driver marked as arrived,start_ride,stops' })
  @Put('ride/status')
  RideStatus(@Query() body: RideStatus) {
    return this.bookingService.RideStatus(body);
  }

  @Roles(UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'dispatcher assign drivers' })
  @Put(':id/assign-driver')
  assignADriver(@Param('id') id: string, @Body() payload: AssignDriverDto, @Request() req) {
    return this.bookingService.assignADriver(id, payload, req.payload.user_id);
  }

  @Roles(UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'dispatcher broadcast request' })
  @Put('broadcast/request/:id')
  broadcastRequest(@Param('id') id: string, @Request() req) {
    return this.bookingService.broadCastRequest(id, req.payload);
  }

  @Roles(UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'dispatcher broadcast request' })
  @Put('auto-assign/request/:id')
  autoAssignRequest(@Param('id') id: string, @Request() req) {
    return this.bookingService.autoAssignRequest(id, req.payload);
  }

  @Roles(UsersType.Driver, UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Driver marked as completed the ride' })
  @Put('ride-completed/:id')
  RideCompleted(
    @Param('id') id: string,
    @Query('toll_amount') tollAmount: number,
    @Request() req,
  ) {
    return this.bookingService.Ride_Completed(
      id,
      tollAmount,
      req.payload.user_id,
    );
  }

  @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Customer add tip for driver' })
  @Put('add-tip/:id')
  AddTip(@Param('id') id: string, @Body() body: AddtipDto, @Request() req) {
    return this.bookingService.add_tip(id, body, req, req.payload.user_id);
  }

  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'cancel ride by driver to cancel ride' })
  @Put('cancelled/:id')
  booking_cancelled(
    @Param('id') id: string,
    @Body() body: CancelBookingDto,
    @Request() req,
  ) {
    return this.bookingService.booking_cancelled(id, body, req.payload, req);
  }

  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Marked as booking cancelled' })
  @Put('cancel/request/:id')
  cancel_request(@Param('id') id: string, @Request() req) {
    return this.bookingService.cancel_request(id, req.payload);
  }

  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'confirm recive payment' })
  @Put('recived/payment/:id')
  recived_payment(@Param('id') id: string, @Request() req) {
    return this.bookingService.recived_payment(id, req.payload.user_id);
  }

  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Bookings listing for driver and customer ' })
  @Get('/listing/status')
  booking_listing(@Query() body: BookingStatusDto, @Request() req) {
    return this.bookingService.booking_listing(body, req.payload);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher, StaffRoles.BOOKINGS)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Bookings listing for admin' })
  @Get('/admin/listing')
  AdminBookingListing(@Query() body: findBookingDto) {
    return this.bookingService.AdminBookingListing(body);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher, StaffRoles.BOOKINGS)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Bookings detail for admin' })
  @Get('detail/admin/:id')
  AdminBookingDetail(@Param('id') id: string) {
    return this.bookingService.AdminBookingDetail(id);
  }

  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'update tip and payment type' })
  @Put('update/tip/payment_type')
  update_booking(@Body() body: UpdateTipPaymentTypeDto, @Request() req) {
    return this.bookingService.updateBookingInfo(body, req.payload.user_id);
  }

  @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Check scheule booking' })
  @Get('check/schedule/ride')
  CheckScheduleRide(@Request() req) {
    return this.bookingService.CheckScheduleBooking(req.payload.user_id);
  }

  @Roles(UsersType.Customer)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Check coupon' })
  @Get('check/coupon/:coupon_id')
  CheckCoupon(@Param('coupon_id') coupon_id: string) {
    return this.bookingService.CheckCoupon(coupon_id);
  }

  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'API For - Cancel Ride By Dispatcher' })
  @Put('dispatcher/cancelled/:booking_id')
  cancel_ride_by_dispatcher(@Param('booking_id') booking_id: string, @Request() req: any) {
    return this.bookingService.cancel_ride_by_dispatcher(booking_id, req.payload);
  }

  // @ApiBearerAuth('authorization')
  // @UseGuards(AuthGuard, RolesGuard)
  // @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get available drivers list - available for booking ' })
  @Get('/dispatcher/driver/list')
  listOfDriverForAssinByDispatcher(@Query() dto: DriverListOnDispatcherForAssignDto, @Request() req) {
    return this.bookingService.listOfDriverForAssinByDispatcher(req, dto);
  }

  @ApiOperation({ summary: 'update payment status by deriver ' })
  @Patch('/dispatcher/payment/:booking_id/:status')
  updatePaymentStatusDriver(@Param('booking_id') booking_id: string, @Param('status') status: string) {
    return this.bookingService.updatePaymentStatusDriver(booking_id, status);
  }

  @Roles(UsersType.admin, UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher, StaffRoles.BOOKINGS)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Bookings listing for admin' })
  @Get('/admin/payouts/listing')
  payoutsPaidUnpaidList(@Query() dto: BookingPaidUnpaidListDto) {
    return this.bookingService.payoutsPaidUnpaidList(dto);
  }

  @Get('send/otp/mail')
  sentMail(@Query() body: sendMail) {
    return this.bookingService.SendMAil(body);
  }

  @ApiOperation({ deprecated: true })
  @Post('test')
  push(@Body() body: NotifyDto) {
    let payload = {
      title: "body.title",
      message: "body.description",
    }
    return this.bookingService.notificationTest(body?.fcm_token, payload)
  }
}
