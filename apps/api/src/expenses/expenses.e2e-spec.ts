import { INestApplication } from '@nestjs/common';
import { createApp, login } from '../test/helpers';

describe('expenses, dashboard, summary', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(() => app.close());

  const valid = { title: 'Lunch', amount: '12.50', date: '2025-03-10', categoryId: 'food' };
  type Agent = Awaited<ReturnType<typeof login>>;
  const titles = (body: { title: string }[]) => body.map((e) => e.title);

  it('AC-8 creates an expense owned by the caller', async () => {
    const a = await login(app, 'ac8@x.com');
    const created = await a.post('/expenses').send(valid).expect(201);
    expect(created.body).toMatchObject({ title: 'Lunch', amount: '12.50', categoryId: 'food' });
    expect(created.body.userId).toBeUndefined();
    expect((await a.get('/expenses')).body).toHaveLength(1);
  });

  it('AC-9 invalid input returns 400 with field errors and stores nothing', async () => {
    const a = await login(app, 'ac9@x.com');
    for (const bad of [
      { ...valid, categoryId: undefined },
      { ...valid, categoryId: 'nope' },
      { ...valid, title: '  ' },
      { ...valid, amount: '0' },
      { ...valid, amount: '-3' },
      { ...valid, amount: 'abc' },
      { ...valid, amount: '1.234' },
      { ...valid, date: '2025-13-40' },
    ]) {
      const res = await a.post('/expenses').send(bad).expect(400);
      expect(res.body.errors.length).toBeGreaterThan(0);
      expect(res.body.errors[0]).toHaveProperty('field');
    }
    expect((await a.get('/expenses')).body).toEqual([]);
    const ok = await a.post('/expenses').send(valid).expect(201);
    await a.patch(`/expenses/${ok.body.id}`).send({ categoryId: 'zzz' }).expect(400);
    await a.patch(`/expenses/${ok.body.id}`).send({ amount: 'x' }).expect(400);
    expect((await a.get(`/expenses/${ok.body.id}`)).body.title).toBe('Lunch');
  });

  it('AC-10 lists newest first and gets one by id', async () => {
    const a = await login(app, 'ac10@x.com');
    const first = await a.post('/expenses').send(valid).expect(201);
    await a.post('/expenses').send({ ...valid, title: 'Older', date: '2025-03-01' }).expect(201);
    await a.post('/expenses').send({ ...valid, title: 'Newer', date: '2025-03-20', amount: 3 }).expect(201);
    expect(titles((await a.get('/expenses').expect(200)).body)).toEqual(['Newer', 'Lunch', 'Older']);
    const got = await a.get(`/expenses/${first.body.id}`).expect(200);
    expect(got.body).toMatchObject({ title: 'Lunch', amount: '12.50', date: '2025-03-10', categoryId: 'food' });
  });

  it('AC-11 patches and deletes', async () => {
    const a = await login(app, 'ac11@x.com');
    const { body } = await a.post('/expenses').send(valid).expect(201);
    const upd = await a.patch(`/expenses/${body.id}`).send({ title: 'Dinner', amount: '20' }).expect(200);
    expect(upd.body).toMatchObject({ title: 'Dinner', amount: '20.00' });
    await a.delete(`/expenses/${body.id}`).expect(204);
    await a.get(`/expenses/${body.id}`).expect(404);
  });

  it('AC-5 isolates users', async () => {
    const a = await login(app, 'iso-a@x.com');
    const b = await login(app, 'iso-b@x.com');
    const { body } = await a.post('/expenses').send(valid).expect(201);
    expect((await b.get('/expenses').expect(200)).body).toEqual([]);
    await b.get(`/expenses/${body.id}`).expect(404);
    await b.patch(`/expenses/${body.id}`).send({ title: 'hack' }).expect(404);
    await b.delete(`/expenses/${body.id}`).expect(404);
    expect((await a.get(`/expenses/${body.id}`).expect(200)).body.title).toBe('Lunch');
  });

  async function seedFilters(email: string): Promise<Agent> {
    const a = await login(app, email);
    await a.post('/expenses').send({ ...valid, title: 'Coffee Beans', date: '2025-01-05' });
    await a.post('/expenses').send({ ...valid, title: 'Bus coffee', date: '2025-02-05', categoryId: 'transport' });
    await a.post('/expenses').send({ ...valid, title: 'Rent', date: '2025-03-05', categoryId: 'bills' });
    return a;
  }
  const q = async (a: Agent, qs: string) => titles((await a.get(`/expenses${qs}`).expect(200)).body);

  it('AC-17 searches titles case-insensitively', async () => {
    const a = await seedFilters('ac17@x.com');
    expect(await q(a, '?search=COFFEE')).toEqual(['Bus coffee', 'Coffee Beans']);
  });

  it('AC-18 filters by category and inclusive date range', async () => {
    const a = await seedFilters('ac18@x.com');
    expect(await q(a, '?category=bills')).toEqual(['Rent']);
    expect(await q(a, '?from=2025-02-05&to=2025-03-05')).toEqual(['Rent', 'Bus coffee']);
    await a.get('/expenses?from=bad').expect(400);
  });

  it('AC-19 combines filters and returns empty list when none match', async () => {
    const a = await seedFilters('ac19@x.com');
    expect(await q(a, '?search=coffee&category=transport&from=2025-02-01&to=2025-02-28')).toEqual(['Bus coffee']);
    expect(await q(a, '?search=zzz')).toEqual([]);
    expect(await q(a, '?search=coffee&category=bills')).toEqual([]);
  });

  it('AC-14 dashboard totals current month only', async () => {
    const a = await login(app, 'ac14@x.com');
    const today = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < 6; i++) {
      await a.post('/expenses').send({ ...valid, title: `T${i}`, date: today, amount: '0.10' }).expect(201);
    }
    await a.post('/expenses').send({ ...valid, date: '2020-01-01' }).expect(201);
    const dash = await a.get('/dashboard').expect(200);
    expect(dash.body.total).toBe('0.60');
    expect(dash.body.count).toBe(6);
    expect(dash.body.recent).toHaveLength(5);
  });

  it('AC-15 dashboard with no expenses is zero and empty', async () => {
    const a = await login(app, 'ac15@x.com');
    const empty = await a.get('/dashboard').expect(200);
    expect(empty.body).toMatchObject({ total: '0.00', count: 0, recent: [] });
  });

  it('AC-21 summary breakdown sums to total', async () => {
    const a = await login(app, 'ac21@x.com');
    await a.post('/expenses').send({ ...valid, date: '2020-01-10' }).expect(201);
    await a.post('/expenses').send({ ...valid, date: '2020-01-31', categoryId: 'bills', amount: '0.20' });
    await a.post('/expenses').send({ ...valid, date: '2020-02-01', amount: '99' });
    const s = await a.get('/summary?month=2020-01').expect(200);
    expect(s.body.total).toBe('12.70');
    expect(s.body.breakdown.map((b: { categoryId: string; amount: string }) => [b.categoryId, b.amount])).toEqual([
      ['food', '12.50'],
      ['bills', '0.20'],
    ]);
  });

  it('AC-22 summary validates month and handles empty month', async () => {
    const a = await login(app, 'ac22@x.com');
    const none = await a.get('/summary?month=1999-01').expect(200);
    expect(none.body).toMatchObject({ total: '0.00', breakdown: [] });
    await a.get('/summary?month=2020-13').expect(400);
    await a.get('/summary?month=abc').expect(400);
    await a.get('/summary').expect(400);
  });
});
