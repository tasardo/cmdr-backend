const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { db }  = require('../database/db');

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'cmdr_secret_key_2025';

// POST /api/auth/paciente
router.post('/paciente', async (req, res) => {
  try {
    const { dni, nacimiento } = req.body;
    if (!dni || !nacimiento) return res.status(400).json({ error: 'DNI y fecha de nacimiento son requeridos' });

    const paciente = await db.getPaciente(dni.trim());
    if (!paciente)                        return res.status(401).json({ error: 'Paciente no encontrado. Contacte a la administración.' });
    if (paciente.nacimiento !== nacimiento) return res.status(401).json({ error: 'Fecha de nacimiento incorrecta' });

    const token = jwt.sign({ dni: paciente.dni, nombre: paciente.nombre, rol: 'paciente' }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, paciente });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/admin
router.post('/admin', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });

    const admin = await db.getAdmin(username);
    if (!admin || !bcrypt.compareSync(password, admin.password)) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign({ id: admin._id, username: admin.username, rol: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, username: admin.username });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
