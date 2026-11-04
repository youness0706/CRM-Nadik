import React, { useEffect, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress,
  Grid, IconButton, Paper, Snackbar, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tooltip, Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate, useParams } from 'react-router-dom';
import MemberDialog from '../components/MemberDialog';
import PaymentDialog from '../components/PaymentDialog';
import apiClient from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { useLanguage } from '../state/LanguageContext';

const PAYMENT_TYPES = {
  month: 'Monthly',
  assurance: 'Insurance',
  subscription: 'Yearly subscription',
  jawaz: 'Jawaz',
};

function InfoItem({ label, value }) {
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{value || '—'}</Typography>
    </Grid>
  );
}

function PaymentStatusCard({ title, paid, detail, t }) {
  return (
    <Grid item xs={12} sm={4}>
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>{title}</Typography>
          <Chip
            icon={paid ? <CheckCircleIcon /> : <CancelIcon />}
            label={paid ? t('Paid') : t('Unpaid')}
            color={paid ? 'success' : 'error'}
            sx={{ fontWeight: 700, mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary">{detail}</Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}

export default function MemberProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [member, setMember] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [currentPeriod] = useState(() => {
    const today = new Date();
    return {
      month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
      year: String(today.getFullYear()),
    };
  });

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const [memberResponse, paymentsResponse] = await Promise.all([
          apiClient.get(`/crm/members/${id}/`),
          apiClient.get('/crm/payments/', { params: { trainer: id, per_page: 200, page: 1 } }),
        ]);
        let allPayments = paymentsResponse.data.results || paymentsResponse.data;
        if (!Array.isArray(allPayments)) {
          throw new Error('The payment response has an unexpected format.');
        }

        const totalPages = paymentsResponse.data.total_pages || 1;
        if (totalPages > 1) {
          const remainingPages = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) => (
              apiClient.get('/crm/payments/', {
                params: { trainer: id, per_page: 200, page: index + 2 },
              })
            ))
          );
          allPayments = allPayments.concat(...remainingPages.map((response) => response.data.results || []));
        }

        if (active) {
          setMember(memberResponse.data);
          setPayments(allPayments.sort((a, b) => String(b.paymentdate).localeCompare(String(a.paymentdate))));
        }
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError, t('Unable to load member profile.')));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProfile();
    return () => { active = false; };
  }, [id, refreshKey, t]);

  const handlePaymentSuccess = () => {
    setPaymentDialogOpen(false);
    setSelectedPayment(null);
    setRefreshKey((current) => current + 1);
    setToast({ open: true, message: t('Saved successfully.'), severity: 'success' });
  };

  const handlePaymentDelete = async (payment) => {
    if (!window.confirm(`${t('Delete Payment')}?\n${payment.paymentAmount} MAD`)) return;
    setDeletingId(payment.id);
    try {
      await apiClient.delete(`/crm/payments/${payment.id}/`);
      setRefreshKey((current) => current + 1);
      setToast({ open: true, message: t('Payment deleted.'), severity: 'success' });
    } catch (requestError) {
      setToast({
        open: true,
        message: getApiErrorMessage(requestError, t('Failed to delete.')),
        severity: 'error',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  if (error || !member) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/members')} sx={{ mb: 2 }}>{t('Back to Members')}</Button>
        <Alert severity="error">{error || t('Unable to load member profile.')}</Alert>
      </Box>
    );
  }

  const monthlyPayment = payments.find((payment) => payment.paymentCategry === 'month' && payment.paymentdate?.slice(0, 7) === currentPeriod.month);
  const insurancePayment = payments.find((payment) => payment.paymentCategry === 'assurance' && payment.paymentdate?.slice(0, 4) === currentPeriod.year);
  const yearlyPayment = payments.find((payment) => payment.paymentCategry === 'subscription' && payment.paymentdate?.slice(0, 4) === currentPeriod.year);

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/members')} sx={{ mb: 2 }}>{t('Back to Members')}</Button>
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
            <Avatar
              src={member.image || undefined}
              alt={`${member.first_name} ${member.last_name}`}
              sx={{ width: { xs: 64, sm: 84 }, height: { xs: 64, sm: 84 }, fontSize: 28 }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h4" fontWeight="bold">{member.first_name} {member.last_name}</Typography>
              <Typography color="text.secondary">{member.category} · {member.phone || t('No phone')}</Typography>
              <Chip
                size="small"
                color={member.is_active ? 'success' : 'default'}
                label={member.is_active ? t('Active') : t('Inactive')}
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>
          <Button variant="contained" startIcon={<EditIcon />} onClick={() => setMemberDialogOpen(true)}>
            {t('Edit Member')}
          </Button>
        </Box>
      </Paper>

      <Typography variant="h5" sx={{ mb: 1.5 }}>{t('Payment status')}</Typography>
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        <PaymentStatusCard
          title={t('Monthly')}
          paid={Boolean(monthlyPayment)}
          detail={monthlyPayment ? `${t('Paid on')} ${monthlyPayment.paymentdate}` : t('For this month')}
          t={t}
        />
        <PaymentStatusCard
          title={t('Insurance')}
          paid={Boolean(insurancePayment)}
          detail={insurancePayment ? `${t('Paid on')} ${insurancePayment.paymentdate}` : t('For this year')}
          t={t}
        />
        <PaymentStatusCard
          title={t('Yearly subscription')}
          paid={Boolean(yearlyPayment)}
          detail={yearlyPayment ? `${t('Paid on')} ${yearlyPayment.paymentdate}` : t('For this year')}
          t={t}
        />
      </Grid>

      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 2.5 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>{t('Member information')}</Typography>
        <Grid container spacing={2}>
          <InfoItem label={t('First Name')} value={member.first_name} />
          <InfoItem label={t('Last Name')} value={member.last_name} />
          <InfoItem label={t('Date of Birth')} value={member.birth_day} />
          <InfoItem label={t('Age')} value={member.age} />
          <InfoItem label={t('Phone')} value={member.phone} />
          <InfoItem label={t('Parent Phone')} value={member.phone_parent} />
          <InfoItem label={t('Email')} value={member.email} />
          <InfoItem label="CIN" value={member.CIN} />
          <InfoItem label={t('Address')} value={member.address} />
          <InfoItem label={t('Gender')} value={t(member.male_female === 'female' ? 'Female' : 'Male')} />
          <InfoItem label={t('Category')} value={member.category} />
          <InfoItem label={t('Belt')} value={member.belt_degree} />
          <InfoItem label={t('Education level')} value={member.Degree} />
          <InfoItem label={t('Height (cm)')} value={member.tall} />
          <InfoItem label={t('Weight (kg)')} value={member.weight} />
          <InfoItem label={t('Start Date')} value={member.started_day} />
        </Grid>
      </Paper>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
        <Typography variant="h5">{t('Payment history')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setSelectedPayment(null); setPaymentDialogOpen(true); }}
        >
          {t('Record Payment')}
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('Date')}</TableCell>
              <TableCell>{t('Payment Type')}</TableCell>
              <TableCell>{t('Amount (MAD)')}</TableCell>
              <TableCell align="right">{t('Actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.length ? payments.map((payment) => (
              <TableRow key={payment.id} hover>
                <TableCell>{payment.paymentdate}</TableCell>
                <TableCell>{t(PAYMENT_TYPES[payment.paymentCategry] || payment.category_display || payment.paymentCategry)}</TableCell>
                <TableCell>{payment.paymentAmount} MAD</TableCell>
                <TableCell align="right">
                  <Tooltip title={t('Edit Payment')}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => { setSelectedPayment(payment); setPaymentDialogOpen(true); }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('Delete Payment')}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handlePaymentDelete(payment)}
                      disabled={deletingId === payment.id}
                    >
                      {deletingId === payment.id ? <CircularProgress size={16} /> : <DeleteIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>{t('No payments found.')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <MemberDialog
        open={memberDialogOpen}
        onClose={() => setMemberDialogOpen(false)}
        member={member}
        onSuccess={() => {
          setMemberDialogOpen(false);
          setRefreshKey((current) => current + 1);
          setToast({ open: true, message: t('Member updated successfully.'), severity: 'success' });
        }}
      />
      <PaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        payment={selectedPayment}
        initialTrainer={member}
        onSuccess={handlePaymentSuccess}
      />
      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={() => setToast((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast((current) => ({ ...current, open: false }))}
          severity={toast.severity}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
