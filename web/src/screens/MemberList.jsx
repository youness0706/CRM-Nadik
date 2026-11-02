import React, { useState } from 'react';
import {
  Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Button, Box, Chip, TextField, InputAdornment,
  CircularProgress, ToggleButtonGroup, ToggleButton, FormControl, InputLabel,
  Select, MenuItem, TablePagination, IconButton, Tooltip, Snackbar, Alert,
  Card, CardContent, useMediaQuery, useTheme, Stack
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import usePagination from '../hooks/usePagination';
import MemberDialog from '../components/MemberDialog';
import apiClient from '../services/api';
import { useLanguage } from '../state/LanguageContext';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'الصغار', label: 'Kids (الصغار)' },
  { value: 'فتيان', label: 'Boys (فتيان)' },
  { value: 'شبان', label: 'Youth (شبان)' },
  { value: 'كبار', label: 'Adults (كبار)' },
  { value: 'نساء', label: 'Women (نساء)' },
];

export default function MemberList() {
  const { t } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const {
    data: members, loading, error, page, rowsPerPage, totalCount, filters,
    handlePageChange, handleRowsPerPageChange, applyFilter, refresh
  } = usePagination('/crm/members/', { is_active: 'all' });

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') applyFilter('search', searchInput);
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
    if (deletingId === member.id) return;
    if (!window.confirm(`${t('Delete Member')}?\n${member.first_name} ${member.last_name}`)) return;
    setDeletingId(member.id);
    try {
      await apiClient.delete(`/crm/members/${member.id}/`);
      setToast({ open: true, message: t('Member deleted successfully.'), severity: 'success' });
      refresh();
    } catch {
      setToast({ open: true, message: t('Failed to delete member.'), severity: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDialogSuccess = () => {
    setDialogOpen(false);
    setToast({ open: true, message: selectedMember ? t('Member updated successfully.') : t('Member added successfully.'), severity: 'success' });
    refresh();
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, gap: 1 }}>
        <Typography variant="h4" fontWeight="bold">{t('Members')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} size={isMobile ? 'medium' : 'large'} onClick={handleAddClick} sx={{ flexShrink: 0 }}>
          {isMobile ? t('Add Member') : t('Add Member')}
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2.5, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', borderRadius: 2 }}>
        <TextField
          size="small"
          placeholder={t('Search members (press Enter)...')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleSearchSubmit}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment>,
          }}
          sx={{ minWidth: { xs: '100%', sm: 220 }, flexGrow: 1 }}
        />
        <ToggleButtonGroup
          value={filters.is_active || 'all'}
          exclusive
          onChange={(e, val) => val !== null && applyFilter('is_active', val)}
          size="small"
          sx={{ flexWrap: 'wrap' }}
        >
          <ToggleButton value="all" sx={{ px: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.75rem', sm: '0.8rem' } }}>{t('All Statuses')}</ToggleButton>
          <ToggleButton value="true" sx={{ px: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.75rem', sm: '0.8rem' } }}>{t('Active')}</ToggleButton>
          <ToggleButton value="false" sx={{ px: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.75rem', sm: '0.8rem' } }}>{t('Inactive')}</ToggleButton>
        </ToggleButtonGroup>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>{t('Category')}</InputLabel>
          <Select
            value={filters.category || 'all'}
            label={t('Category')}
            onChange={(e) => applyFilter('category', e.target.value === 'all' ? '' : e.target.value)}
          >
            {CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{t(c.label)}</MenuItem>)}
          </Select>
        </FormControl>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Mobile card view */}
      {isMobile ? (
        <Box>
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
          ) : members.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}><Typography color="text.secondary">{t('No members found.')}</Typography></Box>
          ) : (
            <Stack spacing={1.5}>
              {members.map((m) => (
                <Card key={m.id} sx={{ borderRadius: 2.5, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
                  <CardContent sx={{ p: '14px 16px !important' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography fontWeight={700} sx={{ fontSize: '1rem', color: 'text.primary' }}>{m.first_name} {m.last_name}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                          {m.phone ? m.phone : '—'} • {m.category || ''}
                        </Typography>
                        {m.belt_degree && (
                          <Typography variant="caption" sx={{ color: 'primary.dark', display: 'block', mt: 0.5, fontWeight: 500 }}>
                            {t('Belt')}: {m.belt_degree}
                          </Typography>
                        )}
                      </Box>
                      <Chip
                        label={m.is_active ? t('Active') : t('Inactive')}
                        color={m.is_active ? 'success' : 'default'}
                        size="small"
                        sx={{ borderRadius: 1.5, fontSize: '0.75rem', fontWeight: 600 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5, justifyContent: 'flex-end', borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<EditIcon fontSize="small" />}
                        onClick={() => handleEditClick(m)}
                        sx={{ minHeight: 34, borderRadius: 1.5 }}
                      >
                        {t('Edit')}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={deletingId === m.id ? <CircularProgress size={14} color="inherit" /> : <DeleteIcon fontSize="small" />}
                        onClick={() => handleDeleteClick(m)}
                        disabled={deletingId === m.id}
                        sx={{ minHeight: 34, borderRadius: 1.5 }}
                      >
                        {t('Delete Member')}
                      </Button>
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
        /* Desktop table view */
        <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('Name')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('Phone')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('Category')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('Belt')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('Age')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('Status')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>{t('Actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow>
              ) : members.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><Typography color="text.secondary">{t('No members found.')}</Typography></TableCell></TableRow>
              ) : (
                members.map((m) => (
                  <TableRow key={m.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{m.first_name} {m.last_name}</TableCell>
                    <TableCell>{m.phone || '—'}</TableCell>
                    <TableCell>{m.category}</TableCell>
                    <TableCell>{m.belt_degree || '—'}</TableCell>
                    <TableCell>{m.age || '—'}</TableCell>
                    <TableCell>
                      <Chip label={m.is_active ? t('Active') : t('Inactive')} color={m.is_active ? 'success' : 'default'} size="small" sx={{ borderRadius: 1 }} />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('Edit Member')}>
                        <IconButton size="small" color="primary" onClick={() => handleEditClick(m)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title={t('Delete Member')}>
                        <IconButton size="small" color="error" onClick={() => handleDeleteClick(m)} disabled={deletingId === m.id}>
                          {deletingId === m.id ? <CircularProgress size={14} /> : <DeleteIcon fontSize="small" />}
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

      <MemberDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        member={selectedMember}
        onSuccess={handleDialogSuccess}
      />

      <Snackbar open={toast.open} autoHideDuration={5000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: '100%', borderRadius: 2 }}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}
