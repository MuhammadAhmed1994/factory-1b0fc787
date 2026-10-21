import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches, MaxLength, registerDecorator, ValidationOptions } from 'class-validator';
import { CATEGORIES } from '../categories/categories';
import { isRealDate } from '../common/money';

function IsRealDate(options?: ValidationOptions) {
  return (target: object, property: string) =>
    registerDecorator({
      name: 'isRealDate',
      target: target.constructor,
      propertyName: property,
      options: { message: 'Date must be a valid date (YYYY-MM-DD)', ...options },
      validator: { validate: (v: unknown) => isRealDate(v) },
    });
}

const amountIn = ({ value }: { value: unknown }) => (typeof value === 'number' ? String(value) : value);
const trimmed = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

const AMOUNT_RE = /^(?!0+(\.0{1,2})?$)\d+(\.\d{1,2})?$/;
const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export class CreateExpenseDto {
  @Transform(trimmed)
  @IsString({ message: 'Title is required' })
  @Matches(/\S/, { message: 'Title is required' })
  @MaxLength(200)
  title!: string;

  @Transform(amountIn)
  @IsString({ message: 'Amount must be a number greater than 0' })
  @Matches(AMOUNT_RE, { message: 'Amount must be a number greater than 0 with at most 2 decimals' })
  amount!: string;

  @IsRealDate()
  date!: string;

  @IsIn(CATEGORY_IDS, { message: 'A valid category is required' })
  categoryId!: string;
}

export class UpdateExpenseDto {
  @IsOptional()
  @Transform(trimmed)
  @IsString({ message: 'Title is required' })
  @Matches(/\S/, { message: 'Title is required' })
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @Transform(amountIn)
  @IsString({ message: 'Amount must be a number greater than 0' })
  @Matches(AMOUNT_RE, { message: 'Amount must be a number greater than 0 with at most 2 decimals' })
  amount?: string;

  @IsOptional()
  @IsRealDate()
  date?: string;

  @IsOptional()
  @IsIn(CATEGORY_IDS, { message: 'A valid category is required' })
  categoryId?: string;
}
