import * as mongoose from 'mongoose';
export class ContactUsAggregation{
   
    async Match(id){
        try {
            return{
                
        $match: { _id: new mongoose.Types.ObjectId(id)} 
            }
        } catch (error) {
            console.log("error",error);
            throw error
            
            
        }
    }
   
    async pendingMatch(){
        try {
            return{
                $match:{reply:null}
            }
        } catch (error) {
            console.log("error",error);
            throw error
            
            
        }
    }

    async repliedMatch(){
        try {
            return {
                $match: { reply: { $ne: null } }
            };
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }


    async  customerLookup(){
        try {
            return {
                $lookup: {
                    from: 'customers',
                    let: { customer_id: '$user_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$$customer_id', '$_id'] }
                                    ]
                                }
                            }
                        },
                        {
                            $project:{
                                name:1
                            }
                        }
                    ],
                    as: 'customer'
                }
            };
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }
    

    async  driverLookup(){
        try {
            return {
                $lookup: {
                    from: 'drivers',
                    let: { driver_id: '$user_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$$driver_id', '$_id'] }
                                    ]
                                }
                            }
                        },
                        {
                            $project:{
                                name:1
                            }
                        }
                    ],
                    as: 'driver'
                }
            };
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async unwind_driver(){
        try {
            return{
                $unwind:{
                    path:"$driver",
                    preserveNullAndEmptyArrays:true
                }
            }
        } catch (error) {
            throw error
        }
    }

    async unwind_customer(){
        try {
            return{
                $unwind:{
                    path:"$customer",
                    preserveNullAndEmptyArrays:true
                }
            }
        } catch (error) {
            throw error
        }
    }

    async project(){

        try {
            return{
                $project:{
                    customer:1,
                    driver:1,
                    created_at:1
                }
            }
        } catch (error) {
            
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

      async ContactDetailproject(){
try {
    return{
$project:{
    customer:1,
    driver:1,
    message:1,
    created_at:1,
    reply:1,
    reply_at:1
}
    }
} catch (error) {
    throw error
}
      }
}