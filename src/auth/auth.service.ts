import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { CreateAuthDto, ResendOtpDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { DbService } from 'src/db/db.service';
import {
  becomeDriverDto,
  CreateCustomerDto,
  SocialLoginDto,
  VerifyPhone,
} from 'src/customer/dto/create-customer.dto';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from 'src/constants';
import { throwError } from 'rxjs';
import { CommonService } from 'src/common/common.service';
import { InjectStripe } from 'nestjs-stripe';
import Stripe from 'stripe';
import * as AWS from 'aws-sdk';
import * as path from 'path';
import * as mime from 'mime-types';
import * as mongosse from 'mongoose';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import { BookingService } from 'src/booking/booking.service';
import { EmailService } from 'src/common/common.emails.sesrvice';
import { Types } from 'mongoose';
import { ActivityService } from 'src/activity/activity.service';
const moment = require('moment');
@Injectable()
export class AuthService {
  private s3: AWS.S3;
  constructor(
    @InjectStripe() private readonly stripe: Stripe,
    private readonly model: DbService,
    private readonly jwtService: JwtService,
    private readonly commonService: CommonService,
    private readonly emailService: EmailService,
    private readonly bookingService: BookingService,
    private readonly activityService: ActivityService

  ) { }

  async becomeDriver(body: becomeDriverDto) {
    try {
      const data = await this.model.drivers.findOne({
        country_code: body.country_code, phone: body.phone,
      });

      const data_email = await this.model.drivers.findOne({
        $or: [{ email: body.email }, { temp_email: body.email }],
      });

      const checkEmailExistInCustomer = await this.model.customers.findOne({
        email: body.email,
        is_deleted: false,
      });
      if (data) {
        throw new HttpException(
          {
            error_code:
              'Phone number already exists. Please enter another number.',
            error_description:
              'Phone number already exists. Please enter another number.',
          },
          HttpStatus.BAD_REQUEST,
        );
      } else if (checkEmailExistInCustomer || data_email) {
        throw new HttpException(
          {
            error_code: 'Email already exists. Please enter another email.',
            error_description:
              'Email already exists. Please enter another email.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const isTwilioEnabled = process.env.TWILIO_ENABLED === 'true';
      console.log('isTwilioEnabled', isTwilioEnabled)

      const phone_otp = isTwilioEnabled ? await this.generateOtp() : "1234";
      let email_otp = await this.generateOtp();
      // let phone_otp = 1234;
      // let email_otp = 1234;
      let phone = body.country_code + body.phone
      //sent_otp_with_twilio
      if (isTwilioEnabled) {
        // this.commonService.sendotp(phone_otp, phone)
        this.commonService.sendOtpSMS(phone_otp, body.country_code, body.phone)
      }
      
      let payload = {
        country_code: body.country_code,
        phone: body.phone,
        email: body.email,
        name: body.name,
        police_check: body.police_check,
        network_name: body.network_name,
        abn_number: body.abn_number,
        licence_front_image: body.licence_front_image,
        licence_back_image: body.licence_back_image,
        phone_otp: phone_otp,
        image: body.image,
        email_otp: email_otp,
        email_otp_at: moment().valueOf(),
        phone_otp_at: Date.now(),
        scope: 'driver',
        set_up_profile: true,
      };
      console.log('payload', payload)
      const configuration = await this.model.appConfiguration.findOne();
      const policy_url = process.env.POLICY_URL || 'https://staging.tiptopmaxisydney.com.au/driver_policy';
      this.emailService.emailVerification(body.email, configuration.product_name, body.name, +email_otp, policy_url)
      const access_token = await this.jwtService.signAsync(payload);
      return { token: access_token, user: { ...payload, phone_otp: null, email_otp: null } };
    } catch (error) {
      throw error;
    }
  }

  async updateDriver(body: becomeDriverDto, req) {
    try {
      const authHeader = req.headers['authorization'];
      let language = req.headers['language'] || 'english';
      const token = authHeader.replace(/^Bearer\s/, '');

      let token_payload = await this.decode_JwtToken(token);
      const payload = {
        country_code: body.country_code ?? token_payload.country_code,
        phone: body.phone ?? token_payload.phone,
        name: body.name ?? token_payload.name,
        email: body.email ?? token_payload.email,
        police_check: body.police_check ?? token_payload.police_check,
        network_name: body.network_name ?? token_payload.network_name,
        abn_number: body.abn_number ?? token_payload.abn_number,
        licence_front_image: body.licence_front_image ?? token_payload.licence_front_image,
        licence_back_image: body.licence_back_image ?? token_payload.licence_back_image,
        image: body.image ?? token_payload.image,
      }
      return await this.becomeDriver(payload)
    } catch (error) {
      console.log(error, '<----updating driver details');
      throw error
    }
  }

  async continue_with_phone(createCustomerDto: CreateCustomerDto, req) {
    try {
      const { country_code, phone, type } = createCustomerDto;
      const language = req.headers['language'] || 'english';
      const fullPhone = country_code + phone;

      const testNumbers = (process.env.TEST_NUMBERS || '').split(',');
      const isTestNumber = testNumbers.includes(fullPhone);
      const isTwilioEnabled = process.env.TWILIO_ENABLED === 'true';

      const otp = isTestNumber || !isTwilioEnabled
        ? 1234
        : await this.generateOtp();

      if (isTwilioEnabled && !isTestNumber) {
        // this.commonService.sendotp(otp, fullPhone);
        this.commonService.sendOtpSMS(otp, country_code, phone)
      }

      const isCustomer = type === 'customer';
      const isDriver = type === 'driver';

      const isCompany = await this.model.company.findOne({
        phone_no: phone,
        country_code: country_code,
      })

      if (isCompany) throw new HttpException({
        error_code: 'corporate_client',
        error_description: 'corporate_client',
      }, HttpStatus.BAD_REQUEST)

      if (!isCustomer && !isDriver) {
        const key = 'Invalid type';
        const localization = await this.commonService.localization(language, key);
        throw new HttpException(
          {
            error_code: localization[language],
            error_description: localization[language],
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const user = isCustomer
        ? await this.find_customer_with_phone(phone)
        : await this.model.drivers.findOne({ phone });

      if (user?.is_block) {
        throw new HttpException(
          {
            error_code: 'BLOCKED',
            error_description: user.block_reason,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const payload = {
        country_code,
        phone,
        phone_otp: String(otp),
        phone_otp_at: Date.now(),
        scope: type,
        language,
      };

      const access_token = await this.jwtService.signAsync(payload);
      return { token: access_token };

    } catch (error) {
      console.error('continue_with_phone error:', error);
      throw error;
    }
  }

  async continue_with_phone_old(createCustomerDto: CreateCustomerDto, req) {
    try {
      let language = req.headers['language'] || 'english';

      let phone_otp = Boolean(process.env.TWILIO_ENABLED as string) ? await this.generateOtp() : 1234;
      // let phone_otp = 1234;
      let payload;

      let phone = createCustomerDto.country_code + createCustomerDto.phone;
      const testNumbers = process.env.TEST_NUMBERS || [];
      const isTestNumbers = testNumbers.includes(phone)
      phone_otp = isTestNumbers ? 1234 : phone_otp; // For testing purposes, use a fixed OTP
      // sent_otp_with_twilio
      // !isTestNumbers ? this.commonService.sendotp(phone_otp, phone) : null
      !isTestNumbers ? this.commonService.sendOtpSMS(phone_otp, createCustomerDto.country_code, createCustomerDto.phone) : null

      if (createCustomerDto.type === 'customer') {
        const data = await this.find_customer_with_phone(
          createCustomerDto.phone,
        );
        if (data && data.is_block) {
          throw new HttpException(
            {
              error_code: 'BLOCKED',
              error_description: data.block_reason,
            },
            HttpStatus.BAD_REQUEST,
          );
        }

        payload = {
          country_code: createCustomerDto.country_code,
          phone: createCustomerDto.phone,
          phone_otp: phone_otp,
          phone_otp_at: Date.now(),
          scope: 'customer',
          language: language,
        };
      } else if (createCustomerDto.type === 'driver') {
        const data = await this.model.drivers.findOne({
          phone: createCustomerDto.phone,
        });
        if (data && data.is_block) {
          throw new HttpException(
            {
              error_code: 'BLOCKED',
              error_description: data.block_reason,
            },
            HttpStatus.BAD_REQUEST,
          );
        }

        payload = {
          country_code: createCustomerDto.country_code,
          phone: createCustomerDto.phone,
          phone_otp: phone_otp,
          phone_otp_at: Date.now(),
          scope: 'driver',
          language: language,
        };
      } else {
        let key = 'Invalid type';
        const localization = await this.commonService.localization(
          language,
          key,
        );
        throw new HttpException(
          {
            error_code: localization[language],
            error_description: localization[language],
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      const access_token = await this.jwtService.signAsync(payload);
      return { token: access_token };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async verify_phone(verifyphoneDto: VerifyPhone, req) {
    try {
      const authHeader = req.headers['authorization'];
      const language = req.headers['language'] || 'english';
      const token = authHeader.replace(/^Bearer\s/, '');
      const token_payload = await this.decode_JwtToken(token);

      const isOtpValid = verifyphoneDto.otp === token_payload.phone_otp;
      const otpSentAt = new Date(token_payload.phone_otp_at);
      const isOtpExpired = Date.now() >= otpSentAt.getTime() + 5 * 60 * 1000;

      if (!isOtpValid) {
        const message = await this.getLocalizedMessage(language, 'Invalid otp');
        throw new HttpException({ error_code: message, error_description: message }, HttpStatus.BAD_REQUEST);
      }

      if (isOtpExpired) {
        throw new HttpException(
          { error_code: 'OTP has expired', error_description: 'OTP has expired' },
          HttpStatus.BAD_REQUEST
        );
      }

      if (token_payload.scope === 'customer') {
        return await this.handleCustomerVerification(token_payload, verifyphoneDto, language);
      }

      if (token_payload.scope === 'driver') {
        return await this.handleDriverVerification(token_payload, verifyphoneDto, language);
      }

    } catch (error) {
      throw error;
    }
  }

  private async getLocalizedMessage(language: string, key: string): Promise<string> {
    const localization = await this.commonService.localization(language, key);
    return localization[language];
  }

  private async handleCustomerVerification(token_payload: any, dto: VerifyPhone, language: string) {
    const { country_code, phone } = token_payload;

    const customer = await this.model.customers
      .findOne({ country_code, phone, is_deleted: false })
      .populate([{ path: 'current_booking' }]);

    let customerToUse = customer;

    if (!customer) {
      const tempCustomer = await this.model.customers.findOne({ temp_phone: phone, is_deleted: false });
      if (tempCustomer) {
        customerToUse = await this.model.customers.findOneAndUpdate(
          { _id: tempCustomer._id },
          {
            phone: tempCustomer.temp_phone,
            temp_phone: null,
            is_phone_verify: true
          },
          { new: true }
        );
      }
    }

    return customerToUse
      ? await this.customer_login(customerToUse, dto.fcm_token, language)
      : await this.customer_signup(dto, token_payload);
  }

  private async handleDriverVerification(token_payload: any, dto: VerifyPhone, language: string) {
    const { country_code, phone } = token_payload;

    const driver = await this.model.drivers
      .findOne({ country_code, phone, is_deleted: false })
      .populate([{ path: 'current_booking' }]);

    return driver
      ? await this.driver_login(driver, dto.fcm_token, language, dto.device_type)
      : await this.driver_signup(dto, token_payload);
  }


  async verify_phone_old(verifyphoneDto: VerifyPhone, req) {
    try {
      const authHeader = req.headers['authorization'];
      let language = req.headers['language'] || 'english';
      const token = authHeader.replace(/^Bearer\s/, '');
      let token_payload = await this.decode_JwtToken(token);
      if (token_payload.scope === 'customer') {
        const customer_exist = await this.model.customers
          .findOne({ country_code: token_payload.country_code, phone: token_payload.phone, is_deleted: false })
          .populate([{ path: 'current_booking' }]);
        let customer_with_temp = null;
        !customer_exist
          ? (customer_with_temp = await this.model.customers.findOne({
            temp_phone: token_payload.phone, is_deleted: false
          }))
          : null;
        const otpSentAt = new Date(token_payload.phone_otp_at);
        const otpSentAdd5Minutes = otpSentAt.getTime() + 5 * 60 * 1000;
        const currentTimestamp = Date.now();

        if (verifyphoneDto.otp == token_payload.phone_otp) {
          if (currentTimestamp >= otpSentAdd5Minutes) {
            throw new HttpException(
              {
                error_code: 'OTP has expired',
                error_description: 'OTP has expired',
              },
              HttpStatus.BAD_REQUEST,
            );
          }
          if (customer_exist || customer_with_temp) {
            let updateDispatcherCust;
            customer_with_temp
              ? (updateDispatcherCust =
                await this.model.customers.findOneAndUpdate(
                  { _id: customer_with_temp._id },
                  {
                    phone: customer_with_temp.temp_phone,
                    temp_phone: null,
                    is_phone_verify: true,
                  },
                  { new: true },
                ))
              : null;
            return await this.customer_login(
              customer_exist || updateDispatcherCust,
              verifyphoneDto.fcm_token,
              language,
            );
          } else {
            return await this.customer_signup(verifyphoneDto, token_payload);
          }
        } else {
          let key = 'Invalid otp';
          const localization = await this.commonService.localization(
            language,
            key,
          );
          throw new HttpException(
            {
              error_code: localization[language],
              error_description: localization[language],
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      } else if (token_payload.scope === 'driver') {
        const driver_exist = await this.model.drivers
          .findOne({ country_code: token_payload.country_code, phone: token_payload.phone, is_deleted: false })
          .populate([{ path: 'current_booking' }]);

        const otpSentAt = new Date(token_payload.phone_otp_at);
        const otpSentAdd5Minutes = otpSentAt.getTime() + 5 * 60 * 1000;
        const currentTimestamp = Date.now();
        if (verifyphoneDto.otp == token_payload.phone_otp) {
          if (currentTimestamp >= otpSentAdd5Minutes) {
            throw new HttpException(
              {
                error_code: 'OTP has expired',
                error_description: 'OTP has expired',
              },
              HttpStatus.BAD_REQUEST,
            );
          }
          if (driver_exist) {
            return await this.driver_login(
              driver_exist,
              verifyphoneDto.fcm_token,
              language,
              verifyphoneDto.device_type || 'android', // Default to 'android' if device_type is not provided
            );
          } else {
            return await this.driver_signup(verifyphoneDto, token_payload);
          }
        } else {
          let key = 'Invalid otp';
          const localization = await this.commonService.localization(
            language,
            key,
          );
          throw new HttpException(
            {
              error_code: localization[language],
              error_description: localization[language],
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    } catch (error) {
      throw error;
    }
  }

  async checkToken(token) {
    const user = await this.model.sessions.findOne({ token: token });
    return user;
  }

  async decode_JwtToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: jwtConstants.secret,
      });
      return payload;
    } catch (error) {
      throw error;
    }
  }

  async find_customer_with_phone(phone: string) {
    try {
      const customer = await this.model.customers
        .findOne({
          phone: phone,
          is_deleted: false,
        })
        .populate([{ path: 'current_booking' }]);
      return customer;
    } catch (error) {
      throw error;
    }
  }

  async find_driver_with_phone(phone: string) {
    try {
      const driver = await this.model.drivers
        .findOne({
          phone: phone,
          is_deleted: false,
        })
        .populate([{ path: 'current_booking' }]);
      return driver;
    } catch (error) {
      throw error;
    }
  }

  async find_customer_with_id(id: string) {
    try {
      const customer = await this.model.customers.findOne({ _id: id });
      return customer;
    } catch (error) {
      throw error;
    }
  }

  async find_driver_with_id(id: string) {
    try {
      const driver = await this.model.drivers.findOne({ _id: id });
      return driver;
    } catch (error) {
      throw error;
    }
  }

  async customer_login(customer, fcm_token: String, language) {
    try {
      const payload = {
        user_id: customer._id,
        country_code: customer.country_code,
        phone: customer.phone,
        scope: 'customer',
      };
      const access_token = await this.jwtService.signAsync(payload);

      let data = {
        user_id: customer._id,
        token: access_token,
        scope: 'customer',
        fcm_token: fcm_token,
      };
      await this.model.sessions.deleteMany({
        user_id: customer._id,
      });
      await this.model.customers.updateOne(
        { _id: customer._id },
        { preferred_language: language },
      );
      await this.model.sessions.create(data);
      const customer_detail = await this.find_customer_with_phone(
        customer.phone,
      );
      return {
        access_token: access_token,
        data: customer_detail,
      };
    } catch (error) {
      throw error;
    }
  }

  async driver_login(driver, fcm_token: String, language, device_type: string) {
    try {
      const payload = {
        user_id: driver._id,
        country_code: driver.country_code,
        phone: driver.phone,
        scope: 'driver',
        device_type: device_type || 'android', 
      };
      const access_token = await this.jwtService.signAsync(payload);
      let data = {
        user_id: driver._id,
        token: access_token,
        scope: 'driver',
        fcm_token: fcm_token,
        device_type: device_type || 'android', 
      };
      await this.model.sessions.deleteMany({
        user_id: driver._id,
      });
      await this.model.drivers.updateOne(
        { _id: driver._id },
        { preferred_language: language },
      );
      await this.model.sessions.create(data);
      const driver_detail = await this.find_driver_with_phone(driver.phone);

      return {
        access_token: access_token,
        data: driver_detail,
      };
    } catch (error) {
      throw error;
    }
  }

  async customer_signup(body, customer_data) {
    try {
      const customer = await this.stripe.customers.create({
        phone: customer_data.phone,
      });
      let data = {
        phone: customer_data.phone,
        country_code: customer_data.country_code,
        is_phone_verify: true,
        is_active: true,
        login_type: 'normal',
        device_type: body.device_type,
        customer_id: customer.id,
        preferred_language: customer_data.langauge,
        created_at: moment().valueOf(),
      };
      const create_customer = await this.model.customers.create(data);
      const payload = {
        user_id: create_customer._id,
        country_code: create_customer.country_code,
        phone: create_customer.phone,
        scope: 'customer',
      };
      const access_token = await this.jwtService.signAsync(payload);

      let session_data = {
        user_id: create_customer._id,
        token: access_token,
        scope: 'customer',
        fcm_token: body.fcm_token,
      };
      await this.model.sessions.deleteMany({
        fcm_token: body.fcm_token,
      });
      await this.model.sessions.create(session_data);

      return {
        access_token: access_token,
        data: create_customer,
      };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async driver_signup(body, driver_data) {
    try {
      const customer = await this.stripe.customers.create({
        phone: driver_data.phone,
      });

      let data = {
        phone: driver_data.phone,
        country_code: driver_data.country_code,
        name: driver_data?.name ? driver_data.name : null,
        temp_email: driver_data?.email ? driver_data.email : null,
        licence_front_image: driver_data?.licence_front_image ? driver_data.licence_front_image : null,
        licence_back_image: driver_data?.licence_back_image ? driver_data.licence_back_image : null,
        temp_email_otp: driver_data?.email_otp ? driver_data.email_otp : null,
        temp_email_otp_at: driver_data?.email_otp_at ? driver_data.email_otp_at : null,
        set_up_profile: driver_data?.set_up_profile ? driver_data.set_up_profile : false,
        is_phone_verify: true,
        device_type: body.device_type,
        customer_id: customer.id,
        preferred_language: driver_data.langauge,
        image: driver_data.image,
        created_at: moment().valueOf(),
      };
      const create_driver = await this.model.drivers.create(data);
      const payload = {
        user_id: create_driver._id,
        country_code: create_driver.country_code,
        phone: create_driver.phone,
        scope: 'driver',
        device_type: body.device_type,
      };
      const access_token = await this.jwtService.signAsync(payload);

      let session_data = {
        user_id: create_driver._id,
        token: access_token,
        scope: 'driver',
        fcm_token: body.fcm_token,
        device_type: body.device_type,
      };
      await this.model.sessions.deleteMany({
        fcm_token: body.fcm_token,
      });
      await this.model.sessions.create(session_data);

      return {
        access_token: access_token,
        data: create_driver,
      };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async getProfile(payload) {
    try {

      //await this.activityService.logActivity({ booking_id: payload.user_id, userId: payload.user_id, action: "CREATE", resource: "booking", description: "Booking created", payload: payload });

      if (payload.scope === 'customer') {
        const customer: any = await this.model.customers
          .findOne({ _id: new mongosse.Types.ObjectId(payload.user_id) })
          .populate([{ path: 'current_booking' }, { path: 'connection_id' }, { path: "support_connection" }]);

        // const change_currency = await this.bookingService.convert_wallet_amount(
        //   customer.preferred_currency,
        //   customer.wallet_balance,
        // );
        const data = {
          ...customer._doc,
          wallet_balance: customer.wallet_balance,
        };
        return { data: data };
      } else if (payload.scope === 'driver') {
        const driver = await this.model.drivers
          .findOne({ _id: new mongosse.Types.ObjectId(payload.user_id) })
          .populate([{ path: 'current_booking' }, { path: 'connection_id' }, { path: "support_connection" }]);
        return { data: driver };
      } else {
        return { error: 'Invalid scope' };
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      return { error: 'An error occurred while fetching the profile' };
    }
  }

  async editProfile(payload, body, req) {
    try {
      let already_exist;
      let alreadyExistInOther;
      let otp;
      let language = req.headers['language'] || 'english';
      let update_data: any = {};
      body.name ? (update_data.name = body.name) : null;
      body.image ? (update_data.image = body.image) : null;
      body.language ? (update_data.language = body.language) : null;
      body.currency_symbol
        ? (update_data.currency_symbol = body.currency_symbol)
        : null;
      body.currency ? (update_data.currency = body.currency) : null;
      body.sos_contact ? (update_data.sos_contact = body.sos_contact) : null;
      body.sos_country_code
        ? (update_data.sos_country_code = body.sos_country_code)
        : null;

      if (body.email) {
        const isCompany = await this.model.company.findOne({
          email: body.email,
        })

        if (isCompany) throw new HttpException({
          error_code: 'corporate_client',
          error_description: 'corporate_client',
        }, HttpStatus.BAD_REQUEST)

        if (payload.scope === 'customer') {
          already_exist = await this.model.customers.findOne({
            email: body.email,
            is_deleted: false,
          });

          // alreadyExistInOther = await this.model.drivers.findOne({
          //   email: body.email,
          //   is_deleted: false,
          // });
        }
        if (payload.scope === 'driver') {
          already_exist = await this.model.drivers.findOne({
            email: body.email,
            is_deleted: false,
          });
          // alreadyExistInOther = await this.model.customers.findOne({
          //   email: body.email,
          //   is_deleted: false,
          // });
        }
        if (already_exist || alreadyExistInOther) {
          throw new HttpException(
            {
              error_code: 'Email already exist',
              error_description: 'Email already exist',
            },
            HttpStatus.BAD_REQUEST,
          );
        }

        // otp = 1234;
        otp = await this.generateOtp();
        update_data.temp_email = body.email;
        update_data.temp_email_otp = otp;
        update_data.temp_email_otp_at = Date.now();
      }
      if (body.phone) {
        const isCompany = await this.model.company.findOne({
          phone_no: body.phone,
          country_code: body.country_code,
        })

        if (isCompany) throw new HttpException({
          error_code: 'corporate_client',
          error_description: 'corporate_client',
        }, HttpStatus.BAD_REQUEST)

        if (payload.scope === 'customer') {
          already_exist = await this.model.customers.findOne({
            phone: body.phone,
            country_code: body.country_code,
            is_deleted: false,
          });

        }
        if (payload.scope === 'driver') {
          already_exist = await this.model.drivers.findOne({
            phone: body.phone,
            country_code: body.country_code,
            is_deleted: false,
          });

        }
        if (already_exist) {
          throw new HttpException(
            {
              error_code: 'Phone already exist',
              error_description: 'Phone already exist',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
        let phone_otp = await this.generateOtp();
        // let phone_otp = 1234;
        update_data.temp_phone = body.phone;
        update_data.temp_country_code = body.country_code;
        update_data.temp_phone_otp = phone_otp;
        update_data.temp_phone_otp_at = Date.now();

        let phone = body.country_code + body.phone
        // sent_otp_with_twilio
        // this.commonService.sendotp(phone_otp, phone)
        this.commonService.sendOtpSMS(phone_otp, body.country_code, body.phone)

      }
      if (payload.scope === 'customer') {
        await this.model.customers.updateOne(
          { _id: payload.user_id },
          update_data,
        );
      }

      if (payload.scope === 'driver') {
        update_data.licence_front_image = body.licence_front_image;
        update_data.licence_back_image = body.licence_back_image;
        update_data.police_check = body.police_check;
        update_data.network_name = body.network_name;
        update_data.abn_number = body.abn_number;
        update_data.set_up_profile = true;
        await this.model.drivers.updateOne(
          { _id: payload.user_id },
          update_data,
        );
      }
      if (body.email) {
        let user_data;
        if (payload.scope === 'customer') {
          user_data = await this.model.customers.findOne({
            _id: payload.user_id,
          });
        }
        if (payload.scope === 'driver') {
          user_data = await this.model.drivers.findOne({
            _id: payload.user_id,
          });
        }
        const configuration = await this.model.appConfiguration.findOne();
        const policy_url = `https://staging.tiptopmaxisydney.com.au/${payload.scope}_policy`;
        this.emailService.emailVerification(body.email, configuration.product_name, user_data?.name, +otp, policy_url, payload.scope)
      }



      let key = 'Profile successfully updated';
      const localization = await this.commonService.localization(language, key);
      return {
        // message: localization['english'],
        message: "yes",
      };
    } catch (error) {
      throw error;
    }
  }

  // async sent_email_verify_mail(user_data, otp, body, payload) {
  //   try {
  //     const configuration = await this.model.appConfiguration.findOne();
  //     const currentDir = __dirname;
  //     const cabAppDir = path.resolve(currentDir, '../../');
  //     // console.log('hello', cabAppDir);

  //     let file_path = path.join(
  //       __dirname,
  //       '../../dist/email-template/email-otp.hbs',
  //     );

  //     console.log('file_path', file_path);
  //     let html = fs.readFileSync(file_path, { encoding: 'utf-8' });
  //     let policy_url = '';

  //     // Compile the template
  //     payload.scope === 'customer'
  //       ? (policy_url = 'https://staging.tiptopmaxisydney.com.au/customer_policy')
  //       : null;
  //     payload.scope === 'driver'
  //       ? (policy_url = 'https://staging.tiptopmaxisydney.com.au/driver_policy')
  //       : null;


  //     // Compile the template

  //     const template = Handlebars.compile(html);
  //     const data = {
  //       productName: configuration.product_name,
  //       name: user_data.name,
  //       otp: otp,
  //       policyUrl: policy_url,
  //     };
  //     const htmlToSend = template(data);

  //     let mailData = {
  //       to: body.email,
  //       subject: `Your Tiptop Ride account verification code`,
  //       html: htmlToSend,
  //     };

  //     this.commonService.sendmail(
  //       mailData.to,
  //       mailData.subject,
  //       null,
  //       mailData.html,
  //     );
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  async verify_email(payload, body, req) {
    try {
      let language = req.headers['language'] || 'english';
      if (payload.scope === 'customer') {
        const customer_detail = await this.find_customer_with_id(
          payload.user_id,
        );
        const otpSentAt = new Date(customer_detail.temp_email_otp_at);
        const otpSentAdd5Minutes = otpSentAt.getTime() + 5 * 60 * 1000;
        const currentTimestamp = Date.now();
        if (customer_detail.temp_email_otp === Number(body.otp)) {
          if (currentTimestamp >= otpSentAdd5Minutes) {
            throw new HttpException(
              {
                error_code: 'OTP has expired',
                error_description: 'OTP has expired',
              },
              HttpStatus.BAD_REQUEST,
            );
          }
          if (customer_detail.email === null) {
            this.emailService.welcomeEmail(customer_detail.temp_email ?? customer_detail.email, customer_detail.name, payload.scope)
            // this.SentWelcomeMailToCustomer(
            //   customer_detail.name,
            //   customer_detail.temp_email,
            // );
          }
          await this.model.customers.updateOne(
            { _id: customer_detail._id },
            { email: customer_detail.temp_email, is_email_verify: true },
          );
          const key = 'Email verified successfully';
          const localization = await this.commonService.localization(
            language,
            key,
          );
          return {
            message: localization[language],
          };
        } else {
          const key = 'Invalid otp';
          const localization = await this.commonService.localization(
            language,
            key,
          );
          throw new HttpException(
            {
              error_code: localization[language],
              error_description: localization[language],
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      } else if (payload.scope === 'driver') {
        const driver_detail = await this.find_driver_with_id(payload.user_id);
        const otpSentAt = new Date(driver_detail.temp_email_otp_at);
        const otpSentAdd5Minutes = otpSentAt.getTime() + 5 * 60 * 1000;
        const currentTimestamp = Date.now();
        if (driver_detail.temp_email_otp === Number(body.otp)) {
          if (currentTimestamp >= otpSentAdd5Minutes) {
            throw new HttpException(
              {
                error_code: 'OTP has expired',
                error_description: 'OTP has expired',
              },
              HttpStatus.BAD_REQUEST,
            );
          }
          await this.model.drivers.updateOne(
            { _id: driver_detail._id },
            { email: driver_detail.temp_email, is_email_verify: true },
          );
          this.emailService.welcomeEmail(driver_detail.temp_email ?? driver_detail.email, driver_detail.name, payload.scope)
          const key = 'Email verified successfully';
          const localization = await this.commonService.localization(
            language,
            key,
          );
          return {
            message: localization[language],
          };
        } else {
          const key = 'Invalid otp';
          const localization = await this.commonService.localization(
            language,
            key,
          );
          throw new HttpException(
            {
              error_code: localization[language],
              error_description: localization[language],
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    } catch (error) {
      throw error;
    }
  }

  async verify_edit_phone(payload, body, req) {
    try {
      let language = req.headers['language'] || 'english';

      if (payload.scope === 'customer') {
        const customer_detail = await this.find_customer_with_id(
          payload.user_id,
        );
        const otpSentAt = new Date(customer_detail.temp_phone_otp_at);
        const otpSentAdd5Minutes = otpSentAt.getTime() + 5 * 60 * 1000;
        const currentTimestamp = Date.now();
        if (customer_detail.temp_phone_otp == body.otp) {
          if (currentTimestamp >= otpSentAdd5Minutes) {
            throw new HttpException(
              {
                error_code: 'OTP has expired',
                error_description: 'OTP has expired',
              },
              HttpStatus.BAD_REQUEST,
            );
          }
          await this.model.customers.updateOne(
            { _id: customer_detail._id },
            {
              phone: customer_detail.temp_phone,
              country_code: customer_detail.temp_country_code,
              is_phone_verify: true,
            },
          );
          const key = 'phone_verified_successfully';
          const localization = await this.commonService.localization(
            language,
            key,
          );
          return {
            message: "localization[language]",
          };
        } else {
          const key = 'Invalid otp';
          const localization = await this.commonService.localization(
            language,
            key,
          );
          throw new HttpException(
            {
              error_code: localization[language],
              error_description: localization[language],
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      } else if (payload.scope === 'driver') {
        const driver_detail = await this.find_driver_with_id(payload.user_id);
        const otpSentAt = new Date(driver_detail.temp_phone_otp_at);
        const otpSentAdd5Minutes = otpSentAt.getTime() + 5 * 60 * 1000;
        const currentTimestamp = Date.now();
        if (driver_detail.temp_phone_otp == body.otp) {
          if (currentTimestamp >= otpSentAdd5Minutes) {
            throw new HttpException(
              {
                error_code: 'OTP has expired',
                error_description: 'OTP has expired',
              },
              HttpStatus.BAD_REQUEST,
            );
          }
          await this.model.drivers.updateOne(
            { _id: driver_detail._id },
            {
              phone: driver_detail.temp_phone,
              country_code: driver_detail.temp_country_code,
              is_phone_verify: true,
            },
          );
          const key = 'phone_verified_successfully';
          const localization = await this.commonService.localization(
            language,
            key,
          );
          return {
            message: localization[language],
          };
        } else {
          const key = 'Invalid otp';
          const localization = await this.commonService.localization(
            language,
            key,
          );
          throw new HttpException(
            {
              error_code: localization[language],
              error_description: localization[language],
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    } catch (error) {
      throw error;
    }
  }

  async delete_account(payload, req) {
    try {
      let language = req.headers['language'] || 'english';
      const key = 'Delete account successfully';
      const localization = await this.commonService.localization(language, key);
      if (payload.scope === 'driver') {
        await this.model.drivers.updateOne(
          { _id: payload.user_id },
          { is_deleted: true },
        );
      }
      if (payload.scope === 'customer') {
        await this.model.customers.updateOne(
          { _id: payload.user_id },
          { is_deleted: true },
        );
      }
      return { message: localization[language] };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async logOut(req, payload) {
    try {
      const authHeader = req.headers['authorization'];
      let language = req?.headers['language'] || 'english';
      const key = 'Logout successfully';
      const localization = await this.commonService.localization(language, key);
      const token =
        authHeader && typeof authHeader === 'string'
          ? authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : authHeader
          : null;

      if (payload.scope === 'driver') {
        await this.model.drivers.updateOne(
          { _id: payload.user_id },
          { status: 'offline' },
        );
      }
      let endSession = await this.model.sessions.deleteMany({
        user_id: new Types.ObjectId(payload.user_id),
      });
      if (!endSession) {
        throw new HttpException(
          {
            error_code: 'No Session Exist',
            error_description: 'No Session Exist',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      return { message: localization[language] };
    } catch (error) {
      console.log('errror', error);
    }
  }

  async social_login(body: SocialLoginDto) {
    try {
      if (body.social_type == 'google') {
        const response = await this.login_with_google(body);
        return response;
      } else if (body.social_type == 'apple') {
        const response = await this.login_with_apple(body);
        return response;
      } else {
        throw new BadRequestException({ message: 'Invalid Request' });
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async login_with_google(body) {
    try {
      let payload: any;
      let response = this.jwtService.decode(body.token);
      const customer = await this.stripe.customers.create({
        phone: response.given_name,
      });
      let data = {
        name: `${response?.given_name}`,
        email: response?.email,
        image: response?.picture,
        social_id: response?.sub,
        login_type: 'google',
        set_up_profile: true,
        device_type: body.device_type,
        is_email_verify: true,
        customer_id: customer.id,
      };
      if (body.type === 'customer') {
        let user = await this.model.customers.findOne({
          email: response?.email,
          is_deleted: false,
        }).populate([{ path: 'current_booking' }]);
        if (!user) {
          let newUser = await this.model.customers.create(data);
          this.emailService.welcomeEmail(newUser.temp_email, newUser.name, body.type)
          // this.SentWelcomeMailToCustomer(newUser.name, newUser.temp_email);
          let payload = { user_id: newUser._id, scope: 'customer' };
          const access_token = await this.jwtService.signAsync(payload);
          console.log('access_token', access_token);
          await this.model.sessions.create({
            user_id: newUser._id,
            token: access_token,
            scope: 'customer',
            fcm_token: body.fcm_token,
          });
          user = await this.model.customers.findOne({
            email: response?.email,
            is_deleted: false,
          }).populate([{ path: 'current_booking' }]);
          return {
            access_token: access_token,
            data: user,
          };
        } else {
          if (user.is_block === true) {
            throw new HttpException(
              {
                error_code: 'BLOCKED',
                error_description:
                  'Your account is blocked.please contact admin',
              },
              HttpStatus.BAD_REQUEST,
            );
          } else {
            payload = { user_id: user.id, scope: 'customer' };
            const access_token = await this.jwtService.signAsync(payload);
            console.log('access_token', access_token);
            await this.model.sessions.deleteMany({
              user_id: user._id,
            });
            await this.model.sessions.create({
              user_id: user._id,
              token: access_token,
              scope: 'customer',
              fcm_token: body.fcm_token,
            });
            return {
              access_token: access_token,
              data: user,
            };
          }
        }
      }
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async login_with_apple(body) {
    try {
      let payload: any;
      let response = this.jwtService.decode(body.token);
      const customer = await this.stripe.customers.create({
        phone: response?.email.split('@')[0].slice(0, 20),
      });
      let data = {
        name: response?.email.split('@')[0],
        email: response?.email,
        image: response?.picture,
        social_id: response?.sub,
        login_type: 'apple',
        set_up_profile: true,
        device_type: body.device_type,
        is_email_verify: true,
        customer_id: customer.id,
      };
      if (body.type === 'customer') {
        let user = await this.model.customers.findOne({
          email: response?.email,
          is_deleted: false,
        }).populate([{ path: 'current_booking' }]);
        if (!user) {
          let newUser = await this.model.customers.create(data);
          this.emailService.welcomeEmail(newUser.temp_email, newUser.name, body.type)
          // this.SentWelcomeMailToCustomer(newUser.name, newUser.temp_email);
          let payload = { user_id: newUser._id, scope: 'customer' };
          const access_token = await this.jwtService.signAsync(payload);
          await this.model.sessions.create({
            user_id: newUser._id,
            token: access_token,
            scope: 'customer',
            fcm_token: body.fcm_token,
          });
          user = await this.model.customers.findOne({
            email: response?.email,
            is_deleted: false,
          }).populate([{ path: 'current_booking' }])
          return {
            access_token: access_token,
            data: user,
          };
        } else {
          if (user.is_block === true) {
            throw new HttpException(
              {
                error_code: 'BLOCKED',
                error_description:
                  'Your account is blocked.please contact admin',
              },
              HttpStatus.BAD_REQUEST,
            );
          } else {
            payload = { user_id: user.id, scope: 'customer' };
            const access_token = await this.jwtService.signAsync(payload);
            await this.model.sessions.deleteMany({
              user_id: user._id,
            });
            await this.model.sessions.create({
              user_id: user._id,
              token: access_token,
              scope: 'customer',
              fcm_token: body.fcm_token,
            });
            return {
              access_token: access_token,
              data: user,
            };
          }
        }
      } else if (body.type === 'driver') {
        let driver = await this.model.drivers.findOne({
          email: response?.email,
          is_deleted: false,
        });
        if (!driver) {
          let newDriver = await this.model.drivers.create(data);
          let payload = { user_id: newDriver._id, scope: 'driver' };
          const access_token = await this.jwtService.signAsync(payload);
          await this.model.sessions.create({
            user_id: newDriver._id,
            token: access_token,
            scope: 'driver',
            fcm_token: body.fcm_token,
          });
          return {
            access_token: access_token,
            data: newDriver,
          };
        } else {
          payload = { user_id: driver.id, scope: 'driver' };
          const access_token = await this.jwtService.signAsync(payload);
          await this.model.sessions.create({
            user_id: driver._id,
            token: access_token,
            scope: 'driver',
            fcm_token: body.fcm_token,
          });
          return {
            access_token: access_token,
            data: driver,
          };
        }
      }
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async generateOtp() {
    try {
      return Math.floor(1000 + Math.random() * 9000);
    } catch (error) {
      throw error;
    }
  }

  async UpdateFcmToken(id, token) {
    try {
      await this.model.sessions.updateOne(
        { user_id: id },
        { fcm_token: token },
      );
      return { message: 'update successfully' };
    } catch (error) {
      throw error;
    }
  }

  // async SentWelcomeMailToCustomer(name, email) {
  //   try {
  //     const currentDir = __dirname;
  //     const cabAppDir = path.resolve(currentDir, '../../');
  //     let file_path = path.join(
  //       __dirname,
  //       '../../dist/email-template/welcome-mail-customer.hbs',
  //     );
  //     let html = fs.readFileSync(file_path, { encoding: 'utf-8' });
  //     const template = Handlebars.compile(html);
  //     const data = {
  //       name: name,
  //     };
  //     const htmlToSend = template(data);

  //     let mailData = {
  //       to: email,
  //       subject: `Welcome to TipTop Ride ! Your Ride is Just a Tap Away 🚗`,
  //       html: htmlToSend,
  //     };

  //     this.commonService.sendmail(
  //       mailData.to,
  //       mailData.subject,
  //       null,
  //       mailData.html,
  //     );
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  // async SentWelcomeMailToDriver(name, email) {
  //   try {
  //     const currentDir = __dirname;
  //     const cabAppDir = path.resolve(currentDir, '../../');
  //     let file_path = path.join(
  //       __dirname,
  //       '../../dist/email-template/welcome-mail-driver.hbs',
  //     );
  //     let html = fs.readFileSync(file_path, { encoding: 'utf-8' });
  //     // Compile the template
  //     const template = Handlebars.compile(html);
  //     const data = {
  //       name: name,
  //     };
  //     const htmlToSend = template(data);
  //     let mailData = {
  //       to: email,
  //       subject: `Welcome to the TipTop Ride Team! Start Earning Today 🚗`,
  //       html: htmlToSend,
  //     };
  //     this.commonService.sendmail(
  //       mailData.to,
  //       mailData.subject,
  //       null,
  //       mailData.html,
  //     );
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  async resendOtp(type: string, body?: ResendOtpDto) {
    try {
      const query = {
        ...(body &&
          body?.email && {
          $or: [
            { email: body.email.toLowerCase() },
            { temp_email: body.email.toLowerCase() }
          ]
        })
      };
      const userInfo = await this.model.drivers.findOne(query);
      if (!body?.email && userInfo['is_' + type + '_verified']) {
        throw new HttpException(
          {
            error_description: 'Your email is already verified',
            error_code: 'ALREADY_VERIFIED',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (type === 'email') {
        if (body.email && !userInfo) {
          throw new HttpException(
            {
              error_description: 'We are unable to find account with associated this email',
              error_code: 'INVALID_EMAIL',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
        const otp = await this.commonService.generateOtp();
        // const otp = 1234;
        const configuration = await this.model.appConfiguration.findOne();
        const policy_url = `https://staging.tiptopmaxisydney.com.au/driver_policy`;
        this.emailService.emailVerification(body.email ?? userInfo.email, configuration.product_name, userInfo?.name, +otp, policy_url)
        userInfo.temp_email_otp = otp;
        userInfo.is_email_verify = false;
        userInfo.temp_email_otp_at = moment().valueOf()
        userInfo.save();
        throw new HttpException(
          {
            message: 'OTP sent on your ragistered mail',
          },
          HttpStatus.OK,
        );
      } else if (type === 'phone') {
        (userInfo.temp_phone_otp = 1234, userInfo.temp_phone_otp_at = moment().valueOf()),
          (userInfo.is_phone_verify = false);
        userInfo.save();
        throw new HttpException(
          {
            message: 'OTP sent on your ragistered phone',
          },
          HttpStatus.OK,
        );
      } else {
        throw new HttpException(
          {
            error_description: 'Something went wrong!!',
            error_code: 'FAILED_REQUEST',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      console.log('from resent otp =>', error);
      throw error;
    }
  }
}
