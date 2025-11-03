import * as mongoose from 'mongoose';
export class VehicleAggreagation {
  async match() {
    try {
      return {
        $match: {},
      };
    } catch (error) {}
  }

  async VehicleTypeLookup() {
    try {
      return {
        $lookup: {
          from: 'vehicle_types', // Replace with your actual vehicle details collection
          let: { vehicle_id: '$vehicle_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$$vehicle_id', '$_id'] }],
                },
              },
            },
          ],
          as: 'vehicle_id',
        },
      };
    } catch (error) {}
  }

async unwind_data()  {
    try {
        return{
            $unwind:{
                path:'$vehicle_id',
                preserveNullAndEmptyArrays: true
            }
        }
    } catch (error) {
        throw error
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
                        input: '$vehicle_id.vehicle_type',
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
    } catch (error) {}
  }

  async face_set(option){
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
}
 
