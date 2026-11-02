import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Alert, Paper, FormControl, MenuItem, Select, CircularProgress, Container } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import TranslateIcon from '@mui/icons-material/Translate';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import apiClient from '../services/api';
import { useLanguage } from '../state/LanguageContext';

function formatErrorMessage(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(formatErrorMessage).filter(Boolean).join(' ');
  if (value && typeof value === 'object') return Object.values(value).map(formatErrorMessage).filter(Boolean).join(' ');
  return '';
}

export default function Login() {
  const { language, setLanguage, direction, t } = useLanguage();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);
    setIsLoading(true);
    try {
      const loginIdentifier = identifier.trim();
      const credentials = {
        [loginIdentifier.includes('@') ? 'email' : 'username']: loginIdentifier,
        password,
      };
      const response = await apiClient.post('/auth/login/', credentials);
      const { access, refresh } = response.data;
      if (access && refresh) {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        navigate('/dashboard');
      } else {
        setError('Login failed: Invalid response format.');
      }
    } catch (err) {
      const responseData = err.response?.data;
      const responseError = formatErrorMessage(
        responseData?.detail ?? responseData?.email ?? responseData?.username
          ?? responseData?.non_field_errors ?? responseData?.error
      );
      setError(responseError || 'Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      dir={direction}
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e0f2f1 0%, #f0f4f8 60%, #fff8e1 100%)',
        p: 2,
      }}
    >
      {/* Language switcher - top corner */}
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

      <Container maxWidth="xs">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            width: '100%',
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 8px 40px rgba(0,96,100,0.10)',
          }}
        >
          {/* Logo / Brand */}
          <Box sx={{ mb: 3.5, textAlign: 'center' }}>
            <Box
              sx={{
                width: 64, height: 64, borderRadius: '20px',
                background: 'linear-gradient(135deg, #006064, #00838f)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mx: 'auto', mb: 2,
                boxShadow: '0 4px 16px rgba(0,96,100,0.25)',
              }}
            >
              <LockOutlinedIcon sx={{ color: 'white', fontSize: 30 }} />
            </Box>
            <Typography component="h1" variant="h5" fontWeight="bold" color="primary.dark" gutterBottom>
              Nadik
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('Sports Association Management Platform')}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} dir={direction}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="identifier"
              label={t('Email or Username')}
              name="identifier"
              autoComplete="email"
              autoFocus
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={isLoading}
              inputProps={{
                dir: 'ltr',
                style: { textAlign: direction === 'rtl' ? 'right' : 'left' },
              }}
              sx={{ mb: 1 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label={t('Password')}
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              inputProps={{
                dir: 'ltr',
                style: { textAlign: direction === 'rtl' ? 'right' : 'left' },
              }}
              sx={{ mb: 1 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{
                mt: 2.5, py: 1.5, borderRadius: 2.5,
                fontSize: '1rem', fontWeight: 700,
                background: 'linear-gradient(135deg, #006064, #00838f)',
                boxShadow: '0 4px 16px rgba(0,96,100,0.25)',
              }}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {isLoading ? t('Signing In...') : t('Sign In')}
            </Button>
            <Button
              component={RouterLink}
              to="/register"
              fullWidth
              sx={{ mt: 1, color: 'text.secondary', fontWeight: 500 }}
            >
              {t('Create an organization')}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
