import * as mongoose from 'mongoose';
import { BookingStatus } from 'src/booking/schema/booking.schema';
export class DriverAggregation {
  async match(id: string) {
    try {
      return {
        $match: { _id: new mongoose.Types.ObjectId(id) }

      };
    } catch (error) {
      throw error;
    }
  }

  async DriverVehicleDetailLookup() {
    try {
      return {
        $lookup: {
          from: 'vehicle_details', // Replace with your actual vehicle details collection
          let: { driver_id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$$driver_id', '$driver_id'] }
                    // { $eq: ['$status', 'active'] }, 
                  ],
                },
              },
            },


            {
              $project: {
                vehicle_id: 1,
                name: 1,
                model: 1,
                status: 1,
                number: 1,
                color: 1,
                child_seat_availabilty: 1,
                wheel_chair_availabilty: 1,

              }
            }
          ],
          as: 'vehicleDetails',
        },
      };
    } catch (error) {
      console.error(error);
    }
  }



  async DriverBankLookup() {
    try {
      return {
        $lookup: {
          from: 'banks', // Replace with your actual vehicle details collection
          let: { driver_id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$$driver_id', '$driver_id'] }
                    // { $eq: ['$status', 'active'] }, 
                  ],
                },
              },
            },
            {
              $project: {
                account_number: 1,

              }
            }
          ],
          as: 'bankAccount',
        },
      };
    } catch (error) { }
  }




  async DriverDocumentDetailLookup() {
    try {
      return {
        $lookup: {
          from: 'documentsdetails', // Replace with your actual vehicle details collection
          let: { driver_id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$$driver_id', '$driver_id'] },
                    { $eq: ['$status', 'active'] },
                  ],
                },
              },
            },
            {
              $project: {
                licence_front_image: 1,
                licence_back_image: 1,
                licence_expiry_date: 1
              }
            }
          ],
          as: 'documentsDetails',
        },
      };
    } catch (error) {
      // Handle error
    }
  }


  async unwind_vehicle_detail() {
    try {
      return {
        $unwind: '$vehicleDetails',
        // preserveNullAndEmptyArrays: true

      };
    } catch (error) {
      throw error;
    }
  }

  async unwind_document_detail() {
    try {
      return {
        $unwind: '$documentsDetails',
        // preserveNullAndEmptyArrays: true
      };
    } catch (error) {
      throw error;
    }
  }



  async _drivermatch() {
    try {
      return {
        $match: { is_active: true, is_approved: true, is_deleted: false, is_block: false },
      };
    } catch (error) {
      console.log("error", error);

    }
  }

  async InActiveDriverMatch() {
    try {
      return {
        $match: { is_active: false, is_approved: false, is_deleted: false, is_block: false },
      };
    } catch (error) {
      console.log("error", error);

    }
  }

  async Blockdrivermatch() {
    try {
      return {
        $match: { is_block: true },
      };
    } catch (error) {
      console.log("error", error);

    }
  }

  async Deleteddrivermatch() {
    try {
      return {
        $match: { is_deleted: true },
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
        foreignField: 'driver_id',
        as: 'bookings'
      },
    }
  }

  async AddField() {
    return {
      $addFields: {
        bookingCount: {
          $size: {
            $filter: {
              input: "$bookings",
              as: "booking",
              cond: { $eq: ["$$booking.booking_status", BookingStatus.Completed] } // Use "$$" for the variable
            }
          }
        }
      }
    }
    /*  {
       $addFields: {
         $size: {
           $filter: {
             input: "$bookings",
             as: "booking",
             cond: { $eq: ["$$booking.booking_status", "completed"] }
           }
         }
       }
     } */
  }

  async driverDetailPipeline(driver_id: string) {
    return [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(driver_id) // Match the specific driver
        }
      },
      {
        $lookup: {
          from: 'banks', // Replace with your actual vehicle details collection
          let: { driver_id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$$driver_id', '$driver_id'] }
                    // { $eq: ['$status', 'active'] }, 
                  ],
                },
              },
            },
            {
              $project: {
                account_number: 1,
                bsb_number: 1,

              }
            }
          ],
          as: 'bankAccount',
        }
      },
      {
        $lookup: {
          from: "vehicle_details", // Replace with your actual vehicle details collection
          let: { driver_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        "$$driver_id",
                        "$driver_id"
                      ]
                    },
                    // { $eq: ["$status", "active"] }
                  ]
                }
              }
            },
            {
              $project: {
                _id: 1,

                vehicle_id: 1,
                name: 1,
                model: 1,
                number: 1,
                color: 1,
                child_seat_availabilty: 1,
                wheel_chair_availabilty: 1,
                vehicle_registration_image: 1,
                vehicle_insurance_image: 1,
                insurance_expiry_date: 1,
                registration_expiry_date: 1,
                no_of_childseat: 1,
                status: 1,
                no_of_wheelchair: 1,
                no_of_childcapsule: 1,
                approved_on: 1,
                created_at: 1,
                updated_at: 1,
              }
            }
          ],
          as: "vehicleDetails"
        }
      },
      {
        $lookup: {
          from: "bookings",
          let: { driverId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        "$driver_id",
                        "$$driverId"
                      ]
                    },
                    {
                      $eq: [
                        "$booking_status",
                        "completed"
                      ]
                    }
                  ]
                }
              }
            }
          ],
          as: "bookings"
        }
      },
      {
        $addFields: {
          totalEarnings: {
            $reduce: {
              input: "$bookings",
              initialValue: 0,
              in: {
                $add: [
                  "$$value",
                  "$$this.total_amount"
                ]
              } // Total amount from all bookings
            }
          },
          totalCommission: {
            $reduce: {
              input: "$bookings",
              initialValue: 0,
              in: {
                $add: [
                  "$$value",
                  {
                    $multiply: [
                      "$$this.total_amount",
                      {
                        $divide: ["$commission", 100]
                      }
                    ]
                  } // Commission percentage of total_amount
                ]
              }
            }
          },
          totalGST: {
            $reduce: {
              input: "$bookings",
              initialValue: 0,
              in: { $add: ["$$value", "$$this.gst"] } // Sum of GST
            }
          }
        }
      },
      {
        $addFields: {
          driverEarnings: {
            $subtract: [
              {
                $subtract: [
                  "$totalEarnings",
                  "$totalCommission"
                ]
              },
              "$totalGST"
            ] // Earnings after commission and GST deductions
          }
        }
      },
      {
        $addFields: {
          invoiceTotal: {
            $reduce: {
              input: {
                $filter: {
                  input: "$bookings",
                  as: "booking",
                  cond: {
                    $eq: [
                      "$$booking.payment_method",
                      "invoice"
                    ]
                  }
                }
              },
              initialValue: 0,
              in: {
                $add: [
                  "$$value",
                  "$$this.total_amount"
                ]
              } // Total invoice payments
            }
          }
        }
      },
      {
        $addFields: {
          total_payout: {
            $cond: {
              if: {
                $gt: [
                  "$driverEarnings",
                  "$invoiceTotal"
                ]
              },
              then: {
                $subtract: [
                  "$driverEarnings",
                  "$invoiceTotal"
                ]
              }, // Deduct invoice total if earnings > invoice total
              else: "$driverEarnings" // Keep original earnings
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          image: 1,
          phone: 1,
          country_code: 1,
          is_active: 1,
          is_block: 1,
          abn_number: 1,
          network_name: 1,
          is_deleted: 1,
          is_approved: 1,
          approved_on: 1,
          created_at: 1,
          commission: 1,
          licence_front_image: 1,
          licence_back_image: 1,
          licence_expiry_date: 1,
          total_payout: 1,
          upcoming_payout: 1,
          bookingCount: 1,
          walletbalance: 1,
          vehicleDetails: 1,
          bankAccount: 1,
          block_reason: 1,
          reject_reason: 1,
          totalEarnings: 1,
          totalCommission: 1,
          totalGST: 1,
          driverEarnings: 1,
          invoiceTotal: 1,
          adjustedEarnings: 1
        }
      }
    ]
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

  async bank_detail_lookup() {
    return {
      $lookup: {
        from: 'banks',
        localField: '_id',
        foreignField: 'driver_id',
        as: 'bank'
      },
    }
  }

  async unwind_bank_detail() {
    try {
      return {
        $unwind: {
          path: '$bank',
          preserveNullAndEmptyArrays: true
        }
      };
    } catch (error) {
      throw error;
    }
  }


  async vehicle_detail_lookup() {
    return {
      $lookup: {
        from: 'vehicle_details',
        localField: '_id',
        foreignField: 'driver_id',
        as: 'vehicle_detail'
      },
    }
  }

  async unwind_vehicle_details() {
    try {
      return {
        $unwind: {
          path: '$vehicle_detail',
          preserveNullAndEmptyArrays: true
        }
      };
    } catch (error) {
      throw error;
    }
  }

  async vehicle_type_lookup() {
    return {
      $lookup: {
        from: 'vehicle_types',
        localField: 'vehicle_type_id',
        foreignField: '_id',
        as: 'vehicle_type_detail'
      },
    }
  }

  async unwind_vehicle_type_details() {
    try {
      return {
        $unwind: {
          path: '$vehicle_type_detail',
          preserveNullAndEmptyArrays: true
        }
      };
    } catch (error) {
      throw error;
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

  async face_set_ace(option) {
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
                _id: 1
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
        email: 1,
        image: 1,
        country_code: 1,
        phone: 1,
        is_active: 1,
        is_block: 1,
        is_deleted: 1,
        is_approved: 1,
        bookingCount: 1,
        vehicle_number: { $ifNull: ["$vehicle_detail.number", ""] },
        vehicle_category: { $ifNull: ["$vehicle_type_detail.vehicle_type", ""] },
        number_of_people: { $ifNull: ["$vehicle_detail.no_of_seat", ""] },
        account_number: { $ifNull: ["$bank.account_number", ""] },
        bsb_number: { $ifNull: ["$bank.bsb_number", ""] },
        signup_date: { $ifNull: ["$created_at", ""] }
      }
    };
  }

  async driverRequestprojectFields() {
    return {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        image: 1,
        country_code: 1,
        phone: 1,
        created_at: 1

      }
    };
  }

  async UpdateDocsRequestprojectFields() {
    return {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        image: 1,
        country_code: 1,
        phone: 1,
        updated_at: 1,
        created_at: 1

      }
    };
  }


  async driverprojectFields() {
    return {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        image: 1,
        phone: 1,
        country_code: 1,
        is_active: 1,
        is_block: 1,
        is_deleted: 1,
        is_approved: 1,
        approved_on: 1,
        created_at: 1,
        commission: 1,
        licence_front_image: 1,
        licence_back_image: 1,
        licence_expiry_date: 1,
        total_payout: 1,
        upcoming_payout: 1,
        bookingCount: 1,
        walletbalance: 1,
        // documentsDetails:1,
        vehicleDetails: 1,
        bankAccount: 1,
        block_reason: 1,
        reject_reason: 1
      }
    };

  }


  async total_payout_lookup() {
    return {
      $lookup: {
        from: 'payments',
        let: { driverId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$driver_id', '$$driverId'] },
                  // { $eq: ['$payout_to_driver', 'completed'] },
                  { $eq: ['$status', 'completed'] } // Condition for payout key is completed
                ]
              }
            }
          },
        ],
        as: 'payments'
      }
    };
  }


  async total_payout_AddField() {
    return {
      $addFields: {
        total_payout: { $sum: '$payments.payout_amount' }
      }
    }
  }

  async upcoming_payout_lookup() {
    return {
      $lookup: {
        from: 'payments',
        let: { driverId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$driver_id', '$$driverId'] },
                  { $eq: ['$payout_to_driver', 'pending'] },
                  { $eq: ['$status', 'completed'] }
                ]
              }
            }
          }
        ],
        as: 'Upcoming_payments'
      }
    };
  }


  async upcoming_payout_AddField() {
    return {
      $addFields: {
        upcoming_payout: { $sum: '$Upcoming_payments.payout_amount' }
      }
    }
  }


  async driver_vehicle_detail_match(id) {
    try {
      return {
        $match: { _id: new mongoose.Types.ObjectId(id) }
      }
    } catch (error) {

    }
  }

  //  async vehicle_document_lookup()
  //  {
  //   try {
  //     return{
  //       $lookup: {
  //         from: 'documentsdetails',
  //         localField: '_id',
  //         foreignField: 'vehicle_detail_id',
  //         as: 'DocumentsDetails'
  //       },

  //       }
  //     }
  //    catch (error) {

  //   }
  //  }

  async vehicle_document_lookup() {
    try {
      return {
        $lookup: {
          from: 'documentsdetails', // Replace with your actual vehicle details collection
          let: { vehicle_detail_id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$$vehicle_detail_id', '$vehicle_detail_id'] }
                    // { $eq: ['$status', 'active'] }, 
                  ],
                },
              },
            },
            {
              $project: {
                vehicle_insurance_image: 1,
                vehicle_registration_image: 1,
                insurance_expiry_date: 1,
                registration_expiry_date: 1,
              }
            }
          ],
          as: 'vehicleDetails',
        },
      };
    } catch (error) { }
  }

  async getDriverVehicleDetailAggregation(id) {
    return [
      {
        $match: { _id: new mongoose.Types.ObjectId(id) }
      },
      {
        $lookup: {
          from: 'documentsdetails', // Replace with your actual document detail collection name
          localField: '_id',       // Field from vehicle_detail
          foreignField: 'vehicle_detail_id', // Field from document_detail
          as: 'documentDetails'
        }
      }
    ];
  }

  async _driverRequestmatch() {
    try {
      return {
        $match: { is_approved: null, set_up_profile: true, set_up_vehicle: true, set_up_documents: true, is_doc_update: { $ne: true } },
      };
    } catch (error) {
      console.log("error", error);

    }
  }

  async _driverRequestRejectmatch() {
    try {
      return {
        $match: {
          is_active: true,
          is_approved: false,
          set_up_profile: true,
          set_up_vehicle: true,
          set_up_documents: true
        },
      };
    } catch (error) {
      console.log("error", error);

    }
  }

  async _UpdatedDocsRequestmatch() {
    try {
      return {
        // $match: { is_approved: null, approved_on: { $ne: null }},
        $match: { is_approved: null, is_doc_update: true },
      };
    } catch (error) {
      console.log("error", error);

    }
  }

}
