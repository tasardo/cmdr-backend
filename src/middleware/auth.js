const jwt  = require('jsonwebtoken');
const { db } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'cmdr_secret_key_2025';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso restringido a administradores' });
  }
  next();
}

function adminOrMedico(req, res, next) {
  if (req.user?.rol !== 'admin' && req.user?.rol !== 'medico') {
    return res.status(403).json({ error: 'Acceso restringido a médicos y administradores' });
  }
  next();
}

// Registro de auditoría (Ley 25.326 Art. 9 — trazabilidad de accesos)
function auditMiddleware(accion) {
  return (req, _res, next) => {
    const entry = {
      accion,
      usuario:    req.user?.username || req.user?.dni || 'desconocido',
      rol:        req.user?.rol || '-',
      ip:         req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '-',
      recurso:    req.originalUrl,
      metodo:     req.method,
      params:     JSON.stringify(req.params),
    };
    db.auditLog(entry).catch(() => {}); // no-blocking, no falla si DB está ocupada
    next();
  };
}

module.exports = { authMiddleware, adminOnly, adminOrMedico, auditMiddleware };
