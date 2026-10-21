import { BadRequestException, Controller, Get, Module, Query } from '@nestjs/common';
import { categoryName } from '../categories/categories';
import { CurrentUser } from '../common/current-user';
import { fromCents, isMonth } from '../common/money';
import { ExpenseRecord, StoreService } from '../common/store.service';
import { byNewest, present } from '../expenses/expenses.controller';

type User = { id: string };

@Controller()
export class DashboardController {
  constructor(private readonly store: StoreService) {}

  private inMonth(user: User, month: string): ExpenseRecord[] {
    return this.store.expenses.filter((e) => e.userId === user.id && e.date.startsWith(`${month}-`));
  }

  @Get('dashboard')
  dashboard(@CurrentUser() user: User) {
    const month = new Date().toISOString().slice(0, 7);
    const rows = this.inMonth(user, month);
    return {
      month,
      total: fromCents(rows.reduce((s, e) => s + e.amountCents, 0)),
      count: rows.length,
      recent: [...rows].sort(byNewest).slice(0, 5).map(present),
    };
  }

  @Get('summary')
  summary(@CurrentUser() user: User, @Query('month') month?: string) {
    if (!isMonth(month)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: [{ field: 'month', message: 'month must be YYYY-MM' }],
      });
    }
    const rows = this.inMonth(user, month);
    const sums = new Map<string, { cents: number; count: number }>();
    for (const e of rows) {
      const s = sums.get(e.categoryId) ?? { cents: 0, count: 0 };
      s.cents += e.amountCents;
      s.count += 1;
      sums.set(e.categoryId, s);
    }
    const breakdown = [...sums.entries()]
      .sort((a, b) => b[1].cents - a[1].cents)
      .map(([categoryId, s]) => ({
        categoryId,
        category: categoryName(categoryId),
        amount: fromCents(s.cents),
        count: s.count,
      }));
    return { month, total: fromCents(rows.reduce((s, e) => s + e.amountCents, 0)), breakdown };
  }
}

@Module({ controllers: [DashboardController] })
export class DashboardModule {}
