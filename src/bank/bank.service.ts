import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AddBankDto, editBankDto } from './dto/bank.dto';
import { DbService } from 'src/db/db.service';

import { Types } from 'mongoose';
import * as moment from 'moment';
import { PaymentService } from 'src/payment/payment.service';
import { CommonService } from 'src/common/common.service';
import Stripe from 'stripe';
import { InjectStripe } from 'nestjs-stripe';

@Injectable()
export class BankService {
  constructor(
    @InjectStripe() private readonly stripe: Stripe,
    private readonly model: DbService,
    private readonly paymentService: PaymentService,
    private readonly commonService: CommonService

  ) { }

  async addBank(body: AddBankDto, user_id: string, req) {
    try {
      let update_driver
      let language = req.headers['language'] || 'english';
      const key = 'Bank added successfully';
      const localization = await this.commonService.localization(language, key)
      let driver = await this.model.drivers.findById({ _id: new Types.ObjectId(user_id) })
      if (!driver.customer_id) {
        const stripe_customer = await this.stripe.customers.create({
          name: driver.name,
          email: driver.email,
        });

        update_driver = await this.model.drivers.findOneAndUpdate(
          { _id: driver._id },
          { customer_id: stripe_customer.id },
          { new: true },
        );
      }

      let file = await this.paymentService.uploadDoc(body.file)
      // let bank = await this.paymentService.addBank(body, driver.name,driver.preferred_currency)
      // let account = await this.paymentService.AddAccount(body, bank?.id, driver,driver?.customer_id || update_driver.customer_id,file?.id)
      await this.model.banks.create({
        created_at: moment().utc().valueOf(),
        driver_id: driver?._id,
        country_code: body.country_code,
        phone: body.phone,
        address: body.address,
        country: body.country,
        first_name: body.first_name,
        last_name: body.last_name,
        currency: 'aud',
        customer: driver?.customer_id,
        account_number: body.account_number,
        bsb_number: body.bsb_number,
        tax_file_number: body.tax_file_number,
        date_of_birth: body.date_of_birth,
        // account_id: account?.id,
        file: file.id,
        file_path: body?.file,
      })
      await this.model.drivers.updateOne({ _id: driver?._id }, { is_bank_added: true })
      throw new HttpException({ message: localization[language] }, HttpStatus.OK)
    } catch (error) {
      console.log(error);
      throw error
    }
  }

  async get_bank_detail(user_id) {
    try {
      const data = await this.model.banks.findOne({ driver_id: user_id })
      return { data: data }
    } catch (error) {
      throw error
    }
  }

  async editBank(body: editBankDto, user_id: string, req) {
    try {
      const language = req.headers['language'] || 'english';
      const localizationKey = 'Bank added successfully';
      const localization = await this.commonService.localization(language, localizationKey);

      let driver = await this.model.drivers.findById(new Types.ObjectId(user_id));
      if (!driver) {
        throw new HttpException('Driver not found', HttpStatus.NOT_FOUND);
      }

      // Create Stripe customer if not exists
      if (!driver.customer_id) {
        const stripeCustomer = await this.stripe.customers.create({
          name: driver.name,
          email: driver.email,
        });

        driver = await this.model.drivers.findOneAndUpdate(
          { _id: driver._id },
          { customer_id: stripeCustomer.id },
          { new: true }
        );
      }

      // Add bank and upload file
      // const bank = await this.paymentService.addBank(body, driver.name, driver.preferred_currency);
      const file = await this.paymentService.uploadDoc(body.file);

      // Create account with uploaded file & bank
      // const account = await this.paymentService.AddAccount(
      //   body,
      //   bank?.id,
      //   driver,
      //   driver.customer_id,
      //   file?.id
      // );

      // Update bank details
      await this.model.banks.updateOne(
        { _id: body.bank_id },
        {
          updated_at_at: moment().utc().valueOf(),
          driver_id: driver._id,
          country_code: body.country_code,
          phone: body.phone,
          address: body.address,
          country: body.country,
          first_name: body.first_name,
          last_name: body.last_name,
          currency: 'aud',
          customer: driver.customer_id,
          account_number: body.account_number,
          bsb_number: body.bsb_number,
          tax_file_number: body.tax_file_number,
          date_of_birth: body.date_of_birth,
          // account_id: account?.id,
          file: file?.id,
          file_path: body.file
        }
      );

      // Return success
      throw new HttpException({ message: localization[language] }, HttpStatus.OK);
    } catch (error) {
      console.error('editBank error:', error);
      throw error;
    }
  }

}
