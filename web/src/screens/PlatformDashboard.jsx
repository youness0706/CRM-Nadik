import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, Grid, InputLabel, MenuItem, Paper, Select,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import apiClient from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { useLanguage } from '../state/LanguageContext';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const today = new Date().toISOString().slice(0, 10);
const EMPTY_EXPENSE = { title: '', description: '', amount: '', date: today };

function Metric({ title, value, icon, accent }) {
  return (
    <Paper sx={{ p: 2.5, height: '100%', borderLeft: 4, borderColor: accent, borderRadius: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>{value}</Typography>
        </Box>
        <Box sx={{ color: accent, opacity: 0.75 }}>{icon}</Box>
      </Box>
    </Paper>
  );
}

function MonthlyChart({ rows }) {
  const peak = Math.max(1, ...rows.flatMap((row) => [row.income, row.expenses]));
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(34px, 1fr))', gap: 1, alignItems: 'end', overflowX: 'auto', pb: 1 }}>
      {rows.map((row) => (
        <Box key={row.month} sx={{ minWidth: 34, textAlign: 'center' }}>
          <Box sx={{ height: 150, display: 'flex', alignItems: 'end', justifyContent: 'center', gap: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box title={`Income: ${row.income.toFixed(2)} MAD`} sx={{ width: 10, height: `${Math.max(2, row.income / peak * 138)}px`, bgcolor: 'success.main', borderRadius: '3px 3px 0 0' }} />
            <Box title={`Expenses: ${row.expenses.toFixed(2)} MAD`} sx={{ width: 10, height: `${Math.max(2, row.expenses / peak * 138)}px`, bgcolor: 'warning.main', borderRadius: '3px 3px 0 0' }} />
          </Box>
          <Typography variant="caption" color="text.secondary">{MONTHS[row.month - 1]}</Typography>
        </Box>
      ))}
    </Box>
  );
}

export default function PlatformDashboard() {
  const { t } = useLanguage();
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expense, setExpense] = useState(EMPTY_EXPENSE);
  const [saving, setSaving] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get(`/platform/dashboard/?year=${year}`);
      setReport(response.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load platform report.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReport(); }, [year]);

  const saveExpense = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiClient.post('/platform/dashboard/', expense);
      setExpense(EMPTY_EXPENSE);
      setExpenseOpen(false);
      await loadReport();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to add platform expense.'));
    } finally {
      setSaving(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const metrics = report?.metrics;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>{t('Nadik Platform')}</Typography>
          <Typography color="text.secondary">{t('Owner overview · organizations and platform finances')}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel>{t('Year')}</InputLabel>
            <Select value={year} label="Year" onChange={(event) => setYear(event.target.value)}>
              {Array.from({ length: 5 }, (_, index) => currentYear - index).map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setExpenseOpen(true)}>{t('Add platform cost')}</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box> : report && (
        <>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} lg={3}><Metric title="Organizations" value={`${metrics.organization_count} (${metrics.active_organizations} active)`} icon={<BusinessIcon />} accent="primary.main" /></Grid>
            <Grid item xs={12} sm={6} lg={3}><Metric title="People across organizations" value={`${metrics.trainee_count} trainees · ${metrics.staff_count} staff`} icon={<PeopleIcon />} accent="info.main" /></Grid>
            <Grid item xs={12} sm={6} lg={3}><Metric title={`${year} subscription income`} value={`${metrics.subscription_income.toFixed(2)} MAD`} icon={<TrendingUpIcon />} accent="success.main" /></Grid>
            <Grid item xs={12} sm={6} lg={3}><Metric title="Platform net" value={`${metrics.net_income.toFixed(2)} MAD`} icon={<AccountBalanceIcon />} accent={metrics.net_income >= 0 ? 'success.main' : 'error.main'} /></Grid>
          </Grid>

          <Box component="section" sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6" fontWeight={700}>Platform finance · {year}</Typography>
              <Typography variant="body2" color="text.secondary">{t('Income')} <b>{metrics.subscription_income.toFixed(2)} MAD</b> · {t('Costs')} <b>{metrics.platform_expenses.toFixed(2)} MAD</b> · {t('Net Profit')} <b>{metrics.net_income.toFixed(2)} MAD</b></Typography>
            </Box>
            <Paper sx={{ p: 2.5, borderRadius: 1 }}>
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Typography variant="caption"><Box component="span" sx={{ color: 'success.main' }}>■</Box> {t('Subscription income')}</Typography>
                <Typography variant="caption"><Box component="span" sx={{ color: 'warning.main' }}>■</Box> {t('Platform costs')}</Typography>
              </Box>
              <MonthlyChart rows={report.monthly} />
            </Paper>
          </Box>

          <Box component="section" sx={{ mb: 4 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>{t('Organization portfolio')}</Typography>
            <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 1 }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>{t('Organizations')}</TableCell><TableCell>{t('Plan / status')}</TableCell><TableCell align="right">{t('Trainees')}</TableCell><TableCell align="right">{t('Staff')}</TableCell><TableCell align="right">{t('Subscription income')} ({year})</TableCell><TableCell>{t('Renewal')}</TableCell></TableRow></TableHead>
                <TableBody>
                  {report.organizations.map((organization) => (
                    <TableRow key={organization.id} hover>
                      <TableCell><Typography fontWeight={600}>{organization.name}</Typography><Typography variant="caption" color="text.secondary">{organization.slug}</Typography></TableCell>
                      <TableCell>{organization.subscription_tier} · {organization.is_active ? organization.subscription_status : 'Suspended'}</TableCell>
                      <TableCell align="right">{organization.active_trainees} / {organization.total_trainees}</TableCell>
                      <TableCell align="right">{organization.staff_count}</TableCell>
                      <TableCell align="right">{organization.subscription_income.toFixed(2)} MAD</TableCell>
                      <TableCell>{organization.subscription_end || 'Not set'}</TableCell>
                    </TableRow>
                  ))}
                  {!report.organizations.length && <TableRow><TableCell colSpan={6} align="center">{t('No organizations yet.')}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Box component="section">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="h6" fontWeight={700}>{t('Platform costs')}</Typography>
              <Typography variant="body2" color="text.secondary">{metrics.platform_expenses.toFixed(2)} MAD this year</Typography>
            </Box>
            <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 1 }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>{t('Date')}</TableCell><TableCell>{t('Cost')}</TableCell><TableCell>{t('Description')}</TableCell><TableCell align="right">{t('Amount')}</TableCell></TableRow></TableHead>
                <TableBody>
                  {report.expenses.map((item) => (
                    <TableRow key={item.id}><TableCell>{item.date}</TableCell><TableCell>{item.title}</TableCell><TableCell>{item.description || '—'}</TableCell><TableCell align="right">{Number(item.amount).toFixed(2)} MAD</TableCell></TableRow>
                  ))}
                  {!report.expenses.length && <TableRow><TableCell colSpan={4} align="center">{t('No platform costs recorded for')} {year}.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </>
      )}

      <Dialog open={expenseOpen} onClose={() => !saving && setExpenseOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={saveExpense}>
          <DialogTitle>{t('Add platform cost')}</DialogTitle>
          <DialogContent dividers>
            <TextField fullWidth required label={t('Cost title')} value={expense.title} onChange={(event) => setExpense({ ...expense, title: event.target.value })} sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><TextField fullWidth required type="number" label={t('Amount (MAD)')} value={expense.amount} inputProps={{ min: '0.01', step: '0.01' }} onChange={(event) => setExpense({ ...expense, amount: event.target.value })} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth required type="date" label={t('Date')} value={expense.date} InputLabelProps={{ shrink: true }} onChange={(event) => setExpense({ ...expense, date: event.target.value })} /></Grid>
              <Grid item xs={12}><TextField fullWidth multiline minRows={2} label={t('Description')} value={expense.description} onChange={(event) => setExpense({ ...expense, description: event.target.value })} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions><Button onClick={() => setExpenseOpen(false)} disabled={saving}>{t('Cancel')}</Button><Button type="submit" variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={18} /> : <AddIcon />}>{t('Save cost')}</Button></DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
