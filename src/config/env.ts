import dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables from .env file if it exists (optional)
// Looks in the root directory of the app using this package
dotenv.config({ path: join(process.cwd(), '.env') });

// Export environment variables with types
export const env = {
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY as string,
  DEFAULT_MODEL_NAME: process.env.DEFAULT_MODEL_NAME as string,
} as const;
