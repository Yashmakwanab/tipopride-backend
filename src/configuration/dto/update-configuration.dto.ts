import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateConfigurationDto } from './create-configuration.dto';

export class UpdateConfigurationDto {
  @ApiProperty()
  product_name: String;

  @ApiProperty({
    type: Object,
    properties: {
      email: { type: 'string' },
      call: { type: 'string' },
      skype: { type: 'string' },
    },
    required: false,
  })
  support: { email: string; call: string; skype: string };

  @ApiProperty({
    type: Object,
    properties: {
      twilio_account_sid: { type: 'string' },
      twilio_auth_token: { type: 'string' },
      twilio_phone_number: { type: 'string' },
    },
    required: false,
  })
  twilio: {
    twilio_account_sid: string;
    twilio_auth_token: string;
    twilio_phone_number: string;
  };

  @ApiProperty({
    type: Object,
    properties: {
      stripe_publishable_key: { type: 'string' },
      stripe_secret_key: { type: 'string' },
    },
    required: false,
  })
  stripe: { stripe_publishable_key: string; stripe_secret_key: string };


  @ApiProperty({
    type: Object,
    properties: {
      tax_keyword: { type: 'string' },
      tax_keyword_hindi: { type: 'string' },
      tax_percentage: { type: 'string' },
    },
    required: false,
  })
  tax: { tax_keyword: string; tax_percentage: string;tax_keyword_hindi:string };


  @ApiProperty()
  fcm_key: String;

  @ApiProperty()
  cancellation_charges: number;

  @ApiProperty({
    type: Object,
    properties: {
        AppEmail: { type: 'string' },
      AppPassword: { type: 'string' },
    },
    required: false,
  })
  email_creds: { AppEmail: string; AppPassword: string };

  @ApiProperty({
    type: Object,
    properties: {
      facebook_url: { type: 'string' },
      instagram_url: { type: 'string' },
      youtube_url: { type: 'string' },
    },
    required: false,
  })
  social_links: {
    facebook_url: string;
    instagram_url: string;
    youtube_url: string;
  };
}

