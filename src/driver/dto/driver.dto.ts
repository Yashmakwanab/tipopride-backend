import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateLocationDto {
    @ApiProperty()
    latitude: string

    @ApiProperty()
    longitude: string

    @ApiProperty()
    heading: string

    @ApiProperty()
    token: string

}
export class near_rides_dto {
    @ApiProperty()
    latitude: string

    @ApiProperty()
    longitude: string


}

export class driver_location_dto {
    @ApiProperty()
    id: string




}

export class EditCommission {
    @ApiProperty()
    id: string
    @ApiProperty()
    commission: number
}

export class payoutTransactionHistory {
    @ApiProperty()
    driver_id: string

    @ApiProperty()
    page: number

    @ApiProperty()
    limit: number
}

export class AvailablilityCheckDto {
    @ApiProperty()
    pick_up_lat: string;

    @ApiProperty()
    pick_up_long: string;

    @ApiProperty()
    drop_lat: string;

    @ApiProperty()
    drop_long: string;
}


export class vehicleDetailDto {
    @ApiProperty()
    vehicle_id: string

    @ApiProperty()
    name: string

    @ApiProperty()
    model: string

    @ApiProperty()
    number: string

    @ApiProperty()
    color: string

    @ApiProperty()
    no_of_seat: string

    @ApiProperty()
    vehicle_photo: string

    @ApiProperty()
    child_seat_availabilty: boolean

    @ApiProperty()
    wheel_chair_availabilty: boolean

    @ApiProperty()
    child_capsule_availabilty: boolean
    @ApiProperty()
    vehicle_insurance_image: string

    @ApiProperty()
    vehicle_registration_image: string

    @ApiProperty()
    no_of_childseat: number

    @ApiProperty()
    no_of_wheelchair: number

    @ApiProperty()
    no_of_childcapsule: number

}

export class EditvehicleDetailDto {
    @ApiProperty()
    vehicle_detail_id: string

    @ApiProperty()
    vehicle_id: string

    @ApiProperty()
    name: string

    @ApiProperty()
    model: string

    @ApiProperty()
    number: string

    @ApiProperty()
    no_of_seat: number

    @ApiProperty()
    color: string

    @ApiProperty()
    vehicle_photo: string

    @ApiProperty()
    no_of_childseat: number

    @ApiProperty()
    no_of_wheelchair: number

    @ApiProperty()
    no_of_childcapsule: number

    @ApiProperty()
    child_seat_availabilty: boolean

    @ApiProperty()
    wheel_chair_availabilty: boolean
    @ApiProperty()
    child_capsule_availabilty: boolean
    @ApiProperty()
    vehicle_insurance_image: string

    @ApiProperty()
    vehicle_registration_image: string

    @ApiProperty()
    edit_items: string[]

}

export class DocumentDetailDto {

    @ApiProperty()
    vehicle_detail_id: string

    @ApiProperty()
    licence_front_image: string

    @ApiProperty()
    licence_back_image: string

    @ApiProperty()
    vehicle_insurance_image: string

    @ApiProperty()
    vehicle_registration_image: string

}

export class licence_update {


    @ApiProperty()
    licence_front_image: string

    @ApiProperty()
    licence_back_image: string



}


export class DriverStatusDto {
    @ApiProperty()
    status: string
}
export class findDriverDto {

    @ApiProperty({
        default: 'active',
        enum: ['active', 'in-active', 'block', 'deleted']
    })
    status: 'active' | 'in-active' | 'block' | 'deleted' = 'deleted';

    @ApiPropertyOptional()
    search?: string;

    @ApiProperty()
    page: number

    @ApiProperty()
    limit: number
}

export class exportDriverDto {

    @ApiProperty({
        default: 'active',
        enum: ['active', 'in-active', 'block', 'deleted']
    })
    status: 'active' | 'in-active' | 'block' | 'deleted' = 'deleted';

    @ApiPropertyOptional()
    search?: string;
}

export class findDriverRequestDto {

    @ApiProperty({
        default: 'pending',
        enum: ['pending', 'reject']
    })
    status: 'pending' | 'reject' = 'reject';

    @ApiPropertyOptional()
    search?: string;

    @ApiProperty()
    page: number

    @ApiProperty()
    limit: number
}

export class DocUpdateDto {



    @ApiPropertyOptional()
    search?: string;

    @ApiProperty()
    page: number

    @ApiProperty()
    limit: number
}
export class UpdateDriverRequestDto {

    @ApiProperty()
    id: string;

    @ApiProperty({
        default: 'accept',
        enum: ['accept', 'decline']
    })
    status: 'accept' | 'decline' = 'accept';

    @ApiPropertyOptional()
    reason: string
}


export class UpdateDriverStatusDto {

    @ApiProperty()
    id: string

    @ApiProperty({
        default: 'deactive',
        enum: ['active', 'deactive']
    })
    status: 'active' | 'deactive' = 'active';

    @ApiPropertyOptional()
    reason: string

}

export class UpdateDriverBlockStatusDto {

    @ApiProperty()
    id: string

    @ApiProperty({
        default: 'block',
        enum: ['block', 'unblock']
    })
    status: 'block' | 'unblock' = 'block';

    @ApiPropertyOptional()
    reason: string

}


export class SetExpiryDateDto {
    @ApiProperty()
    vehicle_detail_id: string

    @ApiProperty()
    licence_expiry_date: number

    @ApiProperty()
    insurance_expiry_date: number

    @ApiProperty()
    registration_expiry_date: number
}

export class driverVehicleListingDto {
    @ApiProperty()
    page: number

    @ApiProperty()
    limit: number
}

