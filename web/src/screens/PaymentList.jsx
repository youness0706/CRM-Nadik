import React, { useState } from 'react';
import {
  Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Button, Box, Chip, TextField, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, TablePagination,
  IconButton, Tooltip, Snackbar, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import usePagination from '../hooks/usePagination';
import PaymentDialog from '../components/PaymentDialog';
import apiClient from '../services/api';
import { useLanguage } from '../state/LanguageContext';

const PAYMENT_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'month', label: 'Monthly' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'assurance', label: 'Insurance' },
  { value: 'jawaz', label: 'Jawaz' },
];

export default function PaymentList() {
  const { t } = useLanguage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const {
    data: payments,
    loading,
    error,
    page,
    rowsPerPage,
    totalCount,
    filters,
    handlePageChange,
    handleRowsPerPageChange,
    applyFilter,
    refresh
  } = usePagination('/crm/payments/', { paymentCategry: 'all', start_date: '', end_date: '' });

  // Compute total of current page (backend might need a dedicated endpoint for overall total)
  const pageTotal = payments.reduce((sum, p) => sum + parseFloat(p.paymentAmount || 0), 0);

  const handleAddClick = () => {
    setSelectedPayment(null);
    setDialogOpen(true);
  };

  const handleEditClick = (payment) => {
    setSelectedPayment(payment);
    setDialogOpen(true);
  };

  const handleDeleteClick = async (payment) => {
    if (window.confirm(`Are you sure you want to delete this payment of ${payment.paymentAmount} MAD for ${payment.trainer_name}?`)) {
      try {
        await apiClient.delete(`/crm/payments/${payment.id}/`);
        setToast({ open: true, message: 'Payment deleted successfully.', severity: 'success' });
        refresh();
      } catch (err) {
        setToast({ open: true, message: 'Failed to delete payment.', severity: 'error' });
      }
    }
  };

  const handleDialogSuccess = () => {
    setDialogOpen(false);
    setToast({ open: true, message: selectedPayment ? 'Payment updated successfully.' : 'Payment recorded successfully.', severity: 'success' });
    refresh();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">{t('Payments')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} size="large" onClick={handleAddClick}>
          {t('Record Payment')}
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', borderRadius: 2 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>{t('Type')}</InputLabel>
          <Select 
            value={filters.paymentCategry || 'all'} 
            label={t('Type')}
            onChange={(e) => applyFilter('paymentCategry', e.target.value)}
          >
            {PAYMENT_TYPES.map((item) => (
              <MenuItem key={item.value} value={item.value}>{t(item.label)}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small" type="date" label={t('From')} 
          value={filters.start_date || ''}
          onChange={(e) => applyFilter('start_date', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small" type="date" label={t('To')} 
          value={filters.end_date || ''}
          onChange={(e) => applyFilter('end_date', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Chip
          label={`${t('Page Total:')} ${pageTotal.toFixed(2)} MAD`}
          color="success"
          variant="outlined"
          sx={{ ml: 'auto' }}
        />
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'background.default' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('Member')}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('Date')}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('Type')}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{t('Amount (MAD)')}</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>{t('Actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">{t('No payments found.')}</Typography>
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
                  <TableCell align="right">
                    <Tooltip title={t('Edit Payment')}>
                      <IconButton size="small" color="primary" onClick={() => handleEditClick(p)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('Delete Payment')}>
                      <IconButton size="small" color="error" onClick={() => handleDeleteClick(p)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
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

      <PaymentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        payment={selectedPayment}
        onSuccess={handleDialogSuccess}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
