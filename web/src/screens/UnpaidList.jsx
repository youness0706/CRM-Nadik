import React, { useState, useEffect } from 'react';
import {
  Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Box, CircularProgress, FormControl, InputLabel, Select, MenuItem, Chip, Alert
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import apiClient from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { useLanguage } from '../state/LanguageContext';

export default function UnpaidList() {
  const { language, t } = useLanguage();
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">{t('Unpaid Members')}</Typography>
      </Box>

      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', borderRadius: 2 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>{t('Year')}</InputLabel>
          <Select value={year} label="Year" onChange={(e) => setYear(e.target.value)}>
            {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>{t('Month')}</InputLabel>
          <Select value={month} label="Month" onChange={(e) => setMonth(e.target.value)}>
            {months.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
          </Select>
        </FormControl>
        <Chip icon={<WarningIcon />} label={`${data.count} ${t('unpaid members')}`} color="warning" sx={{ ml: 'auto' }} />
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
                        <Chip label={t('WhatsApp')} color="success" size="small" clickable />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
