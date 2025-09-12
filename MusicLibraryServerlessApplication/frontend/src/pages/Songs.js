import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  CardActions,
  CardMedia,
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
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import api from '../services/api';

const songValidationSchema = yup.object({
  title: yup.string().required('Title is required'),
  artist: yup.string().required('Artist is required'),
  album: yup.string(),
  year: yup.number().min(1900).max(new Date().getFullYear()),
  genre: yup.string(),
  duration: yup.number().min(1),
  cover_art_url: yup.string().url('Must be a valid URL'),
  rating: yup.number().min(1).max(5),
  notes: yup.string()
});

const Songs = () => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [error, setError] = useState('');

  const formik = useFormik({
    initialValues: {
      title: '',
      artist: '',
      album: '',
      year: '',
      genre: '',
      duration: '',
      cover_art_url: '',
      rating: '',
      notes: ''
    },
    validationSchema: songValidationSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        const songData = {
          ...values,
          year: values.year ? parseInt(values.year) : null,
          duration: values.duration ? parseInt(values.duration) : null,
          rating: values.rating ? parseInt(values.rating) : null
        };

        if (editingSong) {
          await api.songs.update(editingSong.song_id, songData);
        } else {
          await api.songs.create(songData);
        }

        await fetchSongs();
        setDialogOpen(false);
        setEditingSong(null);
        resetForm();
      } catch (error) {
        setError(error.response?.data?.detail || error.message);
      }
    }
  });

  const fetchSongs = async () => {
    try {
      const response = await api.songs.getAll();
      setSongs(response.data.songs || []);
    } catch (error) {
      setError('Failed to fetch songs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, []);

  const handleEdit = (song) => {
    setEditingSong(song);
    formik.setValues({
      title: song.title || '',
      artist: song.artist || '',
      album: song.album || '',
      year: song.year || '',
      genre: song.genre || '',
      duration: song.duration || '',
      rating: song.rating || '',
      notes: song.notes || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (songId) => {
    if (window.confirm('Are you sure you want to delete this song?')) {
      try {
        await api.songs.delete(songId);
        await fetchSongs();
      } catch (error) {
        setError('Failed to delete song');
      }
    }
  };

  const handleAddNew = () => {
    setEditingSong(null);
    formik.resetForm();
    setDialogOpen(true);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <Typography>Loading songs...</Typography>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          My Songs
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
        >
          Add Song
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {songs.length === 0 ? (
        <Typography color="textSecondary" align="center" sx={{ mt: 4 }}>
          No songs in your collection yet. Add your first song!
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {songs.map((song) => (
            <Grid item xs={12} sm={6} md={4} key={song.song_id}>
              <Card>
                {song.cover_art_url && (
                  <CardMedia
                    component="img"
                    height="200"
                    image={song.cover_art_url}
                    alt={`${song.album || song.title} artwork`}
                    sx={{ objectFit: 'contain', backgroundColor: '#f5f5f5' }}
                  />
                )}
                <CardContent>
                  <Typography variant="h6" noWrap gutterBottom>
                    {song.title}
                  </Typography>
                  <Typography color="textSecondary" noWrap>
                    {song.artist}
                  </Typography>
                  {song.album && (
                    <Typography variant="body2" color="textSecondary" noWrap>
                      {song.album}
                    </Typography>
                  )}
                  <Box mt={1}>
                    {song.year && (
                      <Chip label={song.year} size="small" sx={{ mr: 1, mb: 1 }} />
                    )}
                    {song.genre && (
                      <Chip label={song.genre} size="small" sx={{ mr: 1, mb: 1 }} />
                    )}
                    {song.duration && (
                      <Chip label={formatDuration(song.duration)} size="small" sx={{ mr: 1, mb: 1 }} />
                    )}
                  </Box>
                  {song.rating && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {'★'.repeat(song.rating)}{'☆'.repeat(5 - song.rating)}
                    </Typography>
                  )}
                  {song.notes && (
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      {song.notes}
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <IconButton size="small" onClick={() => handleEdit(song)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(song.song_id)}>
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Song Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingSong ? 'Edit Song' : 'Add New Song'}
        </DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              margin="normal"
              name="title"
              label="Title"
              value={formik.values.title}
              onChange={formik.handleChange}
              error={formik.touched.title && Boolean(formik.errors.title)}
              helperText={formik.touched.title && formik.errors.title}
            />
            <TextField
              fullWidth
              margin="normal"
              name="artist"
              label="Artist"
              value={formik.values.artist}
              onChange={formik.handleChange}
              error={formik.touched.artist && Boolean(formik.errors.artist)}
              helperText={formik.touched.artist && formik.errors.artist}
            />
            <TextField
              fullWidth
              margin="normal"
              name="album"
              label="Album"
              value={formik.values.album}
              onChange={formik.handleChange}
            />
            <TextField
              fullWidth
              margin="normal"
              name="cover_art_url"
              label="Artwork URL"
              placeholder="e.g., /artwork/album-cover.jpg"
              value={formik.values.cover_art_url}
              onChange={formik.handleChange}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  margin="normal"
                  name="year"
                  label="Year"
                  type="number"
                  value={formik.values.year}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  margin="normal"
                  name="genre"
                  label="Genre"
                  value={formik.values.genre}
                  onChange={formik.handleChange}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  margin="normal"
                  name="duration"
                  label="Duration (seconds)"
                  type="number"
                  value={formik.values.duration}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  margin="normal"
                  name="rating"
                  label="Rating (1-5)"
                  type="number"
                  inputProps={{ min: 1, max: 5 }}
                  value={formik.values.rating}
                  onChange={formik.handleChange}
                />
              </Grid>
            </Grid>
            <TextField
              fullWidth
              margin="normal"
              name="notes"
              label="Notes"
              multiline
              rows={3}
              value={formik.values.notes}
              onChange={formik.handleChange}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingSong ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Songs;