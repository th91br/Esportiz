const fs = require('fs');
let html = fs.readFileSync('public/landing.html', 'utf8');

const regex = /<div class="mockup-welcome">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
const replacement = `<img src="/screens/dashboard.png" alt="Esportiz Dashboard Real" style="width: 100%; display: block; border-bottom-left-radius: 20px; border-bottom-right-radius: 20px;" />
      </div>
    </div>`;

html = html.replace(regex, replacement);
fs.writeFileSync('public/landing.html', html, 'utf8');
console.log("Hero updated!");
