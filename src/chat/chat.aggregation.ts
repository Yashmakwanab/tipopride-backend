import { Injectable } from "@nestjs/common";
import { Types } from "mongoose";
import { ChatListDto } from "./dto/chat.dto";

@Injectable()
export class ChatAggregator {

    async getListOfChat(id: string, search: string, skip, limit) {
        try {
            return [
                {
                    "$match": {
                        "$or": [
                            { "receiver": new Types.ObjectId(id) },
                            { "sender": new Types.ObjectId(id) },
                            { "receiver": null }
                        ],
                        "is_exit_chat": false
                    }
                },
                {
                    "$lookup": {
                        "from": "admins",
                        "localField": "sender",
                        "foreignField": "_id",
                        "as": "sender_admin"
                    }
                },
                {
                    "$lookup": {
                        "from": "drivers",
                        "localField": "sender",
                        "foreignField": "_id",
                        "as": "sender_driver"
                    }
                },
                {
                    "$lookup": {
                        "from": "customers",
                        "localField": "sender",
                        "foreignField": "_id",
                        "as": "sender_customer"
                    }
                },
                {
                    "$lookup": {
                        "from": "admins",
                        "localField": "receiver",
                        "foreignField": "_id",
                        "as": "receiver_admin"
                    }
                },
                {
                    "$lookup": {
                        "from": "drivers",
                        "localField": "receiver",
                        "foreignField": "_id",
                        "as": "receiver_driver"
                    }
                },
                {
                    "$lookup": {
                        "from": "customers",
                        "localField": "receiver",
                        "foreignField": "_id",
                        "as": "receiver_customer"
                    }
                },
                {
                    "$addFields": {
                        "sender": {
                            "$concatArrays": ["$sender_admin", "$sender_driver", "$sender_customer"]
                        },
                        "receiver": {
                            "$concatArrays": ["$receiver_admin", "$receiver_driver", "$receiver_customer"]
                        }
                    }
                },
                {
                    "$project": {
                        "sender_admin": 0,
                        "sender_driver": 0,
                        "sender_customer": 0,
                        "receiver_admin": 0,
                        "receiver_driver": 0,
                        "receiver_customer": 0
                    }
                },
                {
                    "$unwind": {
                        "path": "$sender",
                        "preserveNullAndEmptyArrays": true
                    }
                },
                {
                    "$unwind": {
                        "path": "$receiver",
                        "preserveNullAndEmptyArrays": true
                    }
                },
                {
                    "$project": {
                        "_id": 1,
                        "last_message": 1,
                        "updated_at": 1,
                        "created_at": 1,
                        "unread_count": 1,
                        "booking_id": 1,
                        "sender": {
                            "_id": 1,
                            "name": 1,
                            "image": 1,
                            "user_type": 1
                        },
                        "receiver": {
                            "_id": 1,
                            "name": 1,
                            "image": 1,
                            "user_type": 1
                        }
                    }
                },
                {
                    "$lookup": {
                        "from": "chats",
                        "let": { "connection_id": "$_id" },
                        "pipeline": [
                            {
                                "$match": {
                                    "$expr": {
                                        "$and": [
                                            { "$eq": ["$connection_id", "$$connection_id"] },
                                            {
                                                "$or": [
                                                    { "$eq": ["$receiver", new Types.ObjectId(id)] },
                                                    { "$eq": ["$receiver", null] }
                                                ]
                                            },
                                            { "$eq": ["$read", false] }
                                        ]
                                    }
                                }
                            }
                        ],
                        "as": "chats"
                    }
                },
                {
                    "$addFields": {
                        "unread_count": { "$size": "$chats" }
                    }
                },
                {
                    "$project": {
                        "chats": 0
                    }
                },
                {
                    $redact: {
                        $cond: {
                            if: {
                                $or: [
                                    { $eq: [search, undefined] },
                                    {
                                        $regexMatch: {
                                            input: '$sender.name',
                                            regex: search,
                                            options: 'i',
                                        },
                                    },
                                    {
                                        $regexMatch: {
                                            input: '$receiver.name',
                                            regex: search,
                                            options: 'i',
                                        },
                                    },
                                ],
                            },
                            then: '$$KEEP',
                            else: '$$PRUNE',
                        },
                    },
                },
                {
                    $facet: {
                        count: [
                            {
                                $count: "count"
                            },
                        ],
                        data: [
                            {
                                $sort: {
                                    updated_at: -1 as 1 | -1
                                }
                            },
                            {
                                $skip: skip
                            },
                            {
                                $limit: limit
                            }
                        ]
                    }
                }
            ]
            // [
            //     {
            //         $match: {
            //             // $or: [
            //             //     {
            //             //     },
            //             //     {
            //             //         $and: [
            //             //             {
            //             //                 dispatcher_id: null,
            //             //                 customer_id: null
            //             //             }
            //             //         ]
            //             //     }
            //             // ]
            //         }
            //     },
            //     {
            //         $lookup: {
            //             from: "drivers",
            //             let: { driver_id: "$driver_id" },
            //             pipeline: [
            //                 {
            //                     $match: {
            //                         $expr: {
            //                             $and: [
            //                                 { $eq: ["$_id", "$$driver_id"] }
            //                             ]
            //                         }
            //                     }
            //                 },
            //                 {
            //                     $project: {
            //                         name: 1,
            //                         image: 1
            //                     } // Project only the name field
            //                 }
            //             ],
            //             as: "driver_id"
            //         }
            //     },
            //     {
            //         $unwind: {
            //             path: "$driver_id",
            //             preserveNullAndEmptyArrays: true
            //         }
            //     },
            //     {
            //         $lookup: {
            //             from: "customers",
            //             let: { customer_id: "$customer_id" },
            //             pipeline: [
            //                 {
            //                     $match: {
            //                         $expr: {
            //                             $and: [
            //                                 { $eq: ["$_id", "$$customer_id"] }
            //                             ]
            //                         }
            //                     }
            //                 },
            //                 {
            //                     $project: {
            //                         name: 1,
            //                         image: 1
            //                     } // Project only the name field
            //                 }
            //             ],
            //             as: "customer_id"
            //         }
            //     },
            //     {
            //         $unwind: {
            //             path: "$customer_id",
            //             preserveNullAndEmptyArrays: true
            //         }
            //     },
            //     {
            //         $lookup: {
            //             from: "chats",
            //             let: { connection_id: "$_id" },
            //             pipeline: [
            //                 {
            //                     $match: {
            //                         $expr: {
            //                             $and: [
            //                                 {
            //                                     $eq: [
            //                                         "$connection_id",
            //                                         "$$connection_id"
            //                                     ]
            //                                 },
            //                                 { $eq: ["$read", false] }
            //                             ]
            //                         }
            //                     }
            //                 }
            //             ],
            //             as: "chats"
            //         }
            //     },
            //     {
            //         $addFields: {
            //             unread_count: { $size: "$chats" }
            //         }
            //     },
            //     {
            //         $project: {
            //             chats: 0
            //         }
            //     },
            //     {
            //         $redact: {
            //             $cond: {
            //                 if: {
            //                     $or: [
            //                         { $eq: [search, undefined] },
            //                         {
            //                             $regexMatch: {
            //                                 input: '$customer_id.name',
            //                                 regex: search,
            //                                 options: 'i',
            //                             },
            //                         },
            //                         {
            //                             $regexMatch: {
            //                                 input: '$driver_id.name',
            //                                 regex: search,
            //                                 options: 'i',
            //                             },
            //                         },
            //                     ],
            //                 },
            //                 then: '$$KEEP',
            //                 else: '$$PRUNE',
            //             },
            //         },
            //     },
            //     {
            //         $facet: {
            //             count: [
            //                 {
            //                     $count: "count"
            //                 },
            //             ],
            //             data: [
            //                 {
            //                     $sort: {
            //                         updated_at: -1 as 1 | -1
            //                     }
            //                 },
            //                 {
            //                     $skip: skip
            //                 },
            //                 {
            //                     $limit: limit
            //                 }
            //             ]
            //         }
            //     }
            // ]
        } catch (error) {
            throw error
        }
    }
}