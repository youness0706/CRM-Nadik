import React, { useState } from 'react';
import {
  Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Button, Box, Chip, TextField, InputAdornment,
  CircularProgress, ToggleButtonGroup, ToggleButton, FormControl, InputLabel,
  Select, MenuItem, TablePagination
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import usePagination from '../hooks/usePagination';

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
  
  const {
    data: members,
    loading,
    page,
    rowsPerPage,
    totalCount,
    filters,
    handlePageChange,
    handleRowsPerPageChange,
    applyFilter,
    applyMultipleFilters
  } = usePagination('/crm/members/', { is_active: 'true', category: 'all' });

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') {
      applyFilter('search', searchInput);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Members</Typography>
        <Button variant="contained" startIcon={<AddIcon />} size="large">
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

      <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'background.default' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Phone</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Belt</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Age</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Gender</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Started</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
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
                  <TableCell>{m.male_female === 'male' ? '♂' : '♀'}</TableCell>
                  <TableCell>{m.started_day}</TableCell>
                  <TableCell>
                    <Chip
                      label={m.is_active ? 'Active' : 'Inactive'}
                      color={m.is_active ? 'success' : 'default'}
                      size="small"
                      sx={{ borderRadius: 1 }}
                    />
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
