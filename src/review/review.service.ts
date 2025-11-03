import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { AddReviewDto } from './dto/review.dto';
import { BookingService } from 'src/booking/booking.service';
import { DbService } from 'src/db/db.service';
import { CommonService } from 'src/common/common.service';

@Injectable()
export class ReviewService {
  constructor(
    private readonly bookingService: BookingService,
    private readonly model: DbService,
    private readonly commonService: CommonService
  ) { }

  async create(body: AddReviewDto, payload, req) {
    try {
      let data
      const booking = await this.bookingService.find_booking_with_id(
        body.booking_id,
      );
      if (booking) {
        if (payload.scope === 'customer') {
          data = {
            driver_id: booking.driver_id,
            customer_id: booking.customer_id,
            booking_id: booking._id,
            rate: body.rate,
            description: body.description,
            type: "driver",
            created_at: Date.now()
          };
        } else {
          data = {
            driver_id: booking.driver_id,
            customer_id: booking.customer_id,
            booking_id: booking._id,
            rate: body.rate,
            description: body.description,
            type: "customer",
            created_at: Date.now()
          };
        }
        const add_review = await this.model.reviews.create(data);
        if (payload.scope === "customer") {
          const update_booking = await this.model.booking.updateOne({ _id: body.booking_id }, { rate_by_customer: true })
        } else {
          const update_booking = await this.model.booking.updateOne({ _id: body.booking_id }, { rate_by_driver: true })
        }
        const update_rating_in_driver_and_customer_table = await this.update_rating(
          booking,
          payload,
        );
        let language = req.headers['language'] || 'english';
        const key = 'review_added';
        const localization = await this.commonService.localization(language, key)
        return { message: localization[language] };
      } else {
        throw new HttpException(
          {
            error_code: 'INVALID_BOOKING_ID',
            error_description: 'Invalid booking id ',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async findAll(payload, page, limit) {
    try {
      const skip = (page - 1) * limit;
      let data;
      let total_rating = 0;
      let total_rating_count = 0;
      let data_count
      if (payload.scope === 'driver') {
        data = await this.model.reviews.find({
          driver_id: payload.user_id,
          type: 'driver',
        }).populate([
          { path: 'customer_id' },
          { path: 'driver_id' },

        ]).sort({ created_at: -1 }).skip(skip).limit(limit);;

        data_count = await this.model.reviews.countDocuments({
          driver_id: payload.user_id,
          type: 'driver',
        })

      } else if (payload.scope === 'customer') {
        data = await this.model.reviews.find({
          customer_id: payload.user_id,
          type: 'customer',
        }).populate([
          { path: 'customer_id' },
          { path: 'driver_id' },

        ]).sort({ created_at: -1 }).skip(skip).limit(limit);;

        data_count = await this.model.reviews.countDocuments({
          customer_id: payload.user_id,
          type: 'customer',
        })
      }
      for (const rating of data) {
        total_rating += rating.rate;
        total_rating_count += 1;
      }
      let average_rating = (total_rating / total_rating_count).toFixed(1);
      console.log('average_rating', average_rating);
      console.log('total_rating', total_rating);
      console.log('total_rating_count', total_rating_count);

      return {
        count: data_count,

        overall_rating: average_rating,
        // total_reviews: total_rating_count,
        data: data
      };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async update_rating(booking, payload) {
    try {
      let ratings;
      let total_rating = 0;
      let total_rating_count = 0;
      if (payload.scope === 'customer') {
        ratings = await this.model.reviews.find({
          driver_id: booking.driver_id,
          type: 'driver',
        });
      } else if (payload.scope === 'driver') {
        ratings = await this.model.reviews.find({
          customer_id: booking.customer_id,
          type: 'customer',
        });
      }
      for (const rating of ratings) {
        total_rating += rating.rate;
        total_rating_count += 1;
      }
      console.log("total_rating............................", total_rating);
      console.log("total_rating_count............................", total_rating_count);
      let average_rating = (total_rating / total_rating_count).toFixed(1);
      if (payload.scope === 'customer') {
        console.log("driver_rating...................", average_rating);

        let update = await this.model.drivers.updateOne(
          {
            _id: booking.driver_id,
          },
          {
            ratings: average_rating,
          },
        );
      } else if (payload.scope === 'driver') {

        console.log("customer_rating...................", average_rating);
        let update = await this.model.customers.updateOne(
          {
            _id: booking.customer_id,
          },
          {
            ratings: average_rating,
          },
        );
      }

      console.log('average_rating', average_rating);
      console.log('total_rating', total_rating);
      console.log('total_rating_count', total_rating_count);
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }
}
