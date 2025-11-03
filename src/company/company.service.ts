import { HttpCode, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { DbService } from 'src/db/db.service';
import { CommonService } from 'src/common/common.service';

@Injectable()
export class CompanyService {
  constructor(
    private readonly model: DbService,
    private readonly commonService: CommonService,
    // private readonly paymentService:PaymentService
  ) { }

  async create(createCompanyDto: CreateCompanyDto) {
    try {
      const { country_code, phone_no, email } = createCompanyDto;
      const normalizedEmail = email.toLowerCase();

      // Check if the phone number is already used by a customer
      const isCustomer = await this.model.customers.findOne({
        $or: [
          { country_code, phone: phone_no },
          { email: normalizedEmail }
        ]
      });

      // Check if the phone number is already used by a driver
      const isDriver = await this.model.drivers.findOne({
        $or: [
          { country_code, phone: phone_no },
          { email: normalizedEmail }
        ]
      });

      // If phone number is used in customer or driver records, reject registration
      if (isCustomer || isDriver) {
        throw new HttpException(
          {
            error_description: `It appears that the phone number or email you provided is already registered as a ${isCustomer ? "customer" : "driver"
              } in our platform. In terms to create the account please change your email and phone number or please contact our support team for assistance.`
          },
          HttpStatus.BAD_REQUEST
        );
      }

      let isExitMail = await this.model.company.findOne({ email: createCompanyDto.email.toLowerCase() })
      if (isExitMail) {
        // throw new HttpException({ error_description: "This Email attached with another Phone!!" }, HttpStatus.BAD_REQUEST)
        throw new HttpException({ error_description: "This email are already associated with an existing corporate customer." }, HttpStatus.BAD_REQUEST)
      }

      let isExitNumber = await this.model.company.findOne({ country_code:createCompanyDto.country_code , phone_no: createCompanyDto.phone_no })
      if (isExitNumber) {
        // throw new HttpException({ error_description: "This Number Already Exists!!" }, HttpStatus.BAD_REQUEST)
        throw new HttpException({ error_description: "This phone number are already associated with an existing corporate customer." }, HttpStatus.BAD_REQUEST)
      }

      let data = await this.model.company.create(createCompanyDto)

      return { data: data }
    } catch (error) {
      throw error
    }
  }

  async findAll(findCompaniesDto) {
    try {
      const search = findCompaniesDto?.search
        ? { name: { $regex: findCompaniesDto.search, $options: 'i' } }
        : {};

      const skip = (findCompaniesDto.page - 1) * findCompaniesDto.limit;

      // Fetch companies with pagination
      const companies = await this.model.company.find(search)
        .skip(skip)
        .limit(findCompaniesDto.limit)
        .sort({ created_at: -1 });

      // Add total booking count for each company
      const data = await Promise.all(
        companies.map(async (company) => {
          const totalBookings = await this.model.booking.countDocuments({ company_id: company._id });
          return { ...company.toObject(), total_booking: totalBookings };
        })
      );

      // Total count of all companies matching the search criteria
      const data_count = await this.model.company.countDocuments(search);

      return { data_count, data };
    } catch (error) {
      throw error;
    }
  }


  async findOne(id: string) {
    try {
      let data = await this.model.company.findOne({ _id: id })
      return { data: data }
    } catch (error) {
      throw error
    }
  }

  async update(id: string, body) {
    try {
      await this.model.company.updateOne({ _id: id }, body)
      return { message: "Successfully updated" }
    } catch (error) {
      throw error
    }
  }

  async remove(id: string) {
    try {
      await this.model.company.deleteOne({ _id: id })
      return { message: "Successfully deleted" }
    } catch (error) {
      throw error
    }
  }
}
