import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { PaymentModule } from 'src/payment/payment.module';

@Module({
  imports: [PaymentModule],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule { }
