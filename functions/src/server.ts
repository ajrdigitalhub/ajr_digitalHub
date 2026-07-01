import app from './app';

const PORT = 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Modern Backend running on http://0.0.0.0:${PORT}`);
});
