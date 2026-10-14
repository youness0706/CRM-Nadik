import React, { useState } from 'react';
import {
  Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Button, Box, Chip, CircularProgress, TablePagination,
  IconButton, Tooltip, Snackbar, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import usePagination from '../hooks/usePagination';
import StaffDialog from '../components/StaffDialog';
import apiClient from '../services/api';

export default function StaffList() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const {
    data: staff,
    loading,
    error,
    page,
    rowsPerPage,
    totalCount,
    handlePageChange,
    handleRowsPerPageChange,
    refresh
  } = usePagination('/crm/staff/');

  const pageTotalSalaries = staff.reduce((sum, s) => sum + parseFloat(s.salary || 0), 0);

  const handleAddClick = () => {
    setSelectedStaff(null);
    setDialogOpen(true);
  };

  const handleEditClick = (s) => {
    setSelectedStaff(s);
    setDialogOpen(true);
  };

  const handleDeleteClick = async (s) => {
    if (window.confirm(`Are you sure you want to delete staff member ${s.username}?`)) {
      try {
        await apiClient.delete(`/crm/staff/${s.id}/`);
        setToast({ open: true, message: 'Staff deleted successfully.', severity: 'success' });
        refresh();
      } catch (err) {
        setToast({ open: true, message: err.response?.data?.detail || 'Failed to delete staff.', severity: 'error' });
      }
    }
  };

  const handleDialogSuccess = () => {
    setDialogOpen(false);
    setToast({ open: true, message: selectedStaff ? 'Staff updated successfully.' : 'Staff added successfully.', severity: 'success' });
    refresh();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Staff</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Chip label={`Page Salaries: ${pageTotalSalaries.toFixed(2)} MAD`} color="info" variant="outlined" />
          <Button variant="contained" startIcon={<AddIcon />} size="large" onClick={handleAddClick}>Add Staff</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
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
                  <TableCell align="right">
                    <Tooltip title="Edit Staff">
                      <IconButton size="small" color="primary" onClick={() => handleEditClick(s)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Staff">
                      <IconButton size="small" color="error" onClick={() => handleDeleteClick(s)}>
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

      <StaffDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        staff={selectedStaff}
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
