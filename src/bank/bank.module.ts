import { Module } from '@nestjs/common';
import { BankService } from './bank.service';
import { BankController } from './bank.controller';
import { DbModule } from 'src/db/db.module';
import { PaymentModule } from 'src/payment/payment.module';


@Module({
  imports:[
    DbModule,
    PaymentModule
  ],
  controllers: [BankController],
  providers: [BankService],
})
export class BankModule {}
