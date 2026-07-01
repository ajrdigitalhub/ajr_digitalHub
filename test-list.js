const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            /* recurse */
            if (!file.includes('node_modules') && !file.includes('.angular')) {
                results.push(file);
                results = results.concat(walk(file));
            }
        } else { 
            results.push(file);
        }
    });
    return results;
}

try {
    console.log("FILES UNDER /app/applet:");
    console.log(walk('/app/applet').join('\n'));
} catch (e) {
    console.error(e);
}
