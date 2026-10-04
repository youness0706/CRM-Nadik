import React, { useState, useEffect } from 'react';
import {
  Typography, Paper, Grid, Card, CardContent, Box, Chip, Divider,
  CircularProgress, Alert
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PaymentIcon from '@mui/icons-material/Payment';
import TodayIcon from '@mui/icons-material/Today';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import GroupIcon from '@mui/icons-material/Group';
import WarningIcon from '@mui/icons-material/Warning';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import ArticleIcon from '@mui/icons-material/Article';
import apiClient from '../services/api';

function StatCard({ icon, title, value, color = 'primary.main', subtitle }) {
  return (
    <Card sx={{ height: '100%', borderTop: 3, borderColor: color }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color, opacity: 0.7, fontSize: 40 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/crm/dashboard/');
      setStats(response.data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome to {stats?.organization_name || 'your CRM'}
        </Typography>
      </Box>

      {/* Subscription Warning */}
      {stats?.subscription?.days_remaining <= 7 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Your subscription expires in {stats.subscription.days_remaining} days.
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<PeopleIcon fontSize="inherit" />}
            title="Active Members"
            value={stats?.total_members || 0}
            color="primary.main"
            subtitle={`${stats?.new_members || 0} new this month`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<WarningIcon fontSize="inherit" />}
            title="Unpaid This Month"
            value={stats?.unpaid_count || 0}
            color="warning.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<TrendingUpIcon fontSize="inherit" />}
            title="Month Income"
            value={`$${stats?.month_income?.toFixed(0) || 0}`}
            color="success.main"
            subtitle={`$${stats?.today_income?.toFixed(0) || 0} today`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<TrendingDownIcon fontSize="inherit" />}
            title="Month Expenses"
            value={`$${stats?.month_expenses?.toFixed(0) || 0}`}
            color="error.main"
          />
        </Grid>
      </Grid>

      {/* Second Row */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<GroupIcon fontSize="inherit" />}
            title="Staff"
            value={stats?.total_staff || 0}
            color="info.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<PersonOffIcon fontSize="inherit" />}
            title="Inactive Members"
            value={stats?.inactive_members || 0}
            color="text.disabled"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<ArticleIcon fontSize="inherit" />}
            title="Events"
            value={stats?.total_articles || 0}
            color="secondary.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<PaymentIcon fontSize="inherit" />}
            title="Added Payments"
            value={`$${stats?.month_added_payments?.toFixed(0) || 0}`}
            color="success.light"
            subtitle="This month"
          />
        </Grid>
      </Grid>
    </Box>
  );
}
