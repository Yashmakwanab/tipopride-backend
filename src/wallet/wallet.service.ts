import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { addMoneyDto } from './dto/wallet.dto';
import { PaymentService } from 'src/payment/payment.service';
import { DbService } from 'src/db/db.service';
import { BookingService } from 'src/booking/booking.service';
import { InjectStripe } from 'nestjs-stripe';
import Stripe from 'stripe';
import { PaymentType } from 'src/payment/dto/payment.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectStripe() private readonly stripe: Stripe,
    private readonly paymentService: PaymentService,
    private readonly model: DbService,
    private readonly bookingService: BookingService,
  ) { }
  async create(body: addMoneyDto, customer_id) {
    try {
      let currency_convert_amount;
      const customer = await this.model.customers.findOne({ _id: customer_id });
      if (customer.preferred_currency === 'INR' && body.amount < 43) {
        throw new HttpException(
          {
            error_code: 'The minimum amount required is ₹43',
            error_description: 'The minimum amount required is ₹43.',
          },
          HttpStatus.BAD_REQUEST,
        );
      } else if (customer.preferred_currency === 'USD' && body.amount < 0.5) {
        throw new HttpException(
          {
            error_code: 'The minimum amount required is $0.50',
            error_description: 'The minimum amount required is $0.50.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      // if (customer.preferred_currency === 'INR') {
      //   currency_convert_amount =
      //     await this.bookingService.convert_payment_amount(
      //       customer.preferred_currency,
      //       body.amount,
      //     );
      // }

      const data = {
        amount: body.amount * 100,
        currency: 'usd',
        customer: customer.customer_id,
        automatic_payment_methods: { enabled: true },
        metadata: {
          amount: body.amount,
          customer_id: customer_id,
          currency: customer.preferred_currency,
          currency_convert_amount: currency_convert_amount,
          type: PaymentType.Wallet,
          user_id: String(customer?._id),
        },
      };
      const intent = await this.stripe.paymentIntents.create(data);
      return {
        client_secret: intent?.client_secret,
        amount: Math.round(body.amount),
      };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async findAll(customer_id, page, limit) {
    try {
      const customer = await this.model.customers.findOne({ _id: customer_id });
      const skip = (page - 1) * limit;
      const data: any = await this.model.wallet
        .find({ customer_id: customer_id })
        .populate([{ path: 'booking_id' }])
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit);

      const convertedDataPromises = data.map(async (entry) => {
        // const response = await this.bookingService.convert_wallet_amount(
        //   customer.preferred_currency,
        //   entry.amount,
        // );
        const roundedAmount = Math.round(entry.amount * 100) / 100;
        return {
          ...entry._doc,
          amount: roundedAmount,
        };
      });

      const convertedData = await Promise.all(convertedDataPromises);
      console.log('convertedData................', convertedData);

      const data_count = await this.model.wallet.countDocuments({
        customer_id: customer_id,
      });

      return { count: data_count, data: convertedData };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }
}
