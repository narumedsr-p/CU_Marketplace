import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { UserClaims } from '@workspace/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiOperation({ summary: 'getCategories()' })
  @Get()
  getCategories() {
    return this.categoriesService.findAll();
  }

  @ApiOperation({ summary: 'createCategory()' })
  @Post()
  createCategory(@Body() body: any, @CurrentUser() user: UserClaims) {
    return this.categoriesService.create(body, user.role);
  }

  @ApiOperation({ summary: 'updateCategory()' })
  @Put(':categoryId')
  updateCategory(
    @Param('categoryId') categoryId: string,
    @Body() body: any,
    @CurrentUser() user: UserClaims,
  ) {
    return this.categoriesService.update(categoryId, body, user.role);
  }

  @ApiOperation({ summary: 'deleteCategory()' })
  @Delete(':categoryId')
  deleteCategory(@Param('categoryId') categoryId: string, @CurrentUser() user: UserClaims) {
    return this.categoriesService.remove(categoryId, user.role);
  }
}
