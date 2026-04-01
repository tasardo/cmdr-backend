const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const jwt      = require('jsonwebtoken');
const { authMiddleware } = require('../middleware/auth');
const db = require('../database/db');

const router = express.Router();

// ── Configuración Cloudinary ──────────────────────────────────
const cloudinaryOk = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

if (cloudinaryOk) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// ── Storage: Cloudinary si está configurado, disco local si no ──
let upload;
if (cloudinaryOk) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder:         'cmdr-ordenes',
      resource_type:  'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    },
  });
  upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
} else {
  // Fallback: disco local (solo para desarrollo)
  const UPLOADS_DIR = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
      filename:    (_req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ['.jpg','.jpeg','.png','.pdf'];
      allowed.includes(path.extname(file.originalname).toLowerCase()) ? cb(null,true) : cb(new Error('Solo JPG, PNG o PDF'));
    },
  });
}

// POST /api/archivos/upload
router.post('/upload', authMiddleware, upload.single('orden'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

  // Cloudinary devuelve req.file.path como URL pública
  // Disco local devuelve req.file.filename
  const url      = req.file.path || `/api/archivos/${req.file.filename}`;
  const filename = cloudinaryOk ? req.file.filename : req.file.filename;

  res.status(201).json({
    filename: cloudinaryOk ? req.file.path : req.file.filename, // guardamos la URL completa si es Cloudinary
    url,
    originalname: req.file.originalname,
    size: req.file.size,
  });
});

// POST /api/archivos/informe/:turnoId — médico/admin sube informe al turno
router.post('/informe/:turnoId', authMiddleware, upload.single('informe'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });
  if (req.user?.rol !== 'medico' && req.user?.rol !== 'admin')
    return res.status(403).json({ error: 'Solo médicos o administradores pueden subir informes' });
  try {
    const id = parseInt(req.params.turnoId);
    const turno = await db.getTurno(id);
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });
    const filename = cloudinaryOk ? req.file.path : req.file.filename;
    await db.updateTurno(id, { informe_archivo: filename });
    res.json({ ok: true, informe_archivo: filename });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/archivos/:filename — solo para fallback local
// (Cloudinary: la URL ya está guardada directamente en MongoDB)
const JWT_SECRET = process.env.JWT_SECRET || 'cmdr_secret_key_2025';
router.get('/:filename', (req, res) => {
  const raw = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (!raw) return res.status(401).json({ error: 'No autorizado' });
  try { jwt.verify(raw, JWT_SECRET); } catch { return res.status(401).json({ error: 'Token inválido' }); }

  const UPLOADS_DIR = path.join(__dirname, '../../uploads');
  const filename    = path.basename(req.params.filename);
  const filepath    = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Archivo no encontrado' });

  if (req.query.download === '1') res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.sendFile(filepath);
});

module.exports = router;
