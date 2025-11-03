

import { Injectable } from "@nestjs/common";
import axios from 'axios';

@Injectable()
export class SendMsg91Service {
  private readonly MSG91_API_URL = 'https://control.msg91.com/api/v5/email/send';
  private readonly AUTH_KEY = '454209Ahv3Rk6Fn683d3cf6P1';

  constructor() { }

  async sendEmail(recipients, template_id: string, pdf?: any) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'authkey': this.AUTH_KEY,
    };
    const body: any = {
      recipients: recipients,
      from: {
        email: 'support@tiptopride.com.au',
      },
      domain: 'tiptopride.com.au',
      template_id: template_id,
    };

    if (pdf) {
      body.attachments = [
        {
          content: pdf,
          filename: 'invoice.pdf',
          type: 'application/pdf',
        },
      ];
    }

    try {
      const response = await axios.post(this.MSG91_API_URL, body, { headers });
      return response.data;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error
    }
  }


}

