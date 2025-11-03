export class CouponAggregation{
    async AvailableInPhoneMatch(){
        try {
          return {
            $match:{type: 'in-app' }
          }  
        } catch (error) {
            throw error
        }
    }

    async SharedMatch(){
        try {
          return {
            $match:{ type: 'one-time', used_by: { $eq: [] } }
          }  
        } catch (error) {
            throw error
        }
    }

    async SharedusedMatch(){
        try {
          return {
            $match:{type: 'one-time', used_by: { $ne: [] } }
          }  
        } catch (error) {
            throw error
        }
    }

    async AvailableInPhoneproject() {
        try {
          return {
            
              $project: {
                maximum_discount_amount: 1,
                code: 1,
                discount_percentage: 1,
                minimum_booking_amount:1,   
                status:1,
                valid_upto:1

              }
            }
        
        } catch (error) {
          throw error;
        }
      }



async SharedUsedLoopup(){
    return {
      $lookup: {
        from: 'bookings',
        let: { id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$coupon_id', '$$id'] }
            
                ]
              }
            }
          },
          {
            $project: {
              booking_id: 1,
              created_at: 1,
              coupon_discount: 1,
              
            }
          }
        ],
        as: 'booking'
      }
    };
  }

      async SharedUsedproject() {
        try {
          return {
            
              $project: {
                maximum_discount_amount: 1,
                code: 1,
                discount_percentage: 1,
                minimum_booking_amount:1,  
                booking:1 ,
                status:1,
                valid_upto:1,
                date_of_use:1
              }
            }
        
        } catch (error) {
          throw error;
        }
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
