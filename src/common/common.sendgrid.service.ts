

import { Injectable } from "@nestjs/common";
import axios from 'axios';


@Injectable()
export class SendGridEmailService {
    constructor(

    ) { }

    private readonly SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';
    private readonly SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    
    async sendEmailUsingSendGrid(to: string, subject: string, body: string, attachments?: { filename: string; content: any }[]) {
      try {
        const payload: any = {
          personalizations: [
            {
              to: [{ email: to }],
              subject,
            },
          ],
          from: {
            email: 'support@tiptopride.com.au',
            name: 'Tip Top Ride',
          },
          content: [
            {
              type: 'text/html',
              value: body,
            },
          ],
        };
    
        if (attachments && attachments.length > 0) {
          payload.attachments = attachments.map(att => ({
            content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content,
            filename: att.filename,
            type: 'application/pdf',
            disposition: 'attachment',
          }));
        }
    
        const headers = {
          Authorization: `Bearer ${this.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        };
    
        const response = await axios.post(this.SENDGRID_API_URL, payload, { headers });
        return response.data;
      } catch (error) {
        console.error('SendGrid email send failed:', error.response?.data || error.message);
        throw new Error('Email send failed');
      }
    }


}

