import React, { useState } from 'react';
import {
  Alert, Box, Button, Container, Grid, Paper, TextField, Typography,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { getApiErrorMessage } from '../services/errors';

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
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
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
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4, bgcolor: 'background.default' }}>
      <Container maxWidth="md">
        <Paper sx={{ p: { xs: 3, sm: 4 }, border: '1px solid', borderColor: 'divider' }}>
          <Typography component="h1" variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
            Create an organization
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Create your administrator account and organization.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit}>
            <Typography variant="h6" sx={{ mb: 1 }}>Administrator</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required label="Username" name="username" value={form.username} onChange={handleChange} inputProps={{ minLength: 3 }} disabled={loading} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required type="email" label="Email" name="email" value={form.email} onChange={handleChange} disabled={loading} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="First name" name="first_name" value={form.first_name} onChange={handleChange} disabled={loading} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Last name" name="last_name" value={form.last_name} onChange={handleChange} disabled={loading} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required type="password" label="Password" name="password" value={form.password} onChange={handleChange} inputProps={{ minLength: 6 }} disabled={loading} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required type="password" label="Confirm password" name="password_confirm" value={form.password_confirm} onChange={handleChange} inputProps={{ minLength: 6 }} disabled={loading} />
              </Grid>
            </Grid>

            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Organization</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required label="Organization name" name="org_name" value={form.org_name} onChange={handleChange} inputProps={{ minLength: 3 }} disabled={loading} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth type="email" label="Organization email" name="org_email" value={form.org_email} onChange={handleChange} disabled={loading} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Organization phone" name="org_phone" value={form.org_phone} onChange={handleChange} disabled={loading} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline minRows={2} label="Description" name="org_description" value={form.org_description} onChange={handleChange} disabled={loading} />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, gap: 2 }}>
              <Button component={RouterLink} to="/" disabled={loading}>Back to sign in</Button>
              <Button type="submit" variant="contained" disabled={loading}>
                {loading ? 'Creating...' : 'Create organization'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}