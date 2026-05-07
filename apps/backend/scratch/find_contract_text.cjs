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
        if (data.text.includes('Caboclos')) {
          console.log(`FOUND IN: ${file}`);
          fs.writeFileSync(path.join(process.cwd(), 'scratch/caboclos_text.txt'), data.text);
          return;
        }
      } catch (e) {}
    }
  }
  console.log('NOT FOUND');
}

main().catch(console.error);
