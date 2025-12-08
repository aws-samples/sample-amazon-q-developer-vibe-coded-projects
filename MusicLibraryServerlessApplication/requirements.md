# Music Library Application Requirements

## Overview
This document outlines the requirements for a music library application built with Python (backend) and React (frontend). The application allows users to manage their music collection by adding, browsing, and organizing music titles.

## Architecture

### High-Level Architecture (Serverless Approach)
- **Frontend**: React.js application hosted on Amazon S3
- **Backend**: Python API using AWS Lambda and API Gateway
- **Database**: Amazon DynamoDB
- **Authentication**: Amazon Cognito

### Component Diagram
```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  S3 Static      │      │  API Gateway    │      │  AWS Lambda     │
│  Website        │─────►│  REST API       │─────►│  (Python/FastAPI)│
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └────────┬────────┘
       ▲                                                   │
       │                                                   ▼
┌──────┴────────┐                                  ┌─────────────────┐
│               │                                  │                 │
│  Amazon       │◄─────────────────────────────────┤  DynamoDB       │
│  Cognito      │                                  │  Database       │
│               │                                  │                 │
└───────────────┘                                  └─────────────────┘
```

## Features

### User Management
- User registration and login
- User profile management
- Password reset functionality

### Music Collection Management
- Add music titles to personal collection
- Edit music title information
- Remove titles from collection

### Music Information
- Store basic information:
  - Title
  - Artist/Band
  - Album
  - Year
  - Genre
  - Duration
  - Cover art (URL or file upload)
  - Personal rating (1-5 stars)
  - Notes/comments

### Browsing and Search
- Browse collection by various filters:
  - Artist
  - Album
  - Genre
  - Year
  - Rating
- Search functionality with autocomplete
- Sort by different fields

### Playlist Management
- Create custom playlists
- Add/remove songs from playlists
- Reorder songs within playlists
- Share playlists (optional)

### Statistics and Insights
- View listening statistics
- Recommendations based on collection
- Most played artists and genres

### Import/Export
- Import music data from CSV/JSON files
- Export collection to various formats
- Integration with music streaming services (optional)

## Technical Requirements

### DynamoDB Data Modeling Approach

- **Single-Table Design**:
  - Store multiple entity types in one DynamoDB table
  - Use prefixes in partition keys to distinguish entity types (e.g., "USER#123", "SONG#456")
  - Design sort keys to enable efficient queries (e.g., "METADATA", "PLAYLIST#789")

- **Example Access Patterns**:
  - Get user by ID
  - Get all songs for a user
  - Get all playlists for a user
  - Get all songs in a playlist
  - Find songs by artist/album/genre
  - Get recently added songs

- **Handling Relationships**:
  - Denormalize data where appropriate for query efficiency
  - Use composite sort keys for hierarchical relationships
  - Create GSIs for many-to-many relationships (e.g., songs in playlists)

- **Performance Considerations**:
  - Design keys to avoid hot partitions
  - Use sparse indexes for attributes that aren't present in all items
  - Consider batch operations for bulk data processing

### Backend (Python Lambda Functions)
- RESTful API using FastAPI with Mangum adapter for AWS Lambda
- API Gateway integration for HTTP endpoints
- Data access: boto3 for DynamoDB integration
- Pydantic for data validation and request/response models
- Cognito integration for authentication and authorization
- Unit tests with pytest and moto for AWS service mocking
- Lambda function organization by domain (auth, songs, playlists)

### Frontend (React on S3)
- Modern React with hooks and functional components
- State management with Redux or Context API
- Responsive design with CSS frameworks (Material-UI or Tailwind CSS)
- Form validation with Formik and Yup
- Integration with Amazon Cognito for authentication
- S3 static website hosting
- Environment configuration for different deployment stages
- Unit tests with Jest and React Testing Library

### Database (DynamoDB)
- **Data Model Design**:
  - Single-table design approach for efficient access patterns
  - Composite keys (partition key + sort key) for flexible querying
  - Global Secondary Indexes (GSIs) for additional access patterns
  - Local Secondary Indexes (LSIs) for range queries within a partition

- **Key Entities and Access Patterns**:
  - Users: Retrieve user profiles and authentication data
  - Songs: Store and query music metadata
  - Playlists: Manage user-created collections of songs
  - User-Song relationships: Track ratings and play counts

- **DynamoDB Features to Utilize**:
  - On-demand capacity for variable workloads
  - DynamoDB Streams for event-driven architecture
  - DynamoDB Accelerator (DAX) for caching (if needed)
  - Point-in-time recovery for data protection

- **Data Consistency**:
  - Strong consistency for critical operations
  - Eventually consistent reads for better performance where appropriate

### Serverless Deployment
- Infrastructure as Code using AWS SAM or Serverless Framework
- CI/CD pipeline with GitHub Actions
- Environment configuration using AWS Parameter Store or Secrets Manager
- AWS Lambda deployment with different environments (dev, staging, prod)
- S3 static website deployment with versioning
- API Gateway configuration with custom domain (optional)
- DynamoDB provisioning with on-demand capacity
- IAM roles and policies for secure service access
- Cognito User Pool and Identity Pool configuration

## Non-Functional Requirements
- Responsive design for mobile and desktop
- Accessibility compliance
- Performance optimization for large collections
- Secure data handling and storage
- Offline functionality (optional)

## Future Enhancements
- Mark favorites functionality
- Music player integration
- Social features (sharing, following)
- Music recommendation engine
- Integration with external APIs (Spotify, Last.fm, etc.)
- Mobile applications (React Native)
## DynamoDB Table Design Example

```
Table: MusicLibrary

Items:
1. User
   - PK: USER#<user_id>
   - SK: METADATA
   - email: <email>
   - username: <username>
   - password_hash: <hashed_password>
   - created_at: <timestamp>

2. Song
   - PK: SONG#<song_id>
   - SK: METADATA
   - title: <title>
   - artist: <artist>
   - album: <album>
   - year: <year>
   - genre: <genre>
   - duration: <duration_in_seconds>
   - cover_art_url: <url>

3. User's Song (for personal collection)
   - PK: USER#<user_id>
   - SK: SONG#<song_id>
   - added_at: <timestamp>
   - rating: <1-5>
   - notes: <text>
   - play_count: <number>
   - last_played: <timestamp>

4. Playlist
   - PK: USER#<user_id>
   - SK: PLAYLIST#<playlist_id>
   - name: <playlist_name>
   - description: <description>
   - created_at: <timestamp>
   - is_public: <boolean>

5. Playlist Song
   - PK: PLAYLIST#<playlist_id>
   - SK: SONG#<song_id>#<position>
   - added_at: <timestamp>

Global Secondary Indexes:
1. GSI1 (Artist-Title Index)
   - PK: ARTIST#<artist_name>
   - SK: TITLE#<title>

2. GSI2 (Genre Index)
   - PK: GENRE#<genre>
   - SK: SONG#<song_id>

3. GSI3 (User-Rating Index)
   - PK: USER#<user_id>
   - SK: RATING#<rating>#SONG#<song_id>
```
## AWS Serverless Infrastructure

### Core AWS Services

1. **Amazon API Gateway**
   - RESTful API endpoints
   - Request validation
   - API key management
   - CORS configuration
   - Integration with Lambda functions

2. **AWS Lambda**
   - Python runtime for backend logic
   - Function organization by domain (users, songs, playlists)
   - Environment variables for configuration
   - CloudWatch integration for logging
   - Appropriate memory and timeout settings

3. **Amazon DynamoDB**
   - Single-table design as outlined previously
   - On-demand capacity mode for cost optimization
   - Point-in-time recovery for data protection
   - TTL for session management (if needed)

4. **Amazon Cognito**
   - User Pool for authentication
   - Identity Pool for AWS service access
   - JWT token handling
   - Integration with API Gateway authorizers
   - Password policies and MFA (optional)

5. **Amazon S3**
   - Static website hosting for React frontend
   - Bucket policies for secure access
   - Versioning for rollback capability
   - Website configuration (index.html, error.html)

### Future Expansion Services

1. **Amazon CloudFront**
   - Global content delivery
   - Edge caching
   - HTTPS with custom domain

2. **AWS Lambda@Edge**
   - Custom logic at edge locations
   - Request/response manipulation

3. **Amazon ElasticSearch Service**
   - Advanced search capabilities
   - Integration with DynamoDB using Streams