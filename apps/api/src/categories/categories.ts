import { Controller, Get, Module } from '@nestjs/common';

export const CATEGORIES = [
  { id: 'food', name: 'Food' },
  { id: 'transport', name: 'Transport' },
  { id: 'shopping', name: 'Shopping' },
  { id: 'education', name: 'Education' },
  { id: 'bills', name: 'Bills' },
  { id: 'other', name: 'Other' },
];

export const categoryName = (id: string): string => CATEGORIES.find((c) => c.id === id)?.name ?? id;

@Controller('categories')
export class CategoriesController {
  @Get()
  list() {
    return CATEGORIES;
  }
}

@Module({ controllers: [CategoriesController] })
export class CategoriesModule {}
