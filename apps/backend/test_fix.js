const monthMap = {
  janeiro: '01', fevereiro: '02', março: '03', marco: '03',
  abril: '04', maio: '05', junho: '06', julho: '07',
  agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12'
};

const toDate = (s) => {
  const clean = s.replace(/\s+/g, ' ').trim();
  const parts = clean.split(' ');
  const day = parts[0].padStart(2, '0');
  const monthName = (parts[2] || '').toLowerCase();
  const year = parts[parts.length - 1];
  const month = monthMap[monthName] || '??';
  return `${day}/${month}/${year}`;
};

const months = "12";
let startDateStr = toDate("05 de Maio de 2026");
let endDateStr = toDate("05 de Maio de 2026");

console.log("Original:", startDateStr, "-", endDateStr);

if (startDateStr === endDateStr && Number(months) > 0 && !startDateStr.includes('??')) {
  const [d, m, y] = startDateStr.split('/').map(Number);
  const date = new Date(y, m - 1, d);
  date.setMonth(date.getMonth() + Number(months));
  
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  endDateStr = `${dd}/${mm}/${yyyy}`;
}

console.log("Repaired:", startDateStr, "-", endDateStr);
