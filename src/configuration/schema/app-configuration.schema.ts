import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as moment from "moment";
import mongoose, { HydratedDocument } from "mongoose";
class support {
  @Prop({ default: null })
  email: string;

  @Prop({ default: null })
  country_code: string;

  @Prop({ default: null })
  call: string;

  @Prop({ default: null })
  skype: string;
}

// class stripe {
//   @Prop({ default: null })
//   stripe_publishable_key: string;

//   @Prop({ default: null })
//   stripe_secret_key: string;
// }

// class twilio {
//   @Prop({ default: null })
//   twilio_account_sid: string;

//   @Prop({ default: null })
//   twilio_auth_token: string;

//   @Prop({ default: null })
//   twilio_phone_number: string;
// }

class social_links {
  @Prop({ default: null })
  facebook_url: string;

  @Prop({ default: null })
  instagram_url: string;

  @Prop({ default: null })
  youtube_url: string;
}

class email_creds {
  @Prop({ default: null })
  AppEmail: string;

  @Prop({ default: null })
  AppPassword: string;

}

class tax {
  @Prop({ default: null })
  tax_keyword: string;

  @Prop({ default: null })
  tax_keyword_hindi: string;


  @Prop({ default: null })
  tax_percentage: string;

}

@Schema()
export class AppConfiguration {
  @Prop({ default: null })
  product_name: string;

  @Prop({ type: support })
  support: support;

  // @Prop({ type: stripe })
  // stripe: stripe;

  // @Prop({ type: twilio })
  // twilio: twilio;

  // @Prop({ default: null })
  // fcm_key: string;

  @Prop({ type: email_creds })
  email_creds: email_creds;

  @Prop({ type: social_links })
  social_links: social_links;

  @Prop({ type: tax })
  tax: tax;

  @Prop({ default: 0 })
  cancellation_charges: number;

  @Prop({ default: 0 })
  airport_toll: number;

  @Prop({ default: 0 })
  gov_levy: number;
}

export type AppConfigurationDocument = HydratedDocument<AppConfiguration>
export const AppConfigurationModel = SchemaFactory.createForClass(AppConfiguration)