import React from 'react';
import {
  Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Button, Box, Chip, CircularProgress, TablePagination
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import usePagination from '../hooks/usePagination';

export default function StaffList() {
  const {
    data: staff,
    loading,
    page,
    rowsPerPage,
    totalCount,
    handlePageChange,
    handleRowsPerPageChange,
  } = usePagination('/crm/staff/');

  const pageTotalSalaries = staff.reduce((sum, s) => sum + parseFloat(s.salary || 0), 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Staff</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Chip label={`Page Salaries: ${pageTotalSalaries.toFixed(2)} MAD`} color="info" variant="outlined" />
          <Button variant="contained" startIcon={<AddIcon />} size="large">Add Staff</Button>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'background.default' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Admin</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Phone</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Salary (MAD)</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Started</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No staff members found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              staff.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{s.username}</TableCell>
                  <TableCell>{s.first_name} {s.last_name}</TableCell>
                  <TableCell>{s.role}</TableCell>
                  <TableCell>
                    <Chip
                      label={s.is_admin ? 'Admin' : 'Staff'}
                      color={s.is_admin ? 'primary' : 'default'}
                      size="small"
                      sx={{ borderRadius: 1 }}
                    />
                  </TableCell>
                  <TableCell>{s.phone_number || '—'}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{parseFloat(s.salary).toFixed(2)} DH</TableCell>
                  <TableCell>{s.started}</TableCell>
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
