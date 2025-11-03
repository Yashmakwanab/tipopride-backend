import { Injectable } from '@nestjs/common';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { DbService } from 'src/db/db.service';
import { FaqAggregation } from './faq.aggregation';
import { CommonService } from 'src/common/common.service';

@Injectable()
export class FaqService {
  constructor(
    private readonly model: DbService,
    private readonly faqAggregation: FaqAggregation,
    private readonly commonService: CommonService,
  ) {}
  async create(createFaqDto: CreateFaqDto) {
    try {
      await this.model.faqs.create(createFaqDto);
      return { message: 'Faq add successfully' };
    } catch (error) {
      throw error;
    }
  }

  async findAll(body) {
    try {
      let options = await this.commonService.set_options(body.page, body.limit);
      let data_to_aggregate = [
        await this.faqAggregation.match(body.status),
        await this.faqAggregation.fillter_data(body.search),
        await this.faqAggregation.project(),
        await this.faqAggregation.face_set(options),
      ];
      const data = await this.model.faqs.aggregate(data_to_aggregate);
      return { count: data[0]?.count[0]?.count, data: data[0]?.data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async findAllForApps(body) {
    try {
      let data_to_aggregate = [
        await this.faqAggregation.match(body.status),
        await this.faqAggregation.project(),
      ];
      const data = await this.model.faqs.aggregate(data_to_aggregate);
      return {data: data };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async findOne(id: string) {
    const data = await this.model.faqs.findOne({ _id: id });
    return data;
  }

  async update(id: string, updateFaqDto: UpdateFaqDto) {
    try {
     await this.model.faqs.updateOne({ _id: id }, updateFaqDto);
      return { message: 'Faq update successfully' };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.model.faqs.deleteOne({ _id: id });
      return { message: 'Deleted successfully' };
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }
}
