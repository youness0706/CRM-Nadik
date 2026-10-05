import React, { useState, useEffect } from 'react';
import {
  Typography, Paper, Box, Grid, Card, CardContent, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, Divider
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import apiClient from '../services/api';

export default function FinancialStatus() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => { fetchData(); }, [year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/crm/financial/?year=${year}`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Financial Status</Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Year</InputLabel>
          <Select value={year} label="Year" onChange={(e) => setYear(e.target.value)}>
            {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderTop: 4, borderColor: 'success.main' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2" fontWeight="500">Total Income</Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    {data?.total_income?.toFixed(2)} DH
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ color: 'success.main', fontSize: 40, opacity: 0.2 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderTop: 4, borderColor: 'error.main' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2" fontWeight="500">Total Expenses</Typography>
                  <Typography variant="h5" fontWeight="bold" color="error.main">
                    {data?.total_expenses?.toFixed(2)} DH
                  </Typography>
                </Box>
                <TrendingDownIcon sx={{ color: 'error.main', fontSize: 40, opacity: 0.2 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderTop: 4, borderColor: 'info.main' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2" fontWeight="500">Staff Salaries</Typography>
                  <Typography variant="h5" fontWeight="bold" color="info.main">
                    {data?.total_salaries?.toFixed(2)} DH
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Rent: {data?.rent?.toFixed(2)} DH</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderTop: 4, borderColor: data?.net_profit >= 0 ? 'success.main' : 'error.main' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2" fontWeight="500">Net Profit</Typography>
                  <Typography variant="h5" fontWeight="bold" color={data?.net_profit >= 0 ? 'success.main' : 'error.main'}>
                    {data?.net_profit?.toFixed(2)} DH
                  </Typography>
                </Box>
                <AccountBalanceIcon sx={{ color: data?.net_profit >= 0 ? 'success.main' : 'error.main', fontSize: 40, opacity: 0.2 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Monthly Breakdown Table */}
      <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Typography variant="h6" gutterBottom fontWeight="600">Monthly Income Breakdown</Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={2}>
          {data?.monthly_income?.map((m) => (
            <Grid item xs={6} sm={4} md={2} key={m.month}>
              <Card variant="outlined" sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', border: 'none' }}>
                <Typography variant="caption" color="text.secondary" fontWeight="600" display="block" gutterBottom>
                  {monthNames[m.month - 1].toUpperCase()}
                </Typography>
                <Typography variant="h6" fontWeight="bold" color={m.income > 0 ? 'success.main' : 'text.disabled'}>
                  {m.income > 0 ? `${m.income.toFixed(0)} DH` : '—'}
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
}
