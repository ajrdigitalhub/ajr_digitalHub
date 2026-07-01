import axios from 'axios';

async function test() {
  const projectId = 'godofmobil';
  
  // Try default RTDB URLs
  const rtdbUrls = [
    `https://${projectId}-default-rtdb.firebaseio.com/.json`,
    `https://${projectId}-default-rtdb.asia-southeast1.firebasedatabase.app/.json`,
    `https://${projectId}.firebaseio.com/.json`
  ];

  for (const url of rtdbUrls) {
    try {
      console.log(`Querying RTDB URL: ${url}...`);
      const res = await axios.get(url, { timeout: 5000 });
      console.log(`SUCCESS querying RTDB at ${url}!`);
      console.log('Data:', JSON.stringify(res.data).substring(0, 500));
    } catch (err: any) {
      console.error(`Error querying RTDB at ${url}:`, err.response?.status || err.message);
    }
  }
}

test();
