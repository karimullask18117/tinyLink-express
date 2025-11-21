// JSON-backed data layer (fallback to avoid native sqlite builds).
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace('sqlite:', '').replace(/\.db$/,'') : path.join(__dirname, 'data');
const dir = path.dirname(path.join(dbPath, 'tinylink.json')) === '.' ? path.join(__dirname, 'data') : path.dirname(path.join(dbPath, 'tinylink.json'));
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, 'tinylink.json');

let state = { lastId: 0, links: [] };
if (fs.existsSync(file)) {
  try { state = JSON.parse(fs.readFileSync(file, 'utf8') || '{}'); }
  catch (e) { state = { lastId: 0, links: [] }; }
}

function save() { fs.writeFileSync(file, JSON.stringify(state, null, 2)); }

const CODE_RE = /^[A-Za-z0-9]{6,8}$/;

function validateUrl(s) {
  try {
    const u = new URL(s);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    return true;
  } catch (e) { return false; }
}

function findByCode(code) {
  return state.links.find(l => l.code === code && l.deleted === 0);
}

module.exports = {
  createLink: (url, code) => {
    if (!validateUrl(url)) throw new Error('invalid url');
    let finalCode = code;
    if (finalCode) {
      if (!CODE_RE.test(finalCode)) throw new Error('invalid code format');
      const exist = findByCode(finalCode);
      if (exist) { const e = new Error('code exists'); e.code = 'EEXISTS'; throw e; }
    } else {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let c;
      for (let attempt = 0; attempt < 20; attempt++) {
        c = Array.from({ length: 7 }).map(() => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
        if (!findByCode(c)) { finalCode = c; break; }
      }
      if (!finalCode) throw new Error('could not generate unique code');
    }
    state.lastId = (state.lastId || 0) + 1;
    const now = new Date().toISOString();
    const row = { id: state.lastId, code: finalCode, url, clicks: 0, last_clicked: null, created_at: now, deleted: 0 };
    state.links.push(row);
    save();
    return { code: row.code, url: row.url, clicks: row.clicks, last_clicked: row.last_clicked, created_at: row.created_at };
  },
  listLinks: () => {
    return state.links.filter(l => l.deleted === 0).map(l => ({ code: l.code, url: l.url, clicks: l.clicks, last_clicked: l.last_clicked, created_at: l.created_at })).sort((a,b)=> b.created_at.localeCompare(a.created_at));
  },
  getLink: (code) => {
    if (!CODE_RE.test(code)) return null;
    const l = findByCode(code);
    if (!l) return null;
    return { code: l.code, url: l.url, clicks: l.clicks, last_clicked: l.last_clicked, created_at: l.created_at };
  },
  deleteLink: (code) => {
    const l = state.links.find(l => l.code === code && l.deleted === 0);
    if (!l) return false;
    l.deleted = 1;
    save();
    return true;
  },
  incrementClick: (code) => {
    const l = state.links.find(l => l.code === code && l.deleted === 0);
    if (!l) return;
    l.clicks = (l.clicks || 0) + 1;
    l.last_clicked = new Date().toISOString();
    save();
  }
};
