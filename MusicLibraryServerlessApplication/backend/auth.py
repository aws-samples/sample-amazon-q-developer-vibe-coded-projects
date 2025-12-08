import json
import os
import boto3
from fastapi import FastAPI, HTTPException
from mangum import Mangum
from models import RegisterRequest, LoginRequest
from database import DynamoDBService
import uuid

app = FastAPI()
db = DynamoDBService()
cognito_client = boto3.client('cognito-idp')

@app.post("/auth/register")
async def register(request: RegisterRequest):
    try:
        user_pool_id = os.environ.get('COGNITO_USER_POOL_ID')
        
        # Create user in Cognito
        response = cognito_client.admin_create_user(
            UserPoolId=user_pool_id,
            Username=request.email,
            UserAttributes=[
                {'Name': 'email', 'Value': request.email},
                {'Name': 'email_verified', 'Value': 'true'}
            ],
            TemporaryPassword=request.password,
            MessageAction='SUPPRESS'
        )
        
        # Set permanent password
        cognito_client.admin_set_user_password(
            UserPoolId=user_pool_id,
            Username=request.email,
            Password=request.password,
            Permanent=True
        )
        
        # Create user in DynamoDB
        user_id = response['User']['Username']
        user = db.create_user(user_id, request.email, request.username)
        
        return {"message": "User registered successfully", "user_id": user_id}
        
    except cognito_client.exceptions.UsernameExistsException:
        raise HTTPException(status_code=400, detail="User already exists")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/login")
async def login(request: LoginRequest):
    try:
        user_pool_id = os.environ.get('COGNITO_USER_POOL_ID')
        client_id = os.environ.get('COGNITO_CLIENT_ID')
        
        response = cognito_client.admin_initiate_auth(
            UserPoolId=user_pool_id,
            ClientId=client_id,
            AuthFlow='ADMIN_NO_SRP_AUTH',
            AuthParameters={
                'USERNAME': request.email,
                'PASSWORD': request.password
            }
        )
        
        access_token = response['AuthenticationResult']['AccessToken']
        id_token = response['AuthenticationResult']['IdToken']
        
        # Get user info from token
        user_info = cognito_client.get_user(AccessToken=access_token)
        user_id = user_info['Username']
        
        return {
            "access_token": access_token,
            "id_token": id_token,
            "user_id": user_id,
            "token_type": "Bearer"
        }
        
    except cognito_client.exceptions.NotAuthorizedException:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

handler = Mangum(app)