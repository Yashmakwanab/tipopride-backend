import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateStaffDto, FindStaffdto, staffStatus } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { DbService } from 'src/db/db.service';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import * as moment from 'moment';
import { StaffRoles, UsersType } from 'src/auth/role/user.role';
import { CommonService } from 'src/common/common.service';
import { ActivityService } from 'src/activity/activity.service';
@Injectable()
export class StaffService {
  constructor(
    private readonly model: DbService,
    private readonly common: CommonService,
     private readonly activityService: ActivityService
  ) { }

  async create(body: CreateStaffDto) {
    try {
      let already_exist = await this.model.admin.findOne({ email: body.email.toLowerCase() });


      if (already_exist && !already_exist.is_deleted) {
        throw new HttpException(
          {
            error_code: 'EMAIL_ALREADY_EXIST',
            error_description: 'Email already exist',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if(already_exist?.is_deleted) {

        console.log("Account found in deleted state - Account already exist - but deleted - please activate"+already_exist?._id);

        // throw new HttpException(
        //   {
        //     error_code: 'ACCOUNT_ALREADY_EXIST_BUT_DELETED',
        //     error_description: 'Account already exist - but deleted - please activate',
        //   },
        //   HttpStatus.BAD_REQUEST,
        // );
      }
      
      let password = await bcrypt.hash(body.password, 10);

      const data = await this.model.admin.create({
        ...body, roles: body.roles, password
      });

      return { message: 'Staff added successfully', data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async findAll(body: FindStaffdto) {
    try {
      const query = {
        superAdmin: false,
        //is_deleted: false,
        ...(body?.status && {
          is_active: (body.status == staffStatus.active),
        }),
        ...(body?.search && {
          $or: [
            { name: { $regex: body?.search, $options: 'i' } },
            { email: { $regex: body?.search, $options: 'i' } },
          ],
        })
      };

      const options = await this.common.set_options(body?.page ?? body?.pagination, body?.limit)
      const staff = await this.model.admin.find(query, {}, options);
      // console.log(staff, '<----staff');

      const data = await Promise.all(staff.map(async (res) => {
        const login = await this.model.sessions.findOne({ user_id: res._id }, { created_at: 1 }, { sort: { created_at: -1 } })
        return {
          ...res, last_login: login?.created_at
        }
      }))
      console.log(data, '<--data');

      const count = await this.model.admin.countDocuments(query);
      return { data, count };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async dispatureDetails(id: string) {
    try {
      console.log(id, ",---------");

      const data = await this.model.admin.findOne({ _id: new Types.ObjectId(id) }, { password: 0 }, { lean: true });
      if (!data) {
        throw new HttpException({ error_description: 'Something went wrong!!', error_code: 'INVALID_REQUEST' }, HttpStatus.BAD_REQUEST)
      }
      return { data: data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async update(id: string, body: UpdateStaffDto) {
    try {
      let password;
      console.log(password, "<--pass");

      if (body.password) password = await bcrypt.hash(body?.password, 10);
      const dispatcher = await this.model.admin.findOneAndUpdate(
        { _id: new Types.ObjectId(id) },
        { ...body, password, updated_at: moment().utc().valueOf() },
        { new: true }
      ).lean(true);

      //is_deleted: false

      if (!dispatcher) {
        throw new HttpException({ error_desription: "Something went wrong!!", error_code: "INVALID_REQUEST" }, HttpStatus.BAD_REQUEST)
      }
      return { message: 'staff update successfully', dispatcher: { ...dispatcher, password: null } };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const data = await this.model.admin.findOneAndUpdate(
        { _id: new Types.ObjectId(id)},
        { is_deleted: true, deleted_at: moment().utc().valueOf() },
        { new: true }
      );

      //is_deleted: false 
      if (!data) {
        throw new HttpException({ error_desription: "Something went wrong!!", error_code: "INVALID_REQUEST" }, HttpStatus.BAD_REQUEST)
      }
      throw new HttpException({ message: "Deleted successfully" }, HttpStatus.OK)
    } catch (error) {
      console.log('error', error);
      throw error
    }
  }

  async update_status(id: string) {
    try {
      const dispature = await this.model.admin.findOne({ _id: new Types.ObjectId(id) });
      //is_deleted: false
      if (dispature) {
        dispature.is_active = !dispature?.is_active;        
        dispature.is_deleted = false;
        dispature.save();

        this.activityService.logActivity({ booking_id: id, userId: dispature?._id.toString(), action: "UPDATED", resource: "staff", description: "Staff Status Updated", payload: dispature});

        return { message: 'Status update successfully', dispature };
      }
      throw new HttpException({ error_desription: "Something went wrong!!", error_code: "INVALID_REQUEST" }, HttpStatus.BAD_REQUEST)
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }
}
