import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories';
import { CommonModule } from './common/common.module';
import { DashboardModule } from './dashboard/dashboard.controller';
import { ExpensesModule } from './expenses/expenses.module';

@Module({
  imports: [CommonModule, AuthModule, CategoriesModule, ExpensesModule, DashboardModule],
})
export class AppModule {}
