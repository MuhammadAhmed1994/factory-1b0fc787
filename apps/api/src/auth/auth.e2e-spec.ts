import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp } from '../test/helpers';

describe('auth', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(() => app.close());
  const http = () => request(app.getHttpServer());

  it('AC-1 registers without leaking password', async () => {
    const res = await http().post('/auth/register').send({ email: 'A@x.com ', password: 'password123' }).expect(201);
    expect(res.body.email).toBe('a@x.com');
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);
  });

  it('AC-2 duplicate 409, invalid 400', async () => {
    await http().post('/auth/register').send({ email: 'a@x.com', password: 'password123' }).expect(409);
    await http().post('/auth/register').send({ password: 'password123' }).expect(400);
    await http().post('/auth/register').send({ email: 'nope', password: 'password123' }).expect(400);
    const res = await http().post('/auth/register').send({ email: 'b@x.com' }).expect(400);
    expect(res.body.errors[0].field).toBe('password');
  });

  it('AC-3 login ok and generic 401', async () => {
    const ok = await http().post('/auth/login').send({ email: 'a@x.com', password: 'password123' }).expect(200);
    expect(String(ok.headers['set-cookie'])).toMatch(/HttpOnly/i);
    const bad = await http().post('/auth/login').send({ email: 'a@x.com', password: 'wrongpass1' }).expect(401);
    const unknown = await http().post('/auth/login').send({ email: 'z@x.com', password: 'wrongpass1' }).expect(401);
    expect(bad.body.message).toBe(unknown.body.message);
  });

  it('AC-4 protected routes need a credential', async () => {
    for (const p of ['/auth/me', '/expenses', '/dashboard', '/summary?month=2025-01', '/expenses/x']) {
      await http().get(p).expect(401);
    }
    await http().post('/expenses').send({}).expect(401);
    await http().patch('/expenses/x').send({}).expect(401);
    await http().delete('/expenses/x').expect(401);
  });
});
