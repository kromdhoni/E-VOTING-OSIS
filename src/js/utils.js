export function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h=>h.trim().toLowerCase());
  return lines.slice(1).filter(Boolean).map(line=>{
    const vals = line.split(',').map(v=>v.trim());
    const obj={}; headers.forEach((h,i)=>obj[h]=vals[i]); return obj;
  });
}
export function generateToken() {
  return String(Math.floor(100000 + Math.random()*900000));
}
export function deviceFingerprint() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'node';
  const raw = ua + '|' + Date.now();
  const enc = typeof btoa !== 'undefined' ? btoa(raw) : Buffer.from(raw).toString('base64');
  return enc.slice(0,32);
}
