import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Layout,
  Typography,
  Space,
  Button,
  Alert,
  Spin,
  App as AntApp,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';

import { api, ApiError } from './api';
import type {
  CreateTransactionInput,
  ListFilters,
  SortField,
  SortOrder,
  Transaction,
} from './types';

import { SummaryCards } from './components/SummaryCards';
import { TransactionFilters, type FilterValues } from './components/TransactionFilters';
import { TransactionTable } from './components/TransactionTable';
import { TransactionForm } from './components/TransactionForm';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

const DEFAULT_FILTERS: FilterValues = {
  sortBy: 'date',
  order: 'desc',
};

function toApiFilters(values: FilterValues): ListFilters {
  return {
    type: values.type,
    category: values.category,
    sortBy: values.sortBy as SortField,
    order: values.order as SortOrder,
  };
}

export default function App() {
  // Use AntApp (aliased to avoid clashing with this component's name) so that
  // `message` inherits the ConfigProvider theme tokens.
  const { message } = AntApp.useApp();

  // What the dev URL the browser actually hits. With VITE_API_URL set
  // we use an absolute URL; without it Vite's dev proxy serves /api.
  const apiDisplayUrl = (() => {
    const raw = import.meta.env.VITE_API_URL;
    if (raw) return raw.replace(/\/$/, '');
    return 'localhost:5173 (dev proxy → /api → localhost:3001)';
  })();

  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Refetch whenever filters change. We re-read `filters` from state on each
  // fetch — this is the simplest pattern for an MVP and keeps the effect
  // dependencies stable.
  const fetchData = useCallback(async (next: FilterValues) => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await api.list(toApiFilters(next));
      setData(rows);
    } catch (err) {
      const errorText = err instanceof ApiError ? err.message : 'Failed to load transactions';
      setLoadError(errorText);
      message.error(errorText);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void fetchData(filters);
  }, [filters, fetchData]);

  // --- Handlers --------------------------------------------------------

  const handleOpenCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditing(tx);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (values: CreateTransactionInput) => {
    setSubmitting(true);
    try {
      if (editing) {
        const updated = await api.update(editing.id, values);
        setData((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        message.success('Transaction updated');
      } else {
        const created = await api.create(values);
        setData((prev) => [created, ...prev]);
        message.success('Transaction created');
      }
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      const errorText = err instanceof ApiError ? err.message : 'Save failed';
      message.error(errorText);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.remove(id);
      setData((prev) => prev.filter((t) => t.id !== id));
      message.success('Transaction deleted');
    } catch (err) {
      const errorText = err instanceof ApiError ? err.message : 'Delete failed';
      message.error(errorText);
    }
  };

  const handleFilterChange = (next: FilterValues) => setFilters(next);
  const handleRefresh = () => void fetchData(filters);

  // --- Derived UI ------------------------------------------------------

  const isInitialLoad = useMemo(
    () => loading && data.length === 0 && loadError === null,
    [loading, data.length, loadError]
  );

  return (
    <Layout style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <Header
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <div>
          <Title level={3} style={{ color: '#fff', margin: 0 }}>
            Daily Expense &amp; Income Diary
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
            Track every transaction, see the totals at a glance.
          </Text>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={handleOpenCreate}
          style={{ background: '#fff', color: '#4f46e5', borderColor: 'transparent' }}
        >
          Add transaction
        </Button>
      </Header>

      <Content style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {loadError ? (
          <Alert
            type="error"
            showIcon
            closable
            message="Could not reach the API"
            description={loadError}
            style={{ marginBottom: 16 }}
            onClose={() => setLoadError(null)}
          />
        ) : null}

        <SummaryCards data={data} />

        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 4,
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            }}
          >
            <TransactionFilters
              values={filters}
              loading={loading}
              onChange={handleFilterChange}
              onRefresh={handleRefresh}
            />
            <div style={{ padding: '0 16px 16px' }}>
              {isInitialLoad ? (
                <div
                  style={{
                    padding: 64,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <Spin />
                </div>
              ) : (
                <TransactionTable
                  data={data}
                  loading={loading && data.length > 0}
                  onEdit={handleOpenEdit}
                  onDelete={handleDelete}
                />
              )}
            </div>
          </div>
        </Space>
      </Content>

      <Footer style={{ textAlign: 'center', background: 'transparent' }}>
        <Text type="secondary">
          Built with React, Vite, and Ant Design · API: {apiDisplayUrl}
        </Text>
      </Footer>

      <TransactionForm
        open={modalOpen}
        initial={editing}
        submitting={submitting}
        onCancel={handleCloseModal}
        onSubmit={handleSubmit}
      />
    </Layout>
  );
}
