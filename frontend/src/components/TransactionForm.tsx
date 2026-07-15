import {
  Modal,
  Form,
  Radio,
  InputNumber,
  Select,
  DatePicker,
  Input,
  Typography,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import type {
  Category,
  CreateTransactionInput,
  Transaction,
  TransactionType,
} from '../types';
import { CATEGORIES, TRANSACTION_TYPES } from '../types';

const { TextArea } = Input;

// Same shape the parent cares about for both create and edit submissions.
// For edit, the parent decides whether to call PUT or PATCH and only
// includes the fields it wants to change.
export interface TransactionFormValues {
  type: TransactionType;
  amount: number;
  category: Category;
  date: Dayjs;
  description?: string;
}

interface TransactionFormProps {
  open: boolean;
  initial: Transaction | null; // null => create mode
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateTransactionInput) => void;
}

function toFormValues(initial: Transaction | null) {
  if (!initial) {
    return {
      type: 'expense' as TransactionType,
      amount: undefined,
      category: undefined,
      date: dayjs(),
      description: '',
    };
  }
  return {
    type: initial.type,
    amount: initial.amount,
    category: initial.category,
    date: dayjs(initial.date),
    description: initial.description ?? '',
  };
}

export function TransactionForm({
  open,
  initial,
  submitting,
  onCancel,
  onSubmit,
}: TransactionFormProps) {
  const [form] = Form.useForm<TransactionFormValues>();

  const isEdit = initial !== null;

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit({
        type: values.type,
        amount: values.amount,
        category: values.category,
        date: values.date.format('YYYY-MM-DD'),
        description: values.description?.trim() ? values.description.trim() : null,
      });
    } catch {
      // AntD already surfaces field-level errors; nothing more to do.
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit transaction #${initial?.id}` : 'Add transaction'}
      okText={isEdit ? 'Save changes' : 'Create'}
      confirmLoading={submitting}
      onOk={handleOk}
      onCancel={onCancel}
      destroyOnClose
      maskClosable={!submitting}
      width={520}
    >
      <Form<TransactionFormValues>
        // `key` + `Modal destroyOnClose` force the form to remount whenever
        // the target transaction changes; `initialValues` then refills it.
        key={initial?.id ?? 'new'}
        form={form}
        layout="vertical"
        requiredMark
        initialValues={toFormValues(initial)}
      >
        <Form.Item
          label="Type"
          name="type"
          rules={[{ required: true, message: 'Please pick a type' }]}
        >
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            options={TRANSACTION_TYPES.map((t) => ({
              value: t,
              label: t.charAt(0).toUpperCase() + t.slice(1),
            }))}
          />
        </Form.Item>

        <Form.Item
          label="Amount"
          name="amount"
          rules={[
            { required: true, message: 'Please enter an amount' },
            {
              type: 'number',
              min: 0.01,
              message: 'Amount must be greater than 0',
            },
          ]}
        >
          <InputNumber
            min={0.01}
            step={0.01}
            precision={2}
            style={{ width: '100%' }}
            prefix="$"
            placeholder="0.00"
          />
        </Form.Item>

        <Form.Item
          label="Category"
          name="category"
          rules={[{ required: true, message: 'Please pick a category' }]}
        >
          <Select<Category>
            placeholder="Select a category"
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
        </Form.Item>

        <Form.Item
          label="Date"
          name="date"
          rules={[{ required: true, message: 'Please pick a date' }]}
        >
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item label="Description" name="description">
          <TextArea
            rows={3}
            placeholder="Optional notes"
            maxLength={500}
            showCount
          />
        </Form.Item>

        {isEdit && initial ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Created {initial.created_at} · Updated {initial.updated_at}
          </Typography.Text>
        ) : null}
      </Form>
    </Modal>
  );
}
