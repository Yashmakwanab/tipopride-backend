import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

import * as fs from 'fs'
import * as morgan from 'morgan'


const SSL = process.env.SSL || false
const PORT = process.env.LOCAL_PORT;
const CERT = process.env.SSL_CERT;
const PRIV_KEY = process.env.SSL_PRIV_KEY;

async function bootstrap() {

  let httpsOptions = {}
  if (SSL == "true") {
    httpsOptions = {
      key: fs.readFileSync(PRIV_KEY),
      cert: fs.readFileSync(CERT),
    };
  }
  const app = SSL == "true" ? await NestFactory.create(AppModule, { httpsOptions }) : await NestFactory.create(AppModule);
  app.enableCors();
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
  const config = new DocumentBuilder()
    .setTitle('Tiptop ride')
    .setDescription('')
    .addBearerAuth({ type: 'http', name: 'token', in: 'header' }, 'authorization')
    .addServer(`http://localhost:${process.env.PORT}`, 'local server')
    .addServer(`http://192.168.0.249:${process.env.PORT}`, 'local server')
    .addServer("https://staging.tiptopmaxisydney.com.au:3003", 'optimization server')
    .addServer(`http://staging.api.nexus1.tiptopride.com.au`, "staging server")
    .addServer(`https://dev.tiptopmaxisydney.com.au:3002`, "dev server")
    .addServer(`https://bookings.tiptopride.com.au:3000`, "live server")
    .setVersion('1.0')
    .addTag('Apis')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  await app.listen(process.env.PORT);
  Logger.log(`🚀 Application is running on: http://localhost:${process.env.PORT}`)
}
bootstrap();



