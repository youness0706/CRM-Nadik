import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Alert, Box, IconButton, Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
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

const DOCUMENT_TYPES = ['بطاقة الوطنية', 'الحالة المدنية', 'وثيقة أخرى'];
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;

const DEFAULT_MEMBER = {
  first_name: '', last_name: '', phone: '', phone_parent: '',
  email: '', CIN: '', address: '', male_female: 'male',
  birth_day: '', belt_degree: 'أبيض', Degree: '', tall: '', weight: '', category: 'كبار', started_day: new Date().toISOString().split('T')[0], image_file: null,
  is_active: true
};

export default function MemberDialog({ open, onClose, member = null, onSuccess }) {
  const [formData, setFormData] = useState(DEFAULT_MEMBER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentLoading, setDocumentLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(member ? { ...member, image_file: null } : { ...DEFAULT_MEMBER });
      setError(null);
      setDocuments([]);
      setDocumentFile(null);
      if (member?.id) {
        apiClient.get(`/crm/members/${member.id}/documents/`)
          .then((response) => setDocuments(response.data))
          .catch((requestError) => setError(getApiErrorMessage(requestError, 'Unable to load trainee documents.')));
      }
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
      const payload = { ...formData };
      const imageFile = payload.image_file;
      delete payload.image;
      delete payload.image_file;
      const requestBody = imageFile ? new FormData() : payload;
      if (imageFile) {
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') requestBody.append(key, value);
        });
        requestBody.append('image', imageFile);
      }
      if (member && member.id) {
        await apiClient.put(`/crm/members/${member.id}/`, requestBody, imageFile ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined);
      } else {
        await apiClient.post('/crm/members/', requestBody, imageFile ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined);
      }
      onSuccess();
    } catch (err) {
      setError(getApiErrorMessage(err, 'An error occurred while saving the member.'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async () => {
    if (!member?.id || !documentFile) return;
    if (documentFile.size > MAX_DOCUMENT_SIZE) {
      setError('Documents must be 5 MB or smaller.');
      return;
    }
    setDocumentLoading(true);
    setError(null);
    try {
      const payload = new FormData();
      payload.append('document_type', documentType);
      payload.append('file', documentFile);
      const response = await apiClient.post(`/crm/members/${member.id}/documents/`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocuments((current) => [response.data, ...current]);
      setDocumentFile(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to upload trainee document.'));
    } finally {
      setDocumentLoading(false);
    }
  };

  const handleDocumentDelete = async (document) => {
    try {
      await apiClient.delete(`/crm/members/${member.id}/documents/${document.id}/`);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to delete trainee document.'));
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
              <TextField fullWidth label="Education level" name="Degree" value={formData.Degree || ''} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="number" label="Height (cm)" name="tall" value={formData.tall || ''} onChange={handleChange} inputProps={{ min: 0, step: '0.01' }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="number" label="Weight (kg)" name="weight" value={formData.weight || ''} onChange={handleChange} inputProps={{ min: 0, step: '0.01' }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="date" required label="Start Date" name="started_day" value={formData.started_day || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <Button component="label" variant="outlined" size="small">
                {formData.image_file?.name || 'Choose trainee photo'}
                <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFormData((current) => ({ ...current, image_file: event.target.files?.[0] || null }))} />
              </Button>
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
          {member?.id && (
            <Box sx={{ mt: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12}>
                  <TextField select fullWidth label="Document type" value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
                    {DOCUMENT_TYPES.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={7}>
                  <Button component="label" variant="outlined" size="small">
                    {documentFile?.name || 'Choose document (max 5 MB)'}
                    <input hidden type="file" onChange={(event) => setDocumentFile(event.target.files?.[0] || null)} />
                  </Button>
                </Grid>
                <Grid item xs={12} sm={5}>
                  <Button variant="contained" onClick={handleDocumentUpload} disabled={!documentFile || documentLoading}>
                    {documentLoading ? 'Uploading...' : 'Upload document'}
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  {documents.map((document) => (
                    <Box key={document.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', py: 0.5 }}>
                      <Button component="a" href={document.file} target="_blank" rel="noreferrer">{document.document_type}</Button>
                      <Tooltip title="Delete document">
                        <IconButton size="small" color="error" onClick={() => handleDocumentDelete(document)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </Box>
                  ))}
                  {!documents.length && <Box sx={{ color: 'text.secondary', typography: 'body2' }}>No documents uploaded.</Box>}
                </Grid>
              </Grid>
            </Box>
          )}
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
