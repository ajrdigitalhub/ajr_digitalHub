import * as fs from 'fs';
import * as path from 'path';

const apiFilePath = 'C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\firebase-tools\\lib\\api.js';
if (fs.existsSync(apiFilePath)) {
  const content = fs.readFileSync(apiFilePath, 'utf8');
  console.log('File found. Searching for clientId...');
  
  // Let's print out the file lines containing clientId or clientSecret
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('clientId') || line.includes('clientSecret') || line.includes('client_id')) {
      console.log(`Line ${idx + 1}: ${line.trim().substring(0, 150)}`);
    }
  });
} else {
  console.log('api.js file not found.');
}
