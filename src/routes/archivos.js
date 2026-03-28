const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Solo se permiten archivos JPG, PNG o PDF'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// POST /api/archivos/upload  — subir orden médica
router.post('/upload', authMiddleware, upload.single('orden'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo' });
  }

  res.status(201).json({
    filename: req.file.filename,
    originalname: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
    url: `/api/archivos/${req.file.filename}`,
  });
});

// GET /api/archivos/:filename  — descargar/ver archivo
router.get('/:filename', authMiddleware, (req, res) => {
  // Sanitizar nombre para evitar path traversal
  const filename = path.basename(req.params.filename);
  const filepath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }

  res.sendFile(filepath);
});

// DELETE /api/archivos/:filename  — solo admin
router.delete('/:filename', authMiddleware, (req, res) => {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo administradores pueden eliminar archivos' });
  }

  const filename = path.basename(req.params.filename);
  const filepath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }

  fs.unlinkSync(filepath);
  res.json({ message: 'Archivo eliminado' });
});

module.exports = router;
