import dotenv from 'dotenv';
dotenv.config();

const REQUIRED_ENV_VARS = [
  'WA_VERIFY_TOKEN',
  'WA_ACCESS_TOKEN',
  'WA_PHONE_NUMBER_ID',
  'APP_SECRET'
];

const missingVars = REQUIRED_ENV_VARS.filter(key => !process.env[key]);

if (missingVars.length > 0) {
  throw new Error(
    `[CRITICAL STARTUP ERROR] Missing required WhatsApp environment variables: ${missingVars.join(', ')}. Please verify your .env file.`
  );
}

export const whatsappConfig = {
  verifyToken: process.env.WA_VERIFY_TOKEN || '',
  accessToken: process.env.WA_ACCESS_TOKEN || '',
  phoneNumberId: process.env.WA_PHONE_NUMBER_ID || '',
  appSecret: process.env.APP_SECRET || '',
  graphUrl: 'https://graph.facebook.com/v20.0'
};
