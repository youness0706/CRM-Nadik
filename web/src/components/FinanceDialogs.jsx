import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, FormControlLabel, Checkbox, CircularProgress, Alert
} from '@mui/material';
import apiClient from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { useLanguage } from '../state/LanguageContext';

const DEFAULT_EXPENSE = {
  cost: '', desc: '', amount: '', date: new Date().toISOString().split('T')[0], is_recurring: false
};

const DEFAULT_ADDED = {
  title: '', desc: '', amount: '', date: new Date().toISOString().split('T')[0]
};

export function ExpenseDialog({ open, onClose, expense = null, onSuccess }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState(DEFAULT_EXPENSE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setFormData(expense ? { ...expense } : DEFAULT_EXPENSE);
      setError(null);
    }
  }, [open, expense]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (expense && expense.id) {
        await apiClient.put(`/crm/expenses/${expense.id}/`, formData);
      } else {
        await apiClient.post('/crm/expenses/', formData);
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
        <DialogTitle>{expense ? t('Edit Expense') : t('Add Expense')}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth required label={t('Title')} name="cost" value={formData.cost} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label={t('Description')} name="desc" value={formData.desc} onChange={handleChange} multiline rows={2} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="number" required label={t('Amount (MAD)')} name="amount" value={formData.amount} onChange={handleChange} inputProps={{ step: "0.01", min: "0" }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="date" required label={t('Date')} name="date" value={formData.date} onChange={handleChange} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Checkbox name="is_recurring" checked={formData.is_recurring} onChange={handleChange} color="primary" />}
                label={t('Recurring Expense')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={loading}>{t('Cancel')}</Button>
          <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : null}>
            {expense ? t('Save Changes') : t('Add Expense')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export function AddedPaymentDialog({ open, onClose, payment = null, onSuccess }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState(DEFAULT_ADDED);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setFormData(payment ? { ...payment } : DEFAULT_ADDED);
      setError(null);
    }
  }, [open, payment]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (payment && payment.id) {
        await apiClient.put(`/crm/added-payments/${payment.id}/`, formData);
      } else {
        await apiClient.post('/crm/added-payments/', formData);
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
        <DialogTitle>{payment ? t('Edit Additional Payment') : t('Add Additional Payment')}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth required label={t('Title')} name="title" value={formData.title} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label={t('Description')} name="desc" value={formData.desc} onChange={handleChange} multiline rows={2} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="number" required label={t('Amount (MAD)')} name="amount" value={formData.amount} onChange={handleChange} inputProps={{ step: "0.01", min: "0" }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="date" required label={t('Date')} name="date" value={formData.date} onChange={handleChange} InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={loading}>{t('Cancel')}</Button>
          <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : null}>
            {payment ? t('Save Changes') : t('Add Payment')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
