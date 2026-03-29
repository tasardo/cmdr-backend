const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { db }  = require('../database/db');

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'cmdr_secret_key_2025';

// POST /api/auth/paciente
// Si el paciente no existe, se registra automáticamente con su DNI y fecha de nacimiento
router.post('/paciente', async (req, res) => {
  try {
    const { dni, nacimiento, nombre } = req.body;
    if (!dni || !nacimiento) return res.status(400).json({ error: 'DNI y fecha de nacimiento son requeridos' });

    let paciente = await db.getPaciente(dni.trim());

    if (!paciente) {
      // Auto-registro: crear el paciente con los datos que trajo
      paciente = await db.insertPaciente({
        dni:        dni.trim(),
        nacimiento: nacimiento,
        nombre:     nombre || 'Paciente ' + dni.trim(),
        email:      '',
        telefono:   '',
        cobertura:  'Particular',
      });
    } else {
      // Paciente existente: verificar fecha de nacimiento
      if (paciente.nacimiento !== nacimiento) {
        return res.status(401).json({ error: 'Fecha de nacimiento incorrecta' });
      }
    }

    const token = jwt.sign({ dni: paciente.dni, nombre: paciente.nombre, rol: 'paciente' }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, paciente });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/admin  (también maneja médicos — el rol viene del campo 'rol' en la DB)
router.post('/admin', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });

    const admin = await db.getAdmin(username);
    if (!admin || !bcrypt.compareSync(password, admin.password)) return res.status(401).json({ error: 'Credenciales inválidas' });

    const rol = admin.rol || 'admin';
    const token = jwt.sign({ id: admin._id, username: admin.username, nombre: admin.nombre || admin.username, rol }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, username: admin.username, nombre: admin.nombre || admin.username, rol });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
