import { Table, Tag, Space, Button, Popconfirm, Tooltip, Empty } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

import type { Transaction } from '../types';
import { formatCurrency } from '../format';

interface TransactionTableProps {
  data: Transaction[];
  loading: boolean;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: number) => void;
}

// Helpers exposed via Table so columns can use them in render().
const typeColor: Record<Transaction['type'], string> = {
  income: 'green',
  expense: 'volcano',
};

export function TransactionTable({
  data,
  loading,
  onEdit,
  onDelete,
}: TransactionTableProps) {
  return (
    <Table<Transaction>
      rowKey="id"
      dataSource={data}
      loading={loading}
      locale={{ emptyText: <Empty description="No transactions yet" /> }}
      pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
      columns={[
        {
          title: 'Date',
          dataIndex: 'date',
          key: 'date',
          width: 120,
          defaultSortOrder: 'descend',
          sorter: (a, b) => a.date.localeCompare(b.date),
        },
        {
          title: 'Type',
          dataIndex: 'type',
          key: 'type',
          width: 110,
          render: (type: Transaction['type']) => (
            <Tag color={typeColor[type]} style={{ textTransform: 'capitalize' }}>
              {type}
            </Tag>
          ),
        },
        {
          title: 'Category',
          dataIndex: 'category',
          key: 'category',
          width: 140,
        },
        {
          title: 'Amount',
          dataIndex: 'amount',
          key: 'amount',
          width: 140,
          align: 'right',
          sorter: (a: Transaction, b: Transaction) => a.amount - b.amount,
          render: (amount: number, row: Transaction) => (
            <span style={{ color: typeColor[row.type] === 'green' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
              {row.type === 'expense' ? '−' : '+'}
              {formatCurrency(amount)}
            </span>
          ),
        },
        {
          title: 'Description',
          dataIndex: 'description',
          key: 'description',
          ellipsis: true,
          render: (text: string | null) =>
            text ? (
              text
            ) : (
              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>—</span>
            ),
        },
        {
          title: 'Actions',
          key: 'actions',
          width: 160,
          render: (_v, row) => (
            <Space size="small">
              <Tooltip title="Edit">
                <Button
                  size="small"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(row)}
                  aria-label={`Edit transaction ${row.id}`}
                />
              </Tooltip>
              <Popconfirm
                title="Delete this transaction?"
                description="This action cannot be undone."
                okText="Delete"
                okButtonProps={{ danger: true }}
                cancelText="Cancel"
                onConfirm={() => onDelete(row.id)}
              >
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={`Delete transaction ${row.id}`}
                />
              </Popconfirm>
            </Space>
          ),
        },
      ]}
    />
  );
}
