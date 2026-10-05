import React from 'react';
import {
  Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Button, Box, Chip, TextField, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, TablePagination
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import usePagination from '../hooks/usePagination';

const PAYMENT_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'month', label: 'Monthly' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'assurance', label: 'Insurance' },
  { value: 'jawaz', label: 'Jawaz' },
];

export default function PaymentList() {
  const {
    data: payments,
    loading,
    page,
    rowsPerPage,
    totalCount,
    filters,
    handlePageChange,
    handleRowsPerPageChange,
    applyFilter
  } = usePagination('/crm/payments/', { paymentCategry: 'all', start_date: '', end_date: '' });

  // Compute total of current page (backend might need a dedicated endpoint for overall total)
  const pageTotal = payments.reduce((sum, p) => sum + parseFloat(p.paymentAmount || 0), 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Payments</Typography>
        <Button variant="contained" startIcon={<AddIcon />} size="large">
          Record Payment
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', borderRadius: 2 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Type</InputLabel>
          <Select 
            value={filters.paymentCategry || 'all'} 
            label="Type" 
            onChange={(e) => applyFilter('paymentCategry', e.target.value)}
          >
            {PAYMENT_TYPES.map(t => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small" type="date" label="From" 
          value={filters.start_date || ''}
          onChange={(e) => applyFilter('start_date', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small" type="date" label="To" 
          value={filters.end_date || ''}
          onChange={(e) => applyFilter('end_date', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Chip
          label={`Page Total: ${pageTotal.toFixed(2)} MAD`}
          color="success"
          variant="outlined"
          sx={{ ml: 'auto' }}
        />
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'background.default' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Member</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Amount (MAD)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No payments found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{p.trainer_name} {p.trainer_surname}</TableCell>
                  <TableCell>{p.paymentdate}</TableCell>
                  <TableCell>
                    <Chip label={p.category_display || p.paymentCategry} size="small" color="info" sx={{ borderRadius: 1 }} />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'success.main' }}>
                    {parseFloat(p.paymentAmount).toFixed(2)} DH
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </TableContainer>
    </Box>
  );
}
