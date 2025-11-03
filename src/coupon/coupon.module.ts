import { Module } from '@nestjs/common';
import { CouponService } from './coupon.service';
import { CouponController } from './coupon.controller';
import { CouponAggregation } from './coupon.aggregation';

@Module({
  controllers: [CouponController],
  providers: [CouponService,CouponAggregation],
})
export class CouponModule {}
