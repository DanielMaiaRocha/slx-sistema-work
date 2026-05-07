const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function main() {
  const uploadsDir = path.join(process.cwd(), 'public/uploads');
  const files = fs.readdirSync(uploadsDir);
  
  for (const file of files) {
    if (file.toLowerCase().endsWith('.pdf')) {
      const dataBuffer = fs.readFileSync(path.join(uploadsDir, file));
      try {
        const data = await pdf(dataBuffer);
        if (data.text.includes('Caboclos') && data.text.includes('30')) {
          console.log(`FOUND POTENTIAL MATCH: ${file}`);
          // Extract a bit of context around 'valor'
          const rentIdx = data.text.toLowerCase().indexOf('valor');
          if (rentIdx !== -1) {
            console.log('CONTEXT:', data.text.substring(rentIdx, rentIdx + 100));
          }
        }
      } catch (e) {}
    }
  }
}

main().catch(console.error);
