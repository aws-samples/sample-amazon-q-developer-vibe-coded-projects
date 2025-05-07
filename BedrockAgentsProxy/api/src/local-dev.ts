import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading environment variables from: ${envPath}`);
dotenv.config({ path: envPath });

import { app } from './app';

// Set up a port for local development
const PORT = process.env.PORT || 3001;

// Set AWS_REGION if not already set
if (!process.env.AWS_REGION) {
  process.env.AWS_REGION = 'us-east-1';
  console.log('Using default AWS_REGION for local development: us-east-1');
}

// Start the server
app.listen(PORT, () => {
  console.log(`API server running locally at http://localhost:${PORT}`);
});
