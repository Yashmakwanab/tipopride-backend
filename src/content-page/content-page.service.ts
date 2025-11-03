import { Injectable } from '@nestjs/common';
import { CreateContentPageDto } from './dto/create-content-page.dto';
import { UpdateContentPageDto } from './dto/update-content-page.dto';
import { DbService } from 'src/db/db.service';
import { ContentPageAggregation } from './content-page.aggregation';
import * as moment from "moment";

@Injectable()
export class ContentPageService {
  constructor(private readonly model: DbService,
    private readonly contentPageAggregation: ContentPageAggregation
  ) { }
  async bootstrap_pages() {
    let fetch_data: any = await this.model.pages.find();
    if (fetch_data.length < 1) {
      console.log("pages created")
      const saveData = [
        {
          title_slug: 'term_&_condition',
          title: 'Terms & Conditions',
          type: 'customer',
          description:
            "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
        },
        {

          title_slug: 'privacy_policy',
          title: 'Privacy Policy',
          type: 'customer',
          description:
            "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
        },
        {

          title_slug: 'about_us',
          title: 'About us',
          type: 'customer',
          description:
            "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
        },

        {

          title_slug: 'term_&_condition',
          title: 'Terms & Conditions',
          type: 'driver',
          description:
            "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
        },
        {

          title_slug: 'privacy_policy',
          title: 'Privacy Policy',
          type: 'driver',
          description:
            "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
        },
        {

          title_slug: 'about_us',
          title: 'About us',
          type: 'driver',
          description:
            "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
        },

      ];

      await this.model.pages.create(saveData);

    }
  }

  async findAll(body) {
    try {
      let data_to_aggregate = [
        await this.contentPageAggregation.match(body.status)
      ]
      let data = await this.model.pages.aggregate(data_to_aggregate)
      return { data: data }
    } catch (error) {
      console.log("error", error);
      throw error;

    }
  }

  async findOne(id: string) {
    try {
      const data = await this.model.pages.findOne({ _id: id })
      return { data: data }
    } catch (error) {
      console.log("error", error);
      throw error

    }
  }

  async find_with_name(body) {
    try {
      const data = await this.model.pages.findOne({ type: body.type, title_slug: body.name })
      return { data: data }
    } catch (error) {
      console.log("error", error);
      throw error

    }
  }

  async update(id: string, updateContentPageDto: UpdateContentPageDto) {
    try {
      await this.model.pages.updateOne({ _id: id }, {
        description: updateContentPageDto.description,
        updated_at: moment().utc().valueOf()
      })
      return { message: "message update successfully" }
    } catch (error) {
      console.log("error", error);
      throw error;

    }
  }

}