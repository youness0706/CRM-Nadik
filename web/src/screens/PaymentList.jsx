import React, { useEffect, useState } from 'react';
import {
  Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Button, Box, Chip, TextField, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, TablePagination,
  IconButton, Tooltip, Snackbar, Alert, Autocomplete,
  Card, CardContent, useMediaQuery, useTheme, Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import ReceiptIcon from '@mui/icons-material/Receipt';
import usePagination from '../hooks/usePagination';
import PaymentDialog from '../components/PaymentDialog';
import apiClient from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { useLanguage } from '../state/LanguageContext';

const PAYMENT_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'month', label: 'Monthly' },
  { value: 'subscription', label: 'Yearly subscription' },
  { value: 'assurance', label: 'Insurance' },
  { value: 'jawaz', label: 'Jawaz' },
];

export default function PaymentList() {
  const { t } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [exportStatus, setExportStatus] = useState('paid');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

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

  useEffect(() => {
    let active = true;
    const fetchMembers = async () => {
      try {
        const response = await apiClient.get('/crm/members/', {
          params: { is_active: 'all', search: memberSearch, per_page: 100 },
        });
        if (active) setMembers(response.data.results || response.data || []);
      } catch (requestError) {
        if (active) setExportError(getApiErrorMessage(requestError, 'Unable to load trainees.'));
      }
    };
    fetchMembers();
    return () => { active = false; };
  }, [memberSearch]);

  const saveDownload = (response, filename) => {
    const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    setExportError('');
    try {
      const response = await apiClient.get('/crm/payments/export/docx/', {
        params: {
          ...filters,
          trainer: selectedMember?.id || '',
          status: exportStatus,
        },
        responseType: 'blob',
      });
      saveDownload(response, `nadik-${exportStatus}-payments.docx`);
    } catch (requestError) {
      setExportError(getApiErrorMessage(requestError, 'Unable to export the payment list.'));
    } finally {
      setExporting(false);
    }
  };

  const handleInvoiceDownload = async (payment) => {
    try {
      const response = await apiClient.get(`/crm/payments/${payment.id}/invoice/`, { responseType: 'blob' });
      saveDownload(response, `invoice-${payment.id}.pdf`);
    } catch (requestError) {
      setToast({
        open: true,
        message: getApiErrorMessage(requestError, 'Unable to download the payment invoice.'),
        severity: 'error',
      });
    }
  };

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
    if (deletingId === payment.id) return;
    if (window.confirm(`${t('Delete Payment')}?\n${payment.paymentAmount} MAD - ${payment.trainer_name}`)) {
      setDeletingId(payment.id);
      try {
        await apiClient.delete(`/crm/payments/${payment.id}/`);
        setToast({ open: true, message: t('Payment deleted.'), severity: 'success' });
        refresh();
      } catch (requestError) {
        setToast({
          open: true,
          message: getApiErrorMessage(requestError, t('Failed to delete.')),
          severity: 'error',
        });
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleDialogSuccess = () => {
    setDialogOpen(false);
    setToast({ open: true, message: selectedPayment ? t('Saved successfully.') : t('Saved successfully.'), severity: 'success' });
    refresh();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, gap: 1 }}>
        <Typography variant="h4" fontWeight="bold">{t('Payments')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} size={isMobile ? 'medium' : 'large'} onClick={handleAddClick} sx={{ flexShrink: 0 }}>
          {isMobile ? t('Record Payment') : t('Record Payment')}
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', borderRadius: 2 }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
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
          sx={{ minWidth: 130 }}
        />
        <TextField
          size="small" type="date" label={t('To')} 
          value={filters.end_date || ''}
          onChange={(e) => applyFilter('end_date', e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 130 }}
        />
        <Autocomplete
          size="small"
          sx={{ minWidth: { xs: '100%', sm: 200 }, flexGrow: 1 }}
          options={selectedMember && !members.some((member) => member.id === selectedMember.id)
            ? [selectedMember, ...members]
            : members}
          value={selectedMember}
          getOptionLabel={(member) => `${member.first_name} ${member.last_name}`}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(event, member) => {
            setSelectedMember(member);
            applyFilter('trainer', member?.id || '');
          }}
          onInputChange={(event, value) => setMemberSearch(value)}
          renderInput={(params) => <TextField {...params} label={t('Trainee')} />}
        />
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel>{t('List status')}</InputLabel>
          <Select value={exportStatus} label={t('List status')} onChange={(event) => setExportStatus(event.target.value)}>
            <MenuItem value="paid">{t('Paid')}</MenuItem>
            <MenuItem value="unpaid">{t('Unpaid')}</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
          disabled={exporting}
          onClick={handleExport}
          sx={{ minHeight: 38 }}
        >
          {t('Export Word')}
        </Button>
        <Chip
          label={`${t('Page Total:')} ${pageTotal.toFixed(2)} DH`}
          color="success"
          variant="outlined"
          sx={{ fontWeight: 'bold', ml: { xs: 0, sm: 'auto' } }}
        />
      </Paper>

      {exportError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setExportError('')}>{exportError}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {isMobile ? (
        <Box>
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
          ) : payments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}><Typography color="text.secondary">{t('No payments found.')}</Typography></Box>
          ) : (
            <Stack spacing={1.5}>
              {payments.map((p) => (
                <Card key={p.id} sx={{ borderRadius: 2.5, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
                  <CardContent sx={{ p: '14px 16px !important' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography fontWeight={700} sx={{ fontSize: '0.95rem' }}>{p.trainer_name} {p.trainer_surname}</Typography>
                        <Typography variant="caption" color="text.secondary">{p.paymentdate}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle1" fontWeight={800} color="success.main">
                          {parseFloat(p.paymentAmount).toFixed(2)} DH
                        </Typography>
                        <Chip label={p.category_display || p.paymentCategry} size="small" color="info" sx={{ borderRadius: 1, fontSize: '0.7rem', height: 20 }} />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5, justifyContent: 'flex-end', borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<EditIcon fontSize="small" />}
                        onClick={() => handleEditClick(p)}
                        sx={{ minHeight: 32, borderRadius: 1.5 }}
                      >
                        {t('Edit')}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={deletingId === p.id ? <CircularProgress size={14} color="inherit" /> : <DeleteIcon fontSize="small" />}
                        onClick={() => handleDeleteClick(p)}
                        disabled={deletingId === p.id}
                        sx={{ minHeight: 32, borderRadius: 1.5 }}
                      >
                        {t('Delete Payment')}
                      </Button>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleInvoiceDownload(p)}
                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 0.7 }}
                      >
                        <ReceiptIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[10, 25, 50]}
            sx={{ mt: 1 }}
          />
        </Box>
      ) : (
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
                        <IconButton size="small" color="error" onClick={() => handleDeleteClick(p)} disabled={deletingId === p.id}>
                          {deletingId === p.id ? <CircularProgress size={14} /> : <DeleteIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('Download invoice')}>
                        <IconButton size="small" color="primary" onClick={() => handleInvoiceDownload(p)}>
                          <ReceiptIcon fontSize="small" />
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
      )}

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
        <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: '100%', borderRadius: 2 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
