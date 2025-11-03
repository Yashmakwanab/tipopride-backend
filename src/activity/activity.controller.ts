import { Controller, Get } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';

@Controller('activities')

export class ActivityController {
    constructor(private readonly activityService: ActivityService) { }

    @Get()
    @ApiOperation({ summary: 'Get all activity logs' })
    @ApiResponse({
        status: 200,
        description: 'List of all user activities',

    })
    async getAllActivities() {
        return this.activityService.getAllActivities();
    }
}
