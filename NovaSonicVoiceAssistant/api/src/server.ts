import * as dotenv from 'dotenv';
import * as path from 'path';
import { server } from './app';

// Load environment variables from .env file in development mode
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.resolve(__dirname, '../.env');
  dotenv.config({ path: envPath });
}

const PORT = process.env.PORT || 3001;

// Start server
server.listen(PORT, () => {
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
 