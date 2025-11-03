import e from 'express';
import * as mongoose from 'mongoose';
import { RideStatus } from 'src/booking/dto/booking.dto';
export class AdminAggregation {
  async match() {
    try {
      return {
        $match: { is_active: true, is_block: false, is_deleted: false }
      }
    } catch (error) {
      throw error
    }

  }
  async drivermatch() {
    try {
      return {
        $match: { is_active: true, is_approved: true, is_deleted: false, is_block: false }
      }
    } catch (error) {
      throw error
    }

  }


  async selectedmatch(ids) {
    try {
      console.log("Selected IDs:", ids);
      const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));

      return {
        $match: { _id: { $in: objectIds }, email: { $ne: null } }
      };
    } catch (error) {
      throw error;
    }
  }

  async SessionLookup() {
    try {
      return {
        $lookup: {
          from: 'sessions',
          let: { user_id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$$user_id', '$user_id'] },

                  ],
                },
              },
            },
            {
              $project: {
                fcm_token: 1
              }
            }
          ],
          as: 'sessions',
        },
      };
    } catch (error) {
      throw error;
    }
  }


  async project() {
    try {
      return {
        $project: {
          email: 1,
          sessions: 1
        }
      }
    } catch (error) {
      throw error
    }
  }

  async bookingoverallmatch() {
    try {
      return {
        $match: { booking_status: { $ne: null } }
      }
    } catch (error) {
      throw error
    }

  }

  async bookingTodaymatch() {
    try {
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0))
      const startOfTodayMiliSecond = startOfToday.getTime();
      return {
        $match: { booking_status: { $ne: null }, created_at: { $gte: startOfTodayMiliSecond } }
      }
    } catch (error) {
      throw error
    }

  }


  async bookingWeekmatch() {
    try {
      const today = new Date();
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfWeekMillis = startOfWeek.getTime();

      return {
        $match: { booking_status: { $ne: null }, created_at: { $gte: startOfWeekMillis } }
      }
    } catch (error) {
      throw error
    }

  }


  async bookingMonthmatch() {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthMillis = startOfMonth.getTime();
      return {
        $match: {
          booking_status: { $ne: null }, created_at: { $gte: startOfMonthMillis }
        }
      }
    } catch (error) {
      throw error
    }

  }


  async Customersoverallmatch() {
    try {
      return {
        $match: { is_email_verify: true, is_active: true, is_block: false }
      }
    } catch (error) {
      throw error
    }

  }
  async CustomerTodaymatch() {
    try {
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0))
      const startOfTodayMiliSecond = startOfToday.getTime();
      return {
        $match: { is_email_verify: true, created_at: { $gte: startOfTodayMiliSecond } }
      }
    } catch (error) {
      throw error
    }

  }

  async CustomerWeekmatch() {
    try {
      const today = new Date();
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfWeekMillis = startOfWeek.getTime();

      return {
        $match: { is_email_verify: true, created_at: { $gte: startOfWeekMillis } }
      }
    } catch (error) {
      throw error
    }

  }

  async CustomerMonthmatch() {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthMillis = startOfMonth.getTime();
      return {
        $match: {
          is_email_verify: true, created_at: { $gte: startOfMonthMillis }
        }
      }
    } catch (error) {
      throw error
    }

  }

  async Driversoverallmatch() {
    try {
      return {

        $match: {
          is_active: true, is_approved: true, is_deleted: false, is_block: false
        }


      }
    } catch (error) {
      throw error
    }

  }

  async DriverWeekmatch() {
    try {
      const today = new Date();
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfWeekMillis = startOfWeek.getTime();

      return {
        $match: { is_approved: true, created_at: { $gte: startOfWeekMillis } }
      }
    } catch (error) {
      throw error
    }

  }

  async DriverTodaymatch() {
    try {
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0))
      const startOfTodayMillis = startOfToday.getTime();
      return {
        $match: { is_approved: true, created_at: { $gte: startOfTodayMillis } }
      }
    } catch (error) {
      throw error
    }

  }
  async DriverMonthMatch() {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthMillis = startOfMonth.getTime();
      return {
        $match: {
          is_approved: true, created_at: { $gte: startOfMonthMillis }
        }
      }
    } catch (error) {
      throw error
    }

  }

  async DriverIdleMatch() {
    try {
      return {
        $match: {
          is_approved: true, status: "online", ride_status: "free"
        }
      }
    } catch (error) {
      throw error
    }

  }

  async DriverOnRideMatch() {
    try {
      return {
        $match: {
          is_approved: true, status: "online", ride_status: "busy"
        }
      }
    } catch (error) {
      throw error
    }

  }
  async DriverOfflineMatch() {
    try {
      return {
        $match: {
          is_approved: true, status: "offline",
        }
      }
    } catch (error) {
      throw error
    }

  }

  async DriverRequestsOverallMatch() {
    try {
      return {
        $match: { is_approved: null, is_active: true, approved_on: null, set_up_profile: true, set_up_vehicle: true, set_up_documents: true }
      }
    } catch (error) {
      throw error
    }

  }

  async DriverRequestTodaymatch() {
    try {
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0))
      const startOfTodayMillis = startOfToday.getTime();
      return {
        $match: { is_approved: null, is_active: true, approved_on: null, set_up_profile: true, set_up_vehicle: true, set_up_documents: true, created_at: { $gte: startOfTodayMillis } }
      }
    } catch (error) {
      throw error
    }

  }

  async DriverRequestWeekmatch() {
    try {
      const today = new Date();
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfWeekMillis = startOfWeek.getTime();

      return {
        $match: { is_approved: null, is_active: true, approved_on: null, set_up_profile: true, set_up_vehicle: true, set_up_documents: true, created_at: { $gte: startOfWeekMillis } }
      }
    } catch (error) {
      throw error
    }

  }

  async DriverRequestMonthMatch() {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthMillis = startOfMonth.getTime();
      return {
        $match: {
          is_approved: null, is_active: true, approved_on: null, set_up_profile: true, set_up_vehicle: true, set_up_documents: true, created_at: { $gte: startOfMonthMillis }
        }
      }
    } catch (error) {
      throw error
    }

  }

  async Docs_update_request_overallmatch() {
    try {
      return {
        $match: { is_approved: null, is_doc_update: true }
      }
    } catch (error) {
      throw error
    }

  }

  async Docs_update_RequestWeekmatch() {
    try {
      const today = new Date();
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfWeekMillis = startOfWeek.getTime();

      return {
        $match: { is_approved: null, is_doc_update: true, created_at: { $gte: startOfWeekMillis } }
      }
    } catch (error) {
      throw error
    }

  }

  async Today_Docs_Updated_RequestTodaymatch() {
    try {
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0));
      const startOfTodayMillis = startOfToday.getTime();
      return {
        $match: { is_approved: null, is_doc_update: true, created_at: { $gte: startOfTodayMillis } }
      }
    } catch (error) {
      throw error
    }

  }
  async Monthly_Docs_Updated_RequestMatch() {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthMillis = startOfMonth.getTime();
      return {
        $match: {
          is_approved: null, is_doc_update: true, created_at: { $gte: startOfMonthMillis }
        }
      }
    } catch (error) {
      throw error
    }

  }

  async Earningsoverallmatch() {
    try {
      return {
        $match: {}
      }
    } catch (error) {
      throw error
    }

  }

  async todayEarningsoverallmatch() {
    try {
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0))
      const startOfTodayMillis = startOfToday.getTime();
      return {
        $match: { created_at: { $gte: startOfTodayMillis } }
      }
    } catch (error) {
      throw error
    }

  }

  async weekEarningsoverallmatch() {
    try {
      const today = new Date();
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfWeekMillis = startOfWeek.getTime();
      return {
        $match: { created_at: { $gte: startOfWeekMillis } }
      }
    } catch (error) {
      throw error
    }

  }

  async monthlyEarningsoverallmatch() {
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
      throw error
    }

  }

  async TodayEarningMatch() {
    try {
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0))

      const startOfMonthmili = startOfToday.getTime();
      console.log(startOfMonthmili);
      return {
        $match: { created_at: { $gte: startOfMonthmili } }
      }
    } catch (error) {
      throw error
    }

  }

  async PendingComplaintmatch() {
    try {
      return {
        $match: { status: "pending" }
      }
    } catch (error) {
      throw error
    }

  }
  async RepliedComplaintmatch() {
    try {
      return {
        $match: { status: "replied" }
      }
    } catch (error) {
      throw error
    }

  }


  async face_set() {
    try {
      return {
        $facet: {

          total_earning: [

            {
              $group: {
                _id: null,
                total_earning: { $sum: "$commision_amount" }
              }
            }
          ],

        }
      }
    } catch (error) {

    }
  }

  async face_set_DueToApp() {
    try {
      return {
        $facet: {

          total_earning: [

            {
              $group: {
                _id: null,
                total_earning: { $sum: "$amount" }
              }
            }
          ],

        }
      }
    } catch (error) {

    }
  }

  async DueToDrivermatch() {
    try {
      return {
        $match: {}
      }
    } catch (error) {
      throw error
    }

  }

  async monthlyDueToAppmatch() {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthmili = startOfMonth.getTime();
      console.log("month", startOfMonthmili);

      return {
        $match: {
          payout_to_driver: "pending",
          payment_type: "cash", created_at: { $gte: startOfMonthmili }
        }
      }
    } catch (error) {
      throw error
    }

  }


  async weekDueToAppmatch() {
    try {
      const today = new Date();
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfWeekMillis = startOfWeek.getTime();
      return {
        $match: {
          payout_to_driver: "pending",
          payment_type: "cash", created_at: { $gte: startOfWeekMillis }
        }
      }
    } catch (error) {
      throw error
    }

  }


  async yearDueToAppmatch() {
    try {
      const today = new Date();
      const startOfYear = new Date(today.getFullYear(), 0, 1); // January 1st of the current year
      startOfYear.setHours(0, 0, 0, 0); // Set to the start of the day
      const startOfYearMili = startOfYear.getTime(); // Start of the year in milliseconds
      const todayMili = today.getTime(); // Current date and time in milliseconds

      console.log("Start of Year:", startOfYearMili);
      console.log("Today:", todayMili);

      return {
        $match: {
          payout_to_driver: "pending",
          payment_type: "cash",
          created_at: { $gte: startOfYearMili, $lte: todayMili }
        }
      };
    } catch (error) {
      throw error;
    }
  }


  async monthlyTax() {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthmili = startOfMonth.getTime();
      console.log("month", startOfMonthmili);

      return {
        $match: {
          payout_to_driver: "pending",
          payment_type: "cash", created_at: { $gte: startOfMonthmili }
        }
      }
    } catch (error) {
      throw error
    }

  }

  async yearTax() {
    try {
      const today = new Date();
      const startOfYear = new Date(today.getFullYear(), 0, 1); // January 1st of the current year
      startOfYear.setHours(0, 0, 0, 0); // Set to the start of the day
      const startOfYearMili = startOfYear.getTime(); // Start of the year in milliseconds
      const todayMili = today.getTime(); // Current date and time in milliseconds

      console.log("Start of Year:", startOfYearMili);
      console.log("Today:", todayMili);

      return {
        $match: {
          created_at: { $gte: startOfYearMili, $lte: todayMili }
        }
      };
    } catch (error) {
      throw error;
    }
  }


}