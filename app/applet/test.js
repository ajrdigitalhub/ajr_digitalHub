const fs = require('fs');
const path = require('path');

function findFiles(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          if (!filePath.includes('/proc') && !filePath.includes('/sys') && !filePath.includes('/dev') && !filePath.includes('/node_modules') && !filePath.includes('/opt/npm-cache') && !filePath.includes('/var/lib') && !filePath.includes('/usr') && !filePath.includes('/root') && !filePath.includes('/etc')) {
            results = results.concat(findFiles(filePath));
          }
        } else if (file === 'server.ts' || file === 'angular.json' || file === 'package.json') {
          results.push(filePath);
        }
      } catch (e) {}
    });
  } catch (e) {}
  return results;
}

console.log('Found files:', findFiles('/'));
