import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { DbService } from 'src/db/db.service';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from 'src/constants';
import { CustomerAggregation } from './customer.aggreagtion';

@Module({
  imports:[ JwtModule.register({
    global: true,
    secret: jwtConstants.secret,
  
   
  })],
  controllers: [CustomerController],
  providers: [CustomerService,CustomerAggregation],
})
export class CustomerModule {}
