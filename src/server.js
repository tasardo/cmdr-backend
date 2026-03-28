require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { initDb, db } = require('./database/db');
const { notificarRecordatorio, whatsappURLRecordatorio } = require('./utils/notificaciones');

const authRoutes        = require('./routes/auth');
const turnosRoutes      = require('./routes/turnos');
const pacientesRoutes   = require('./routes/pacientes');
const facturacionRoutes = require('./routes/facturacion');
const chatRoutes        = require('./routes/chat');
const archivosRoutes    = require('./routes/archivos');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir el frontend (index.html + api.js) desde la carpeta /public
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/auth',        authRoutes);
app.use('/api/turnos',      turnosRoutes);
app.use('/api/pacientes',   pacientesRoutes);
app.use('/api/facturacion', facturacionRoutes);
app.use('/api/chat',        chatRoutes);
app.use('/api/archivos',    archivosRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Recordatorios pendientes para el panel admin
app.get('/api/recordatorios/pendientes', async (_req, res) => {
  try {
    const manana   = new Date();
    manana.setDate(manana.getDate() + 1);
    const fechaStr = manana.toISOString().slice(0, 10);

    const todos      = await db.getTurnos();
    const pendientes = [];

    for (const t of todos.filter(t => t.fecha === fechaStr && t.estado === 'Confirmado')) {
      if (await db.recordatorioEnviado(t.id)) continue;
      const p      = await db.getPaciente(t.paciente_dni);
      const nombre = p ? p.nombre : t.paciente_dni;
      const tel    = t.telefono || (p ? p.telefono : null);
      pendientes.push({ ...t, paciente_nombre: nombre, paciente_telefono: tel, whatsapp_url: whatsappURLRecordatorio(tel, t, nombre) });
    }
    res.json(pendientes);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Redirigir todo lo demás al index.html (SPA)
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Archivo supera 10MB' });
  res.status(500).json({ error: err.message || 'Error interno' });
});

// Recordatorios automáticos cada hora
async function verificarRecordatorios() {
  const manana   = new Date();
  manana.setDate(manana.getDate() + 1);
  const fechaStr = manana.toISOString().slice(0, 10);

  const todos = await db.getTurnos();
  for (const t of todos.filter(t => t.fecha === fechaStr && t.estado === 'Confirmado')) {
    if (await db.recordatorioEnviado(t.id)) continue;
    const p      = await db.getPaciente(t.paciente_dni);
    const nombre = p ? p.nombre : t.paciente_dni;
    const ok     = await notificarRecordatorio(t, nombre);
    if (ok) {
      await db.marcarRecordatorioEnviado(t.id);
      console.log(`[RECORDATORIO] Email enviado a ${nombre}`);
    }
  }
}

// Iniciar servidor después de conectar a MongoDB
initDb().then(() => {
  app.listen(PORT, () => {
    const emailOk = process.env.EMAIL_USER ? '✅' : '⚠️  configurar en variables de entorno';
    console.log(`\n🏥 CMDR corriendo en http://localhost:${PORT}`);
    console.log(`📧 Email: ${emailOk}\n`);
  });
  setInterval(verificarRecordatorios, 60 * 60 * 1000);
  setTimeout(verificarRecordatorios, 5000);
}).catch(err => {
  console.error('❌ Error conectando a MongoDB:', err.message);
  process.exit(1);
});
