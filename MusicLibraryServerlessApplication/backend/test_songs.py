import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from fastapi import HTTPException
import uuid

# Mock the database before importing songs module
with patch('database.DynamoDBService'):
    from songs import app, get_user_id_from_context
    from models import CreateSongRequest, UpdateSongRequest

client = TestClient(app)

@pytest.fixture
def mock_db():
    with patch('songs.db') as mock:
        yield mock

@pytest.fixture
def mock_user_id():
    with patch('songs.get_user_id_from_context', return_value='test-user-id') as mock:
        yield mock

class TestGetSongs:
    def test_get_songs_success(self, mock_db, mock_user_id):
        mock_songs = [
            {'song_id': '1', 'title': 'Test Song', 'artist': 'Test Artist'},
            {'song_id': '2', 'title': 'Another Song', 'artist': 'Another Artist'}
        ]
        mock_db.get_user_songs.return_value = mock_songs
        
        response = client.get("/songs")
        
        assert response.status_code == 200
        assert response.json() == {"songs": mock_songs}
        mock_db.get_user_songs.assert_called_once_with('test-user-id')

    def test_get_songs_with_artist_filter(self, mock_db, mock_user_id):
        mock_songs = [{'song_id': '1', 'title': 'Test Song', 'artist': 'Queen'}]
        mock_db.search_songs_by_artist.return_value = mock_songs
        
        response = client.get("/songs?artist=Queen")
        
        assert response.status_code == 200
        assert response.json() == {"songs": mock_songs}
        mock_db.search_songs_by_artist.assert_called_once_with('Queen')

    def test_get_songs_with_genre_filter(self, mock_db, mock_user_id):
        mock_songs = [{'song_id': '1', 'title': 'Test Song', 'genre': 'Rock'}]
        mock_db.search_songs_by_genre.return_value = mock_songs
        
        response = client.get("/songs?genre=Rock")
        
        assert response.status_code == 200
        assert response.json() == {"songs": mock_songs}
        mock_db.search_songs_by_genre.assert_called_once_with('Rock')

    def test_get_songs_with_search_filter(self, mock_db, mock_user_id):
        mock_songs = [
            {'song_id': '1', 'title': 'Bohemian Rhapsody', 'artist': 'Queen', 'album': 'A Night at the Opera'},
            {'song_id': '2', 'title': 'Another Song', 'artist': 'Test Artist', 'album': 'Test Album'}
        ]
        mock_db.get_user_songs.return_value = mock_songs
        
        response = client.get("/songs?search=bohemian")
        
        assert response.status_code == 200
        result = response.json()
        assert len(result["songs"]) == 1
        assert result["songs"][0]["title"] == "Bohemian Rhapsody"

    def test_get_songs_search_by_artist(self, mock_db, mock_user_id):
        mock_songs = [
            {'song_id': '1', 'title': 'Song 1', 'artist': 'Queen', 'album': 'Album 1'},
            {'song_id': '2', 'title': 'Song 2', 'artist': 'Beatles', 'album': 'Album 2'}
        ]
        mock_db.get_user_songs.return_value = mock_songs
        
        response = client.get("/songs?search=queen")
        
        assert response.status_code == 200
        result = response.json()
        assert len(result["songs"]) == 1
        assert result["songs"][0]["artist"] == "Queen"

    def test_get_songs_database_error(self, mock_db, mock_user_id):
        mock_db.get_user_songs.side_effect = Exception("Database error")
        
        response = client.get("/songs")
        
        assert response.status_code == 500
        assert "Database error" in response.json()["detail"]

class TestCreateSong:
    def test_create_song_success(self, mock_db, mock_user_id):
        mock_user_song = {
            'user_id': 'test-user-id',
            'song_id': 'test-song-id',
            'title': 'Test Song',
            'artist': 'Test Artist'
        }
        mock_db.add_song_to_user_collection.return_value = mock_user_song
        
        song_data = {
            "title": "Test Song",
            "artist": "Test Artist",
            "album": "Test Album",
            "year": 2023,
            "genre": "Rock",
            "duration": 180,
            "rating": 5,
            "notes": "Great song"
        }
        
        with patch('songs.uuid.uuid4', return_value=Mock(hex='test-song-id')):
            response = client.post("/songs", json=song_data)
        
        assert response.status_code == 200
        result = response.json()
        assert result["message"] == "Song added successfully"
        assert result["song"] == mock_user_song

    def test_create_song_minimal_data(self, mock_db, mock_user_id):
        mock_user_song = {
            'user_id': 'test-user-id',
            'song_id': 'test-song-id',
            'title': 'Test Song',
            'artist': 'Test Artist'
        }
        mock_db.add_song_to_user_collection.return_value = mock_user_song
        
        song_data = {
            "title": "Test Song",
            "artist": "Test Artist"
        }
        
        response = client.post("/songs", json=song_data)
        
        assert response.status_code == 200
        result = response.json()
        assert result["message"] == "Song added successfully"

    def test_create_song_invalid_rating(self, mock_db, mock_user_id):
        song_data = {
            "title": "Test Song",
            "artist": "Test Artist",
            "rating": 6  # Invalid rating > 5
        }
        
        response = client.post("/songs", json=song_data)
        
        assert response.status_code == 422  # Validation error

    def test_create_song_missing_required_fields(self, mock_db, mock_user_id):
        song_data = {
            "title": "Test Song"
            # Missing required 'artist' field
        }
        
        response = client.post("/songs", json=song_data)
        
        assert response.status_code == 422  # Validation error

    def test_create_song_database_error(self, mock_db, mock_user_id):
        mock_db.add_song_to_user_collection.side_effect = Exception("Database error")
        
        song_data = {
            "title": "Test Song",
            "artist": "Test Artist"
        }
        
        response = client.post("/songs", json=song_data)
        
        assert response.status_code == 500
        assert "Database error" in response.json()["detail"]

class TestUpdateSong:
    def test_update_song_success(self, mock_db, mock_user_id):
        mock_db.update_user_song.return_value = {'updated': True}
        
        update_data = {
            "rating": 4,
            "notes": "Updated notes"
        }
        
        response = client.put("/songs/test-song-id", json=update_data)
        
        assert response.status_code == 200
        assert response.json()["message"] == "Song updated successfully"
        mock_db.update_user_song.assert_called_once_with(
            'test-user-id', 
            'test-song-id', 
            {'rating': 4, 'notes': 'Updated notes'}
        )

    def test_update_song_partial_data(self, mock_db, mock_user_id):
        mock_db.update_user_song.return_value = {'updated': True}
        
        update_data = {
            "rating": 3
        }
        
        response = client.put("/songs/test-song-id", json=update_data)
        
        assert response.status_code == 200
        mock_db.update_user_song.assert_called_once_with(
            'test-user-id', 
            'test-song-id', 
            {'rating': 3}
        )

    def test_update_song_no_user_updates(self, mock_db, mock_user_id):
        update_data = {
            "title": "New Title",
            "artist": "New Artist"
        }
        
        response = client.put("/songs/test-song-id", json=update_data)
        
        assert response.status_code == 200
        # Should not call update_user_song since no user-specific fields
        mock_db.update_user_song.assert_not_called()

    def test_update_song_invalid_rating(self, mock_db, mock_user_id):
        update_data = {
            "rating": 0  # Invalid rating < 1
        }
        
        response = client.put("/songs/test-song-id", json=update_data)
        
        assert response.status_code == 422  # Validation error

    def test_update_song_database_error(self, mock_db, mock_user_id):
        mock_db.update_user_song.side_effect = Exception("Database error")
        
        update_data = {
            "rating": 4
        }
        
        response = client.put("/songs/test-song-id", json=update_data)
        
        assert response.status_code == 500
        assert "Database error" in response.json()["detail"]

class TestDeleteSong:
    def test_delete_song_success(self, mock_db, mock_user_id):
        response = client.delete("/songs/test-song-id")
        
        assert response.status_code == 200
        assert response.json()["message"] == "Song removed from collection"
        mock_db.remove_song_from_user_collection.assert_called_once_with(
            'test-user-id', 
            'test-song-id'
        )

    def test_delete_song_database_error(self, mock_db, mock_user_id):
        mock_db.remove_song_from_user_collection.side_effect = Exception("Database error")
        
        response = client.delete("/songs/test-song-id")
        
        assert response.status_code == 500
        assert "Database error" in response.json()["detail"]

class TestGetUserIdFromContext:
    def test_get_user_id_returns_mock_id(self):
        result = get_user_id_from_context()
        assert result == "mock-user-id"