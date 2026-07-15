import { Card, Row, Col, Statistic } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  WalletOutlined,
} from '@ant-design/icons';

import type { Transaction } from '../types';
import { formatCurrency } from '../format';

interface SummaryCardsProps {
  data: Transaction[];
}

interface Totals {
  income: number;
  expense: number;
  balance: number;
}

function computeTotals(data: Transaction[]): Totals {
  return data.reduce<Totals>(
    (acc, tx) => {
      if (tx.type === 'income') {
        acc.income += tx.amount;
        acc.balance += tx.amount;
      } else {
        acc.expense += tx.amount;
        acc.balance -= tx.amount;
      }
      return acc;
    },
    { income: 0, expense: 0, balance: 0 }
  );
}


export function SummaryCards({ data }: SummaryCardsProps) {
  const totals = computeTotals(data);

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={24} sm={12} md={8}>
        <Card variant="borderless">
          <Statistic
            title="Total Income"
            value={totals.income}
            precision={2}
            formatter={() => formatCurrency(totals.income)}
            prefix={<ArrowUpOutlined style={{ color: '#16a34a' }} />}
            valueStyle={{ color: '#16a34a', fontWeight: 600 }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Card variant="borderless">
          <Statistic
            title="Total Expense"
            value={totals.expense}
            precision={2}
            formatter={() => formatCurrency(totals.expense)}
            prefix={<ArrowDownOutlined style={{ color: '#dc2626' }} />}
            valueStyle={{ color: '#dc2626', fontWeight: 600 }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Card variant="borderless">
          <Statistic
            title="Balance"
            value={totals.balance}
            precision={2}
            formatter={() => formatCurrency(totals.balance, true)}
            prefix={<WalletOutlined />}
            valueStyle={{
              color: totals.balance >= 0 ? '#16a34a' : '#dc2626',
              fontWeight: 600,
            }}
          />
        </Card>
      </Col>
    </Row>
  );
}
