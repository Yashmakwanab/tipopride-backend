import * as mongoose from 'mongoose';
export class BookingAggregation {
  async match(id) {
    return {
      $match: { _id: new mongoose.Types.ObjectId(id) },
    };
  }

  async bookingReviewLookup() {
    try {
      return {
        $lookup: {
          from: 'reviews', // Replace with your actual vehicle details collection
          let: { booking_id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$$booking_id', '$booking_id'] }],
                },
              },
            },
          ],
          as: 'reviews',
        },
      };
    } catch (error) { }
  }

  async unwind_review_detail() {
    try {
      return {
        $unwind: '$reviews',
      };
    } catch (error) {
      throw error;
    }
  }

  async customerNameLookup() {
    try {
      return {
        $lookup: {
          from: 'customers', // The collection name for customers
          let: { customerId: '$customer_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$_id', '$$customerId'] }],
                },
              },
            },
            {
              $project: { name: 1, phone: 1, country_code: 1, temp_phone: 1, temp_country_code: 1, temp_email: 1, email: 1 }, // Project only the name field
            },
          ],
          as: 'customer_id',
        },
      };
    } catch (error) {
      console.error('Error in customerNameLookup:', error);
      throw error;
    }
  }

  async customer_unwind() {
    return {
      $unwind: {
        path: '$customer_id',
        preserveNullAndEmptyArrays: true,
      },
    };
  }

  async companyNameLookup() {
    try {
      return {
        $lookup: {
          from: 'companies', // The collection name for customers
          let: { companyId: '$company_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$_id', '$$companyId'] }],
                },
              },
            },
            // {
            //   $project: { name: 1,phone:1,country_code:1 }, // Project only the name field
            // },
          ],
          as: 'company_id',
        },
      };
    } catch (error) {
      console.error('Error in customerNameLookup:', error);
      throw error;
    }
  }

  async Company_unwind() {
    return {
      $unwind: {
        path: '$company_id',
        preserveNullAndEmptyArrays: true,
      },
    };
  }

  async dispatcherNameLookup() {
    try {
      return {
        $lookup: {
          from: 'admins', // The collection name for customers
          let: { dispatcher_id: '$dispatcher_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$_id', '$$dispatcher_id'] }],
                },
              },
            },
            {
              $project: { name: 1 }, // Project only the name field
            },
          ],
          as: 'dispatcher_id',
        },
      };
    } catch (error) {
      console.error('Error in customerNameLookup:', error);
      throw error;
    }
  }

  async dispatcher_unwind() {
    return {
      $unwind: {
        path: '$dispatcher_id',
        preserveNullAndEmptyArrays: true,
      },
    };
  }

  async AssignedNameLookup() {
    try {
      return {
        $lookup: {
          from: 'admins', // The collection name for customers
          let: { assigned_by: '$assigned_by' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$_id', '$$assigned_by'] }],
                },
              },
            },
            {
              $project: { name: 1 }, // Project only the name field
            },
          ],
          as: 'assigned_by',
        },
      };
    } catch (error) {
      console.error('Error in customerNameLookup:', error);
      throw error;
    }
  }

  async Assigned_unwind() {
    return {
      $unwind: {
        path: '$assigned_by',
        preserveNullAndEmptyArrays: true,
      },
    };
  }

  async driverNameLookup() {
    try {
      return {
        $lookup: {
          from: 'drivers', // The collection name for customers
          let: { driverId: '$driver_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$_id', '$$driverId'] }],
                },
              },
            },
            {
              $project: { name: 1, email: 1 }, // Project only the name field
            },
          ],
          as: 'driver_id',
        },
      };
    } catch (error) {
      console.error('Error in driverNameLookup:', error);
      throw error;
    }
  }
  async driver_unwind() {
    return {
      $unwind: {
        path: '$driver_id',
        preserveNullAndEmptyArrays: true,
      },
    };
  }

  async vehicleNameLookup() {
    try {
      return {
        $lookup: {
          from: 'vehicle_details', // The collection name for customers
          let: { id: '$vehicleDetail_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$_id', '$$id'] }],
                },
              },
            },
            // {
            //     $project: { number: 1 } // Project only the name field
            // }
          ],
          as: 'vehicleDetail_id',
        },
      };
    } catch (error) {
      console.error('Error in vehicleNameLookup:', error);
      throw error;
    }
  }

  async vehicleTypeLookup() {
    try {
      return {
        $lookup: {
          from: 'vehicle_types', // The collection name for customers
          let: { id: '$vehicle_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$_id', '$$id'] }],
                },
              },
            },
            // {
            //     $project: { number: 1 } // Project only the name field
            // }
          ],
          as: 'vehicle_id',
        },
      };
    } catch (error) {
      console.error('Error in vehicleNameLookup:', error);
      throw error;
    }
  }
  async vehicle_unwind() {
    return {
      $unwind: {
        path: '$vehicleDetail_id',
        preserveNullAndEmptyArrays: true,
      },
    };
  }

  async CouponDetailLookup() {
    try {
      return {
        $lookup: {
          from: 'coupons', // The collection name for customers
          let: { id: '$coupon_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$_id', '$$id'] }],
                },
              },
            },

            {
              $project: {
                type: 1,
                code: 1,
                discount_percentage: 1,
                maximum_discount_amount: 1,
              }, // Project only the name field
            },
          ],
          as: 'coupon_id',
        },
      };
    } catch (error) {
      console.error('Error in vehicleNameLookup:', error);
      throw error;
    }
  }

  async getBookingRequirementFilter(booking: any) {
    const filter: Record<string, any> = {};

    console.log('booking.handbags', booking.handbags)
    console.log('booking.luggage', booking.luggage)
    console.log('booking.passenger', booking.passenger)

    if (booking?.handbags) {
      filter["vehiclesprices.handbags"] = { $gte: booking.handbags };
    }
    if (booking?.luggage) {
      filter["vehiclesprices.luggage"] = { $gte: booking.luggage };
    }
    if (booking?.passenger) {
      filter["vehiclesprices.passenger"] = { $gte: booking.passenger };
    }

    return filter;
  }

  async lookupVehiclePricesStage() {
    return {
      $lookup: {
        from: 'vehiclesprices',
        let: { id: '$vehicle_type_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$vehicle_id', '$$id'] }
            }
          },
          {
            $project: {
              handbags: 1,
              luggage: 1,
              passenger: 1,
            }
          }
        ],
        as: 'vehiclesprices'
      }
    };
  }

  async lookupVehicleTypeStage() {
    return {
      $lookup: {
        from: 'vehicle_types',
        let: { id: '$vehicle_type_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$_id', '$$id'] }
            }
          },
          {
            $project: {
              _id: 1,
              vehicle_type: 1,
              image: 1
            }
          }
        ],
        as: 'vehicle_types'
      }
    };
  }

  async lookupVehicleDetails() {
    return {
      $lookup: {
        from: 'vehicle_details',
        let: { id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$driver_id', '$$id'] },
                  { $eq: ['$status', 'active'] }
                ]
              }
            }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              model: 1,
              number: 1
            }
          }
        ],
        as: 'vehicle_details'
      }
    };
  }


}