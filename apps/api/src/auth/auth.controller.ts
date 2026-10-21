import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { config } from '../app.config';
import { COOKIE_NAME, Public } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user';
import { StoreService } from '../common/store.service';
import { LoginDto, RegisterDto } from './auth.dto';

const MAX_AGE_MS = 7 * 24 * 3600 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly store: StoreService,
    private readonly jwt: JwtService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    if (this.store.users.some((u) => u.email === dto.email)) {
      throw new ConflictException('An account with this email already exists');
    }
    const user = {
      id: randomUUID(),
      email: dto.email,
      passwordHash: await bcrypt.hash(dto.password, 10),
      createdAt: new Date().toISOString(),
    };
    this.store.users.push(user);
    this.store.save();
    return { id: user.id, email: user.email };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = this.store.users.find((u) => u.email === dto.email);
    const ok = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;
    if (!user || !ok) throw new UnauthorizedException('Invalid email or password');
    const token = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      { secret: config.jwtSecret, expiresIn: '7d' },
    );
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: MAX_AGE_MS,
      path: '/',
    });
    return { id: user.id, email: user.email };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(COOKIE_NAME, { path: '/' });
  }

  @Get('me')
  me(@CurrentUser() user: { id: string; email: string }) {
    return { id: user.id, email: user.email };
  }
}
