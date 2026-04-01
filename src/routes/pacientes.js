const express = require('express');
const { db }  = require('../database/db');
const { authMiddleware, adminOnly, adminOrMedico } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, adminOrMedico, async (req, res) => {
  try { res.json(await db.getPacientes()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:dni', authMiddleware, async (req, res) => {
  try {
    const { dni } = req.params;
    if (req.user.rol === 'paciente' && req.user.dni !== dni) return res.status(403).json({ error: 'Acceso denegado' });
    const paciente = await db.getPaciente(dni);
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json(paciente);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { dni, nombre, nacimiento, email, telefono, cobertura } = req.body;
    if (!dni || !nombre || !nacimiento) return res.status(400).json({ error: 'DNI, nombre y nacimiento son requeridos' });
    if (await db.getPaciente(dni)) return res.status(409).json({ error: 'Ya existe un paciente con ese DNI' });
    res.status(201).json(await db.insertPaciente({ dni, nombre, nacimiento, email: email||null, telefono: telefono||null, cobertura: cobertura||'Particular' }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:dni', authMiddleware, async (req, res) => {
  try {
    const { dni } = req.params;
    if (req.user.rol === 'paciente' && req.user.dni !== dni) return res.status(403).json({ error: 'Acceso denegado' });
    if (!await db.getPaciente(dni)) return res.status(404).json({ error: 'Paciente no encontrado' });
    const { nombre, nacimiento, email, telefono, cobertura } = req.body;
    const changes = {};
    if (nombre     !== undefined) changes.nombre     = nombre;
    if (nacimiento !== undefined) changes.nacimiento = nacimiento;
    if (email      !== undefined) changes.email      = email;
    if (telefono   !== undefined) changes.telefono   = telefono;
    if (cobertura  !== undefined) changes.cobertura  = cobertura;
    res.json(await db.updatePaciente(dni, changes));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:dni', authMiddleware, adminOnly, async (req, res) => {
  try {
    if (!await db.getPaciente(req.params.dni)) return res.status(404).json({ error: 'Paciente no encontrado' });
    await db.deletePaciente(req.params.dni);
    res.json({ message: 'Paciente eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
