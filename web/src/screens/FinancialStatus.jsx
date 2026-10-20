import React, { useState, useEffect } from 'react';
import {
  Typography, Paper, Box, Grid, Card, CardContent, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, Divider, Alert
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import apiClient from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { useLanguage } from '../state/LanguageContext';

const INCOME_COLORS = ['#147d64', '#e19a28', '#3979a8'];
const EXPENSE_COLORS = ['#c95844', '#e19a28', '#3979a8', '#7560a8'];

function DonutBreakdown({ title, items, total, colors, emptyLabel, t }) {
  const nonzeroItems = items.filter((item) => item.value > 0);
  let offset = 0;
  const stops = nonzeroItems.map((item, index) => {
    const start = offset;
    offset += (item.value / (total || 1)) * 100;
    return `${colors[index % colors.length]} ${start}% ${offset}%`;
  });
  const background = stops.length ? `conic-gradient(${stops.join(', ')})` : '#e6ebee';

  return (
    <Paper sx={{ p: 2.5, height: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 1, boxShadow: 'none' }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>{title}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(110px, 0.8fr) 1.2fr', sm: '140px 1fr' }, gap: 2, alignItems: 'center' }}>
        <Box role="img" aria-label={`${title}: ${total.toFixed(2)} MAD`} sx={{ width: '100%', maxWidth: 140, aspectRatio: '1', borderRadius: '50%', background, display: 'grid', placeItems: 'center', mx: 'auto' }}>
          <Box sx={{ width: '62%', aspectRatio: '1', borderRadius: '50%', bgcolor: 'background.paper', display: 'grid', alignContent: 'center', textAlign: 'center', px: 0.5 }}>
            <Typography variant="caption" color="text.secondary">{t('Total')}</Typography>
            <Typography variant="body2" fontWeight={700}>{total.toFixed(0)}</Typography>
            <Typography variant="caption" color="text.secondary">MAD</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gap: 1 }}>
          {items.map((item, index) => {
            const share = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <Box key={item.label}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', minWidth: 0 }}>
                    <Box aria-hidden="true" sx={{ width: 9, height: 9, bgcolor: colors[index % colors.length], borderRadius: '2px', flexShrink: 0 }} />
                    <Typography variant="body2" noWrap>{t(item.label)}</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{share.toFixed(0)}%</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ pl: 2 }}>{item.value.toFixed(2)} MAD</Typography>
              </Box>
            );
          })}
          {!nonzeroItems.length && <Typography variant="body2" color="text.secondary">{emptyLabel}</Typography>}
        </Box>
      </Box>
    </Paper>
  );
}

function MonthlyActivityChart({ months, language, t }) {
  const peak = Math.max(1, ...months.flatMap((month) => [month.income, month.expenses]));
  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 1, boxShadow: 'none' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>{t('Monthly cash flow')}</Typography>
          <Typography variant="caption" color="text.secondary">{t('Activity excludes salary and rent estimates')}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="caption"><Box component="span" sx={{ color: 'success.main' }}>■</Box> {t('Income')}</Typography>
          <Typography variant="caption"><Box component="span" sx={{ color: 'warning.main' }}>■</Box> {t('Expenses')}</Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(44px, 1fr))', gap: 1, overflowX: 'auto', pb: 0.5 }}>
        {months.map((month) => (
          <Box key={month.month} sx={{ minWidth: 44, textAlign: 'center' }}>
            <Box sx={{ height: 164, display: 'flex', alignItems: 'end', justifyContent: 'center', gap: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box title={`${t('Income')} ${month.income.toFixed(2)} MAD`} sx={{ width: 13, height: `${Math.max(2, month.income / peak * 148)}px`, bgcolor: 'success.main', borderRadius: '3px 3px 0 0' }} />
              <Box title={`${t('Expenses')} ${month.expenses.toFixed(2)} MAD`} sx={{ width: 13, height: `${Math.max(2, month.expenses / peak * 148)}px`, bgcolor: 'warning.main', borderRadius: '3px 3px 0 0' }} />
            </Box>
            <Typography variant="caption" color="text.secondary">{new Date(2000, month.month - 1, 1).toLocaleDateString(language === 'ar' ? 'ar' : 'fr-FR', { month: 'short' })}</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

export default function FinancialStatus() {
  const { language, t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => { fetchData(); }, [year]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get(`/crm/financial/?year=${year}`);
      setData(response.data);
    } catch (error) {
      setError(getApiErrorMessage(error, 'Failed to load financial data.'));
      console.error('Failed to fetch financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const incomeBreakdown = data?.income_breakdown || {};
  const expenseBreakdown = data?.expense_breakdown || {};
  const incomeItems = [
    { label: 'Member payments', value: Number(incomeBreakdown.payments || 0) },
    { label: 'Additional income', value: Number(incomeBreakdown.additional_payments || 0) },
    { label: 'Event participation', value: Number(incomeBreakdown.events || 0) },
  ];
  const expenseItems = [
    { label: 'Operating costs', value: Number(expenseBreakdown.operating || 0) },
    { label: 'Event costs', value: Number(expenseBreakdown.events || 0) },
    { label: 'Staff salaries', value: Number(expenseBreakdown.salaries || 0) },
    { label: 'Rent', value: Number(expenseBreakdown.rent || 0) },
  ];
  const netMargin = data?.total_income > 0 ? (data.net_profit / data.total_income) * 100 : 0;
  const averageMonthlyIncome = data?.total_income ? data.total_income / 12 : 0;

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">{t('Financial Status')}</Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>{t('Year')}</InputLabel>
          <Select value={year} label="Year" onChange={(e) => setYear(e.target.value)}>
            {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderTop: 4, borderColor: 'success.main' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2" fontWeight="500">{t('Total Income')}</Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    {data?.total_income?.toFixed(2)} DH
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ color: 'success.main', fontSize: 40, opacity: 0.2 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderTop: 4, borderColor: 'error.main' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2" fontWeight="500">{t('Total Expenses')}</Typography>
                  <Typography variant="h5" fontWeight="bold" color="error.main">
                    {data?.total_expenses?.toFixed(2)} DH
                  </Typography>
                </Box>
                <TrendingDownIcon sx={{ color: 'error.main', fontSize: 40, opacity: 0.2 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderTop: 4, borderColor: 'info.main' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2" fontWeight="500">{t('Staff Salaries')}</Typography>
                  <Typography variant="h5" fontWeight="bold" color="info.main">
                    {data?.total_salaries?.toFixed(2)} DH
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{t('Rent:')} {data?.rent?.toFixed(2)} DH</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderTop: 4, borderColor: data?.net_profit >= 0 ? 'success.main' : 'error.main' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2" fontWeight="500">{t('Net Profit')}</Typography>
                  <Typography variant="h5" fontWeight="bold" color={data?.net_profit >= 0 ? 'success.main' : 'error.main'}>
                    {data?.net_profit?.toFixed(2)} DH
                  </Typography>
                </Box>
                <AccountBalanceIcon sx={{ color: data?.net_profit >= 0 ? 'success.main' : 'error.main', fontSize: 40, opacity: 0.2 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2.5, height: '100%', borderLeft: 4, borderColor: 'success.main', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">{t('Net margin')}</Typography>
            <Typography variant="h4" fontWeight={700} color={netMargin >= 0 ? 'success.main' : 'error.main'}>{netMargin.toFixed(1)}%</Typography>
            <Typography variant="caption" color="text.secondary">{t('Net profit as a share of total income')}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2.5, height: '100%', borderLeft: 4, borderColor: 'info.main', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">{t('Average monthly income')}</Typography>
            <Typography variant="h4" fontWeight={700}>{averageMonthlyIncome.toFixed(2)} DH</Typography>
            <Typography variant="caption" color="text.secondary">{t('Annual income divided across 12 months')}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <MonthlyActivityChart months={data?.monthly_breakdown || []} language={language} t={t} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={6}>
          <DonutBreakdown title={t('Income sources')} items={incomeItems} total={Number(data?.total_income || 0)} colors={INCOME_COLORS} emptyLabel={t('No income recorded for this year.')} t={t} />
        </Grid>
        <Grid item xs={12} lg={6}>
          <DonutBreakdown title={t('Expense structure')} items={expenseItems} total={expenseItems.reduce((sum, item) => sum + item.value, 0)} colors={EXPENSE_COLORS} emptyLabel={t('No expenses recorded for this year.')} t={t} />
        </Grid>
      </Grid>

      {/* Monthly Breakdown Table */}
      <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Typography variant="h6" gutterBottom fontWeight="600">{t('Monthly Income Breakdown')}</Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={2}>
          {data?.monthly_breakdown?.map((m) => (
            <Grid item xs={6} sm={4} md={2} key={m.month}>
              <Card variant="outlined" sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', border: 'none' }}>
                <Typography variant="caption" color="text.secondary" fontWeight="600" display="block" gutterBottom>
                  {new Date(2000, m.month - 1, 1).toLocaleDateString(language === 'ar' ? 'ar' : 'fr-FR', { month: 'short' }).toUpperCase()}
                </Typography>
                <Typography variant="body2" fontWeight="bold" color={m.income > 0 ? 'success.main' : 'text.disabled'}>
                  {t('Income')}: {m.income > 0 ? `${m.income.toFixed(0)} DH` : '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">{t('Expenses')}: {m.expenses.toFixed(0)} DH</Typography>
                <Typography variant="caption" color={m.net >= 0 ? 'success.main' : 'error.main'} display="block">{t('Net (before salary/rent)')}: {m.net.toFixed(0)} DH</Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
}
