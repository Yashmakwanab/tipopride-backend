export class ContentPageAggregation{
    async match(status){
        try {
            return{
                $match:{type:status}
            }
        } catch (error) {
            
        }
    }
}