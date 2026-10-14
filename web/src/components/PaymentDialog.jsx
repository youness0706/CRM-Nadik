import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Alert, Autocomplete
} from '@mui/material';
import apiClient from '../services/api';
import { getApiErrorMessage } from '../services/errors';

const PAYMENT_TYPES = [
  { value: 'month', label: 'Monthly (Month)' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'assurance', label: 'Insurance (Assurance)' },
  { value: 'jawaz', label: 'Jawaz' },
];

const DEFAULT_PAYMENT = {
  trainer: '',
  paymentdate: new Date().toISOString().split('T')[0],
  paymentCategry: 'month',
  paymentAmount: ''
};

export default function PaymentDialog({ open, onClose, payment = null, onSuccess }) {
  const [formData, setFormData] = useState(DEFAULT_PAYMENT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // For selecting members
  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState('');

  useEffect(() => {
    if (open) {
      setFormData(payment ? { ...payment, trainer: payment.trainer } : DEFAULT_PAYMENT);
      setError(null);
      fetchMembers('');
    }
  }, [open, payment]);

  const fetchMembers = async (searchQuery) => {
    setLoadingMembers(true);
    setMembersError('');
    try {
      // Just fetch the first page for the dropdown, or use search
      const response = await apiClient.get(`/crm/members/?is_active=true&search=${searchQuery}`);
      setMembers(response.data.results || response.data || []);
    } catch (err) {
      setMembersError(getApiErrorMessage(err, 'Unable to load members.'));
      console.error('Failed to fetch members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.trainer) {
      setError('Please select a member.');
      setLoading(false);
      return;
    }

    try {
      if (payment && payment.id) {
        await apiClient.put(`/crm/payments/${payment.id}/`, formData);
      } else {
        await apiClient.post('/crm/payments/', formData);
      }
      onSuccess();
    } catch (err) {
      setError(getApiErrorMessage(err, 'An error occurred while saving the payment.'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{payment ? 'Edit Payment' : 'Record Payment'}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {membersError && <Alert severity="error" sx={{ mb: 2 }}>{membersError}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Autocomplete
                options={members}
                getOptionLabel={(option) => `${option.first_name} ${option.last_name} (${option.phone || 'No phone'})`}
                loading={loadingMembers}
                onInputChange={(event, newInputValue) => fetchMembers(newInputValue)}
                onChange={(event, newValue) => {
                  setFormData(prev => ({ ...prev, trainer: newValue ? newValue.id : '' }));
                }}
                defaultValue={payment ? { id: payment.trainer, first_name: payment.trainer_name, last_name: payment.trainer_surname } : null}
                renderInput={(params) => (
                  <TextField {...params} label="Select Member" required variant="outlined" />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Payment Type</InputLabel>
                <Select name="paymentCategry" value={formData.paymentCategry} label="Payment Type" onChange={handleChange}>
                  {PAYMENT_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="date" required label="Date" name="paymentdate" value={formData.paymentdate} onChange={handleChange} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth type="number" required label="Amount (MAD)" name="paymentAmount" value={formData.paymentAmount} onChange={handleChange} inputProps={{ step: "0.01", min: "0" }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : null}>
            {payment ? 'Save Changes' : 'Record Payment'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
