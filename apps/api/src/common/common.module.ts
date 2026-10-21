import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { StoreService } from './store.service';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [StoreService, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [StoreService, JwtModule],
})
export class CommonModule {}
