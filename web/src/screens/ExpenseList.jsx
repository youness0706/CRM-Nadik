import React, { useState } from 'react';
import {
  Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Button, Box, Chip, CircularProgress, Tabs, Tab, TablePagination
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import usePagination from '../hooks/usePagination';

export default function ExpenseList() {
  const [tab, setTab] = useState(0);

  const expenses = usePagination('/crm/expenses/');
  const addedPayments = usePagination('/crm/added-payments/');

  const activePagination = tab === 0 ? expenses : addedPayments;
  const activeData = activePagination.data;
  
  // Note: These page totals are only for the current page.
  // Backend aggregated totals should be used for full insights.
  const pageTotalExpenses = expenses.data.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const pageTotalAdded = addedPayments.data.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          {tab === 0 ? 'Expenses' : 'Additional Payments'}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} size="large">
          {tab === 0 ? 'Add Expense' : 'Add Payment'}
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label={`Expenses (${expenses.totalCount})`} />
          <Tab label={`Added Payments (${addedPayments.totalCount})`} />
        </Tabs>
      </Box>

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
                </TableRow>
              </TableHead>
              <TableBody>
                {activeData.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{e.cost}</TableCell>
                    <TableCell>{e.desc || '—'}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'error.main' }}>
                      {parseFloat(e.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>{e.date?.slice(0, 10)}</TableCell>
                    <TableCell>
                      {e.is_recurring && <Chip label="Recurring" size="small" color="warning" />}
                    </TableCell>
                  </TableRow>
                ))}
                {activeData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No expenses found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={expenses.totalCount}
              page={expenses.page}
              onPageChange={expenses.handlePageChange}
              rowsPerPage={expenses.rowsPerPage}
              onRowsPerPageChange={expenses.handleRowsPerPageChange}
              rowsPerPageOptions={[10, 25, 50]}
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
                </TableRow>
              </TableHead>
              <TableBody>
                {activeData.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{p.title}</TableCell>
                    <TableCell>{p.desc || '—'}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {parseFloat(p.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>{p.date?.slice(0, 10)}</TableCell>
                  </TableRow>
                ))}
                {activeData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No additional payments found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={addedPayments.totalCount}
              page={addedPayments.page}
              onPageChange={addedPayments.handlePageChange}
              rowsPerPage={addedPayments.rowsPerPage}
              onRowsPerPageChange={addedPayments.handleRowsPerPageChange}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </TableContainer>
        </>
      )}
    </Box>
  );
}
