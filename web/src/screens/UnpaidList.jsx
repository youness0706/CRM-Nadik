import React, { useState, useEffect } from 'react';
import {
  Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Box, CircularProgress, FormControl, InputLabel, Select, MenuItem, Chip, Alert
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import apiClient from '../services/api';
import { getApiErrorMessage } from '../services/errors';

export default function UnpaidList() {
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
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Unpaid Members</Typography>
      </Box>

      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', borderRadius: 2 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Year</InputLabel>
          <Select value={year} label="Year" onChange={(e) => setYear(e.target.value)}>
            {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Month</InputLabel>
          <Select value={month} label="Month" onChange={(e) => setMonth(e.target.value)}>
            {months.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
          </Select>
        </FormControl>
        <Chip icon={<WarningIcon />} label={`${data.count} unpaid members`} color="warning" sx={{ ml: 'auto' }} />
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'warning.light' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Phone</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow>
            ) : data.unpaid.length === 0 ? (
              <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6 }}><Typography color="text.secondary">All members have paid for this month!</Typography></TableCell></TableRow>
            ) : (
              data.unpaid.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{m.first_name} {m.last_name}</TableCell>
                  <TableCell>{m.phone || '—'}</TableCell>
                  <TableCell>{m.category}</TableCell>
                  <TableCell align="right">
                    {m.phone && (
                      <a href={`https://wa.me/${m.phone}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                        <Chip label="WhatsApp" color="success" size="small" clickable />
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
