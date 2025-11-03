import { Injectable } from '@nestjs/common';
import { CreateConfigurationDto } from './dto/create-configuration.dto';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { DbService } from 'src/db/db.service';

@Injectable()
export class ConfigurationService {
  constructor(public readonly model: DbService) { }

  async findAll() {
    const data = await this.model.appConfiguration.find();
    return { data: data };
  }

  async update(id: string, updateConfigurationDto: UpdateConfigurationDto) {
    try {
      await this.model.appConfiguration.updateOne(
        { _id: id },
        updateConfigurationDto,
      );
      return { mesage: 'configuration successfully updated' };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async bootstrap_configuration() {
    let fetch_data: any = await this.model.appConfiguration.find();
    if (fetch_data.length < 1) {
      const saveData = [
        {
          product_name: "TipTop Ride",
          support: { email: "support@tiptopmaxisydney.com.au", call: null, skype: null },
          stripe: { stripe_publishable_key: null, stripe_secret_key: null },
          twilio: {
            twilio_account_sid: null,
            twilio_auth_token: null,
            twilio_phone_number: null,
          },
          fcm_key: null,
          email_creds: { AppEmail: null, AppPassword: null },
          tax: { tax_keyword: "GST", tax_keyword_hindi: "GST", tax_percentage: "10" },
          social_links: {
            facebook_url: null,
            instagram_url: null,
            youtube_url: null,
          },
          cancellation_charges: 25,
          airport_toll: 5.45,
          gov_levy: 1.20
        },
      ];

      let data = await this.model.appConfiguration.create(saveData);
    }
  }
}
