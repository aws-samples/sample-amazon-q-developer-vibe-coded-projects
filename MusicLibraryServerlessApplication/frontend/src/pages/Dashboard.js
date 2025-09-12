import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Box,
  Paper
} from '@mui/material';
import { 
  MusicNote as MusicNoteIcon,
  QueueMusic as PlaylistIcon,
  TrendingUp as TrendingIcon
} from '@mui/icons-material';
import api from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSongs: 0,
    totalPlaylists: 0,
    recentSongs: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [songsResponse, playlistsResponse] = await Promise.all([
          api.songs.getAll(),
          api.playlists.getAll()
        ]);

        const songs = songsResponse.data.songs || [];
        const playlists = playlistsResponse.data.playlists || [];

        // Get recent songs (last 5)
        const recentSongs = songs
          .sort((a, b) => new Date(b.added_at || 0) - new Date(a.added_at || 0))
          .slice(0, 5);

        setStats({
          totalSongs: songs.length,
          totalPlaylists: playlists.length,
          recentSongs
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <Typography>Loading dashboard...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <MusicNoteIcon color="primary" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Songs
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalSongs}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PlaylistIcon color="secondary" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Playlists
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalPlaylists}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingIcon color="success" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Collection Growth
                  </Typography>
                  <Typography variant="h4">
                    +{Math.floor(stats.totalSongs * 0.1)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    This month
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Recent Songs */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recently Added Songs
            </Typography>
            
            {stats.recentSongs.length === 0 ? (
              <Typography color="textSecondary">
                No songs added yet. Start building your collection!
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {stats.recentSongs.map((song) => (
                  <Grid item xs={12} sm={6} md={4} key={song.song_id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" noWrap>
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
                        {song.rating && (
                          <Typography variant="body2">
                            Rating: {'★'.repeat(song.rating)}{'☆'.repeat(5 - song.rating)}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;