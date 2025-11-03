export class FaqAggregation{

    async match(status){
        try {
            return{
                $match:{type:status}
            }
        } catch (error) {
            
        }
    }

    async project(){
        try {
            return {
                $project:{
                    question:1,
                    answer:1,
                    created_at:1
                }
            }
        } catch (error) {
            console.error("error",error);
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
                            input: '$question',
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
        } catch (error) {
            throw error
        }
      }
}