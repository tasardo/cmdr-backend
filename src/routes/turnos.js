const express = require('express');
const { db }  = require('../database/db');
const { authMiddleware, adminOnly, auditMiddleware } = require('../middleware/auth');
const { notificarConfirmacion, notificarAprobacion, notificarDenegado, notificarRevisar, whatsappURLConfirmacion, whatsappURLDenegado, whatsappURLRevisar, googleCalendarURL } = require('../utils/notificaciones');

const router   = express.Router();
const HORARIOS = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00'];

async function conNombre(t) {
  const p = await db.getPaciente(t.paciente_dni);
  return { ...t, paciente_nombre: p ? p.nombre : t.paciente_dni, paciente_telefono: p ? p.telefono : null };
}

// GET /api/turnos
router.get('/', authMiddleware, auditMiddleware('ver_turnos'), async (req, res) => {
  try {
    let turnos;
    if (req.user.rol === 'admin' || req.user.rol === 'medico') {
      turnos = await db.getTurnos();
      if (req.query.dni) {
        const qDni = req.query.dni.replace(/\./g, '');
        turnos = turnos.filter(t => (t.paciente_dni || '').replace(/\./g, '') === qDni);
      }
    } else {
      turnos = await db.getTurnosByDni(req.user.dni);
    }
    res.json(await Promise.all(turnos.map(conNombre)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/turnos/horarios/disponibles?fecha=YYYY-MM-DD
router.get('/horarios/disponibles', authMiddleware, async (req, res) => {
  try {
    const { fecha } = req.query;
    if (!fecha) return res.status(400).json({ error: 'Se requiere parámetro fecha' });
    const todos    = await db.getTurnos();
    const ocupados = todos.filter(t => t.fecha === fecha && t.estado !== 'Denegado').map(t => t.hora);
    res.json({ fecha, disponibles: HORARIOS.filter(h => !ocupados.includes(h)), ocupados });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/turnos/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const turno = await db.getTurno(parseInt(req.params.id));
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });
    if (req.user.rol === 'paciente' && turno.paciente_dni !== req.user.dni) return res.status(403).json({ error: 'Acceso denegado' });
    res.json(await conNombre(turno));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/turnos
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { estudio, fecha, hora, cobertura, email, telefono, orden_archivo, peso, altura, edad, sexo, alergias, medicacion, antecedentes, motivo } = req.body;
    const paciente_dni = req.user.rol === 'admin' ? req.body.paciente_dni : req.user.dni;

    if (!paciente_dni || !estudio || !fecha || !hora) return res.status(400).json({ error: 'Faltan campos obligatorios' });
    if (!await db.getPaciente(paciente_dni)) return res.status(404).json({ error: 'Paciente no encontrado' });

    const todos = await db.getTurnos();
    const conflicto = todos.find(t => t.fecha === fecha && t.hora === hora && t.estado !== 'Denegado');
    if (conflicto) return res.status(409).json({ error: 'Ya existe un turno en ese horario. Elija otro.' });

    const nuevo = await db.insertTurno({ paciente_dni, estudio, fecha, hora, estado: 'Pendiente de autorización', cobertura: cobertura||null, email: email||null, telefono: telefono||null, orden_archivo: orden_archivo||null, peso: peso||null, altura: altura||null, edad: edad||null, sexo: sexo||null, alergias: alergias||null, medicacion: medicacion||null, antecedentes: antecedentes||null, motivo: motivo||null });
    res.status(201).json(await conNombre(nuevo));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/turnos/:id
router.put('/:id', authMiddleware, auditMiddleware('modificar_turno'), async (req, res) => {
  try {
    const id    = parseInt(req.params.id);
    const turno = await db.getTurno(id);
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });

    if (req.user.rol === 'paciente') {
      if (turno.paciente_dni !== req.user.dni) return res.status(403).json({ error: 'Acceso denegado' });
      if (req.body.estado && req.body.estado !== 'Denegado') return res.status(403).json({ error: 'Solo podés cancelar turnos' });
    }

    const allowed = ['estado','fecha','hora','cobertura','email','telefono','peso','altura','edad','sexo','alergias','medicacion','antecedentes','motivo','orden_archivo'];
    const changes = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) changes[k] = req.body[k]; });

    const updated  = await db.updateTurno(id, changes);
    const enriched = await conNombre(updated);

    // Notificaciones automáticas al cambiar estado
    if (changes.estado && changes.estado !== turno.estado) {
      const p      = await db.getPaciente(updated.paciente_dni);
      const nombre = p ? p.nombre : updated.paciente_dni;
      const tel    = updated.telefono || (p ? p.telefono : null);

      if (changes.estado === 'Confirmado') {
        notificarConfirmacion(updated, nombre).catch(e => console.error('[EMAIL Confirmado]', e.message));
        enriched.whatsapp_url      = whatsappURLConfirmacion(tel, updated, nombre);
        enriched.calendar_url      = googleCalendarURL(updated, nombre);
      }
      if (changes.estado === 'Aprobado') {
        notificarAprobacion(updated, nombre).catch(e => console.error('[EMAIL Aprobado]', e.message));
        enriched.whatsapp_url = whatsappURLConfirmacion(tel, updated, nombre);
      }
      if (changes.estado === 'Denegado') {
        notificarDenegado(updated, nombre).catch(e => console.error('[EMAIL Denegado]', e.message));
        enriched.whatsapp_url = whatsappURLDenegado(tel, updated, nombre);
      }
      if (changes.estado === 'Revisar') {
        notificarRevisar(updated, nombre).catch(e => console.error('[EMAIL Revisar]', e.message));
        enriched.whatsapp_url = whatsappURLRevisar(tel, updated, nombre);
      }
    }

    res.json(enriched);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/turnos/:id
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!await db.getTurno(id)) return res.status(404).json({ error: 'Turno no encontrado' });
    await db.deleteTurno(id);
    res.json({ message: 'Turno eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
