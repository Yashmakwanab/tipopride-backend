import { Injectable } from '@nestjs/common';
import { AddCardsDto, UpdateCardDto } from './dto/card.dto';
import { DbService } from 'src/db/db.service';
import { CommonService } from 'src/common/common.service';
import * as mongoose from 'mongoose';
@Injectable()
export class CardService {
  constructor(
    private readonly model: DbService,
    private readonly commonService: CommonService,
  ) {}

  async create(body: AddCardsDto, payload) {
    try {
      const card_already_exist = await this.model.cards.findOne({
        customer_id: payload.user_id,
        card_no: body.card_number,
      });
      if (card_already_exist) {
        await this.model.cards.updateOne(
          { _id: card_already_exist._id },
          {
            payment_method_id: body.payment_method_id,
            card_holder_name: body.card_holder_name,
            expiry_date: body.expiry_date,
            cvv: body.cvv,
          },
        );
        const data = await this.model.cards.findOne({
          _id: card_already_exist,
        });
        return { data: data };
      } else {
        let data = {
          customer_id: payload.user_id,
          card_no: body.card_number,
          card_holder_name: body.card_holder_name,
          cvv: body.cvv,
          expiry_date: body.expiry_date,
          payment_method_id: body.payment_method_id,
        };
        await this.model.customers.updateOne(
          { _id: new mongoose.Types.ObjectId(payload.user_id) },
          { is_card_added: true },
        );
        const addcard = await this.model.cards.create(data);
        return { data: addcard };
      }
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async findAll(payload) {
    try {
      const data = await this.model.cards.find({
        customer_id: new mongoose.Types.ObjectId(payload.user_id),
      });
      return { data: data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const data = await this.model.cards.findOne({ _id: id });
      return { data: data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async update(id: string, updateCardDto: UpdateCardDto, req) {
    try {
      let language = req.headers['language'] || 'english';
      const key = 'card_update';
      const localization = await this.commonService.localization(language, key);
      await this.model.cards.updateOne(
        { _id: id },
        updateCardDto,
      );
      return { message: localization[language] };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async remove(id: string, req) {
    try {
      let language = req.headers['language'] || 'english';
      const key = 'card_delete';
      const localization = await this.commonService.localization(language, key);
     await this.model.cards.deleteOne({ _id: id });
      return { message: localization[language] };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }
}
