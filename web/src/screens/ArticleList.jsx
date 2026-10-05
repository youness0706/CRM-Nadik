import React from 'react';
import {
  Typography, Paper, Button, Box, Chip, CircularProgress, Card, CardContent, CardActions,
  Grid, TablePagination
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import usePagination from '../hooks/usePagination';

export default function ArticleList() {
  const {
    data: articles,
    loading,
    page,
    rowsPerPage,
    totalCount,
    handlePageChange,
    handleRowsPerPageChange,
  } = usePagination('/crm/articles/');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Events & Articles</Typography>
        <Button variant="contained" startIcon={<AddIcon />} size="large">Add Event</Button>
      </Box>

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
                    <Typography variant="caption" fontWeight="bold" color="error.main">{parseFloat(a.costs).toFixed(0)} DH</Typography>
                    <Typography variant="caption" color="text.secondary"> · Net: </Typography>
                    <Typography variant="caption" fontWeight="bold" color={a.net_profit >= 0 ? 'success.main' : 'error.main'}>
                      {parseFloat(a.net_profit).toFixed(0)} DH
                    </Typography>
                  </Box>
                  <Button size="small">View</Button>
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
          rowsPerPageOptions={[9, 18, 36]}
        />
      </Box>
    </Box>
  );
}
