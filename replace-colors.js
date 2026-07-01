const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src/app', function(filePath) {
  if (filePath.endsWith('.html') || filePath.endsWith('.ts') || filePath.endsWith('.scss')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Replace text colors
    content = content.replace(/text-slate-(100|200|300)/g, 'text-app-text');
    content = content.replace(/text-slate-(700|800|900)/g, 'text-app-text');
    content = content.replace(/text-white/g, 'text-app-text');
    content = content.replace(/text-black/g, 'text-app-text');
    
    // Replace background colors that are used as cards
    content = content.replace(/bg-slate-(800)/g, 'bg-app-card');
    
    // Replace borders
    content = content.replace(/border-slate-(700|800|900|950)/g, 'border-app-border');
    
    // Replace hover states
    content = content.replace(/hover:bg-slate-800\/30/g, 'hover:bg-app-bg');
    content = content.replace(/hover:bg-slate-(700|800)/g, 'hover:bg-app-bg');
    content = content.replace(/hover:text-white/g, 'hover:text-app-text');
    
    // Fix missing closing braces from unescaped replace
    
    if (original !== content) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
