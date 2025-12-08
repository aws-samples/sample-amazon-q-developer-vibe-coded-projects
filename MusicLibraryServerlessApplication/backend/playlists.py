import json
import uuid
from fastapi import FastAPI, HTTPException, Path
from mangum import Mangum
from models import CreatePlaylistRequest, UpdatePlaylistRequest, AddSongToPlaylistRequest
from database import DynamoDBService

app = FastAPI()
db = DynamoDBService()

def get_user_id_from_context(event_context=None):
    # In a real implementation, extract user_id from JWT token
    # For now, return a mock user_id
    return "mock-user-id"

@app.get("/playlists")
async def get_playlists():
    try:
        user_id = get_user_id_from_context()
        playlists = db.get_user_playlists(user_id)
        
        # Get song count for each playlist
        for playlist in playlists:
            playlist_songs = db.get_playlist_songs(playlist['playlist_id'])
            playlist['song_count'] = len(playlist_songs)
        
        return {"playlists": playlists}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/playlists")
async def create_playlist(request: CreatePlaylistRequest):
    try:
        user_id = get_user_id_from_context()
        
        playlist_data = {
            "name": request.name,
            "description": request.description,
            "is_public": request.is_public
        }
        
        playlist = db.create_playlist(user_id, playlist_data)
        
        return {"message": "Playlist created successfully", "playlist": playlist}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/playlists/{playlist_id}")
async def get_playlist(playlist_id: str = Path(...)):
    try:
        user_id = get_user_id_from_context()
        
        playlist = db.get_playlist(user_id, playlist_id)
        if not playlist:
            raise HTTPException(status_code=404, detail="Playlist not found")
        
        songs = db.get_playlist_songs(playlist_id)
        playlist['songs'] = songs
        
        return {"playlist": playlist}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/playlists/{playlist_id}")
async def update_playlist(playlist_id: str, request: UpdatePlaylistRequest):
    try:
        user_id = get_user_id_from_context()
        
        updates = {}
        if request.name is not None:
            updates['name'] = request.name
        if request.description is not None:
            updates['description'] = request.description
        if request.is_public is not None:
            updates['is_public'] = request.is_public
        
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        updated_playlist = db.update_playlist(user_id, playlist_id, updates)
        
        return {"message": "Playlist updated successfully", "playlist": updated_playlist}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/playlists/{playlist_id}")
async def delete_playlist(playlist_id: str):
    try:
        user_id = get_user_id_from_context()
        db.delete_playlist(user_id, playlist_id)
        
        return {"message": "Playlist deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/playlists/{playlist_id}/songs")
async def add_song_to_playlist(playlist_id: str, request: AddSongToPlaylistRequest):
    try:
        user_id = get_user_id_from_context()
        
        # Check if playlist exists and belongs to user
        playlist = db.get_playlist(user_id, playlist_id)
        if not playlist:
            raise HTTPException(status_code=404, detail="Playlist not found")
        
        # Get current songs to determine position
        current_songs = db.get_playlist_songs(playlist_id)
        position = request.position if request.position is not None else len(current_songs) + 1
        
        playlist_song = db.add_song_to_playlist(playlist_id, request.song_id, position)
        
        return {"message": "Song added to playlist", "playlist_song": playlist_song}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

handler = Mangum(app)