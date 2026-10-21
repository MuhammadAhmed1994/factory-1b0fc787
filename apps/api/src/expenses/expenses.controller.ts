import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CATEGORIES } from '../categories/categories';
import { CurrentUser } from '../common/current-user';
import { fromCents, isRealDate, toCents } from '../common/money';
import { ExpenseRecord, StoreService } from '../common/store.service';
import { CreateExpenseDto, UpdateExpenseDto } from './expenses.dto';

type User = { id: string };

export function present(e: ExpenseRecord) {
  return {
    id: e.id,
    title: e.title,
    amount: fromCents(e.amountCents),
    date: e.date,
    categoryId: e.categoryId,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

export function byNewest(a: ExpenseRecord, b: ExpenseRecord): number {
  return a.date < b.date ? 1 : a.date > b.date ? -1 : b.seq - a.seq;
}

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly store: StoreService) {}

  private owned(user: User, id: string): ExpenseRecord {
    const found = this.store.expenses.find((e) => e.id === id && e.userId === user.id);
    if (!found) throw new NotFoundException('Expense not found');
    return found;
  }

  @Get()
  list(
    @CurrentUser() user: User,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const errors: { field: string; message: string }[] = [];
    if (from && !isRealDate(from)) errors.push({ field: 'from', message: 'from must be YYYY-MM-DD' });
    if (to && !isRealDate(to)) errors.push({ field: 'to', message: 'to must be YYYY-MM-DD' });
    if (errors.length) throw new BadRequestException({ statusCode: 400, message: 'Validation failed', errors });
    const needle = typeof search === 'string' ? search.trim().toLowerCase() : '';
    return this.store.expenses
      .filter((e) => e.userId === user.id)
      .filter((e) => !needle || e.title.toLowerCase().includes(needle))
      .filter((e) => !category || e.categoryId === category)
      .filter((e) => !from || e.date >= from)
      .filter((e) => !to || e.date <= to)
      .sort(byNewest)
      .map(present);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateExpenseDto) {
    const now = new Date().toISOString();
    const rec: ExpenseRecord = {
      id: randomUUID(),
      userId: user.id,
      categoryId: dto.categoryId,
      title: dto.title,
      amountCents: toCents(dto.amount),
      date: dto.date,
      seq: this.store.nextSeq(),
      createdAt: now,
      updatedAt: now,
    };
    this.store.expenses.push(rec);
    this.store.save();
    return present(rec);
  }

  @Get(':id')
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return present(this.owned(user, id));
  }

  @Patch(':id')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    const rec = this.owned(user, id);
    if (dto.title !== undefined) rec.title = dto.title;
    if (dto.amount !== undefined) rec.amountCents = toCents(dto.amount);
    if (dto.date !== undefined) rec.date = dto.date;
    if (dto.categoryId !== undefined) rec.categoryId = dto.categoryId;
    rec.updatedAt = new Date().toISOString();
    this.store.save();
    return present(rec);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: User, @Param('id') id: string): void {
    const rec = this.owned(user, id);
    this.store.expenses = this.store.expenses.filter((e) => e !== rec);
    this.store.save();
  }
}

export const KNOWN_CATEGORY_IDS = CATEGORIES.map((c) => c.id);
