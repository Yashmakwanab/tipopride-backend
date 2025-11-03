import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import { CreateConfigurationDto } from './dto/create-configuration.dto';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { ApiTags } from '@nestjs/swagger';

@Controller('configuration')
@ApiTags('app_configuration')
export class ConfigurationController {
  constructor(private readonly configurationService: ConfigurationService) {}

  @Get()
  findAll() {
    return this.configurationService.findAll();
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateConfigurationDto: UpdateConfigurationDto,
  ) {
    return this.configurationService.update(id, updateConfigurationDto);
  }
}
