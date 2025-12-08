# Music Library - Serverless Web Application

A serverless music library application built with React frontend and Python backend, deployed on AWS using SAM (Serverless Application Model).

## Architecture

- **Frontend**: React.js with Material-UI, hosted on Amazon S3
- **Backend**: Python FastAPI with AWS Lambda and API Gateway
- **Database**: Amazon DynamoDB with single-table design
- **Authentication**: Amazon Cognito User Pools

## Features

- User registration and authentication
- Music collection management (add, edit, delete songs)
- Playlist creation and management
- Responsive design with Material-UI
- Search and filter functionality
- Personal ratings and notes for songs

## Project Structure

```
MusicLibraryServerlessApplication/
├── template.yaml              # SAM template for AWS infrastructure
├── backend/                   # Python Lambda functions
│   ├── requirements.txt       # Python dependencies
│   ├── requirements-test.txt  # Testing dependencies
│   ├── pytest.ini           # Pytest configuration
│   ├── models.py             # Pydantic data models
│   ├── database.py           # DynamoDB service layer
│   ├── auth.py               # Authentication Lambda function
│   ├── songs.py              # Songs management Lambda function
│   ├── playlists.py          # Playlists management Lambda function
│   └── test_songs.py         # Unit tests for songs module
├── frontend/                  # React application
│   ├── package.json          # Node.js dependencies
│   ├── public/               # Static assets and artwork
│   └── src/                  # React source code
│       ├── components/       # Reusable components
│       ├── pages/           # Page components
│       ├── services/        # API service layer and mock data
│       └── hooks/           # Custom React hooks
└── requirements.md          # Detailed requirements document
```

## Prerequisites

- AWS CLI configured with appropriate permissions
- SAM CLI installed
- Node.js 16+ and npm
- Python 3.11+

## Local Development

### Option 1: Using Built-in Mock Data (Recommended for Frontend Development)

1. **Start the frontend with built-in mock data:**
   ```bash
   cd frontend
   npm install
   npm run start:mock
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - All mock data is embedded in the React app

3. **Demo credentials for mock mode:**
   - Email: `test@example.com`
   - Password: `password`

4. **Sample songs with artwork:**
   - Queen - "Bohemian Rhapsody" 
   - Eagles - "Hotel California"
   - Pink Floyd - "Money"
   - The Beatles - "Come Together"

### Option 2: Using Real AWS Backend

1. **Deploy the backend infrastructure:**
   ```bash
   sam build
   sam deploy --guided
   ```

2. **Configure frontend environment:**
   ```bash
   cd frontend
   # Create .env file with your API Gateway URL
   echo "REACT_APP_API_URL=https://your-api-id.execute-api.region.amazonaws.com/dev" > .env
   ```

3. **Start the frontend:**
   ```bash
   npm install
   npm start
   ```

## Deployment

### Backend Deployment

1. **Build and deploy using SAM:**
   ```bash
   sam build
   sam deploy --guided
   ```

2. **Note the outputs:**
   - API Gateway URL
   - Cognito User Pool ID and Client ID
   - S3 bucket name for frontend

### Frontend Deployment

1. **Build the React application:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Upload to S3 bucket:**
   ```bash
   aws s3 sync build/ s3://your-frontend-bucket-name --delete
   ```

3. **Configure the S3 bucket for static website hosting** (if not done via SAM template)

## Environment Variables

### Frontend (.env)
```
REACT_APP_API_URL=https://your-api-gateway-url
REACT_APP_USE_MOCK=false
```

### Backend (SAM template)
```
TABLE_NAME=MusicLibrary-dev
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login

### Songs
- `GET /songs` - Get user's songs (with optional filters)
- `POST /songs` - Add song to collection
- `PUT /songs/{song_id}` - Update song
- `DELETE /songs/{song_id}` - Remove song from collection

### Playlists
- `GET /playlists` - Get user's playlists
- `POST /playlists` - Create playlist
- `GET /playlists/{playlist_id}` - Get playlist details
- `PUT /playlists/{playlist_id}` - Update playlist
- `DELETE /playlists/{playlist_id}` - Delete playlist
- `POST /playlists/{playlist_id}/songs` - Add song to playlist

## Database Schema

The application uses DynamoDB single-table design with the following entity types:

- **Users**: `PK: USER#{user_id}`, `SK: METADATA`
- **Songs**: `PK: SONG#{song_id}`, `SK: METADATA`
- **User Songs**: `PK: USER#{user_id}`, `SK: SONG#{song_id}`
- **Playlists**: `PK: USER#{user_id}`, `SK: PLAYLIST#{playlist_id}`
- **Playlist Songs**: `PK: PLAYLIST#{playlist_id}`, `SK: SONG#{song_id}#{position}`

## Development Scripts

### Frontend
```bash
npm start          # Start development server
npm run start:mock # Start with embedded mock data
npm run build      # Build for production
npm test           # Run tests
```

### Backend
```bash
sam build          # Build Lambda functions
sam local start-api # Run API Gateway locally
sam deploy         # Deploy to AWS
```

## Testing

### Frontend Testing
```bash
cd frontend
npm test
```

### Backend Testing

The backend includes comprehensive unit tests with 93% code coverage:

```bash
cd backend
# Create virtual environment
python3 -m venv test_env
source test_env/bin/activate
# Install dependencies
pip install -r requirements-test.txt
pip install fastapi mangum boto3 pydantic python-jose[cryptography] passlib[bcrypt] python-multipart
# Run tests
pytest test_songs.py -v
# Run with coverage
coverage run -m pytest test_songs.py && coverage report -m
```

**Test Coverage:**
- 19 comprehensive test cases covering all API endpoints
- Input validation and error handling
- Database interaction mocking
- 93% code coverage for songs.py module
- Tests for GET, POST, PUT, DELETE operations
- Search and filtering functionality validation

## Troubleshooting

### Common Issues

1. **CORS errors**: Ensure API Gateway has proper CORS configuration
2. **Authentication errors**: Verify Cognito User Pool and Client configuration
3. **DynamoDB access errors**: Check IAM permissions for Lambda functions
4. **Frontend build errors**: Ensure all environment variables are set

### Mock Mode Issues

1. **Images not displaying**: Ensure artwork files are in `frontend/public/` directory
2. **Port conflicts**: Change PORT in React if 3000 is in use
3. **Mock data not updating**: Check `frontend/src/services/mockData.js` for sample data

## Security Considerations

- All API endpoints (except auth) require JWT authentication
- Cognito handles password policies and user management
- DynamoDB access is restricted to authenticated users' data
- S3 bucket policies restrict access to static assets only

## Performance Optimization

- DynamoDB on-demand pricing for variable workloads
- Lambda functions with appropriate memory allocation
- S3 static website hosting with potential CloudFront integration
- Efficient DynamoDB queries using GSIs for search functionality

## Future Enhancements

See `requirements.md` for planned future features including:
- Favorites functionality
- Music player integration
- Social features
- External API integrations
- Mobile applications

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test locally using mock mode
4. Submit a pull request

## License

This project is licensed under the MIT License.