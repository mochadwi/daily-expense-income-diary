import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme as antdTheme, App as AntApp } from 'antd';

import App from './App';
import './styles.css';

const customTheme = {
  // Customise AntD's token system rather than relying on defaults so the
  // income/expense semantic colours line up across Table, Cards, and Tags.
  token: {
    colorPrimary: '#4f46e5', // indigo-600
    colorSuccess: '#16a34a', // green-600
    colorError: '#dc2626', // red-600
    colorInfo: '#0ea5e9', // sky-500
    colorWarning: '#f59e0b', // amber-500
    borderRadius: 8,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  algorithm: antdTheme.defaultAlgorithm,
  components: {
    Card: {
      borderRadiusLG: 12,
    },
    Table: {
      headerBg: '#f8fafc',
      headerColor: '#0f172a',
      borderColor: '#e2e8f0',
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={customTheme}>
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>
);
