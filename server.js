const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===================== DATA LAYER =====================
function defaultData() {
  return {
    users: [],
    sessions: [],
    sessionTypes: ['Push','Pull','Legs','Full Body','Cardio','HIIT','Stretching'],
    machines: [
      {id:'m1',name:'Développé couché',category:'Poitrine'},
      {id:'m2',name:'Squat',category:'Jambes'},
      {id:'m3',name:'Soulevé de terre',category:'Dos'},
      {id:'m4',name:'Développé militaire',category:'Épaules'},
      {id:'m5',name:'Tirage vertical',category:'Dos'},
      {id:'m6',name:'Curl biceps',category:'Bras'},
      {id:'m7',name:'Extension triceps',category:'Bras'},
      {id:'m8',name:'Pec deck',category:'Poitrine'},
      {id:'m9',name:'Leg press',category:'Jambes'},
      {id:'m10',name:'Leg curl',category:'Jambes'},
      {id:'m11',name:'Rowing barre',category:'Dos'},
      {id:'m12',name:'Crunch machine',category:'Abdos'},
    ],
    weights: {},
    challenges: [],
    likes: {},
  };
}

function loadDB() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const db = JSON.parse(raw);
      const def = defaultData();
      for (const k of Object.keys(def)) { if (!(k in db)) db[k] = def[k]; }
      return db;
    }
  } catch(e) { console.error('Error loading data:', e); }
  return defaultData();
}

function saveDB(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
}

// ===================== API ROUTES =====================

// --- GET all data ---
app.get('/api/data', (req, res) => {
  res.json(loadDB());
});

// --- USERS ---
app.get('/api/users', (req, res) => {
  const db = loadDB();
  res.json(db.users);
});

app.post('/api/users', (req, res) => {
  const db = loadDB();
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nom requis' });
  const colors = ['#6C5CE7','#00cec9','#e17055','#00b894','#fdcb6e','#fd79a8','#0984e3','#e84393'];
  const user = { id: 'u' + Date.now(), name: name.trim(), color: colors[db.users.length % colors.length] };
  db.users.push(user);
  saveDB(db);
  res.status(201).json(user);
});

app.delete('/api/users/:id', (req, res) => {
  const db = loadDB();
  db.users = db.users.filter(u => u.id !== req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

// --- SESSIONS ---
app.get('/api/sessions', (req, res) => {
  const db = loadDB();
  res.json(db.sessions);
});

app.post('/api/sessions', (req, res) => {
  const db = loadDB();
  const session = req.body;
  session.id = session.id || 's' + Date.now();
  session.createdAt = session.createdAt || new Date().toISOString();
  // Remove existing for same user/date
  db.sessions = db.sessions.filter(s => !(s.userId === session.userId && s.date === session.date));
  db.sessions.push(session);
  // Save weight history
  if (session.exercises) {
    session.exercises.forEach(e => {
      const key = session.userId + '_' + e.machineId;
      if (!db.weights[key]) db.weights[key] = [];
      db.weights[key].push({ date: session.date, weight: e.weight, reps: e.reps, sets: e.sets });
    });
  }
  saveDB(db);
  res.status(201).json(session);
});

app.delete('/api/sessions/:id', (req, res) => {
  const db = loadDB();
  db.sessions = db.sessions.filter(s => s.id !== req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

// --- SESSION TYPES ---
app.get('/api/session-types', (req, res) => {
  const db = loadDB();
  res.json(db.sessionTypes);
});

app.post('/api/session-types', (req, res) => {
  const db = loadDB();
  const { name } = req.body;
  if (name && !db.sessionTypes.includes(name)) {
    db.sessionTypes.push(name);
    saveDB(db);
  }
  res.json(db.sessionTypes);
});

app.delete('/api/session-types/:name', (req, res) => {
  const db = loadDB();
  db.sessionTypes = db.sessionTypes.filter(t => t !== req.params.name);
  saveDB(db);
  res.json(db.sessionTypes);
});

// --- MACHINES ---
app.get('/api/machines', (req, res) => {
  const db = loadDB();
  res.json(db.machines);
});

app.post('/api/machines', (req, res) => {
  const db = loadDB();
  const { name, category } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  const machine = { id: 'm' + Date.now(), name, category: category || 'Autre' };
  db.machines.push(machine);
  saveDB(db);
  res.status(201).json(machine);
});

app.delete('/api/machines/:id', (req, res) => {
  const db = loadDB();
  db.machines = db.machines.filter(m => m.id !== req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

// --- WEIGHTS ---
app.get('/api/weights', (req, res) => {
  const db = loadDB();
  res.json(db.weights);
});

// --- CHALLENGES ---
app.get('/api/challenges', (req, res) => {
  const db = loadDB();
  res.json(db.challenges);
});

app.post('/api/challenges', (req, res) => {
  const db = loadDB();
  const challenge = req.body;
  challenge.id = challenge.id || 'c' + Date.now();
  db.challenges.push(challenge);
  saveDB(db);
  res.status(201).json(challenge);
});

app.delete('/api/challenges/:id', (req, res) => {
  const db = loadDB();
  db.challenges = db.challenges.filter(c => c.id !== req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

// --- LIKES ---
app.post('/api/likes/:sessionId', (req, res) => {
  const db = loadDB();
  const { userId } = req.body;
  const sid = req.params.sessionId;
  if (!db.likes[sid]) db.likes[sid] = [];
  const idx = db.likes[sid].indexOf(userId);
  if (idx >= 0) db.likes[sid].splice(idx, 1);
  else db.likes[sid].push(userId);
  saveDB(db);
  res.json(db.likes[sid]);
});

// --- Serve frontend ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🏋️  GymSquad lancé sur http://localhost:${PORT}\n`);
});
