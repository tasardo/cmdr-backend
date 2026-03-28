const express = require('express');
const { db }  = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const RESPUESTAS = [
  { palabras: ['turno','reservar','sacar','pedir'],   respuesta: 'Para reservar un turno andá a "Nuevo Turno" en el menú. Tené lista tu orden médica en JPG, PNG o PDF.' },
  { palabras: ['cancelar','anular'],                  respuesta: 'Para cancelar un turno entrá a "Mis Turnos" y seleccioná el que querés cancelar. Hacelo con al menos 24hs de anticipación.' },
  { palabras: ['orden','médica','medica','receta'],   respuesta: 'Necesitás una orden médica firmada. Podés subirla en JPG, PNG o PDF al reservar el turno.' },
  { palabras: ['preparación','preparacion','ayuno'],  respuesta: 'La preparación varía según el estudio. Centellograma Óseo: 2hs de ayuno. Tiroideo: suspender medicación tiroidea 4 semanas antes. Tu médico te indicará lo específico.' },
  { palabras: ['resultado','informe'],                respuesta: 'Los resultados estarán en "Mis Estudios" dentro de 48-72hs hábiles. También te avisamos por email.' },
  { palabras: ['horario','atencion','atención'],      respuesta: 'Atendemos lunes a viernes de 8:00 a 13:00hs.' },
  { palabras: ['oisfa','cobertura','obra social'],    respuesta: 'Trabajamos con OISFA y en forma particular.' },
  { palabras: ['hola','buenas','buen día'],           respuesta: '¡Hola! Soy el asistente del CMDR. ¿En qué te puedo ayudar?' },
];

function respuestaAuto(msg) {
  const lower = msg.toLowerCase();
  for (const r of RESPUESTAS) if (r.palabras.some(p => lower.includes(p))) return r.respuesta;
  return 'Gracias por tu consulta. Un agente se comunicará a la brevedad. WhatsApp: 1150232010 (Lun–Vie 8:00–13:00hs).';
}

router.get('/', authMiddleware, async (req, res) => {
  try { res.json(await db.getChatByDni(req.user.dni || null)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { mensaje } = req.body;
    if (!mensaje?.trim()) return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    const dni = req.user.rol === 'paciente' ? req.user.dni : null;
    await db.insertChat({ paciente_dni: dni, rol: req.user.rol, mensaje: mensaje.trim() });
    const respuesta = respuestaAuto(mensaje);
    await db.insertChat({ paciente_dni: dni, rol: 'bot', mensaje: respuesta });
    res.status(201).json({ enviado: mensaje.trim(), respuesta });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
