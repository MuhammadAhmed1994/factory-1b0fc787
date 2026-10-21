import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  userId: string;
  categoryId: string;
  title: string;
  amountCents: number;
  date: string; // YYYY-MM-DD
  seq: number; // creation order, tie-break
  createdAt: string;
  updatedAt: string;
}

interface Snapshot {
  users: UserRecord[];
  expenses: ExpenseRecord[];
  seq: number;
}

/**
 * Persistence for users and expenses. In memory; when DATA_FILE is set the state is also
 * written to that JSON file after each change and reloaded at boot.
 */
@Injectable()
export class StoreService {
  users: UserRecord[] = [];
  expenses: ExpenseRecord[] = [];
  seq = 0;
  private readonly file = process.env.DATA_FILE?.trim() || undefined;

  constructor() {
    if (this.file && existsSync(this.file)) {
      const snap = JSON.parse(readFileSync(this.file, 'utf8')) as Snapshot;
      this.users = snap.users ?? [];
      this.expenses = snap.expenses ?? [];
      this.seq = snap.seq ?? 0;
    }
  }

  nextSeq(): number {
    return ++this.seq;
  }

  save(): void {
    if (!this.file) return;
    const snap: Snapshot = { users: this.users, expenses: this.expenses, seq: this.seq };
    writeFileSync(this.file, JSON.stringify(snap));
  }
}
