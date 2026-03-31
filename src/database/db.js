const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cmdr';
let _db = null;

async function connect() {
  if (_db) return _db;
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  _db = client.db('cmdr');
  console.log('[DB] Conectado a MongoDB');
  return _db;
}

// Auto-increment ID para turnos
async function nextId(colName) {
  const mdb = await connect();
  const res = await mdb.collection('counters').findOneAndUpdate(
    { _id: colName },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return res.seq;
}

const db = {
  // ── PACIENTES ──────────────────────────────────────────────
  async getPacientes() {
    const mdb = await connect();
    return mdb.collection('pacientes').find().sort({ nombre: 1 }).toArray();
  },
  async getPaciente(dni) {
    const mdb = await connect();
    return mdb.collection('pacientes').findOne({ dni }) || null;
  },
  async insertPaciente(p) {
    const mdb = await connect();
    await mdb.collection('pacientes').insertOne(p);
    return p;
  },
  async updatePaciente(dni, changes) {
    const mdb = await connect();
    const res = await mdb.collection('pacientes').findOneAndUpdate(
      { dni },
      { $set: changes },
      { returnDocument: 'after' }
    );
    return res || null;
  },
  async deletePaciente(dni) {
    const mdb = await connect();
    await mdb.collection('pacientes').deleteOne({ dni });
  },

  // ── ADMINS ────────────────────────────────────────────────
  async getAdmin(username) {
    const mdb = await connect();
    return mdb.collection('admins').findOne({ username }) || null;
  },

  // ── TURNOS ────────────────────────────────────────────────
  async getTurnos() {
    const mdb = await connect();
    return mdb.collection('turnos').find().sort({ fecha: 1, hora: 1 }).toArray();
  },
  async getTurno(id) {
    const mdb = await connect();
    return mdb.collection('turnos').findOne({ id }) || null;
  },
  async getTurnosByDni(dni) {
    const mdb = await connect();
    return mdb.collection('turnos').find({ paciente_dni: dni }).sort({ fecha: 1, hora: 1 }).toArray();
  },
  async insertTurno(t) {
    const mdb = await connect();
    const id  = await nextId('turnos');
    const now = new Date().toISOString();
    const item = { ...t, id, created_at: now, updated_at: now };
    await mdb.collection('turnos').insertOne(item);
    return item;
  },
  async updateTurno(id, changes) {
    const mdb = await connect();
    const res = await mdb.collection('turnos').findOneAndUpdate(
      { id },
      { $set: { ...changes, updated_at: new Date().toISOString() } },
      { returnDocument: 'after' }
    );
    return res || null;
  },
  async deleteTurno(id) {
    const mdb = await connect();
    await mdb.collection('turnos').deleteOne({ id });
  },

  // ── CHAT ─────────────────────────────────────────────────
  async getChatByDni(dni) {
    const mdb = await connect();
    return mdb.collection('chat').find({ paciente_dni: dni }).sort({ created_at: 1 }).toArray();
  },
  async insertChat(m) {
    const mdb = await connect();
    const id  = await nextId('chat');
    const item = { ...m, id, created_at: new Date().toISOString() };
    await mdb.collection('chat').insertOne(item);
    return item;
  },

  // ── AUDIT LOG (Ley 25.326 Art. 9 — trazabilidad) ──────────
  async auditLog(entry) {
    const mdb = await connect();
    await mdb.collection('auditlog').insertOne({
      ...entry,
      timestamp: new Date().toISOString(),
    });
  },
  async getAuditLog(filtro = {}) {
    const mdb = await connect();
    return mdb.collection('auditlog').find(filtro).sort({ timestamp: -1 }).limit(200).toArray();
  },

  // ── RECORDATORIOS ─────────────────────────────────────────
  async recordatorioEnviado(turnoId) {
    const mdb = await connect();
    return !!(await mdb.collection('recordatorios_enviados').findOne({ turnoId }));
  },
  async marcarRecordatorioEnviado(turnoId) {
    const mdb = await connect();
    await mdb.collection('recordatorios_enviados').updateOne(
      { turnoId },
      { $set: { turnoId, fecha: new Date().toISOString() } },
      { upsert: true }
    );
  },
};

async function initDb() {
  const mdb = await connect();

  // Admin por defecto
  const adminExiste = await mdb.collection('admins').findOne({ username: 'admin' });
  if (!adminExiste) {
    const hashed = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'cmdr2025', 10);
    await mdb.collection('admins').insertOne({ username: 'admin', password: hashed, rol: 'admin', nombre: 'Administrador' });
    console.log('[DB] Admin creado: admin / cmdr2025');
  }
  // Médico de ejemplo
  const medicoExiste = await mdb.collection('admins').findOne({ username: 'dr.garcia' });
  if (!medicoExiste) {
    const hashed = bcrypt.hashSync('medico2025', 10);
    await mdb.collection('admins').insertOne({ username: 'dr.garcia', password: hashed, rol: 'medico', nombre: 'Dr. García' });
    console.log('[DB] Médico creado: dr.garcia / medico2025');
  }

  // Pacientes de muestra
  const pacCount = await mdb.collection('pacientes').countDocuments();
  if (pacCount === 0) {
    await mdb.collection('pacientes').insertMany([
      { dni: '12.345.678', nombre: 'Juan Carlos García',   nacimiento: '1980-05-15', email: 'juan.garcia@email.com',      telefono: '1155550001', cobertura: 'OISFA' },
      { dni: '23.456.789', nombre: 'María Elena López',    nacimiento: '1975-03-22', email: 'maria.lopez@email.com',      telefono: '1155550002', cobertura: 'Particular' },
      { dni: '34.567.890', nombre: 'Roberto Martínez',     nacimiento: '1965-11-08', email: 'roberto.martinez@email.com', telefono: '1155550003', cobertura: 'OISFA' },
      { dni: '45.678.901', nombre: 'Ana Beatriz Torres',   nacimiento: '1990-07-30', email: 'ana.torres@email.com',       telefono: '1155550004', cobertura: 'Particular' },
    ]);
    console.log('[DB] Pacientes de muestra creados');
  }

  // Turnos de muestra
  const turCount = await mdb.collection('turnos').countDocuments();
  if (turCount === 0) {
    const now = new Date().toISOString();
    await mdb.collection('turnos').insertMany([
      { id:1, paciente_dni:'12.345.678', estudio:'Centellograma Óseo',     fecha:'2026-04-10', hora:'09:00', estado:'Confirmado',                cobertura:'OISFA',      email:'juan.garcia@email.com',      telefono:'1155550001', peso:75, altura:175, edad:45, sexo:'Masculino', alergias:'Ninguna', medicacion:'Ninguna', antecedentes:'', motivo:'Control oncológico',   orden_archivo:null, created_at:now, updated_at:now },
      { id:2, paciente_dni:'23.456.789', estudio:'Centellograma Tiroideo', fecha:'2026-04-11', hora:'10:00', estado:'Pendiente de autorización', cobertura:'Particular', email:'maria.lopez@email.com',      telefono:'1155550002', peso:62, altura:160, edad:50, sexo:'Femenino',  alergias:'Ninguna', medicacion:'Ninguna', antecedentes:'', motivo:'Nódulo tiroideo',       orden_archivo:null, created_at:now, updated_at:now },
      { id:3, paciente_dni:'34.567.890', estudio:'SPECT Cerebral',         fecha:'2026-04-12', hora:'08:30', estado:'Aprobado',                  cobertura:'OISFA',      email:'roberto.martinez@email.com', telefono:'1155550003', peso:82, altura:178, edad:60, sexo:'Masculino', alergias:'Ninguna', medicacion:'Ninguna', antecedentes:'', motivo:'Evaluación perfusión', orden_archivo:null, created_at:now, updated_at:now },
      { id:4, paciente_dni:'45.678.901', estudio:'Centellograma Cardíaco', fecha:'2026-04-12', hora:'11:00', estado:'Pendiente de autorización', cobertura:'Particular', email:'ana.torres@email.com',       telefono:'1155550004', peso:58, altura:162, edad:35, sexo:'Femenino',  alergias:'Ninguna', medicacion:'Ninguna', antecedentes:'', motivo:'Evaluación isquemia',  orden_archivo:null, created_at:now, updated_at:now },
    ]);
    // Inicializar contador
    await mdb.collection('counters').updateOne(
      { _id: 'turnos' }, { $set: { seq: 4 } }, { upsert: true }
    );
    await mdb.collection('counters').updateOne(
      { _id: 'chat' }, { $set: { seq: 0 } }, { upsert: true }
    );
    console.log('[DB] Turnos de muestra creados');
  }
}

module.exports = { db, initDb };
