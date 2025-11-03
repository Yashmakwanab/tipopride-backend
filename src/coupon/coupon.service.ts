import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateCouponDto, UpdateStatusDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { DbService } from 'src/db/db.service';
import { CouponAggregation } from './coupon.aggregation';
import { CommonService } from 'src/common/common.service';
import * as  moment from 'moment';

@Injectable()
export class CouponService {
  constructor(
    private readonly model: DbService,
    private readonly couponAggregation: CouponAggregation,
    private readonly commonService: CommonService,
  ) { }
  async create(createCouponDto: CreateCouponDto) {
    try {
      if (
        createCouponDto.type != 'one-time' &&
        createCouponDto.type != 'in-app'
      ) {
        throw new HttpException(
          {
            error_code: 'INVALID_TYPE',
            error_description: 'Inavlid type',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      const find_same_name_coupon = await this.model.coupons.findOne({
        code: createCouponDto.code,
      });
      if (find_same_name_coupon) {
        throw new HttpException(
          {
            error_code: 'same_code_coupon_already_added',
            error_description: ' Coupon code already added.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.model.coupons.create(createCouponDto);
      return { message: 'Coupon add successfully' };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async findAll(body) {
    try {
      let options = await this.commonService.set_options(body.page, body.limit);
      let all_coupons = await this.model.coupons.find();
      for (const coupons of all_coupons) {
        let current_date: any = moment().startOf('day').valueOf();
        if (coupons.valid_upto < current_date) {
          await this.model.coupons.updateOne({ _id: coupons._id }, { status: "deactive" })
        }
      }
      let data_to_aggregate = [];
      if (body.status === 'available_on_phone') {
        data_to_aggregate = [
          await this.couponAggregation.AvailableInPhoneMatch(),
          await this.couponAggregation.AvailableInPhoneproject(),
          await this.couponAggregation.face_set(options),
        ];
      } else if (body.status === 'shared') {
        data_to_aggregate = [
          await this.couponAggregation.SharedMatch(),
          await this.couponAggregation.AvailableInPhoneproject(),
          await this.couponAggregation.face_set(options),
        ];
      } else if (body.status === 'shared_used') {
        data_to_aggregate = [
          await this.couponAggregation.SharedusedMatch(),
          await this.couponAggregation.SharedUsedLoopup(),
          await this.couponAggregation.SharedUsedproject(),
          await this.couponAggregation.face_set(options),
        ];
      }
      const data = await this.model.coupons.aggregate(data_to_aggregate).exec();
      return { count: data[0]?.count[0]?.count, data: data[0]?.data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const data = await this.model.coupons.findById({ _id: id });
      return { data: data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async update(id: string, updateCouponDto: UpdateCouponDto) {
    try {
      await this.model.coupons.updateOne(
        { _id: id },
        updateCouponDto,
      );
      return { message: 'Coupon update successfully' };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.model.coupons.deleteOne({ _id: id });
      return { message: 'Coupon delete successfully' };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }


  async update_status(body: UpdateStatusDto) {
    try {
      const coupan = await this.model.coupons.findByIdAndUpdate({ _id: body.id }, { status: body.status })
      if (!coupan) {
        throw new HttpException({ error_code: 'BAD_REQUEST', error_description: 'Something went wrong!!' }, HttpStatus.BAD_REQUEST)
      }
      return { message: "Status updated" }
    } catch (error) {
      console.log("error", error);
      throw error;

    }
  }
}
