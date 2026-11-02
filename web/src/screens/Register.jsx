import React, { useState } from 'react';
import {
  Alert, Box, Button, Container, FormControl, Grid, MenuItem, Paper, Select, TextField, Typography, CircularProgress
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import TranslateIcon from '@mui/icons-material/Translate';
import apiClient from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { useLanguage } from '../state/LanguageContext';

const INITIAL_FORM = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  password_confirm: '',
  org_name: '',
  org_email: '',
  org_phone: '',
  org_description: '',
};

export default function Register() {
  const { language, setLanguage, direction, t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState({ username: null, slug: null });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (name === 'username') setAvailability((current) => ({ ...current, username: null }));
    if (name === 'org_slug') setAvailability((current) => ({ ...current, slug: null }));
  };

  const checkAvailability = async (field, value, endpoint) => {
    if (!value.trim()) {
      setAvailability((current) => ({ ...current, [field]: null }));
      return;
    }
    try {
      const response = await apiClient.get(endpoint, { params: { [field]: value } });
      setAvailability((current) => ({ ...current, [field]: response.data }));
    } catch {
      setAvailability((current) => ({ ...current, [field]: null }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    if (form.password !== form.password_confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/register/', form);
      const { access, refresh } = response.data;
      if (!access || !refresh) throw new Error('Registration did not return login tokens.');
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to create the organization.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box dir={direction} sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4, bgcolor: 'background.default' }}>
      <FormControl
        size="small"
        sx={{
          position: 'fixed',
          top: 16,
          [direction === 'rtl' ? 'left' : 'right']: 16,
          minWidth: 90,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 10,
        }}
      >
        <Select
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          inputProps={{ 'aria-label': t('Language') }}
          startAdornment={<TranslateIcon sx={{ fontSize: 14, ml: 0.5, color: 'text.secondary' }} />}
          sx={{ '& .MuiSelect-select': { py: 0.7, fontSize: '0.82rem' }, borderRadius: 2 }}
        >
          <MenuItem value="fr">Français</MenuItem>
          <MenuItem value="ar">العربية</MenuItem>
        </Select>
      </FormControl>

      <Container maxWidth="md">
        <Paper sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <Typography component="h1" variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
            {t('Create an organization')}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {t('Create your administrator account and organization.')}
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} dir={direction}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>{t('Administrator')}</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required label={t('Username')} name="username" value={form.username} onChange={handleChange} onBlur={() => checkAvailability('username', form.username, '/auth/check-username/')} inputProps={{ minLength: 3, dir: 'ltr' }} helperText={availability.username?.message} error={availability.username?.available === false} disabled={loading} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required type="email" label={t('Email')} name="email" value={form.email} onChange={handleChange} inputProps={{ dir: 'ltr' }} disabled={loading} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label={t('First Name')} name="first_name" value={form.first_name} onChange={handleChange} disabled={loading} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label={t('Last Name')} name="last_name" value={form.last_name} onChange={handleChange} disabled={loading} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required type="password" label={t('Password')} name="password" value={form.password} onChange={handleChange} inputProps={{ minLength: 8, dir: 'ltr' }} disabled={loading} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required type="password" label={t('Confirm password')} name="password_confirm" value={form.password_confirm} onChange={handleChange} inputProps={{ minLength: 8, dir: 'ltr' }} disabled={loading} />
              </Grid>
            </Grid>

            <Typography variant="h6" fontWeight="bold" sx={{ mt: 3, mb: 2 }}>{t('Organization')}</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required label={t('Organization name')} name="org_name" value={form.org_name} onChange={handleChange} inputProps={{ minLength: 3 }} disabled={loading} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label={t('Organization slug (optional)')} name="org_slug" value={form.org_slug || ''} onChange={handleChange} onBlur={() => checkAvailability('slug', form.org_slug || '', '/auth/check-slug/')} inputProps={{ minLength: 3, dir: 'ltr' }} helperText={availability.slug?.message || t('Leave blank to generate from the organization name.')} error={availability.slug?.available === false} disabled={loading} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth type="email" label={t('Organization email')} name="org_email" value={form.org_email} onChange={handleChange} inputProps={{ dir: 'ltr' }} disabled={loading} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label={t('Organization phone')} name="org_phone" value={form.org_phone} onChange={handleChange} inputProps={{ dir: 'ltr' }} disabled={loading} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline minRows={2} label={t('Description')} name="org_description" value={form.org_description} onChange={handleChange} disabled={loading} />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, gap: 2 }}>
              <Button component={RouterLink} to="/" disabled={loading} variant="outlined">{t('Back to sign in')}</Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading || availability.username?.available === false || availability.slug?.available === false}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                sx={{ minWidth: 150 }}
              >
                {loading ? t('Creating...') : t('Create organization')}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
