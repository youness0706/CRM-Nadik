import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Alert
} from '@mui/material';
import apiClient from '../services/api';
import { getApiErrorMessage } from '../services/errors';

const CATEGORIES = [
  { value: 'الصغار', label: 'Kids (الصغار)' },
  { value: 'فتيان', label: 'Boys (فتيان)' },
  { value: 'شبان', label: 'Youth (شبان)' },
  { value: 'كبار', label: 'Adults (كبار)' },
  { value: 'نساء', label: 'Women (نساء)' },
];

const BELTS = [
  { value: 'أبيض', label: 'White' },
  { value: 'برتقالي', label: 'Orange' },
  { value: 'أصفر', label: 'Yellow' },
  { value: 'أخضر', label: 'Green' },
  { value: 'أصفر مع شريط أخضر', label: 'Yellow with green stripe' },
  { value: 'أخضر مع شريط أزرق', label: 'Green with blue stripe' },
  { value: 'أزرق', label: 'Blue' },
  { value: 'أزرق مع شريط أحمر', label: 'Blue with red stripe' },
  { value: 'أحمر', label: 'Red' },
  { value: 'أحمر مع شريط أسود', label: 'Red with black stripe' },
  { value: 'أسود', label: 'Black' },
];

const DEFAULT_MEMBER = {
  first_name: '', last_name: '', phone: '', phone_parent: '',
  email: '', CIN: '', address: '', male_female: 'male',
  birth_day: '', belt_degree: 'أبيض', category: 'كبار', started_day: new Date().toISOString().split('T')[0],
  is_active: true
};

export default function MemberDialog({ open, onClose, member = null, onSuccess }) {
  const [formData, setFormData] = useState(DEFAULT_MEMBER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setFormData(member ? { ...member } : DEFAULT_MEMBER);
      setError(null);
    }
  }, [open, member]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (member && member.id) {
        await apiClient.put(`/crm/members/${member.id}/`, formData);
      } else {
        await apiClient.post('/crm/members/', formData);
      }
      onSuccess();
    } catch (err) {
      setError(getApiErrorMessage(err, 'An error occurred while saving the member.'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{member ? 'Edit Member' : 'Add New Member'}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="First Name" name="first_name" value={formData.first_name || ''} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Last Name" name="last_name" value={formData.last_name || ''} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required type="date" label="Date of Birth" name="birth_day" value={formData.birth_day || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Phone" name="phone" value={formData.phone || ''} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Parent Phone" name="phone_parent" value={formData.phone_parent || ''} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="email" label="Email" name="email" value={formData.email || ''} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="CIN" name="CIN" value={formData.CIN || ''} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Address" name="address" value={formData.address || ''} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Select name="male_female" value={formData.male_female || 'male'} label="Gender" onChange={handleChange}>
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select name="category" value={formData.category || 'كبار'} label="Category" onChange={handleChange}>
                  {CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Belt</InputLabel>
                <Select name="belt_degree" value={formData.belt_degree || 'أبيض'} label="Belt" onChange={handleChange}>
                  {BELTS.map(b => <MenuItem key={b.value} value={b.value}>{b.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="date" required label="Start Date" name="started_day" value={formData.started_day || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select name="is_active" value={formData.is_active !== undefined ? formData.is_active : true} label="Status" onChange={handleChange}>
                  <MenuItem value={true}>Active</MenuItem>
                  <MenuItem value={false}>Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : null}>
            {member ? 'Save Changes' : 'Add Member'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
