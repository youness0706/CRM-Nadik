import React, { useState, useEffect } from 'react';
import {
  Typography, Card, CardContent, Box, Chip, CircularProgress, Alert, Grid
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PaymentIcon from '@mui/icons-material/Payment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import GroupIcon from '@mui/icons-material/Group';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import ArticleIcon from '@mui/icons-material/Article';
import apiClient from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { useLanguage } from '../state/LanguageContext';

function StatCard({ icon, title, value, color = 'primary.main', subtitle, bgColor }) {
  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 3,
        border: 'none',
        background: bgColor || 'background.paper',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Accent bar */}
      <Box sx={{ height: 4, bgcolor: color, width: '100%' }} />
      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, pb: '12px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              color="text.secondary"
              variant="caption"
              fontWeight="600"
              gutterBottom
              sx={{ display: 'block', fontSize: { xs: '0.7rem', sm: '0.78rem' }, textTransform: 'uppercase', letterSpacing: 0.5 }}
            >
              {title}
            </Typography>
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{ fontSize: { xs: '1.4rem', sm: '1.7rem' }, color: 'text.primary', lineHeight: 1.1, mt: 0.25 }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.72rem' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              color,
              opacity: 0.15,
              fontSize: { xs: 36, sm: 44 },
              mt: -0.5,
              ml: 1,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { t } = useLanguage();
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
      setError(getApiErrorMessage(err, 'Failed to load dashboard data.'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>;
  }

  const daysUntilExpiration = stats?.subscription?.days_until_expiration
    ?? stats?.subscription?.days_remaining;

  const kpiRows = [
    [
      { icon: <PeopleIcon fontSize="inherit" />, title: t('Active Members'), value: stats?.total_members || 0, color: 'primary.main', subtitle: `+${stats?.new_members || 0} ${t('new this month')}` },
      { icon: <WarningAmberIcon fontSize="inherit" />, title: t('Unpaid This Month'), value: stats?.unpaid_count || 0, color: 'warning.main' },
      { icon: <TrendingUpIcon fontSize="inherit" />, title: t('Month Income'), value: `${stats?.month_income?.toFixed(0) || 0} DH`, color: 'success.main', subtitle: `${stats?.today_income?.toFixed(0) || 0} DH ${t('today')}` },
      { icon: <TrendingDownIcon fontSize="inherit" />, title: t('Month Expenses'), value: `${stats?.month_expenses?.toFixed(0) || 0} DH`, color: 'error.main' },
    ],
    [
      { icon: <GroupIcon fontSize="inherit" />, title: t('Staff'), value: stats?.total_staff || 0, color: 'info.main' },
      { icon: <PersonOffIcon fontSize="inherit" />, title: t('Inactive Members'), value: stats?.inactive_members || 0, color: 'text.secondary' },
      { icon: <ArticleIcon fontSize="inherit" />, title: t('Events'), value: stats?.total_articles || 0, color: 'secondary.main' },
      { icon: <PaymentIcon fontSize="inherit" />, title: t('Added Payments'), value: `${stats?.month_added_payments?.toFixed(0) || 0} DH`, color: 'success.light', subtitle: t('This month') },
    ],
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Typography variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
          {t('Dashboard')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('Welcome back to')} <strong>{stats?.organization_name || 'Nadik'}</strong>
        </Typography>
      </Box>

      {/* Subscription Warning */}
      {daysUntilExpiration <= 7 && (
        <Alert
          severity="warning"
          sx={{ mb: 3, borderRadius: 2 }}
          icon={<NewReleasesIcon />}
        >
          {daysUntilExpiration < 0
            ? `${t('Your subscription expired')} ${Math.abs(daysUntilExpiration)} ${t('days ago.')}`
            : daysUntilExpiration === 0
              ? t('Your subscription expires today.')
              : `${t('Your subscription expires in')} ${daysUntilExpiration} ${t('days.')}`}
        </Alert>
      )}

      {/* KPI Grid */}
      {kpiRows.map((row, rowIndex) => (
        <Grid container spacing={{ xs: 1.5, sm: 2.5 }} sx={{ mb: { xs: 1.5, sm: 2.5 } }} key={rowIndex}>
          {row.map((card, i) => (
            <Grid item xs={6} sm={6} md={3} key={i}>
              <StatCard {...card} />
            </Grid>
          ))}
        </Grid>
      ))}
    </Box>
  );
}
