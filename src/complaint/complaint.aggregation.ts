
import * as mongoose from 'mongoose';

export class ComplaintAggregation{

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
                $match:{}
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

    async  bookingLookup(){
        try {
            return {
                $lookup: {
                    from: 'bookings',
                    let: { booking_id: '$booking_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$$booking_id', '$_id'] }
                                    ]
                                }
                            }
                        },
                        {
                            $project:{
                                _id:1,
                                booking_id:1
                            }
                        }
                    ],
                    as: 'booking'
                }
            };
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }
    
    async  unwind_bookingLookup() {
        try {
            return {
                $unwind:{
                    path:"$booking",
                    preserveNullAndEmptyArrays:true
                }
            }            
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
                    let: { customer_id: '$booking.customer_id' },
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
    async  unwind_driver() {
        try {
            return {
                $unwind:{
                    path:"$driver",
                    preserveNullAndEmptyArrays:true
                }
            }            
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    async  unwind_customer() {
        try {
            return {
                $unwind:{
                    path:"$customer",
                    preserveNullAndEmptyArrays:true
                }
            }            
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
                    let: { driver_id: '$booking.driver_id' },
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

    async project(){
        return{
            $project:{
                title:1,
                message:1,
                booking:1,
                image:1,
                reply:1,
                reply_at:1,
                created_at:1
                
            }
        }
    }

    async ComplaintDetailproject(){
        return{
            $project:{
                title:1,
                message:1,
                booking:1,
                // booking:1,
                image:1,
                reply:1,
                reply_at:1,
                created_at:1

                
            }
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