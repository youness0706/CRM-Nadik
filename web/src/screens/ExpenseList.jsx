import React, { useState, useEffect } from 'react';
import {
  Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Button, Box, Chip, CircularProgress, Tabs, Tab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import apiClient from '../services/api';

export default function ExpenseList() {
  const [expenses, setExpenses] = useState([]);
  const [addedPayments, setAddedPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    Promise.all([
      apiClient.get('/crm/expenses/'),
      apiClient.get('/crm/added-payments/'),
    ]).then(([expRes, addRes]) => {
      setExpenses(expRes.data);
      setAddedPayments(addRes.data);
    }).catch(err => {
      console.error('Failed to fetch data:', err);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const totalAdded = addedPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

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
          <Tab label={`Expenses (${expenses.length})`} />
          <Tab label={`Added Payments (${addedPayments.length})`} />
        </Tabs>
      </Box>

      {tab === 0 ? (
        <>
          <Chip label={`Total Expenses: $${totalExpenses.toFixed(2)}`} color="error" variant="outlined" sx={{ mb: 2 }} />
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'error.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Title</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Description</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Amount</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Recurring</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{e.cost}</TableCell>
                    <TableCell>{e.desc || '—'}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'error.main' }}>
                      ${parseFloat(e.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>{e.date?.slice(0, 10)}</TableCell>
                    <TableCell>
                      {e.is_recurring && <Chip label="Recurring" size="small" color="warning" />}
                    </TableCell>
                  </TableRow>
                ))}
                {expenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No expenses found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        <>
          <Chip label={`Total: $${totalAdded.toFixed(2)}`} color="success" variant="outlined" sx={{ mb: 2 }} />
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'success.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Title</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Description</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Amount</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {addedPayments.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{p.title}</TableCell>
                    <TableCell>{p.desc || '—'}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      ${parseFloat(p.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>{p.date?.slice(0, 10)}</TableCell>
                  </TableRow>
                ))}
                {addedPayments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No additional payments found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
