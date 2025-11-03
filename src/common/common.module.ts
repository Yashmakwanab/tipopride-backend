import { Global, Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { TwilioModule } from 'nestjs-twilio';
import { MailerModule } from '@nestjs-modules/mailer';
import { join } from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { EmailService } from './common.emails.sesrvice';
import { SendGridEmailService } from './common.sendgrid.service';
import { SendMsg91Service } from './common.email.msg91.service';

@Global()
@Module({

  imports: [
    TwilioModule.forRootAsync({
      useFactory: () => ({
        accountSid: process.env.TWILIO_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN
      })
    }),
    MailerModule.forRoot({
      transport: {
        host: process.env.HOST,
        port: process.env.EMAIL_PORT,
        secure: true,
        auth: {
          user: process.env.NODEMAILER_MAIL,
          pass: process.env.NODEMAILER_PASSWORD
        },
        tls: {
          rejectUnauthorized: false
        }
      },
      template: {
        dir: join(__dirname, '../email-template/'), //process.cwd() + '/dist/templates/',
        adapter: new HandlebarsAdapter(),
        options: {
          strict: false,
        },
      },
    })
  ],
  providers: [CommonService, EmailService, SendGridEmailService, SendMsg91Service],

  exports: [CommonService, EmailService]
})
export class CommonModule { }
