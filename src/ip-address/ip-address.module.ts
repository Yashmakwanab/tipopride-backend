import { Module } from '@nestjs/common';
import { IpAddressService } from './ip-address.service';
import { IpAddressController } from './ip-address.controller';

@Module({
  controllers: [IpAddressController],
  providers: [IpAddressService],
})
export class IpAddressModule {}
