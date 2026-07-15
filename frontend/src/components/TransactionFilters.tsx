import { Select, Space, Button, Card } from 'antd';
import { ReloadOutlined, ClearOutlined } from '@ant-design/icons';

import type { Category, SortField, SortOrder, TransactionType } from '../types';
import { CATEGORIES, ORDERS, SORT_FIELDS, TRANSACTION_TYPES } from '../types';

export interface FilterValues {
  type?: TransactionType;
  category?: Category;
  sortBy: SortField;
  order: SortOrder;
}

interface TransactionFiltersProps {
  values: FilterValues;
  loading: boolean;
  onChange: (next: FilterValues) => void;
  onRefresh: () => void;
}

const defaultValues: FilterValues = {
  sortBy: 'date',
  order: 'desc',
};

export function TransactionFilters({
  values,
  loading,
  onChange,
  onRefresh,
}: TransactionFiltersProps) {
  const update = <K extends keyof FilterValues>(key: K, value: FilterValues[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <Card variant="borderless" style={{ marginBottom: 16 }}>
      <Space wrap size={[12, 12]}>
        <Select<TransactionType>
          allowClear
          placeholder="Type"
          style={{ minWidth: 140 }}
          value={values.type}
          onChange={(v) => update('type', v)}
          options={TRANSACTION_TYPES.map((t) => ({
            value: t,
            label: t.charAt(0).toUpperCase() + t.slice(1),
          }))}
        />
        <Select<Category>
          allowClear
          placeholder="Category"
          style={{ minWidth: 160 }}
          value={values.category}
          onChange={(v) => update('category', v)}
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
        <Select<SortField>
          style={{ minWidth: 140 }}
          value={values.sortBy}
          onChange={(v) => update('sortBy', v)}
          options={SORT_FIELDS.map((f) => ({ value: f, label: `Sort by ${f}` }))}
        />
        <Select<SortOrder>
          style={{ minWidth: 120 }}
          value={values.order}
          onChange={(v) => update('order', v)}
          options={ORDERS.map((o) => ({ value: o, label: o.toUpperCase() }))}
        />
        <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
          Refresh
        </Button>
        <Button
          icon={<ClearOutlined />}
          onClick={() => onChange(defaultValues)}
          disabled={
            !values.type &&
            !values.category &&
            values.sortBy === defaultValues.sortBy &&
            values.order === defaultValues.order
          }
        >
          Clear
        </Button>
      </Space>
    </Card>
  );
}
