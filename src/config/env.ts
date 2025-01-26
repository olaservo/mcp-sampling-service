import dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables from .env file
dotenv.config({ path: join(process.cwd(), '.env') });

// Required environment variables
const requiredEnvVars = ['OPENROUTER_API_KEY', 'DEFAULT_MODEL_NAME'] as const;

// Check for missing environment variables
const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !process.env[envVar]
);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}\n` +
    'Please create a .env file in the root directory with these variables.'
  );
}

// Export environment variables with types
export const env = {
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY as string,
  DEFAULT_MODEL_NAME: process.env.DEFAULT_MODEL_NAME as string,
} as const;
