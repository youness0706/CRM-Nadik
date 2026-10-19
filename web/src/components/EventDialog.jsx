import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, CircularProgress, Alert, MenuItem, Autocomplete
} from '@mui/material';
import apiClient from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { useLanguage } from '../state/LanguageContext';

const DEFAULT_EVENT = {
  title: '', date: new Date().toISOString().split('T')[0], location: 'Club',
  content: '', category: 'League', area: 'national', costs: '0', participetion_price: '0', trainees: []
};

const EVENT_CATEGORIES = [
  ['League', 'Competition'], ['training', 'Training'], ['dawri', 'League'],
  ['test', 'Exam'], ['out', 'Trip'], ['other', 'Other'],
];

const EVENT_AREAS = [
  ['local', 'Local'], ['reigion', 'Regional'], ['national', 'National'],
];

export default function EventDialog({ open, onClose, event = null, onSuccess }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState(DEFAULT_EVENT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [members, setMembers] = useState([]);

  const fetchMembers = async (search = '') => {
    try {
      const response = await apiClient.get(`/crm/members/?is_active=true&per_page=200&search=${encodeURIComponent(search)}`);
      setMembers(response.data.results || response.data || []);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load members for this event.'));
    }
  };

  useEffect(() => {
    if (open) {
      setFormData(event ? { ...DEFAULT_EVENT, ...event, trainees: event.trainees || [] } : { ...DEFAULT_EVENT });
      setError(null);
      fetchMembers();
    }
  }, [open, event]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (event && event.id) {
        await apiClient.put(`/crm/articles/${event.id}/`, formData);
      } else {
        await apiClient.post('/crm/articles/', formData);
      }
      onSuccess();
    } catch (err) {
      setError(getApiErrorMessage(err, 'An error occurred.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{event ? t('Edit Event') : t('Add Event')}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth required label={t('Title')} name="title" value={formData.title} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth required label={t('Description/Content')} name="content" value={formData.content} onChange={handleChange} multiline rows={3} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="date" required label={t('Date')} name="date" value={formData.date} onChange={handleChange} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label={t('Location')} name="location" value={formData.location} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth required label={t('Category')} name="category" value={formData.category} onChange={handleChange}>
                {EVENT_CATEGORIES.map(([value, label]) => <MenuItem key={value} value={value}>{t(label)}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth required label={t('Area')} name="area" value={formData.area} onChange={handleChange}>
                {EVENT_AREAS.map(([value, label]) => <MenuItem key={value} value={value}>{t(label)}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required type="number" label={t('Event Costs (MAD)')} name="costs" value={formData.costs} onChange={handleChange} inputProps={{ step: "0.01", min: "0" }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required type="number" label={t('Participation Price (MAD)')} name="participetion_price" value={formData.participetion_price} onChange={handleChange} inputProps={{ step: "0.01", min: "0" }} />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={members}
                value={members.filter((member) => formData.trainees?.includes(member.id))}
                getOptionLabel={(member) => `${member.first_name} ${member.last_name}`}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onInputChange={(event, value, reason) => reason === 'input' && fetchMembers(value)}
                onChange={(event, selectedMembers) => setFormData((current) => ({ ...current, trainees: selectedMembers.map((member) => member.id) }))}
                renderInput={(params) => <TextField {...params} label={t('Participants')} placeholder={t('Search trainees')} />}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={loading}>{t('Cancel')}</Button>
          <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : null}>
            {event ? t('Save Changes') : t('Add Event')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
