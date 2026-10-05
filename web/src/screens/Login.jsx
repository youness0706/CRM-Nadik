import React, { useState } from 'react';
import { Container, Box, Typography, TextField, Button, Alert, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';

function formatErrorMessage(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(formatErrorMessage).filter(Boolean).join(' ');
  if (value && typeof value === 'object') {
    return Object.values(value).map(formatErrorMessage).filter(Boolean).join(' ');
  }
  return '';
}

export default function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        responseData?.detail
          ?? responseData?.email
          ?? responseData?.username
          ?? responseData?.non_field_errors
          ?? responseData?.error
      );
      setError(responseError || 'Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'background.default' }}>
      <Container maxWidth="sm">
        <Paper elevation={0} sx={{ p: 4, width: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography component="h1" variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
              Nadik
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sports Association Management Platform
            </Typography>
          </Box>
          
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="identifier"
              label="Email or Username"
              name="identifier"
              autoComplete="email"
              autoFocus
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={isLoading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, py: 1.5 }}
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
