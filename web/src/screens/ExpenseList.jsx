import React, { useState } from 'react';
import {
  Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Button, Box, Chip, CircularProgress, Tabs, Tab, TablePagination,
  IconButton, Tooltip, Snackbar, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import usePagination from '../hooks/usePagination';
import { ExpenseDialog, AddedPaymentDialog } from '../components/FinanceDialogs';
import apiClient from '../services/api';

export default function ExpenseList() {
  const [tab, setTab] = useState(0);

  // Dialog States
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  
  const [addedDialogOpen, setAddedDialogOpen] = useState(false);
  const [selectedAdded, setSelectedAdded] = useState(null);

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const expenses = usePagination('/crm/expenses/');
  const addedPayments = usePagination('/crm/added-payments/');

  const activePagination = tab === 0 ? expenses : addedPayments;
  const activeData = activePagination.data;
  
  const pageTotalExpenses = expenses.data.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const pageTotalAdded = addedPayments.data.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  // Handlers for Expenses
  const handleAddExpense = () => { setSelectedExpense(null); setExpenseDialogOpen(true); };
  const handleEditExpense = (item) => { setSelectedExpense(item); setExpenseDialogOpen(true); };
  const handleDeleteExpense = async (item) => {
    if (window.confirm(`Delete expense "${item.cost}"?`)) {
      try {
        await apiClient.delete(`/crm/expenses/${item.id}/`);
        setToast({ open: true, message: 'Expense deleted.', severity: 'success' });
        expenses.refresh();
      } catch (err) { setToast({ open: true, message: 'Failed to delete.', severity: 'error' }); }
    }
  };

  // Handlers for Added Payments
  const handleAddAdded = () => { setSelectedAdded(null); setAddedDialogOpen(true); };
  const handleEditAdded = (item) => { setSelectedAdded(item); setAddedDialogOpen(true); };
  const handleDeleteAdded = async (item) => {
    if (window.confirm(`Delete payment "${item.title}"?`)) {
      try {
        await apiClient.delete(`/crm/added-payments/${item.id}/`);
        setToast({ open: true, message: 'Payment deleted.', severity: 'success' });
        addedPayments.refresh();
      } catch (err) { setToast({ open: true, message: 'Failed to delete.', severity: 'error' }); }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          {tab === 0 ? 'Expenses' : 'Additional Payments'}
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          size="large"
          onClick={tab === 0 ? handleAddExpense : handleAddAdded}
        >
          {tab === 0 ? 'Add Expense' : 'Add Payment'}
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label={`Expenses (${expenses.totalCount})`} />
          <Tab label={`Added Payments (${addedPayments.totalCount})`} />
        </Tabs>
      </Box>

      {activePagination.error && <Alert severity="error" sx={{ mb: 2 }}>{activePagination.error}</Alert>}

      {activePagination.loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
      ) : tab === 0 ? (
        <>
          <Chip label={`Page Total: ${pageTotalExpenses.toFixed(2)} MAD`} color="error" variant="outlined" sx={{ mb: 2 }} />
          <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'error.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Title</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Description</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Amount (MAD)</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Recurring</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'right' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activeData.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{e.cost}</TableCell>
                    <TableCell>{e.desc || '—'}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'error.main' }}>{parseFloat(e.amount).toFixed(2)}</TableCell>
                    <TableCell>{e.date?.slice(0, 10)}</TableCell>
                    <TableCell>{e.is_recurring && <Chip label="Recurring" size="small" color="warning" />}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => handleEditExpense(e)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDeleteExpense(e)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {activeData.length === 0 && (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><Typography color="text.secondary">No expenses found.</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div" count={expenses.totalCount} page={expenses.page}
              onPageChange={expenses.handlePageChange} rowsPerPage={expenses.rowsPerPage}
              onRowsPerPageChange={expenses.handleRowsPerPageChange} rowsPerPageOptions={[10, 25, 50]}
            />
          </TableContainer>
        </>
      ) : (
        <>
          <Chip label={`Page Total: ${pageTotalAdded.toFixed(2)} MAD`} color="success" variant="outlined" sx={{ mb: 2 }} />
          <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'success.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Title</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Description</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Amount (MAD)</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'right' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activeData.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{p.title}</TableCell>
                    <TableCell>{p.desc || '—'}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'success.main' }}>{parseFloat(p.amount).toFixed(2)}</TableCell>
                    <TableCell>{p.date?.slice(0, 10)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => handleEditAdded(p)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDeleteAdded(p)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {activeData.length === 0 && (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}><Typography color="text.secondary">No additional payments found.</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div" count={addedPayments.totalCount} page={addedPayments.page}
              onPageChange={addedPayments.handlePageChange} rowsPerPage={addedPayments.rowsPerPage}
              onRowsPerPageChange={addedPayments.handleRowsPerPageChange} rowsPerPageOptions={[10, 25, 50]}
            />
          </TableContainer>
        </>
      )}

      <ExpenseDialog
        open={expenseDialogOpen} onClose={() => setExpenseDialogOpen(false)}
        expense={selectedExpense} onSuccess={() => { setExpenseDialogOpen(false); setToast({ open: true, message: 'Saved successfully.', severity: 'success' }); expenses.refresh(); }}
      />
      <AddedPaymentDialog
        open={addedDialogOpen} onClose={() => setAddedDialogOpen(false)}
        payment={selectedAdded} onSuccess={() => { setAddedDialogOpen(false); setToast({ open: true, message: 'Saved successfully.', severity: 'success' }); addedPayments.refresh(); }}
      />
      
      <Snackbar open={toast.open} autoHideDuration={6000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: '100%' }}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}
