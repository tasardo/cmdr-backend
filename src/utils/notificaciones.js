const nodemailer = require('nodemailer');

// ── Precios Particular (actualizá estos valores cuando quieras) ───────────
const PRECIOS_PARTICULAR = {
  'Centello. OseoTotal':        549676,
  'Centello. OseoParcial':      549676,
  'Centellograma Óseo':         549676,
  'CentrlloTiroideo':           322534,
  'Centellograma Tiroideo':     322534,
  'CaptacionTiroideo':          117356,
  'PerfMiocR/S':                986628,
  'Centellograma Cardíaco':     986628,
  'SPECTCerebro':              1096695,
  'SPECT Cerebral':            1096695,
  'SPECTOseo':                  764030,
  'SPECTTiroid':               1070301,
  'SPECTParatir':              1620573,
  'SPECTPerR/S':                986628,
  'CentCerebral':               549676,
  'Centello. RenalDMSA':        549676,
  'Centello. RenalDTPArrg':     963351,
  'Centello. PerfPulmon(Q)':    549676,
  'Centello.VentPulmon (V)':    863947,
  'Centello. Salivares':        420484,
  'Centello. Hepatico':         549676,
  'Centello. Linfografia':      986939,
  'Centello. ParatirSustrac':  1187208,
  'Cisternografia':             552928,
  'ReflujoGE':                  549676,
  'VaciamiG Gastrico':          549676,
  'TestVesicula':               552928,
  'Ergometria':                  12755,
  'SPECTHigPoo':                764030,
  'SPECTPulmon':                764030,
  'SPECT/CT (x region)':       1010768,
  'SPECT/CT MIBI':             1009948,
  'Rastreo Galio67CorpTotal':    32526,
  'Centello. Mamario':          963351,
  'PET/CT (FDG) PARCIAL':       864275,
  'PET/CT TOTAL':               864275,
  'PET/CT (COLINA)':           1152695,
  'PET/CT (FLUORDOPA)':        1409976,
  'PET/CT F-PSMA':             2413035,
  'Test Helicobacter Pylori':   500721,
};

function getPrecioParticular(estudio) {
  return PRECIOS_PARTICULAR[estudio] || null;
}

// ── Email ─────────────────────────────────────────────────────────────────
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;

  transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return transporter;
}

async function enviarEmail(destinatario, asunto, html) {
  const t = getTransporter();
  if (!t) {
    console.log('[EMAIL] No configurado — omitido para:', destinatario);
    return false;
  }
  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM || `CMDR Hospital Militar <${process.env.EMAIL_USER}>`,
      to:   destinatario,
      subject: asunto,
      html,
    });
    console.log('[EMAIL] Enviado a:', destinatario);
    return true;
  } catch (e) {
    console.error('[EMAIL] Error:', e.message);
    return false;
  }
}

// ── Templates de email ────────────────────────────────────────────────────
function templateBase(titulo, cuerpo) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9fa;">
      <div style="background:#1a3a5c;padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:1.2rem;">🏥 CMDR — Hospital Militar Central</h1>
        <p style="color:#a8c4e0;margin:4px 0 0;font-size:0.85rem;">Centro Médico de Diagnóstico Radioisotópico</p>
      </div>
      <div style="background:#fff;padding:32px;">
        <h2 style="color:#1a3a5c;margin-top:0;">${titulo}</h2>
        ${cuerpo}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#888;font-size:0.8rem;text-align:center;">
          WhatsApp: <a href="https://wa.me/5491150232010" style="color:#1a3a5c;">1150232010</a><br>
          Mail: <a href="mailto:cemedirahmc@gmail.com" style="color:#1a3a5c;">cemedirahmc@gmail.com</a>
        </p>
      </div>
    </div>`;
}

function fila(label, valor) {
  return `<tr>
    <td style="padding:8px 12px;color:#666;font-size:0.9rem;width:40%;">${label}</td>
    <td style="padding:8px 12px;font-weight:600;font-size:0.9rem;">${valor || '-'}</td>
  </tr>`;
}

function tablaTurno(t) {
  return `<table style="width:100%;border-collapse:collapse;background:#f8f9fa;border-radius:8px;overflow:hidden;margin:16px 0;">
    ${fila('Estudio', t.estudio)}
    ${fila('Fecha', t.fecha)}
    ${fila('Hora', t.hora + ' hs')}
    ${fila('Cobertura', t.cobertura)}
  </table>`;
}

// ── Notificaciones por evento ────────────────────────────────────────────
async function notificarConfirmacion(turno, pacienteNombre) {
  if (!turno.email) return;
  const html = templateBase(
    '✅ Turno Confirmado',
    `<p>Estimado/a <strong>${pacienteNombre}</strong>, su turno ha sido <strong style="color:#28a745;">CONFIRMADO</strong>.</p>
     ${tablaTurno(turno)}
     <div style="background:#e8f5e9;border-left:4px solid #28a745;padding:12px 16px;border-radius:4px;">
       <p style="margin:0;font-size:0.9rem;">📌 Por favor llegue <strong>15 minutos antes</strong> de su turno con DNI y orden médica.</p>
     </div>`
  );
  await enviarEmail(turno.email, '✅ Turno Confirmado — CMDR Hospital Militar', html);
}

async function notificarAprobacion(turno, pacienteNombre) {
  if (!turno.email) return;
  const html = templateBase(
    '✅ Orden Médica Aprobada',
    `<p>Estimado/a <strong>${pacienteNombre}</strong>, su orden médica fue <strong style="color:#28a745;">APROBADA</strong>.</p>
     ${tablaTurno(turno)}
     <p style="color:#555;font-size:0.9rem;">En breve recibirá la confirmación del turno.</p>`
  );
  await enviarEmail(turno.email, '✅ Orden Aprobada — CMDR Hospital Militar', html);
}

async function notificarRecordatorio(turno, pacienteNombre) {
  if (!turno.email) return;
  const html = templateBase(
    '⏰ Recordatorio de Turno — Mañana',
    `<p>Estimado/a <strong>${pacienteNombre}</strong>, le recordamos que <strong>mañana tiene turno</strong>:</p>
     ${tablaTurno(turno)}
     <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:12px 16px;border-radius:4px;">
       <p style="margin:0;font-size:0.9rem;">📌 Llegue <strong>15 minutos antes</strong> con DNI y orden médica.<br>
       Ante dudas comuníquese por WhatsApp al 1150232010.</p>
     </div>`
  );
  await enviarEmail(turno.email, '⏰ Recordatorio de Turno Mañana — CMDR', html);
}

// ── WhatsApp URL (wa.me) ─────────────────────────────────────────────────
function whatsappURLConfirmacion(telefono, turno, pacienteNombre) {
  const tel = (telefono || '').replace(/\D/g, '');
  if (!tel) return null;

  const msg = `🏥 *CMDR – Hospital Militar Central*\n\n` +
    `✅ Su turno fue *CONFIRMADO*\n\n` +
    `👤 Paciente: ${pacienteNombre}\n` +
    `📋 Estudio: ${turno.estudio}\n` +
    `📅 Fecha: ${turno.fecha}\n` +
    `🕐 Hora: ${turno.hora} hs\n\n` +
    `📍 Por favor llegue 15 minutos antes con DNI y orden médica.\n` +
    `📞 Consultas: 1150232010`;

  const num = tel.startsWith('54') ? tel : '549' + tel.replace(/^0/, '');
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

function whatsappURLRecordatorio(telefono, turno, pacienteNombre) {
  const tel = (telefono || '').replace(/\D/g, '');
  if (!tel) return null;

  const msg = `🏥 *CMDR – Hospital Militar Central*\n\n` +
    `⏰ *Recordatorio de Turno — Mañana*\n\n` +
    `👤 ${pacienteNombre}\n` +
    `📋 ${turno.estudio}\n` +
    `📅 ${turno.fecha}\n` +
    `🕐 ${turno.hora} hs\n\n` +
    `📌 Llegue 15 minutos antes con DNI y orden médica.\n` +
    `📞 Consultas: 1150232010`;

  const num = tel.startsWith('54') ? tel : '549' + tel.replace(/^0/, '');
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

module.exports = {
  getPrecioParticular,
  notificarConfirmacion,
  notificarAprobacion,
  notificarRecordatorio,
  whatsappURLConfirmacion,
  whatsappURLRecordatorio,
};
