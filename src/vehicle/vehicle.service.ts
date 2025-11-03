import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { DbService } from 'src/db/db.service';
import { strict } from 'assert';
import { addVehicleDto } from './dto/vehicle.dto';
import { VehicleAggreagation } from './vehicle.aggregation';
import { CommonService } from 'src/common/common.service';

@Injectable()
export class VehicleService {
  constructor(
    private readonly model: DbService,
    private readonly vehicleAggregation: VehicleAggreagation,
    private readonly commonService: CommonService,
  ) { }

  async findVehicleType() {
    try {
      const data = await this.model.vehicleType.find({},{},
        { sort: { vehicle_type: -1 } }
      );
      return { data: data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async findVehicleTypeAdmin() {
    try {
      let response = []
      const data = await this.model.vehicleType.find({},{},
        { sort: { vehicle_type: -1 } }
      );
      for (const vehicle of data) {
        const vehicle_price = await this.model.vehicle.findOne({ vehicle_id: vehicle._id });
        response.push({
          ...vehicle.toObject(), // Spread vehicle data into the object
          vehicle_price,
        });

      }
      return { data: response };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async findVehicleTypeListing() {
    try {
      let response = []
      let active_vehicle = await this.model.vehicle.find({ is_active: true }, {}, { sort: { passenger: -1 } })
      for (const vehicle of active_vehicle) {

        const data = await this.model.vehicleType.findOne({ _id: vehicle.vehicle_id });
        response.push(
          data
        )
      }

      return { data: response };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async create(createVehicleDto: addVehicleDto) {
    try {
      const same_vehicle_already_active = await this.model.vehicle.findOne({
        vehicle_id: createVehicleDto.vehicle_id,
      });
      if (same_vehicle_already_active) {
        throw new HttpException(
          {
            error_code: 'Vehicle already add',
            error_description: 'Vehicle already add',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.model.vehicle.create(createVehicleDto);
      return {
        message: 'vehicle add successfully',
      };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async findAll(body) {
    try {
      let options = await this.commonService.set_options(body.page, body.limit);
      let data_to_aggregate: any = [
        await this.vehicleAggregation.match(),
        await this.vehicleAggregation.VehicleTypeLookup(),
        await this.vehicleAggregation.unwind_data(),
        await this.vehicleAggregation.fillter_data(body.search),
        await this.vehicleAggregation.face_set(options),
      ];
      const data: any = await this.model.vehicle.aggregate(data_to_aggregate);
      return { count: data[0]?.count[0]?.count, data: data[0]?.data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const data = await this.model.vehicle.findById(id);
      if (data) {
        return data;
      } else {
        throw new HttpException(
          { error_code: 'NOT_FOUND', error_description: 'Vehicle not found' },
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async update(id: string, updateVehicleDto: addVehicleDto) {
    try {
      const update_vehicle = await this.model.vehicle.updateOne(
        { _id: id },
        updateVehicleDto,
      );
      console.log('update', update_vehicle);
      return { message: 'Vehicle update successfully' };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const delete_vehicle = await this.model.vehicle.deleteOne({ _id: id });
      return { message: 'Vehicle delete successfully' };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async find_by_vehicle_name(name: string) {
    try {
      const data = await this.model.vehicle.findOne({ vehicle_name: name });
      return data;
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async bootstrap_for_created_vehicle_type() {
    let fetch_data: any = await this.model.vehicleType.find();

    if (fetch_data.length <= 0) {
      let saveData = [
        { vehicle_type: 'Minibus', image: '', seating_options: [8, 9, 10, 11] },
        { vehicle_type: 'SUV', image: '', seating_options: [5, 6, 7] },
        { vehicle_type: 'Sedan', image: '', seating_options: [4] },
      ];

      let data = await this.model.vehicleType.create(saveData);
    }
  }

  async deactivate(id, status) {
    try {
      let query = {};
      if (status === 'active') {
        query = { is_active: true };
      } else if (status === 'deactive') {
        query = { is_active: false };
      }
      const update = await this.model.vehicle.findByIdAndUpdate({ _id: id }, query, { new: true });
      if (!update) {
        throw new HttpException({ error_description: 'Something went wrong!!', error_code: 'BAD_REQUEST' }, HttpStatus.BAD_REQUEST)
      }
      return { message: 'status update successfully' };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }
}
