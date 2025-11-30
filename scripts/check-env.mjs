import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

try {
  const envPath = join(__dirname, '..', '.env');
  const envContent = readFileSync(envPath, 'utf-8');

  const missingVars = requiredEnvVars.filter(varName => {
    const regex = new RegExp(`^${varName}=`, 'm');
    return !regex.test(envContent);
  });

  if (missingVars.length > 0) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error('\x1b[33m%s\x1b[0m', `   - ${varName}`);
    });
    console.error('\x1b[36m%s\x1b[0m', '\nPlease check your .env file and ensure all required variables are set.');
    process.exit(1);
  }

  console.log('\x1b[32m%s\x1b[0m', '✓ Environment variables validated successfully');
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('\x1b[31m%s\x1b[0m', '❌ .env file not found');
    console.error('\x1b[36m%s\x1b[0m', 'Please create a .env file based on .env.example');
    process.exit(1);
  }
  throw error;
}
