import { INestApplication } from '@nestjs/common';
import { createApp, login } from '../test/helpers';

describe('expenses, dashboard, summary', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(() => app.close());

  const valid = { title: 'Lunch', amount: '12.50', date: '2025-03-10', categoryId: 'food' };

  it('AC-8/9/10/11 CRUD and validation', async () => {
    const a = await login(app, 'crud@x.com');
    const created = await a.post('/expenses').send(valid).expect(201);
    expect(created.body).toMatchObject({ title: 'Lunch', amount: '12.50', categoryId: 'food' });
    expect(created.body.userId).toBeUndefined();

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
    }
    await a.patch(`/expenses/${created.body.id}`).send({ categoryId: 'zzz' }).expect(400);

    await a.post('/expenses').send({ ...valid, title: 'Older', date: '2025-03-01' }).expect(201);
    await a.post('/expenses').send({ ...valid, title: 'Newer', date: '2025-03-20', amount: 3 }).expect(201);
    const list = await a.get('/expenses').expect(200);
    expect(list.body.map((e: { title: string }) => e.title)).toEqual(['Newer', 'Lunch', 'Older']);

    const got = await a.get(`/expenses/${created.body.id}`).expect(200);
    expect(got.body.title).toBe('Lunch');
    const upd = await a.patch(`/expenses/${created.body.id}`).send({ title: 'Dinner', amount: '20' }).expect(200);
    expect(upd.body).toMatchObject({ title: 'Dinner', amount: '20.00' });
    await a.delete(`/expenses/${created.body.id}`).expect(204);
    await a.get(`/expenses/${created.body.id}`).expect(404);
  });

  it('AC-5 isolation between users', async () => {
    const a = await login(app, 'iso-a@x.com');
    const b = await login(app, 'iso-b@x.com');
    const { body } = await a.post('/expenses').send(valid).expect(201);
    expect((await b.get('/expenses').expect(200)).body).toEqual([]);
    await b.get(`/expenses/${body.id}`).expect(404);
    await b.patch(`/expenses/${body.id}`).send({ title: 'hack' }).expect(404);
    await b.delete(`/expenses/${body.id}`).expect(404);
    expect((await a.get(`/expenses/${body.id}`).expect(200)).body.title).toBe('Lunch');
  });

  it('AC-17/18/19 search and filters', async () => {
    const a = await login(app, 'filter@x.com');
    await a.post('/expenses').send({ ...valid, title: 'Coffee Beans', date: '2025-01-05' });
    await a.post('/expenses').send({ ...valid, title: 'Bus coffee', date: '2025-02-05', categoryId: 'transport' });
    await a.post('/expenses').send({ ...valid, title: 'Rent', date: '2025-03-05', categoryId: 'bills' });
    const q = async (qs: string) => (await a.get(`/expenses${qs}`).expect(200)).body.map((e: { title: string }) => e.title);
    expect(await q('?search=COFFEE')).toEqual(['Bus coffee', 'Coffee Beans']);
    expect(await q('?category=bills')).toEqual(['Rent']);
    expect(await q('?from=2025-02-05&to=2025-03-05')).toEqual(['Rent', 'Bus coffee']);
    expect(await q('?search=coffee&category=transport&from=2025-02-01&to=2025-02-28')).toEqual(['Bus coffee']);
    expect(await q('?search=zzz')).toEqual([]);
    await a.get('/expenses?from=bad').expect(400);
  });

  it('AC-14/15/21/22 dashboard and summary', async () => {
    const a = await login(app, 'dash@x.com');
    const empty = await a.get('/dashboard').expect(200);
    expect(empty.body).toMatchObject({ total: '0.00', count: 0, recent: [] });

    const today = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < 6; i++) {
      await a.post('/expenses').send({ ...valid, title: `T${i}`, date: today, amount: '0.10' }).expect(201);
    }
    await a.post('/expenses').send({ ...valid, date: '2020-01-01' }).expect(201);
    const dash = await a.get('/dashboard').expect(200);
    expect(dash.body.total).toBe('0.60');
    expect(dash.body.count).toBe(6);
    expect(dash.body.recent).toHaveLength(5);

    await a.post('/expenses').send({ ...valid, date: '2020-01-31', categoryId: 'bills', amount: '0.20' });
    const s = await a.get('/summary?month=2020-01').expect(200);
    expect(s.body.total).toBe('12.70');
    expect(s.body.breakdown.map((b: { categoryId: string; amount: string }) => [b.categoryId, b.amount])).toEqual([
      ['food', '12.50'],
      ['bills', '0.20'],
    ]);
    const none = await a.get('/summary?month=1999-01').expect(200);
    expect(none.body).toMatchObject({ total: '0.00', breakdown: [] });
    await a.get('/summary?month=2020-13').expect(400);
    await a.get('/summary').expect(400);
  });
});
