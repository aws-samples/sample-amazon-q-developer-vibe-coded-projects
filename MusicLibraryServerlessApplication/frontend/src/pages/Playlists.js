import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Alert
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  QueueMusic as PlaylistIcon
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import api from '../services/api';

const playlistValidationSchema = yup.object({
  name: yup.string().required('Name is required'),
  description: yup.string(),
  is_public: yup.boolean()
});

const Playlists = () => {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [error, setError] = useState('');

  const formik = useFormik({
    initialValues: {
      name: '',
      description: '',
      is_public: false
    },
    validationSchema: playlistValidationSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        if (editingPlaylist) {
          await api.playlists.update(editingPlaylist.playlist_id, values);
        } else {
          await api.playlists.create(values);
        }

        await fetchPlaylists();
        setDialogOpen(false);
        setEditingPlaylist(null);
        resetForm();
      } catch (error) {
        setError(error.response?.data?.detail || error.message);
      }
    }
  });

  const fetchPlaylists = async () => {
    try {
      const response = await api.playlists.getAll();
      setPlaylists(response.data.playlists || []);
    } catch (error) {
      setError('Failed to fetch playlists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const handleEdit = (playlist) => {
    setEditingPlaylist(playlist);
    formik.setValues({
      name: playlist.name || '',
      description: playlist.description || '',
      is_public: playlist.is_public || false
    });
    setDialogOpen(true);
  };

  const handleDelete = async (playlistId) => {
    if (window.confirm('Are you sure you want to delete this playlist?')) {
      try {
        await api.playlists.delete(playlistId);
        await fetchPlaylists();
      } catch (error) {
        setError('Failed to delete playlist');
      }
    }
  };

  const handleAddNew = () => {
    setEditingPlaylist(null);
    formik.resetForm();
    setDialogOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return <Typography>Loading playlists...</Typography>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          My Playlists
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
        >
          Create Playlist
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {playlists.length === 0 ? (
        <Typography color="textSecondary" align="center" sx={{ mt: 4 }}>
          No playlists created yet. Create your first playlist!
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {playlists.map((playlist) => (
            <Grid item xs={12} sm={6} md={4} key={playlist.playlist_id}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <PlaylistIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" noWrap>
                      {playlist.name}
                    </Typography>
                  </Box>
                  
                  {playlist.description && (
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      {playlist.description}
                    </Typography>
                  )}
                  
                  <Box mb={2}>
                    <Chip 
                      label={`${playlist.song_count || 0} songs`} 
                      size="small" 
                      sx={{ mr: 1 }} 
                    />
                    {playlist.is_public && (
                      <Chip 
                        label="Public" 
                        size="small" 
                        color="primary" 
                        sx={{ mr: 1 }} 
                      />
                    )}
                  </Box>
                  
                  {playlist.created_at && (
                    <Typography variant="caption" color="textSecondary">
                      Created: {formatDate(playlist.created_at)}
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <IconButton size="small" onClick={() => handleEdit(playlist)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(playlist.playlist_id)}>
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Playlist Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPlaylist ? 'Edit Playlist' : 'Create New Playlist'}
        </DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              margin="normal"
              name="name"
              label="Playlist Name"
              value={formik.values.name}
              onChange={formik.handleChange}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && formik.errors.name}
            />
            <TextField
              fullWidth
              margin="normal"
              name="description"
              label="Description"
              multiline
              rows={3}
              value={formik.values.description}
              onChange={formik.handleChange}
            />
            <Box mt={2}>
              <label>
                <input
                  type="checkbox"
                  name="is_public"
                  checked={formik.values.is_public}
                  onChange={formik.handleChange}
                  style={{ marginRight: 8 }}
                />
                Make this playlist public
              </label>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingPlaylist ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Playlists;