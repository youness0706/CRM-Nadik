import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Chip, CircularProgress, FormControl, InputLabel, MenuItem,
  Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead,
  TablePagination, TableRow, TextField, Typography,
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import apiClient from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { useLanguage } from '../state/LanguageContext';

const METHODS = [
  ['all', 'All methods'], ['cash', 'Cash'], ['bank_transfer', 'Bank transfer'],
  ['card', 'Card'], ['check', 'Check'], ['other', 'Other'],
];

export default function PlatformPayments() {
  const { t } = useLanguage();
  const [rows, setRows] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters] = useState({ search: '', organization: '', payment_method: 'all', date_from: '', date_to: '' });
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    apiClient.get('/platform/organizations/')
      .then((response) => setOrganizations(response.data.results || []))
      .catch(() => setOrganizations([]));
  }, []);

  useEffect(() => {
    const loadPayments = async () => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ page: String(page + 1), per_page: String(rowsPerPage) });
      Object.entries(filters).forEach(([key, value]) => {
        if (value && !(key === 'payment_method' && value === 'all')) params.set(key, value);
      });
      try {
        const response = await apiClient.get(`/platform/payments/?${params}`);
        setRows(response.data.results || []);
        setTotal(response.data.count || 0);
        setTotalAmount(response.data.total_amount || 0);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, 'Unable to load organization payments.'));
      } finally {
        setLoading(false);
      }
    };
    loadPayments();
  }, [page, rowsPerPage, filters]);

  const updateFilter = (key, value) => {
    setPage(0);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>{t('Organization payments')}</Typography>
          <Typography color="text.secondary">{t('Subscription receipts across all organizations')}</Typography>
        </Box>
        <Chip icon={<PaymentsIcon />} label={`${totalAmount.toFixed(2)} MAD ${t('matched receipts')}`} color="success" variant="outlined" />
      </Box>

      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', borderRadius: 1 }}>
        <TextField size="small" label={t('Search organization or processor')} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && updateFilter('search', searchInput)} sx={{ flex: '1 1 220px' }} />
        <FormControl size="small" sx={{ flex: '1 1 180px' }}>
          <InputLabel>{t('Organization')}</InputLabel>
          <Select value={filters.organization} label={t('Organization')} onChange={(event) => updateFilter('organization', event.target.value)}>
            <MenuItem value="">{t('All organizations')}</MenuItem>
            {organizations.map((organization) => <MenuItem key={organization.id} value={organization.id}>{organization.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ flex: '1 1 160px' }}>
          <InputLabel>{t('Payment method')}</InputLabel>
          <Select value={filters.payment_method} label={t('Payment method')} onChange={(event) => updateFilter('payment_method', event.target.value)}>
            {METHODS.map(([value, label]) => <MenuItem key={value} value={value}>{t(label)}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField size="small" type="date" label={t('From')} value={filters.date_from} onChange={(event) => updateFilter('date_from', event.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label={t('To')} value={filters.date_to} onChange={(event) => updateFilter('date_to', event.target.value)} InputLabelProps={{ shrink: true }} />
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('Date')}</TableCell><TableCell>{t('Organization')}</TableCell>
              <TableCell>{t('Period')}</TableCell><TableCell>{t('Payment method')}</TableCell>
              <TableCell>{t('Processed by')}</TableCell><TableCell>{t('Renewal dates')}</TableCell>
              <TableCell align="right">{t('Amount')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow> : rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><Typography color="text.secondary">{t('No organization payments found.')}</Typography></TableCell></TableRow>
            ) : rows.map((payment) => (
              <TableRow key={payment.id} hover>
                <TableCell>{payment.payment_date}</TableCell>
                <TableCell><Typography fontWeight={600}>{payment.organization_name}</Typography><Typography variant="caption" color="text.secondary">{payment.organization_slug}</Typography></TableCell>
                <TableCell>{payment.duration_months} {t('months')}</TableCell>
                <TableCell>{t(payment.payment_method)}</TableCell>
                <TableCell>{payment.processed_by_username || '—'}</TableCell>
                <TableCell>{payment.subscription_start} – {payment.subscription_end}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{Number(payment.amount).toFixed(2)} MAD</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination component="div" count={total} page={page} onPageChange={(_, nextPage) => setPage(nextPage)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0); }} rowsPerPageOptions={[10, 25, 50, 100]} />
      </TableContainer>
    </Box>
  );
}
