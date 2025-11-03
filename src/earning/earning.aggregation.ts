import { Types } from "mongoose";

export class EarningAggregation {
  async Todaymatch() {
    try {
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0))

      const startOfTodayhmili = startOfToday.getTime();
      console.log(startOfTodayhmili);
      return {
        $match: { created_at: { $gte: startOfTodayhmili } }
      }
    } catch (error) {
      console.log("error", error);
      throw error;


    }
  }

  async Weekmatch() {
    try {
      const today = new Date();
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfWeekMillis = startOfWeek.getTime();
      return {
        $match: { created_at: { $gte: startOfWeekMillis } }
      }

    } catch (error) {
      console.log("error", error);
      throw error;


    }
  }

  async monthmatch() {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthmili = startOfMonth.getTime();
      console.log("month", startOfMonthmili);

      return {
        $match: { created_at: { $gte: startOfMonthmili } }
      }

    } catch (error) {
      console.log("error", error);
      throw error;


    }
  }

  async Yearmatch() {
    try {
      const today = new Date();
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      startOfYear.setHours(0, 0, 0, 0);
      const startOfYearMilli = startOfYear.getTime();
      console.log("year", startOfYearMilli);

      return {
        $match: { created_at: { $gte: startOfYearMilli } }
      };
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  }




  async DateFilterMatch(start_date, end_date) {
    try {
      console.log("d", start_date);
      console.log("d", end_date);
      return {
        $match: {
          created_at: {
            $gte: start_date,
            $lte: end_date
          }
        }
      }

    } catch (error) {
      console.log("error", error);

    }
  }


  async bookingIdLoopup() {
    return {
      $lookup: {
        from: 'bookings',
        let: { booking_id: '$booking_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$_id', '$$booking_id'] }

                ]
              }
            }
          },
          {
            $lookup: {
              from: 'drivers',
              let: { driver_id: '$driver_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$_id', '$$booking_id'] }

                      ]
                    }
                  }

                }, {
                  $project: { name: 1, country_code: 1, phone: 1 }
                }
              ],
              as: 'driver_id'
            }
          }, { $unwind: { path: '$driver_id', preserveNullAndEmptyArrays: true, } },
          {
            $project: {
              booking_id: 1, driver_id: 1
            }
          }
        ],
        as: 'booking'
      }
    };
  }

  // async driverEarning(driver_id: string, start_date?: number, end_date?: number) {
  //   try {
  //     return [
  //       {
  //         $match: {
  //           ...(start_date && end_date) && {
  //             created_at: {
  //               $gte: +start_date,
  //               $lte: +end_date
  //             }
  //           },
  //           driver_id: new Types.ObjectId(driver_id),
  //           booking_status: "completed"
  //         }
  //       },
  //       {
  //         $lookup: {
  //           from: "drivers",
  //           localField: "driver_id",
  //           foreignField: "_id",
  //           as: "driver_id"
  //         }
  //       },
  //       {
  //         $unwind: {
  //           path: "$driver_id",
  //           preserveNullAndEmptyArrays: false
  //         }
  //       },
  //       {
  //         $group: {
  //           _id: null,
  //           total_bookings: { $sum: 1 }, // Count all bookings
  //           total_tax: { $sum: "$gst" }, // Sum of all taxes
  //           total_amount: { $sum: "$total_amount" }, // Sum of total amounts
  //           app_commission: {
  //             $sum: {
  //               $multiply: [
  //                 "$total_amount",
  //                 { $divide: ["$driver_id.commission", 100] }
  //               ]
  //             }
  //           },
  //           total_invoice_amount: {
  //             $sum: {
  //               $cond: [{ $eq: ["$payment_method", "invoice"] }, "$total_amount", 0]
  //             }
  //           }
  //         }
  //       },
  //       {
  //         $addFields: {
  //           app_commission: {
  //             $round: ["$app_commission", 2]
  //           } // Round to 2 decimal places
  //         }
  //       },
  //       {
  //         $addFields: {
  //           // app_commission: { $round: ["$app_commission", 2] }, // Round app_commission to 2 decimals
  //           app_earning: { $add: ["$app_commission", "$total_tax"] }, // Total app earning = app_commission + tax
  //           driver_earning: { $subtract: ["$total_amount", { $add: ["$app_commission", "$total_tax"] }] } // Driver earning = total_amount - app_earning
  //         }
  //       },
  //       {
  //         $project: {
  //           _id: 0, // Remove `_id` from output
  //           total_bookings: 1,
  //           total_tax: 1,
  //           total_amount: 1,
  //           app_commission: 1,
  //           app_earning: 1,
  //           driver_earning: 1,
  //           total_invoice_amount: 1 // Include total amount for invoice payments
  //         }
  //       }
  //     ]
  //   } catch (error) {
  //     throw error
  //   }
  // }

  async driverEarning(driver_id: string, start_date?: number, end_date?: number) {
    try {
      return [
        {
          $match: {
            ...(start_date && end_date) && {
              created_at: {
                $gte: +start_date,
                $lte: +end_date
              }
            },
            driver_id: new Types.ObjectId(driver_id),
            booking_status: "completed"
          }
        },
        {
          $lookup: {
            from: "drivers",
            localField: "driver_id",
            foreignField: "_id",
            as: "driver_id"
          }
        },
        {
          $unwind: {
            path: "$driver_id",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $group: {
            _id: null,
            total_bookings: { $sum: 1 }, // Count all bookings
            total_tax: { $sum: "$gst" }, // Sum of all taxes
            total_amount: { $sum: "$total_amount" }, // Sum of total amounts
            coupon_discount: { $sum: "$coupon_discount" }, // Sum of total amounts
            app_commission: {
              $sum: {
                $multiply: [
                  "$base_fee",
                  { $divide: ["$driver_id.commission", 100] }
                ]
              }
            },
            total_invoice_amount: {
              $sum: {
                $cond: [{ $eq: ["$payment_method", "invoice"] }, "$total_amount", 0]
              }
            },
            cash_you_have: {
              $sum: {
                $cond: [{ $eq: ["$payment_method", "DTC"] }, "$total_amount", 0]
              }
            }
          }
        },
        {
          $addFields: {
            app_commission: {
              $round: ["$app_commission", 2]
            } // Round to 2 decimal places
          }
        },
        {
          $addFields: {
            // app_commission: { $round: ["$app_commission", 2] }, // Round app_commission to 2 decimals
            app_earning: { $add: ["$app_commission", "$total_tax"] }, // Total app earning = app_commission + tax
            driver_earning: "$amount_for_driver" // Driver earning = total_amount - app_earning
          }
        },
        {
          $project: {
            _id: 0, // Remove `_id` from output
            total_bookings: 1,
            total_tax: 1,
            total_amount: 1,
            app_commission: 1,
            app_earning: 1,
            driver_earning: 1,
            coupon_discount:1,
            cash_you_have:1,
            total_invoice_amount: 1 // Include total amount for invoice payments
          }
        }
      ]
    } catch (error) {
      throw error
    }
  }

  async payountCalculation(driver_id: Types.ObjectId, startOfDay: number) {
    return [
      {
        $match: {
          created_at: {
            $lte: +startOfDay
          },
          is_satteled: false,
          driver_id,
          booking_status: "completed"
        }
      },
      {
        $lookup: {
          from: "drivers",
          localField: "driver_id",
          foreignField: "_id",
          as: "driver_id"
        }
      },
      {
        $unwind: {
          path: "$driver_id",
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $group: {
          _id: null,
          total_bookings: { $sum: 1 }, // Count all bookings
          total_tax: { $sum: "$gst" }, // Sum of all taxes
          total_amount: { $sum: "$total_amount" }, // Sum of total amounts
          app_commission: {
            $sum: {
              $multiply: [
                "$total_amount",
                { $divide: ["$driver_id.commission", 100] }
              ]
            }
          },
          total_invoice_amount: {
            $sum: {
              $cond: [{ $eq: ["$payment_method", "invoice"] }, "$total_amount", 0]
            }
          },
          booking_ids: { $push: "$_id" } // Collect all booking IDs
        }
      },
      {
        $addFields: {
          app_commission: {
            $round: ["$app_commission", 2]
          } // Round app_commission to 2 decimal places
        }
      },
      {
        $addFields: {
          app_earning: { $add: ["$app_commission", "$total_tax"] }, // Total app earning = app_commission + tax
          driver_earning: { $subtract: ["$total_amount", { $add: ["$app_commission", "$total_tax"] }] } // Driver earning = total_amount - app_earning
        }
      },
      {
        $project: {
          _id: 0, // Remove `_id` from output
          total_bookings: 1,
          total_tax: 1,
          total_amount: 1,
          app_commission: 1,
          app_earning: 1,
          driver_earning: 1,
          total_invoice_amount: 1, // Include total amount for invoice payments
          booking_ids: 1 // Include booking IDs
        }
      }
    ]

  }



  async project() {
    return {
      $project: {
        amount: 1,
        payout_amount: 1,
        commision_amount: 1,
        created_at: 1,
        booking: 1,
        // totalEarned:1
      }
    }
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


          total_earning: [
            {
              $group: {
                _id: null,
                total_earning: { $sum: "$commision_amount" }
              }
            },
            {
              $project: {
                total_earning: { $round: ["$total_earning", 2] }
              }
            }
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

  // async totalEarnedAmountfield(){
  //   return{
  //     $addFields: {
  //      totalEarned: { $sum: '$commision_amount' }
  //       }
  // }
  // }
}