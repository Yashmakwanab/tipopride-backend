import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ReviewService } from './review.service';
import { AddReviewDto } from './dto/review.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { Roles } from 'src/auth/decorators/role.decorators';
import { UsersType } from 'src/auth/role/user.role';


@Controller('review')
@ApiTags('Reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) { }

  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'add reviews for driver & customer' })
  @Post()
  create(@Body() body: AddReviewDto, @Request() req) {
    return this.reviewService.create(body, req.payload, req);
  }

  @ApiBearerAuth('authorization')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'get overall ratings and review list for driver & customer' })
  @Get()
  findAll(@Request() req, @Query('page') page: number, @Query('limit') limit: number) {
    return this.reviewService.findAll(req.payload, page, limit);
  }



  // @Patch(':id')
  // update(@Param('id') id: string) {
  //   return this.reviewService.update(+id, updateReviewDto);
  // }


}
