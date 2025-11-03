import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AddSurchargeDateDto } from './dto/surcharge.dto';
import { DbService } from 'src/db/db.service';
import * as moment from 'moment';
import { CommonService } from 'src/common/common.service';

@Injectable()
export class SurchargeService {
  constructor(private readonly model: DbService) { }
  async create(body: AddSurchargeDateDto) {
    try {
      if (body.type === 'date_time') {

        const { date, start_time, end_time } = body;

        const already_exist = await this.model.surchargeDates.findOne({
          date: date,
          $or: [
            {
              start_time: { $lt: end_time },
              end_time: { $gt: start_time },
            },
          ],
        });
        console.log("date", already_exist);
        console.log("body", body);


        if (already_exist) {
          throw new HttpException(
            {
              error_code: 'ALREADY_EXIST',
              error_description: 'Overlapping date and time range',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      else {
        const already_exist = await this.model.surchargeDates.findOne({ vehicle_id: body.vehicle_id });
        console.log("date", already_exist);
        console.log("body", body);


        if (already_exist) {
          throw new HttpException(
            {
              error_code: 'ALREADY_EXIST',
              error_description: 'This vehicle type has already been added.',
            },
            HttpStatus.BAD_REQUEST,
          );
        }


      }


      const add_date = await this.model.surchargeDates.create(body);
      return { message: 'Surcharge date successfully add' };

    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }


  // async findAll() {
  //   try {

  //     const start_of_day = moment().startOf('day').subtract(5,"hour").subtract(30,"minute").valueOf()
  //  console.log("Date....",start_of_day);
  //  const current_time = moment().valueOf();
  //  console.log("Current Time:", current_time);
  //     const data = await this.model.surchargeDates.find().sort({ date: 1 });

  //     // Iterate over each item and delete past entries
  //     for (const item of data) {
  //       const itemDateMilliseconds = new Date(item.date).getTime();
  //       const itemEndTime = itemDateMilliseconds + moment.duration(item.end_time).asMilliseconds();

  //       // console.log('startOfDayMilliseconds:', startOfDayMilliseconds);
  //       console.log('itemDateMilliseconds:', itemDateMilliseconds);
  //       console.log('itemEndTime:', itemEndTime);

  //       // Check if the date is in the past or if the date is today and the end_time has passed
  //       if (
  //         itemDateMilliseconds < start_of_day || 
  //         (itemDateMilliseconds === start_of_day && itemEndTime <  current_time)
  //       ) {
  //         await this.model.surchargeDates.deleteOne({ _id: item._id });
  //       }
  //     }

  //     // Fetch the remaining dates after deletion
  //     const updatedData = await this.model.surchargeDates.find().sort({ date: 1 });

  //     return { data: updatedData };
  //   } catch (error) {
  //     console.log('error', error);
  //     throw error;
  //   }
  // }


  async findAll(status) {
    try {
      let surcharge_data
      if (status === 'date_time') {

        // Start of the day with time zone offset
        const start_of_day = moment().startOf('day').subtract(5, "hour").subtract(30, "minute").valueOf();
        console.log("Start of Day:", start_of_day);

        // Current time
        const current_time = moment().valueOf();
        console.log("Current Time:", current_time);

        const data = await this.model.surchargeDates.find({ type: status }).sort({ date: 1 });

        // Iterate over each item and delete past entries
        for (const item of data) {
          const itemDateMilliseconds = new Date(item.date).getTime();
          const itemEndTime = itemDateMilliseconds + moment.duration(item.end_time).asMilliseconds();

          console.log('itemDateMilliseconds:', itemDateMilliseconds);
          console.log('itemEndTime:', itemEndTime);

          // Check if the date is in the past or if the date is today and the end_time has passed
          if (
            itemDateMilliseconds < start_of_day ||
            (itemDateMilliseconds >= start_of_day && itemEndTime < current_time)
          ) {
            await this.model.surchargeDates.deleteOne({ _id: item._id });
          }
        }

        surcharge_data = await this.model.surchargeDates.find({ type: status }).sort({ date: 1 });
      }
      else {
        surcharge_data = await this.model.surchargeDates.find({ type: status }).sort({ date: 1 }).populate([{ path: 'vehicle_id' }]);
      }


      // Fetch the remaining dates after deletion
      return { data: surcharge_data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }





  async findOne(id: string) {
    try {
      const data = await this.model.surchargeDates.findOne({ _id: id });
      return { data: data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async update(id: string, body: AddSurchargeDateDto) {
    try {
      const data = await this.model.surchargeDates.updateOne({ _id: id }, body);
      return { message: 'Surcharge date update successfully' };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const data = await this.model.surchargeDates.deleteOne({ _id: id });
      return { message: 'Surcharge date delete successfully' };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }


  async ActiveSurchargeHistory(page, limit) {
    try {
      console.log("cdsfdsfsd");

      let data = await this.model.surchargeHistory.find().sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit).populate([{ path: "vehicle_id" }])

      return { data: data }
    } catch (error) {
      console.log("error", error);
      throw error

    }
  }

}
