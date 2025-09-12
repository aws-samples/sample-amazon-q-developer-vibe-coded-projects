import json
import uuid
from fastapi import FastAPI, HTTPException, Depends, Query
from mangum import Mangum
from models import CreateSongRequest, UpdateSongRequest
from database import DynamoDBService
from typing import Optional, List

app = FastAPI()
db = DynamoDBService()

def get_user_id_from_context(event_context=None):
    # In a real implementation, extract user_id from JWT token
    # For now, return a mock user_id
    return "mock-user-id"

@app.get("/songs")
async def get_songs(
    artist: Optional[str] = Query(None),
    genre: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    try:
        user_id = get_user_id_from_context()
        
        if artist:
            songs = db.search_songs_by_artist(artist)
        elif genre:
            songs = db.search_songs_by_genre(genre)
        else:
            songs = db.get_user_songs(user_id)
        
        # Filter by search term if provided
        if search:
            search_lower = search.lower()
            songs = [
                song for song in songs
                if search_lower in song.get('title', '').lower() or
                   search_lower in song.get('artist', '').lower() or
                   search_lower in song.get('album', '').lower()
            ]
        
        return {"songs": songs}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/songs")
async def create_song(request: CreateSongRequest):
    try:
        user_id = get_user_id_from_context()
        song_id = str(uuid.uuid4())
        
        song_data = {
            "title": request.title,
            "artist": request.artist,
            "album": request.album,
            "year": request.year,
            "genre": request.genre,
            "duration": request.duration,
            "cover_art_url": request.cover_art_url,
            "rating": request.rating,
            "notes": request.notes
        }
        
        # Remove None values
        song_data = {k: v for k, v in song_data.items() if v is not None}
        
        user_song = db.add_song_to_user_collection(user_id, song_id, song_data)
        
        return {"message": "Song added successfully", "song": user_song}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/songs/{song_id}")
async def update_song(song_id: str, request: UpdateSongRequest):
    try:
        user_id = get_user_id_from_context()
        
        # Update song metadata if provided
        song_updates = {}
        if request.title is not None:
            song_updates['title'] = request.title
        if request.artist is not None:
            song_updates['artist'] = request.artist
        if request.album is not None:
            song_updates['album'] = request.album
        if request.year is not None:
            song_updates['year'] = request.year
        if request.genre is not None:
            song_updates['genre'] = request.genre
        if request.duration is not None:
            song_updates['duration'] = request.duration
        if request.cover_art_url is not None:
            song_updates['cover_art_url'] = request.cover_art_url
        
        # Update user-specific data
        user_song_updates = {}
        if request.rating is not None:
            user_song_updates['rating'] = request.rating
        if request.notes is not None:
            user_song_updates['notes'] = request.notes
        
        if user_song_updates:
            updated_user_song = db.update_user_song(user_id, song_id, user_song_updates)
        
        return {"message": "Song updated successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/songs/{song_id}")
async def delete_song(song_id: str):
    try:
        user_id = get_user_id_from_context()
        db.remove_song_from_user_collection(user_id, song_id)
        
        return {"message": "Song removed from collection"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

handler = Mangum(app)