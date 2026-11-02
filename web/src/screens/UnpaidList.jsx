import React, { useState, useEffect } from 'react';
import {
  Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Box, CircularProgress, FormControl, InputLabel, Select, MenuItem, Chip, Alert,
  Card, CardContent, useMediaQuery, useTheme, Stack, Button
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import apiClient from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { useLanguage } from '../state/LanguageContext';

export default function UnpaidList() {
  const { language, t } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [data, setData] = useState({ unpaid: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUnpaid();
  }, [year, month]);

  const fetchUnpaid = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get(`/crm/unpaid/?year=${year}&month=${month}`);
      setData(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load unpaid members.'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - i);
  const months = [
    ...Array.from({ length: 12 }, (_, index) => ({
      value: index + 1,
      label: new Date(2000, index, 1).toLocaleDateString(language === 'ar' ? 'ar' : 'fr-FR', { month: 'long' }),
    }))
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Typography variant="h4" fontWeight="bold">{t('Unpaid Members')}</Typography>
      </Box>

      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', borderRadius: 2 }}>
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel>{t('Year')}</InputLabel>
          <Select value={year} label="Year" onChange={(e) => setYear(e.target.value)}>
            {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>{t('Month')}</InputLabel>
          <Select value={month} label="Month" onChange={(e) => setMonth(e.target.value)}>
            {months.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
          </Select>
        </FormControl>
        <Chip
          icon={<WarningIcon />}
          label={`${data.count} ${t('unpaid members')}`}
          color="warning"
          sx={{ ml: { xs: 0, sm: 'auto' }, fontWeight: 600 }}
        />
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {isMobile ? (
        <Box>
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
          ) : data.unpaid.length === 0 ? (
            <Paper sx={{ textAlign: 'center', py: 6, borderRadius: 2 }}>
              <Typography color="text.secondary">{t('All members have paid for this month!')}</Typography>
            </Paper>
          ) : (
            <Stack spacing={1.5}>
              {data.unpaid.map((m) => (
                <Card key={m.id} sx={{ borderRadius: 2.5, borderLeft: 4, borderColor: 'warning.main', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
                  <CardContent sx={{ p: '14px 16px !important' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography fontWeight={700} sx={{ fontSize: '0.95rem' }}>{m.first_name} {m.last_name}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                          {m.phone || '—'} • {m.category || ''}
                        </Typography>
                      </Box>
                      {m.phone && (
                        <Button
                          component="a"
                          href={`https://wa.me/${m.phone}`}
                          target="_blank"
                          rel="noreferrer"
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<WhatsAppIcon fontSize="small" />}
                          sx={{ borderRadius: 1.5, minHeight: 32, fontSize: '0.75rem' }}
                        >
                          {t('WhatsApp')}
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'warning.light' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('Name')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('Phone')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('Category')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>{t('Actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow>
              ) : data.unpaid.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6 }}><Typography color="text.secondary">{t('All members have paid for this month!')}</Typography></TableCell></TableRow>
              ) : (
                data.unpaid.map((m) => (
                  <TableRow key={m.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{m.first_name} {m.last_name}</TableCell>
                    <TableCell>{m.phone || '—'}</TableCell>
                    <TableCell>{m.category}</TableCell>
                    <TableCell align="right">
                      {m.phone && (
                        <a href={`https://wa.me/${m.phone}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                          <Chip icon={<WhatsAppIcon />} label={t('WhatsApp')} color="success" size="small" clickable />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
