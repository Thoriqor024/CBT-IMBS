const fs = require('fs');
const t = fs.readFileSync('server/index.js', 'utf8');
const i = t.indexOf("app.post('/api/exams'");
console.log(t.slice(i, i + 15000));