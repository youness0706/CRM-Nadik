import React, { useState } from 'react';
import {
  Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Button, Box, Chip, CircularProgress, Tabs, Tab, TablePagination,
  IconButton, Tooltip, Snackbar, Alert, Card, CardContent, useMediaQuery, useTheme, Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import usePagination from '../hooks/usePagination';
import { ExpenseDialog, AddedPaymentDialog } from '../components/FinanceDialogs';
import apiClient from '../services/api';
import { useLanguage } from '../state/LanguageContext';

export default function ExpenseList() {
  const { t } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [tab, setTab] = useState(0);

  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  
  const [addedDialogOpen, setAddedDialogOpen] = useState(false);
  const [selectedAdded, setSelectedAdded] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const expenses = usePagination('/crm/expenses/');
  const addedPayments = usePagination('/crm/added-payments/');

  const activePagination = tab === 0 ? expenses : addedPayments;
  const activeData = activePagination.data;
  
  const pageTotalExpenses = expenses.data.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const pageTotalAdded = addedPayments.data.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  const handleAddExpense = () => { setSelectedExpense(null); setExpenseDialogOpen(true); };
  const handleEditExpense = (item) => { setSelectedExpense(item); setExpenseDialogOpen(true); };
  const handleDeleteExpense = async (item) => {
    if (deletingId === item.id) return;
    if (window.confirm(`${t('Delete expense')} "${item.cost}"?`)) {
      setDeletingId(item.id);
      try {
        await apiClient.delete(`/crm/expenses/${item.id}/`);
        setToast({ open: true, message: t('Expense deleted.'), severity: 'success' });
        expenses.refresh();
      } catch {
        setToast({ open: true, message: t('Failed to delete.'), severity: 'error' });
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleAddAdded = () => { setSelectedAdded(null); setAddedDialogOpen(true); };
  const handleEditAdded = (item) => { setSelectedAdded(item); setAddedDialogOpen(true); };
  const handleDeleteAdded = async (item) => {
    if (deletingId === item.id) return;
    if (window.confirm(`Delete payment "${item.title}"?`)) {
      setDeletingId(item.id);
      try {
        await apiClient.delete(`/crm/added-payments/${item.id}/`);
        setToast({ open: true, message: t('Payment deleted.'), severity: 'success' });
        addedPayments.refresh();
      } catch {
        setToast({ open: true, message: t('Failed to delete.'), severity: 'error' });
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" fontWeight="bold">
          {tab === 0 ? t('Expenses') : t('Additional Payments')}
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          size={isMobile ? 'medium' : 'large'}
          onClick={tab === 0 ? handleAddExpense : handleAddAdded}
        >
          {tab === 0 ? t('Add Expense') : t('Add Payment')}
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label={`${t('Expenses')} (${expenses.totalCount})`} />
          <Tab label={`${t('Additional Payments')} (${addedPayments.totalCount})`} />
        </Tabs>
      </Box>

      {activePagination.error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{activePagination.error}</Alert>}

      {activePagination.loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
      ) : tab === 0 ? (
        <>
          <Chip label={`${t('Page Total:')} ${pageTotalExpenses.toFixed(2)} DH`} color="error" variant="outlined" sx={{ mb: 2, fontWeight: 600 }} />
          {isMobile ? (
            <Box>
              {activeData.length === 0 ? (
                <Paper sx={{ textAlign: 'center', py: 6, borderRadius: 2 }}><Typography color="text.secondary">{t('No expenses found.')}</Typography></Paper>
              ) : (
                <Stack spacing={1.5}>
                  {activeData.map((e) => (
                    <Card key={e.id} sx={{ borderRadius: 2.5, borderLeft: 4, borderColor: 'error.main', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
                      <CardContent sx={{ p: '14px 16px !important' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box>
                            <Typography fontWeight={700} sx={{ fontSize: '0.95rem' }}>{e.cost}</Typography>
                            <Typography variant="caption" color="text.secondary">{e.date?.slice(0, 10)} {e.desc ? `• ${e.desc}` : ''}</Typography>
                          </Box>
                          <Typography variant="subtitle1" fontWeight={800} color="error.main">
                            {parseFloat(e.amount).toFixed(2)} DH
                          </Typography>
                        </Box>
                        {e.is_recurring && <Chip label={t('Recurring')} size="small" color="warning" sx={{ height: 20, fontSize: '0.7rem', mb: 1 }} />}
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', borderTop: '1px solid', borderColor: 'divider', pt: 1, mt: 1 }}>
                          <Button size="small" variant="outlined" color="primary" startIcon={<EditIcon fontSize="small" />} onClick={() => handleEditExpense(e)} sx={{ minHeight: 32, borderRadius: 1.5 }}>
                            {t('Edit')}
                          </Button>
                          <Button size="small" variant="outlined" color="error" startIcon={deletingId === e.id ? <CircularProgress size={14} color="inherit" /> : <DeleteIcon fontSize="small" />} onClick={() => handleDeleteExpense(e)} disabled={deletingId === e.id} sx={{ minHeight: 32, borderRadius: 1.5 }}>
                            {t('Delete expense')}
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
              <TablePagination
                component="div" count={expenses.totalCount} page={expenses.page}
                onPageChange={expenses.handlePageChange} rowsPerPage={expenses.rowsPerPage}
                onRowsPerPageChange={expenses.handleRowsPerPageChange} rowsPerPageOptions={[10, 25, 50]}
                sx={{ mt: 1 }}
              />
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'error.main' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('Title')}</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('Description')}</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('Amount (MAD)')}</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('Date')}</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('Recurring')}</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'right' }}>{t('Actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeData.map((e) => (
                    <TableRow key={e.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{e.cost}</TableCell>
                      <TableCell>{e.desc || '—'}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'error.main' }}>{parseFloat(e.amount).toFixed(2)} DH</TableCell>
                      <TableCell>{e.date?.slice(0, 10)}</TableCell>
                      <TableCell>{e.is_recurring && <Chip label={t('Recurring')} size="small" color="warning" />}</TableCell>
                      <TableCell align="right">
                        <Tooltip title={t('Edit')}><IconButton size="small" color="primary" onClick={() => handleEditExpense(e)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title={t('Delete expense')}><IconButton size="small" color="error" onClick={() => handleDeleteExpense(e)} disabled={deletingId === e.id}>{deletingId === e.id ? <CircularProgress size={14} /> : <DeleteIcon fontSize="small" />}</IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {activeData.length === 0 && (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><Typography color="text.secondary">{t('No expenses found.')}</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <TablePagination
                component="div" count={expenses.totalCount} page={expenses.page}
                onPageChange={expenses.handlePageChange} rowsPerPage={expenses.rowsPerPage}
                onRowsPerPageChange={expenses.handleRowsPerPageChange} rowsPerPageOptions={[10, 25, 50]}
              />
            </TableContainer>
          )}
        </>
      ) : (
        <>
          <Chip label={`${t('Page Total:')} ${pageTotalAdded.toFixed(2)} DH`} color="success" variant="outlined" sx={{ mb: 2, fontWeight: 600 }} />
          {isMobile ? (
            <Box>
              {activeData.length === 0 ? (
                <Paper sx={{ textAlign: 'center', py: 6, borderRadius: 2 }}><Typography color="text.secondary">{t('No additional payments found.')}</Typography></Paper>
              ) : (
                <Stack spacing={1.5}>
                  {activeData.map((p) => (
                    <Card key={p.id} sx={{ borderRadius: 2.5, borderLeft: 4, borderColor: 'success.main', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
                      <CardContent sx={{ p: '14px 16px !important' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box>
                            <Typography fontWeight={700} sx={{ fontSize: '0.95rem' }}>{p.title}</Typography>
                            <Typography variant="caption" color="text.secondary">{p.date?.slice(0, 10)} {p.desc ? `• ${p.desc}` : ''}</Typography>
                          </Box>
                          <Typography variant="subtitle1" fontWeight={800} color="success.main">
                            {parseFloat(p.amount).toFixed(2)} DH
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', borderTop: '1px solid', borderColor: 'divider', pt: 1, mt: 1 }}>
                          <Button size="small" variant="outlined" color="primary" startIcon={<EditIcon fontSize="small" />} onClick={() => handleEditAdded(p)} sx={{ minHeight: 32, borderRadius: 1.5 }}>
                            {t('Edit')}
                          </Button>
                          <Button size="small" variant="outlined" color="error" startIcon={deletingId === p.id ? <CircularProgress size={14} color="inherit" /> : <DeleteIcon fontSize="small" />} onClick={() => handleDeleteAdded(p)} disabled={deletingId === p.id} sx={{ minHeight: 32, borderRadius: 1.5 }}>
                            {t('Delete payment')}
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
              <TablePagination
                component="div" count={addedPayments.totalCount} page={addedPayments.page}
                onPageChange={addedPayments.handlePageChange} rowsPerPage={addedPayments.rowsPerPage}
                onRowsPerPageChange={addedPayments.handleRowsPerPageChange} rowsPerPageOptions={[10, 25, 50]}
                sx={{ mt: 1 }}
              />
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'success.main' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('Title')}</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('Description')}</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('Amount (MAD)')}</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('Date')}</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'right' }}>{t('Actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeData.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{p.title}</TableCell>
                      <TableCell>{p.desc || '—'}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'success.main' }}>{parseFloat(p.amount).toFixed(2)} DH</TableCell>
                      <TableCell>{p.date?.slice(0, 10)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title={t('Edit')}><IconButton size="small" color="primary" onClick={() => handleEditAdded(p)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title={t('Delete payment')}><IconButton size="small" color="error" onClick={() => handleDeleteAdded(p)} disabled={deletingId === p.id}>{deletingId === p.id ? <CircularProgress size={14} /> : <DeleteIcon fontSize="small" />}</IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {activeData.length === 0 && (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}><Typography color="text.secondary">{t('No additional payments found.')}</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <TablePagination
                component="div" count={addedPayments.totalCount} page={addedPayments.page}
                onPageChange={addedPayments.handlePageChange} rowsPerPage={addedPayments.rowsPerPage}
                onRowsPerPageChange={addedPayments.handleRowsPerPageChange} rowsPerPageOptions={[10, 25, 50]}
              />
            </TableContainer>
          )}
        </>
      )}

      <ExpenseDialog
        open={expenseDialogOpen} onClose={() => setExpenseDialogOpen(false)}
        expense={selectedExpense} onSuccess={() => { setExpenseDialogOpen(false); setToast({ open: true, message: t('Saved successfully.'), severity: 'success' }); expenses.refresh(); }}
      />
      <AddedPaymentDialog
        open={addedDialogOpen} onClose={() => setAddedDialogOpen(false)}
        payment={selectedAdded} onSuccess={() => { setAddedDialogOpen(false); setToast({ open: true, message: t('Saved successfully.'), severity: 'success' }); addedPayments.refresh(); }}
      />
      
      <Snackbar open={toast.open} autoHideDuration={6000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: '100%', borderRadius: 2 }}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}
