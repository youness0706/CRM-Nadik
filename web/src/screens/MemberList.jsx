import React, { useState } from 'react';
import {
  Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Button, Box, Chip, TextField, InputAdornment,
  CircularProgress, ToggleButtonGroup, ToggleButton, FormControl, InputLabel,
  Select, MenuItem, TablePagination, IconButton, Tooltip, Snackbar, Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import usePagination from '../hooks/usePagination';
import MemberDialog from '../components/MemberDialog';
import apiClient from '../services/api';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'الصغار', label: 'Kids (الصغار)' },
  { value: 'فتيان', label: 'Boys (فتيان)' },
  { value: 'شبان', label: 'Youth (شبان)' },
  { value: 'كبار', label: 'Adults (كبار)' },
  { value: 'نساء', label: 'Women (نساء)' },
];

export default function MemberList() {
  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  
  const {
    data: members,
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
  } = usePagination('/crm/members/', { is_active: 'true', category: 'all' });

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') {
      applyFilter('search', searchInput);
    }
  };

  const handleAddClick = () => {
    setSelectedMember(null);
    setDialogOpen(true);
  };

  const handleEditClick = (member) => {
    setSelectedMember(member);
    setDialogOpen(true);
  };

  const handleDeleteClick = async (member) => {
    if (window.confirm(`Are you sure you want to delete ${member.first_name} ${member.last_name}?`)) {
      try {
        await apiClient.delete(`/crm/members/${member.id}/`);
        setToast({ open: true, message: 'Member deleted successfully.', severity: 'success' });
        refresh();
      } catch (err) {
        setToast({ open: true, message: 'Failed to delete member.', severity: 'error' });
      }
    }
  };

  const handleDialogSuccess = () => {
    setDialogOpen(false);
    setToast({ open: true, message: selectedMember ? 'Member updated successfully.' : 'Member added successfully.', severity: 'success' });
    refresh();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Members</Typography>
        <Button variant="contained" startIcon={<AddIcon />} size="large" onClick={handleAddClick}>
          Add Member
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', borderRadius: 2 }}>
        <TextField
          size="small"
          placeholder="Search members (press Enter)..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleSearchSubmit}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
          }}
          sx={{ minWidth: 250, flexGrow: 1 }}
        />
        <ToggleButtonGroup
          value={filters.is_active || 'true'}
          exclusive
          onChange={(e, val) => val !== null && applyFilter('is_active', val)}
          size="small"
        >
          <ToggleButton value="true">Active</ToggleButton>
          <ToggleButton value="false">Inactive</ToggleButton>
        </ToggleButtonGroup>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={filters.category || 'all'}
            label="Category"
            onChange={(e) => applyFilter('category', e.target.value)}
          >
            {CATEGORIES.map(c => (
              <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'background.default' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Phone</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Belt</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Age</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No members found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              members.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{m.first_name} {m.last_name}</TableCell>
                  <TableCell>{m.phone || '—'}</TableCell>
                  <TableCell>{m.category}</TableCell>
                  <TableCell>{m.belt_degree || '—'}</TableCell>
                  <TableCell>{m.age || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={m.is_active ? 'Active' : 'Inactive'}
                      color={m.is_active ? 'success' : 'default'}
                      size="small"
                      sx={{ borderRadius: 1 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit Member">
                      <IconButton size="small" color="primary" onClick={() => handleEditClick(m)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Member">
                      <IconButton size="small" color="error" onClick={() => handleDeleteClick(m)}>
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

      <MemberDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        member={selectedMember}
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
