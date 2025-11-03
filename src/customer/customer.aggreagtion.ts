import * as mongoose from 'mongoose';
export class CustomerAggregation {


  async match() {
    try {
      return {
        $match: { is_active: true, is_block: false, is_deleted: false, is_email_verify: true },
      };
    } catch (error) {
      console.log("error", error);

    }
  }

  async DeletedCustomermatch() {
    try {
      return {
        $match: { is_deleted: true },
      };
    } catch (error) {
      console.log("error", error);

    }
  }

  async BlockCustomerMatch() {
    try {
      return {
        $match: { is_block: true, is_deleted: false },
      };
    } catch (error) {
      console.log("error", error);

    }
  }

  async booking_count_lookup() {
    return {
      $lookup: {
        from: 'bookings',
        localField: '_id',
        foreignField: 'customer_id',
        as: 'bookings'
      },
    }
  }

  async AddField() {
    return {
      $addFields: {
        bookingCount: { $size: '$bookings' }
      }
    }
  }


  async fillter_data(search: any) {
    try {
      console.log(search);

      return {
        $redact: {
          $cond: {
            if: {
              $and: [
                {
                  $or: [
                    { $eq: [search, undefined] },
                    {
                      $regexMatch: {
                        input: '$name',
                        regex: search,
                        options: 'i',
                      },
                    },
                    {
                      $regexMatch: {
                        input: '$country_code',
                        regex: search,
                        options: 'i',
                      },
                    },
                    {
                      $regexMatch: {
                        input: '$phone',
                        regex: search,
                        options: 'i',
                      },
                    },
                  ],
                },
              ],
            },
            then: '$$KEEP',
            else: '$$PRUNE',
          },
        },
      };
    } catch (error) { }
  }


  async face_set(option) {
    try {
      return {
        $facet: {
          count: [
            {
              $count: "count"
            },
          ],
          data: [
            {
              $sort: {
                _id: -1 as 1 | -1
              }
            },
            {
              $skip: option.skip
            },
            {
              $limit: option.limit
            }
          ]
        }
      }
    } catch (error) {

    }
  }

  async projectFields() {
    return {
      $project: {
        _id: 1,
        name: 1,
        phone: 1,
        country_code: 1,
        email: 1,
        image: 1,
        is_active: 1,
        is_block: 1,
        is_deleted: 1,
        bookingCount: 1
      }
    };
  }

  async customer_match(id) {
    try {
      return {

        $match: { customer_id: new mongoose.Types.ObjectId(id) }

      }
    } catch (error) {
      console.log("error", error);
      throw error;

    }
  }

  async driver_match(id) {
    try {
      return {

        $match: { driver_id: new mongoose.Types.ObjectId(id) }

      }
    } catch (error) {
      console.log("error", error);
      throw error;

    }
  }

  async customer_lookup() {
    try {
      return {
        $lookup: {
          from: 'customers',  // The name of the customers collection
          localField: 'customer_id',
          foreignField: '_id',
          as: 'customer'
        }
      }

    } catch (error) {

    }
  }

  async vehicle_lookup() {
    try {
      return {
        $lookup: {
          from: 'vehicle_types',  // The name of the customers collection
          localField: 'vehicle_id',
          foreignField: '_id',
          as: 'vehicle'
        }
      }

    } catch (error) {

    }
  }

  async driver_lookup() {
    try {

      return {
        $lookup: {
          from: 'drivers',  // The name of the drivers collection
          localField: 'driver_id',
          foreignField: '_id',
          as: 'driver'
        }
      }
    } catch (error) {

    }
  }

  async unwindVehicleData() {
    try {
      return {
        $unwind: {
          path: '$vehicle',
          preserveNullAndEmptyArrays: true  // In case there's no corresponding customer
        }
      }
    } catch (error) {
      throw error
    }
  }

  async unwind__customerdata() {
    try {
      return {
        $unwind: {
          path: '$customer',
          preserveNullAndEmptyArrays: true  // In case there's no corresponding customer
        }
      }
    } catch (error) {
      throw error
    }
  }

  async unwind_driverdata() {
    try {
      return {
        $unwind: {
          path: '$driver',
          preserveNullAndEmptyArrays: true  // In case there's no corresponding driver
        }
      }
    } catch (error) {
      throw error
    }
  }

  async project() {
    return {
      $project: {
        booking_id: 1,
        pickup_address: 1,
        drop_address: 1,
        booking_status: 1,
        total_amount: 1,
        created_at: 1,
        'customer.name': 1,
        'driver.name': 1,
        'vehicle.vehicle_type': 1
      }
    };
  }
}