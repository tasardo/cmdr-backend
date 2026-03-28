const express = require('express');
const { db }  = require('../database/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router  = express.Router();
const PRECIOS = {
  'Centellograma Óseo':     { OISFA: 549676,  Particular: 549676  },
  'Centellograma Cardíaco': { OISFA: 986628,  Particular: 986628  },
  'Centellograma Tiroideo': { OISFA: 322534,  Particular: 322534  },
  'SPECT Cerebral':         { OISFA: 1096695, Particular: 1096695 },
};

router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const mes    = req.query.mes || new Date().toISOString().slice(0, 7);
    const turnos = (await db.getTurnos()).filter(t => t.fecha && t.fecha.startsWith(mes));

    function stats(cob) {
      const sub  = turnos.filter(t => t.cobertura === cob);
      const conf = sub.filter(t => t.estado === 'Confirmado');
      const monto = conf.reduce((s, t) => s + (PRECIOS[t.estudio]?.[cob] || 80000), 0);
      return { cantidad: sub.length, realizados: conf.length, pendientes: sub.filter(t => t.estado === 'Pendiente de autorización').length, cancelados: sub.filter(t => t.estado === 'Denegado').length, monto };
    }

    res.json({ mes, totales: { total: turnos.length, realizados: turnos.filter(t => t.estado === 'Confirmado').length }, oisfa: stats('OISFA'), particular: stats('Particular') });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/turnos', authMiddleware, adminOnly, async (req, res) => {
  try {
    const mes = req.query.mes || new Date().toISOString().slice(0, 7);
    const cob = req.query.cobertura;
    let turnos = (await db.getTurnos()).filter(t => t.fecha && t.fecha.startsWith(mes) && t.estado === 'Confirmado');
    if (cob) turnos = turnos.filter(t => t.cobertura === cob);
    res.json(turnos);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
