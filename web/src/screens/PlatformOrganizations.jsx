import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Grid, MenuItem, Paper, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import apiClient from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { useLanguage } from '../state/LanguageContext';

const INITIAL_ORG_FORM = {
  username: '', email: '', password: '', password_confirm: '',
  first_name: '', last_name: '', org_name: '', org_slug: '',
  org_email: '', org_phone: '', org_description: '',
};

const INITIAL_RENEWAL = {
  duration_months: 1, amount: '', payment_method: 'cash', notes: '',
};

function formatDate(value, language, t) {
  if (!value) return t('Not set');
  return new Date(value).toLocaleDateString(language === 'ar' ? 'ar' : 'fr-FR');
}

function subscriptionState(organization, t) {
  if (!organization.is_active) return t('Suspended');
  if (organization.days_remaining !== null && organization.days_remaining < 0) return t('Expired');
  return t(organization.subscription_status);
}

export default function PlatformOrganizations() {
  const { language, t } = useLanguage();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [organizationForm, setOrganizationForm] = useState(INITIAL_ORG_FORM);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewal, setRenewal] = useState(INITIAL_RENEWAL);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [organizationEdit, setOrganizationEdit] = useState(null);

  const loadOrganizations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/platform/organizations/');
      setOrganizations(response.data.results || []);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load organizations.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  const showDetails = async (organization) => {
    setSelected({ ...organization, staff: [], subscription_payments: [] });
    setDetailLoading(true);
    setDialogError('');
    try {
      const response = await apiClient.get(`/platform/organizations/${organization.id}/`);
      setSelected(response.data);
    } catch (requestError) {
      setDialogError(getApiErrorMessage(requestError, 'Unable to load organization details.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setDialogError('');
    if (organizationForm.password !== organizationForm.password_confirm) {
      setDialogError('Passwords do not match.');
      return;
    }
    setCreateLoading(true);
    try {
      const response = await apiClient.post('/platform/organizations/', organizationForm);
      setCreateOpen(false);
      setOrganizationForm(INITIAL_ORG_FORM);
      await loadOrganizations();
      setSelected(response.data);
    } catch (requestError) {
      setDialogError(getApiErrorMessage(requestError, 'Unable to create the organization.'));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRenew = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setRenewLoading(true);
    setDialogError('');
    try {
      await apiClient.post(`/platform/organizations/${selected.id}/renew/`, renewal);
      setRenewOpen(false);
      setRenewal(INITIAL_RENEWAL);
      await loadOrganizations();
      const response = await apiClient.get(`/platform/organizations/${selected.id}/`);
      setSelected(response.data);
    } catch (requestError) {
      setDialogError(getApiErrorMessage(requestError, 'Unable to renew the subscription.'));
    } finally {
      setRenewLoading(false);
    }
  };

  const openEdit = () => {
    if (!selected) return;
    setOrganizationEdit({
      name: selected.name || '',
      slug: selected.slug || '',
      description: selected.description || '',
      email: selected.email || '',
      phone_number: selected.phone_number || '',
      location: selected.location || '',
      subscription_tier: selected.subscription_tier || 'free',
      max_trainers: selected.max_trainers ?? 50,
      is_active: selected.is_active,
    });
    setDialogError('');
    setEditOpen(true);
  };

  const handleEdit = async (event) => {
    event.preventDefault();
    if (!selected || !organizationEdit) return;
    setEditLoading(true);
    setDialogError('');
    try {
      const response = await apiClient.patch(`/platform/organizations/${selected.id}/`, organizationEdit);
      setSelected(response.data);
      setEditOpen(false);
      await loadOrganizations();
    } catch (requestError) {
      setDialogError(getApiErrorMessage(requestError, 'Unable to update the organization.'));
    } finally {
      setEditLoading(false);
    }
  };

  const toggleOrganizationActive = async () => {
    if (!selected) return;
    setDialogError('');
    try {
      const response = await apiClient.patch(`/platform/organizations/${selected.id}/`, {
        is_active: !selected.is_active,
      });
      setSelected(response.data);
      await loadOrganizations();
    } catch (requestError) {
      setDialogError(getApiErrorMessage(requestError, 'Unable to change organization status.'));
    }
  };

  const setOrgField = (event) => {
    setOrganizationForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const setRenewalField = (event) => {
    setRenewal((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">{t('Organizations')}</Typography>
          <Typography color="text.secondary">{t('Platform administration')} · {organizations.length} {t('organizations')}</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setDialogError(''); setCreateOpen(true); }}>
          {t('Add organization')}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('Organization')}</TableCell>
              <TableCell>{t('Owner')}</TableCell>
              <TableCell>{t('Subscription')}</TableCell>
              <TableCell>{t('Renewal')}</TableCell>
              <TableCell align="right">{t('People')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center"><CircularProgress size={28} /></TableCell></TableRow>
            ) : organizations.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">{t('No organizations registered yet.')}</TableCell></TableRow>
            ) : organizations.map((organization) => (
              <TableRow key={organization.id} hover onClick={() => showDetails(organization)} sx={{ cursor: 'pointer' }}>
                <TableCell>
                  <Typography fontWeight={600}>{organization.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{organization.slug}</Typography>
                </TableCell>
                <TableCell>{organization.admins?.[0]?.email || t('No owner assigned')}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={subscriptionState(organization, t)}
                    color={!organization.is_active ? 'default' : organization.days_remaining < 0 ? 'error' : 'success'}
                  />
                </TableCell>
                <TableCell>
                  {organization.days_remaining === null ? t('Not set') : organization.days_remaining < 0 ? `${Math.abs(organization.days_remaining)} ${t('days overdue')}` : `${organization.days_remaining} ${t('days')}`}
                  <Typography display="block" variant="caption" color="text.secondary">
                    {formatDate(organization.subscription_end, language, t)}
                  </Typography>
                </TableCell>
                <TableCell align="right">{organization.active_trainees} {t('trainees')} · {organization.staff_count} {t('staff')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Box>
            {selected?.name}
            <Typography variant="body2" color="text.secondary">{selected?.slug}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={openEdit}>{t('Edit organization')}</Button>
            <Button variant="outlined" onClick={toggleOrganizationActive}>
              {selected?.is_active ? t('Suspend') : t('Reactivate')}
            </Button>
            <Button startIcon={<AutorenewIcon />} variant="contained" onClick={() => { setDialogError(''); setRenewOpen(true); }}>
              {t('Renew subscription')}
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          {detailLoading ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box> : selected && (
            <>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="overline">{t('Organization')}</Typography>
                  <Typography>{selected.email || t('No email')} · {selected.phone_number || t('No phone')}</Typography>
                  <Typography color="text.secondary">{selected.location || t('No location')}</Typography>
                  <Typography color="text.secondary">{t('Registered')} {formatDate(selected.created_at, language, t)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="overline">{t('Subscription')}</Typography>
                  <Typography>{t(selected.subscription_tier)} · {subscriptionState(selected, t)}</Typography>
                  <Typography color="text.secondary">{t('Trainee limit')}: {selected.max_trainers ?? t('Not set')}</Typography>
                  <Typography color="text.secondary">{formatDate(selected.subscription_start, language, t)} {t('to')} {formatDate(selected.subscription_end, language, t)}</Typography>
                  <Typography color="text.secondary">{selected.days_remaining === null ? t('No renewal date') : selected.days_remaining < 0 ? `${Math.abs(selected.days_remaining)} ${t('days overdue')}` : `${selected.days_remaining} ${t('days remaining')}`}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="overline">{t('Description')}</Typography>
                  <Typography>{selected.description || t('No description')}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>{t('Staff and owners')}</Typography>
              <Table size="small">
                <TableHead><TableRow><TableCell>{t('Name')}</TableCell><TableCell>{t('Email')}</TableCell><TableCell>{t('Role')}</TableCell><TableCell>{t('Access')}</TableCell></TableRow></TableHead>
                <TableBody>
                  {(selected.staff || []).map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.first_name} {member.last_name} ({member.username})</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{member.role}</TableCell>
                      <TableCell>{member.is_admin ? t('Organization admin') : t('Staff')}</TableCell>
                    </TableRow>
                  ))}
                  {!selected.staff?.length && <TableRow><TableCell colSpan={4}>{t('No staff records.')}</TableCell></TableRow>}
                </TableBody>
              </Table>

              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>{t('Subscription history')}</Typography>
              <Table size="small">
                <TableHead><TableRow><TableCell>{t('Date')}</TableCell><TableCell>{t('Amount')}</TableCell><TableCell>{t('Duration')}</TableCell><TableCell>{t('Method')}</TableCell><TableCell>{t('Processed by')}</TableCell></TableRow></TableHead>
                <TableBody>
                  {(selected.subscription_payments || []).map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.payment_date, language, t)}</TableCell>
                      <TableCell>{Number(payment.amount).toFixed(2)}</TableCell>
                      <TableCell>{payment.duration_months} months</TableCell>
                      <TableCell>{payment.payment_method}</TableCell>
                      <TableCell>{payment.processed_by || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {!selected.subscription_payments?.length && <TableRow><TableCell colSpan={5}>{t('No subscription payments recorded.')}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setSelected(null)}>{t('Close')}</Button></DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => !editLoading && setEditOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleEdit}>
          <DialogTitle>{t('Edit')} {selected?.name}</DialogTitle>
          <DialogContent dividers>
            {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
            {organizationEdit && <Grid container spacing={2}>
              <Grid item xs={12}><TextField fullWidth required label={t('Name')} value={organizationEdit.name} onChange={(event) => setOrganizationEdit({ ...organizationEdit, name: event.target.value })} /></Grid>
              <Grid item xs={12}><TextField fullWidth required label={t('Slug')} value={organizationEdit.slug} onChange={(event) => setOrganizationEdit({ ...organizationEdit, slug: event.target.value })} /></Grid>
              <Grid item xs={12}><TextField fullWidth type="email" label={t('Email')} value={organizationEdit.email} onChange={(event) => setOrganizationEdit({ ...organizationEdit, email: event.target.value })} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label={t('Phone')} value={organizationEdit.phone_number} onChange={(event) => setOrganizationEdit({ ...organizationEdit, phone_number: event.target.value })} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label={t('Location')} value={organizationEdit.location} onChange={(event) => setOrganizationEdit({ ...organizationEdit, location: event.target.value })} /></Grid>
              <Grid item xs={12}><TextField fullWidth multiline minRows={2} label={t('Description')} value={organizationEdit.description} onChange={(event) => setOrganizationEdit({ ...organizationEdit, description: event.target.value })} /></Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label={t('Plan')} value={organizationEdit.subscription_tier} onChange={(event) => setOrganizationEdit({ ...organizationEdit, subscription_tier: event.target.value })}>
                  {['free', 'basic', 'premium'].map((tier) => <MenuItem key={tier} value={tier}>{t(tier)}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth type="number" min="1" label={t('Trainee limit')} value={organizationEdit.max_trainers} onChange={(event) => setOrganizationEdit({ ...organizationEdit, max_trainers: Number(event.target.value) })} /></Grid>
            </Grid>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)} disabled={editLoading}>{t('Cancel')}</Button>
            <Button type="submit" variant="contained" disabled={editLoading}>{editLoading ? t('Saving...') : t('Save changes')}</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={createOpen} onClose={() => !createLoading && setCreateOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleCreate}>
          <DialogTitle>{t('Add organization and owner account')}</DialogTitle>
          <DialogContent dividers>
            {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><TextField fullWidth required label={t('Organization name')} name="org_name" value={organizationForm.org_name} onChange={setOrgField} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label={t('Slug (optional)')} name="org_slug" value={organizationForm.org_slug} onChange={setOrgField} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label={t('Organization email')} name="org_email" value={organizationForm.org_email} onChange={setOrgField} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label={t('Organization phone')} name="org_phone" value={organizationForm.org_phone} onChange={setOrgField} /></Grid>
              <Grid item xs={12}><TextField fullWidth multiline minRows={2} label={t('Description')} name="org_description" value={organizationForm.org_description} onChange={setOrgField} /></Grid>
              <Grid item xs={12}><Divider /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth required label={t('Owner username')} name="username" value={organizationForm.username} onChange={setOrgField} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth required type="email" label={t('Owner email')} name="email" value={organizationForm.email} onChange={setOrgField} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth required type="password" label={t('Temporary password')} name="password" value={organizationForm.password} onChange={setOrgField} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth required type="password" label={t('Confirm password')} name="password_confirm" value={organizationForm.password_confirm} onChange={setOrgField} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)} disabled={createLoading}>{t('Cancel')}</Button>
            <Button type="submit" variant="contained" disabled={createLoading}>{createLoading ? t('Creating...') : t('Create organization')}</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={renewOpen} onClose={() => !renewLoading && setRenewOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleRenew}>
          <DialogTitle>{t('Renew')} {selected?.name}</DialogTitle>
          <DialogContent dividers>
            {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
            <TextField select fullWidth required label={t('Duration')} name="duration_months" value={renewal.duration_months} onChange={setRenewalField} sx={{ mb: 2 }}>
              {[1, 3, 6, 12].map((months) => <MenuItem key={months} value={months}>{months} {t('months')}</MenuItem>)}
            </TextField>
            <TextField fullWidth required type="number" label={t('Amount')} name="amount" value={renewal.amount} onChange={setRenewalField} inputProps={{ min: '0.01', step: '0.01' }} sx={{ mb: 2 }} />
            <TextField select fullWidth required label={t('Payment method')} name="payment_method" value={renewal.payment_method} onChange={setRenewalField} sx={{ mb: 2 }}>
              {[
                ['cash', 'Cash'], ['bank_transfer', 'Bank transfer'], ['card', 'Card'],
                ['check', 'Check'], ['other', 'Other'],
              ].map(([value, label]) => <MenuItem key={value} value={value}>{t(label)}</MenuItem>)}
            </TextField>
            <TextField fullWidth multiline minRows={2} label={t('Notes')} name="notes" value={renewal.notes} onChange={setRenewalField} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRenewOpen(false)} disabled={renewLoading}>{t('Cancel')}</Button>
            <Button type="submit" variant="contained" disabled={renewLoading}>{renewLoading ? t('Saving...') : t('Record renewal')}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}