import { EditExpense } from '@/components/edit-expense'

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EditExpense id={id} />
}
