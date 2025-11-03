import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as moment from 'moment';
import { HydratedDocument } from 'mongoose';

@Schema()
export class Languages {
  @Prop({ default: null })
  key: string;

  @Prop({ default: null })
  english: string;

  @Prop({ default: null })
  hindi: string;

  @Prop({ default: null })
  spanish: string;

  @Prop({ default: null })
  french: string;

  @Prop({ type: Number, default: moment().utc().valueOf() })
  created_at: number;

  @Prop({ type: Number, default: null })
  updated_at: number;
}

export type LanguagesDocment = HydratedDocument<Languages>;
export const LanguagesModel = SchemaFactory.createForClass(Languages);
