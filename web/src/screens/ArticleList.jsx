import React, { useState } from 'react';
import {
  Typography, Paper, Button, Box, Chip, CircularProgress, Card, CardContent, CardActions,
  Grid, TablePagination, IconButton, Tooltip, Snackbar, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import usePagination from '../hooks/usePagination';
import EventDialog from '../components/EventDialog';
import apiClient from '../services/api';

export default function ArticleList() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const {
    data: articles,
    loading,
    error,
    page,
    rowsPerPage,
    totalCount,
    handlePageChange,
    handleRowsPerPageChange,
    refresh
  } = usePagination('/crm/articles/');

  const handleAddClick = () => {
    setSelectedEvent(null);
    setDialogOpen(true);
  };

  const handleEditClick = (event) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const handleDeleteClick = async (event) => {
    if (window.confirm(`Are you sure you want to delete the event "${event.title}"?`)) {
      try {
        await apiClient.delete(`/crm/articles/${event.id}/`);
        setToast({ open: true, message: 'Event deleted successfully.', severity: 'success' });
        refresh();
      } catch (err) {
        setToast({ open: true, message: 'Failed to delete event.', severity: 'error' });
      }
    }
  };

  const handleDialogSuccess = () => {
    setDialogOpen(false);
    setToast({ open: true, message: selectedEvent ? 'Event updated successfully.' : 'Event added successfully.', severity: 'success' });
    refresh();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Events & Articles</Typography>
        <Button variant="contained" startIcon={<AddIcon />} size="large" onClick={handleAddClick}>Add Event</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          {articles.map((a) => (
            <Grid item xs={12} sm={6} md={4} key={a.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderTop: 3, borderColor: 'primary.main', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {a.title}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    <Chip icon={<EventIcon />} label={a.date} size="small" />
                    <Chip label={a.category_display || a.category} size="small" color="primary" />
                    <Chip label={a.area_display || a.area} size="small" variant="outlined" />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, color: 'text.secondary' }}>
                    <LocationOnIcon fontSize="small" />
                    <Typography variant="body2">{a.location}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                    <PeopleIcon fontSize="small" />
                    <Typography variant="body2">{a.trainees_count} participants</Typography>
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Cost: </Typography>
                    <Typography variant="caption" fontWeight="bold" color="error.main">{parseFloat(a.costs || 0).toFixed(0)} DH</Typography>
                    <Typography variant="caption" color="text.secondary"> · Net: </Typography>
                    <Typography variant="caption" fontWeight="bold" color={a.net_profit >= 0 ? 'success.main' : 'error.main'}>
                      {parseFloat(a.net_profit || 0).toFixed(0)} DH
                    </Typography>
                  </Box>
                  <Box>
                    <Tooltip title="Edit Event">
                      <IconButton size="small" color="primary" onClick={() => handleEditClick(a)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Event">
                      <IconButton size="small" color="error" onClick={() => handleDeleteClick(a)}><DeleteIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
          {articles.length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                <Typography color="text.secondary">No events found.</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', bgcolor: 'background.paper', borderRadius: 2 }}>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[9, 18, 25, 36]}
        />
      </Box>

      <EventDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        event={selectedEvent}
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
