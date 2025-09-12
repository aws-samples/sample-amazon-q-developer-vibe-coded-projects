import boto3
import os
from typing import Dict, List, Optional
from datetime import datetime
import uuid
from boto3.dynamodb.conditions import Key, Attr

class DynamoDBService:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.table_name = os.environ.get('TABLE_NAME')
        self.table = self.dynamodb.Table(self.table_name)

    def create_user(self, user_id: str, email: str, username: str) -> Dict:
        item = {
            'PK': f'USER#{user_id}',
            'SK': 'METADATA',
            'user_id': user_id,
            'email': email,
            'username': username,
            'created_at': datetime.utcnow().isoformat(),
            'entity_type': 'user'
        }
        self.table.put_item(Item=item)
        return item

    def get_user(self, user_id: str) -> Optional[Dict]:
        response = self.table.get_item(
            Key={'PK': f'USER#{user_id}', 'SK': 'METADATA'}
        )
        return response.get('Item')

    def create_song(self, song_id: str, song_data: Dict) -> Dict:
        item = {
            'PK': f'SONG#{song_id}',
            'SK': 'METADATA',
            'song_id': song_id,
            'entity_type': 'song',
            'GSI1PK': f'ARTIST#{song_data["artist"]}',
            'GSI1SK': f'TITLE#{song_data["title"]}',
            'GSI2PK': f'GENRE#{song_data.get("genre", "Unknown")}',
            'GSI2SK': f'SONG#{song_id}',
            **song_data
        }
        self.table.put_item(Item=item)
        return item

    def get_song(self, song_id: str) -> Optional[Dict]:
        response = self.table.get_item(
            Key={'PK': f'SONG#{song_id}', 'SK': 'METADATA'}
        )
        return response.get('Item')

    def add_song_to_user_collection(self, user_id: str, song_id: str, song_data: Dict) -> Dict:
        # First create the song if it doesn't exist
        existing_song = self.get_song(song_id)
        if not existing_song:
            self.create_song(song_id, song_data)

        # Add to user's collection
        item = {
            'PK': f'USER#{user_id}',
            'SK': f'SONG#{song_id}',
            'user_id': user_id,
            'song_id': song_id,
            'added_at': datetime.utcnow().isoformat(),
            'rating': song_data.get('rating'),
            'notes': song_data.get('notes'),
            'play_count': 0,
            'entity_type': 'user_song'
        }
        self.table.put_item(Item=item)
        return item

    def get_user_songs(self, user_id: str) -> List[Dict]:
        response = self.table.query(
            KeyConditionExpression=Key('PK').eq(f'USER#{user_id}') & Key('SK').begins_with('SONG#')
        )
        
        # Get full song details for each user song
        songs = []
        for user_song in response['Items']:
            song_id = user_song['song_id']
            song_details = self.get_song(song_id)
            if song_details:
                combined = {**song_details, **user_song}
                songs.append(combined)
        
        return songs

    def update_user_song(self, user_id: str, song_id: str, updates: Dict) -> Dict:
        key = {'PK': f'USER#{user_id}', 'SK': f'SONG#{song_id}'}
        
        update_expression = "SET "
        expression_values = {}
        
        for field, value in updates.items():
            if value is not None:
                update_expression += f"{field} = :{field}, "
                expression_values[f":{field}"] = value
        
        update_expression = update_expression.rstrip(', ')
        
        self.table.update_item(
            Key=key,
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values
        )
        
        return self.table.get_item(Key=key)['Item']

    def remove_song_from_user_collection(self, user_id: str, song_id: str):
        self.table.delete_item(
            Key={'PK': f'USER#{user_id}', 'SK': f'SONG#{song_id}'}
        )

    def create_playlist(self, user_id: str, playlist_data: Dict) -> Dict:
        playlist_id = str(uuid.uuid4())
        item = {
            'PK': f'USER#{user_id}',
            'SK': f'PLAYLIST#{playlist_id}',
            'playlist_id': playlist_id,
            'user_id': user_id,
            'created_at': datetime.utcnow().isoformat(),
            'entity_type': 'playlist',
            **playlist_data
        }
        self.table.put_item(Item=item)
        return item

    def get_user_playlists(self, user_id: str) -> List[Dict]:
        response = self.table.query(
            KeyConditionExpression=Key('PK').eq(f'USER#{user_id}') & Key('SK').begins_with('PLAYLIST#')
        )
        return response['Items']

    def get_playlist(self, user_id: str, playlist_id: str) -> Optional[Dict]:
        response = self.table.get_item(
            Key={'PK': f'USER#{user_id}', 'SK': f'PLAYLIST#{playlist_id}'}
        )
        return response.get('Item')

    def update_playlist(self, user_id: str, playlist_id: str, updates: Dict) -> Dict:
        key = {'PK': f'USER#{user_id}', 'SK': f'PLAYLIST#{playlist_id}'}
        
        update_expression = "SET "
        expression_values = {}
        
        for field, value in updates.items():
            if value is not None:
                update_expression += f"{field} = :{field}, "
                expression_values[f":{field}"] = value
        
        update_expression = update_expression.rstrip(', ')
        
        self.table.update_item(
            Key=key,
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values
        )
        
        return self.table.get_item(Key=key)['Item']

    def delete_playlist(self, user_id: str, playlist_id: str):
        # Delete playlist songs first
        playlist_songs = self.get_playlist_songs(playlist_id)
        for song in playlist_songs:
            self.table.delete_item(
                Key={'PK': f'PLAYLIST#{playlist_id}', 'SK': song['SK']}
            )
        
        # Delete playlist
        self.table.delete_item(
            Key={'PK': f'USER#{user_id}', 'SK': f'PLAYLIST#{playlist_id}'}
        )

    def add_song_to_playlist(self, playlist_id: str, song_id: str, position: int) -> Dict:
        item = {
            'PK': f'PLAYLIST#{playlist_id}',
            'SK': f'SONG#{song_id}#{position:04d}',
            'playlist_id': playlist_id,
            'song_id': song_id,
            'position': position,
            'added_at': datetime.utcnow().isoformat(),
            'entity_type': 'playlist_song'
        }
        self.table.put_item(Item=item)
        return item

    def get_playlist_songs(self, playlist_id: str) -> List[Dict]:
        response = self.table.query(
            KeyConditionExpression=Key('PK').eq(f'PLAYLIST#{playlist_id}') & Key('SK').begins_with('SONG#')
        )
        
        # Get full song details
        songs = []
        for playlist_song in response['Items']:
            song_id = playlist_song['song_id']
            song_details = self.get_song(song_id)
            if song_details:
                combined = {**song_details, **playlist_song}
                songs.append(combined)
        
        return sorted(songs, key=lambda x: x['position'])

    def search_songs_by_artist(self, artist: str) -> List[Dict]:
        response = self.table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1PK').eq(f'ARTIST#{artist}')
        )
        return response['Items']

    def search_songs_by_genre(self, genre: str) -> List[Dict]:
        response = self.table.query(
            IndexName='GSI2',
            KeyConditionExpression=Key('GSI2PK').eq(f'GENRE#{genre}')
        )
        return response['Items']