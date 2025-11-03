import { Controller, Get, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AppService } from './app.service';
import { AdminService } from './admin/admin.service';
import { VehicleService } from './vehicle/vehicle.service';
import { ContentPageService } from './content-page/content-page.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { FileUploadDto } from './auth/dto/create-auth.dto';
import { ConfigurationService } from './configuration/configuration.service';
import { BookingService } from './booking/booking.service';
import { Roles } from './auth/decorators/role.decorators';
import { StaffRoles, UsersType } from './auth/role/user.role';
import { RequirePermissions } from './auth/decorators/require.permission.decorators';
import { AuthGuard } from './auth/guard/auth.guard';
import { DbService } from './db/db.service';


@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly adminService: AdminService,
    private readonly bookingService: BookingService,
    private readonly vehicleService: VehicleService,
    private readonly pagesService: ContentPageService,
    private readonly configurationService: ConfigurationService,
    private readonly dbService: DbService,
  ) { }

  async onApplicationBootstrap(): Promise<void> {
    await this.adminService.bootstrap_for_created_admin();
    await this.vehicleService.bootstrap_for_created_vehicle_type()
    await this.pagesService.bootstrap_pages()
    await this.configurationService.bootstrap_configuration()
  }

  @Post('image-upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: FileUploadDto })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const bucketName = process.env.BUCKET_NAME;
    const key = `${process.env.FOLDER}/${file.originalname}`;
    const result = await this.appService.uploadImage(key, file, file.buffer);
    const imageName = result.Key.split('/').pop();
    return {
      message: 'Image uploaded successfully',
      key: imageName,
      image_url: `${process.env.Url}/${process.env.FOLDER}/${imageName}`

    };
  }

  @Roles(UsersType.Staff)
  @RequirePermissions(StaffRoles.dispatcher)
  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @Get("dispatcher/dashboard")
  async dispatcherAdmin() {
    return await this.bookingService.dispatcherDashboard()
  }

  @Post('db_backup')
  @ApiOperation({ summary: "Db Backup" })
  async dbbackup() {
    let url = await this.dbService.backup_case_1();
    return { url }
  }

}
