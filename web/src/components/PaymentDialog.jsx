import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Box, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Alert, Autocomplete, useMediaQuery, useTheme
} from '@mui/material';
import apiClient from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { useLanguage } from '../state/LanguageContext';

const PAYMENT_TYPES = [
  { value: 'month', label: 'Monthly' },
  { value: 'subscription', label: 'Yearly subscription' },
  { value: 'assurance', label: 'Insurance' },
  { value: 'jawaz', label: 'Jawaz' },
];

const DEFAULT_PAYMENT = {
  trainer: '',
  paymentdate: new Date().toISOString().split('T')[0],
  paymentCategry: 'month',
  paymentAmount: ''
};

export default function PaymentDialog({ open, onClose, payment = null, initialTrainer = null, onSuccess }) {
  const { t } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [formData, setFormData] = useState(DEFAULT_PAYMENT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    if (open) {
      const currentMember = payment
        ? { id: payment.trainer, first_name: payment.trainer_name, last_name: payment.trainer_surname }
        : initialTrainer;
      setFormData(payment
        ? { ...payment, trainer: payment.trainer }
        : { ...DEFAULT_PAYMENT, trainer: currentMember?.id || '' });
      setSelectedMembers(currentMember ? [currentMember] : []);
      setMemberSearch('');
      setError(null);
    }
  }, [open, payment, initialTrainer]);

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    setLoadingMembers(true);
    setMembersError('');
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await apiClient.get('/crm/members/', {
          params: { is_active: true, search: memberSearch, per_page: 100 },
          signal: controller.signal,
        });
        setMembers(response.data.results || response.data || []);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setMembersError(getApiErrorMessage(requestError, 'Unable to load members.'));
        }
      } finally {
        if (!controller.signal.aborted) setLoadingMembers(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [open, memberSearch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trainerIds = selectedMembers.map((member) => member.id);
    if (trainerIds.length === 0) {
      setError(t('Please select at least one trainee.'));
      setLoading(false);
      return;
    }

    try {
      if (payment && payment.id) {
        await apiClient.put(`/crm/payments/${payment.id}/`, formData);
      } else if (trainerIds.length > 1) {
        await apiClient.post('/crm/payments/bulk-create/', {
          trainer_ids: trainerIds,
          paymentdate: formData.paymentdate,
          paymentCategry: formData.paymentCategry,
          paymentAmount: formData.paymentAmount,
        });
      } else {
        await apiClient.post('/crm/payments/', { ...formData, trainer: trainerIds[0] });
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
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{payment ? t('Edit Payment') : t('Record Payment')}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {membersError && <Alert severity="error" sx={{ mb: 2 }}>{membersError}</Alert>}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Autocomplete
                multiple={!payment}
                disableCloseOnSelect={!payment}
                limitTags={2}
                options={[...new Map([...selectedMembers, ...members].map((member) => [member.id, member])).values()]}
                getOptionLabel={(option) => `${option.first_name} ${option.last_name} (${option.phone || 'No phone'})`}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={payment ? selectedMembers[0] || null : selectedMembers}
                loading={loadingMembers}
                onInputChange={(event, newInputValue, reason) => {
                  if (reason === 'input') setMemberSearch(newInputValue);
                }}
                onChange={(event, newValue) => {
                  const nextMembers = payment ? (newValue ? [newValue] : []) : newValue;
                  setSelectedMembers(nextMembers);
                  setFormData((previous) => ({ ...previous, trainer: nextMembers[0]?.id || '' }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t(payment ? 'Select Member' : 'Select trainees')}
                    placeholder={!payment ? t('Search trainees') : ''}
                    variant="outlined"
                  />
                )}
              />
            </Box>
            <FormControl fullWidth required>
              <InputLabel>{t('Payment Type')}</InputLabel>
              <Select name="paymentCategry" value={formData.paymentCategry} label={t('Payment Type')} onChange={handleChange}>
                {PAYMENT_TYPES.map(item => <MenuItem key={item.value} value={item.value}>{t(item.label)}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField fullWidth type="date" required label={t('Date')} name="paymentdate" value={formData.paymentdate} onChange={handleChange} InputLabelProps={{ shrink: true }} />
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField fullWidth type="number" required label={t('Amount (MAD)')} name="paymentAmount" value={formData.paymentAmount} onChange={handleChange} inputProps={{ step: "0.01", min: "0" }} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={onClose} disabled={loading} variant="outlined">{t('Cancel')}</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
            sx={{ minWidth: 130 }}
          >
            {loading ? '...' : (payment ? t('Save Changes') : t('Record Payment'))}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
