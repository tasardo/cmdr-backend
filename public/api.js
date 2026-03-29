// ============================================================
//  CMDR — Conexión Frontend ↔ Backend
// ============================================================

const API_URL = '/api'; // URL relativa — funciona en localhost y en la nube
let API_TOKEN = null;

// ── Precios para pacientes PARTICULARES (sin obra social) ────
const PRECIOS_PARTICULAR = {
  'Centellograma Óseo':          549676,
  'Centello. OseoTotal':         549676,
  'Centello. OseoParcial':       549676,
  'Centellograma Cardíaco':      986628,
  'PerfMiocR/S':                 986628,
  'Centellograma Tiroideo':      322534,
  'CaptacionTiroideo':           117356,
  'Centello. PerfPulmon(Q)':     549676,
  'Centello.VentPulmon (V)':     863947,
  'Centello. RenalDMSA':         549676,
  'Centello. RenalDTPArrg':      963351,
  'Centello. Hepatico':          549676,
  'Centello. Salivares':         420484,
  'Centello. Mamario':           963351,
  'CentCerebral':                549676,
  'Centello. Linfografia':       986939,
  'Centello. ParatirSustrac':   1187208,
  'ReflujoGE':                   549676,
  'VaciamiG Gastrico':           549676,
  'TestVesicula':                552928,
  'Cisternografia':              552928,
  'Rastreo Galio67CorpTotal':     32526,
  'SPECT Cerebral':             1096695,
  'SPECTCerebro':               1096695,
  'SPECTOseo':                   764030,
  'SPECTTiroid':                1070301,
  'SPECTParatir':               1620573,
  'SPECTPerR/S':                 986628,
  'SPECTHigPoo':                 764030,
  'SPECTPulmon':                 764030,
  'SPECT/CT (x region)':        1010768,
  'SPECT/CT MIBI':              1009948,
  'PET/CT TOTAL':                864275,
  'PET/CT (FDG) PARCIAL':        864275,
  'PET/CT (COLINA)':            1152695,
  'PET/CT (FLUORDOPA)':         1409976,
  'PET/CT F-PSMA':              2413035,
  'Ergometria':                   12755,
  'Test Helicobacter Pylori':    500721,
};

// ── Helper para llamadas HTTP ────────────────────────────────
async function apiCall(method, path, body) {
  const opts = { method, headers: {} };
  if (API_TOKEN) opts.headers['Authorization'] = 'Bearer ' + API_TOKEN;
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(API_URL + path, opts);
  } catch (e) {
    throw new Error('No se pudo conectar al servidor. ¿Está corriendo el backend? (npm start)');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}

// ── Subida de archivos (orden médica) ───────────────────────
async function uploadArchivo(file) {
  const fd = new FormData();
  fd.append('orden', file);
  let res;
  try {
    res = await fetch(API_URL + '/archivos/upload', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + API_TOKEN },
      body: fd
    });
  } catch (e) {
    throw new Error('No se pudo subir el archivo. Verificá la conexión.');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al subir archivo');
  return data.filename;
}

// ── Normalizar turno del backend al formato del HTML ────────
function normalizeTurno(t) {
  return {
    id: t.id,
    paciente: t.paciente_nombre || t.paciente_dni,
    dni: (t.paciente_dni || '').replace(/\./g, ''),
    estudio: t.estudio || '',
    fecha: t.fecha || '',
    hora: t.hora || '',
    estado: t.estado || 'Pendiente de autorización',
    cobertura: t.cobertura || '',
    email: t.email || '',
    orden: t.orden_archivo || 'No cargada',
    datosClinic: {
      peso: t.peso || '',
      altura: t.altura || '',
      edad: t.edad || '',
      sexo: t.sexo || '',
      alergias: t.alergias || '',
      medicacion: t.medicacion || '',
      antecedentes: t.antecedentes || '',
      motivo: t.motivo || ''
    }
  };
}

// ── Cargar todos los turnos del usuario logueado ─────────────
async function cargarTurnos() {
  try {
    const turnos = await apiCall('GET', '/turnos');
    APP.turnos = turnos.map(normalizeTurno);
  } catch (e) {
    console.warn('No se pudieron cargar los turnos:', e.message);
  }
}

// ============================================================
//  LOGIN PACIENTE
// ============================================================
async function loginPaciente() {
  const dni    = document.getElementById('loginDNI').value.trim();
  const fecha  = document.getElementById('loginFechaNac').value;
  if (!dni || !fecha) { showToast('Completá DNI y fecha de nacimiento', 'error'); return; }

  const btn = document.querySelector('#loginPaciente .btn-login');
  if (btn) { btn.disabled = true; btn.textContent = 'Ingresando...'; }

  try {
    const data = await apiCall('POST', '/auth/paciente', { dni, nacimiento: fecha });
    API_TOKEN = data.token;

    APP.currentRole = 'paciente';
    APP.paciente = {
      dni:        data.paciente.dni.replace(/\./g, ''),
      _dniRaw:    data.paciente.dni,
      nombre:     data.paciente.nombre,
      nacimiento: data.paciente.nacimiento,
      email:      data.paciente.email    || '',
      telefono:   data.paciente.telefono || '',
      cobertura:  data.paciente.cobertura || 'Particular'
    };

    await cargarTurnos();

    hideLogin();
    hideAllDashboards();
    document.getElementById('dashPaciente').classList.add('active');
    document.getElementById('chatFab').style.display = 'flex';
    document.getElementById('pacUserName').textContent = APP.paciente.nombre;
    showPacView('inicio');
    showToast('Bienvenido/a, ' + APP.paciente.nombre);
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Ingresar como Paciente'; }
  }
}

// ============================================================
//  LOGIN ADMIN
// ============================================================
async function loginAdmin() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  if (!user || !pass) { showToast('Ingresá usuario y contraseña', 'error'); return; }

  const btn = document.querySelector('#loginAdmin .btn-login');
  if (btn) { btn.disabled = true; btn.textContent = 'Ingresando...'; }

  try {
    const data = await apiCall('POST', '/auth/admin', { username: user, password: pass });
    API_TOKEN = data.token;
    APP.currentRole = 'admin';

    await cargarTurnos();

    hideLogin();
    hideAllDashboards();
    document.getElementById('dashAdmin').classList.add('active');
    document.getElementById('chatFab').style.display = 'flex';
    showAdmView('dashboard');
    showToast('Bienvenido al panel de administración');
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Ingresar como Admin'; }
  }
}

// ============================================================
//  LOGOUT
// ============================================================
function logout() {
  API_TOKEN = null;
  APP.currentRole = null;
  APP.turnos = [];
  APP.paciente = { dni: '', nombre: '', nacimiento: '', email: '' };
  hideAllDashboards();
  document.getElementById('publicSite').classList.add('visible');
  document.getElementById('chatFab').style.display = 'none';
  document.getElementById('chatPanel').classList.remove('open');
  window.scrollTo({ top: 0 });
  showToast('Sesión cerrada', 'info');
}

// ============================================================
//  GUARDAR ORDEN MÉDICA EN MEMORIA PARA EL UPLOAD
// ============================================================
function handleOrdenUpload(input) {
  if (input.files.length) {
    turnoData.orden      = input.files[0].name;
    turnoData._ordenFile = input.files[0]; // guardamos el File object
    document.getElementById('ordenFileName').style.display = 'block';
    document.getElementById('ordenFileName').textContent = '✅ ' + input.files[0].name;
  }
}

// ============================================================
//  ENVIAR TURNO
// ============================================================
async function submitTurno() {
  const btnNext = document.getElementById('wizardNext');
  if (btnNext) { btnNext.disabled = true; btnNext.textContent = 'Enviando...'; }

  try {
    // Subir archivo si hay uno
    let ordenFilename = null;
    if (turnoData._ordenFile) {
      showToast('Subiendo orden médica...', 'info');
      ordenFilename = await uploadArchivo(turnoData._ordenFile);
    }

    const dc = turnoData.datosClinic || {};
    const nuevoTurno = await apiCall('POST', '/turnos', {
      estudio:      turnoData.estudio,
      fecha:        turnoData.fecha,
      hora:         turnoData.hora,
      cobertura:    turnoData.cobertura,
      email:        turnoData.email,
      orden_archivo: ordenFilename,
      peso:         dc.peso    || null,
      altura:       dc.altura  || null,
      edad:         dc.edad    || null,
      sexo:         dc.sexo    || null,
      alergias:     dc.alergias     || null,
      medicacion:   dc.medicacion   || null,
      antecedentes: dc.antecedentes || null,
      motivo:       dc.motivo       || null
    });

    APP.turnos.push(normalizeTurno(nuevoTurno));
    showToast('¡Solicitud enviada! Te notificaremos cuando sea autorizada.');
    showPacView('mis-turnos');
  } catch (e) {
    showToast(e.message, 'error');
    if (btnNext) { btnNext.disabled = false; btnNext.textContent = '✅ Confirmar Solicitud'; }
  }
}

// ============================================================
//  CAMBIAR ESTADO DE UN TURNO (admin)
// ============================================================
async function changeEstado(id, nuevoEstado) {
  try {
    const updated = await apiCall('PUT', '/turnos/' + id, { estado: nuevoEstado });
    const idx = APP.turnos.findIndex(t => t.id === id);
    if (idx !== -1) APP.turnos[idx] = normalizeTurno(updated);

    showToast('Estado actualizado a: ' + nuevoEstado);

    if (nuevoEstado === 'Confirmado') {
      if (updated.email) showToast('📧 Mail de confirmación enviado a ' + updated.email, 'info');

      // Abrir WhatsApp automáticamente si hay teléfono
      if (updated.whatsapp_url) {
        setTimeout(() => {
          showToast('📱 Abriendo WhatsApp para enviar confirmación...', 'info');
          window.open(updated.whatsapp_url, '_blank');
        }, 800);
      }
    }

    if (nuevoEstado === 'Aprobado') {
      if (updated.email) showToast('📧 Mail de aprobación enviado a ' + updated.email, 'info');
    }

    viewTurnoDetail(id);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ============================================================
//  PERFIL DEL PACIENTE (con IDs para guardar)
// ============================================================
function renderMiPerfil() {
  const p = APP.paciente;
  const cobOpts = ['OISFA', 'Particular'].map(o =>
    '<option' + (p.cobertura === o ? ' selected' : '') + '>' + o + '</option>'
  ).join('');

  return '<div class="dash-card"><div class="dash-card-header"><h4>Mi Perfil</h4></div><div class="dash-card-body"><div class="dash-form">' +
    '<div class="form-row">' +
      '<div class="form-group"><label>DNI</label><input type="text" id="perfDNI" value="' + (p._dniRaw || p.dni) + '" disabled></div>' +
      '<div class="form-group"><label>Nombre Completo</label><input type="text" id="perfNombre" value="' + p.nombre + '"></div>' +
    '</div>' +
    '<div class="form-row">' +
      '<div class="form-group"><label>Fecha de Nacimiento</label><input type="date" id="perfNac" value="' + p.nacimiento + '"></div>' +
      '<div class="form-group"><label>Email</label><input type="email" id="perfEmail" value="' + p.email + '"></div>' +
    '</div>' +
    '<div class="form-row">' +
      '<div class="form-group"><label>Teléfono</label><input type="tel" id="perfTel" value="' + (p.telefono || '') + '"></div>' +
      '<div class="form-group"><label>Cobertura Principal</label><select id="perfCob">' + cobOpts + '</select></div>' +
    '</div>' +
    '<button class="btn btn-primary" onclick="guardarPerfil()">Guardar Cambios</button>' +
    '</div></div></div>';
}

async function guardarPerfil() {
  try {
    const payload = {
      nombre:     document.getElementById('perfNombre').value,
      nacimiento: document.getElementById('perfNac').value,
      email:      document.getElementById('perfEmail').value,
      telefono:   document.getElementById('perfTel').value,
      cobertura:  document.getElementById('perfCob').value
    };
    const updated = await apiCall('PUT', '/pacientes/' + (APP.paciente._dniRaw || APP.paciente.dni), payload);
    APP.paciente = {
      ...APP.paciente,
      nombre:    updated.nombre,
      nacimiento: updated.nacimiento,
      email:     updated.email     || '',
      telefono:  updated.telefono  || '',
      cobertura: updated.cobertura || 'Particular'
    };
    document.getElementById('pacUserName').textContent = APP.paciente.nombre;
    showToast('Perfil actualizado');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ============================================================
//  VISTA ADMIN — PACIENTES (carga desde backend)
// ============================================================
async function _renderPacientesAdmin() {
  try {
    const pacientes = await apiCall('GET', '/pacientes');
    let html = '<div class="dash-card"><div class="dash-card-header"><h4>Pacientes Registrados</h4></div><div class="dash-card-body" style="overflow-x:auto;">';
    html += '<table class="data-table"><thead><tr><th>Paciente</th><th>DNI</th><th>Cobertura</th><th>Email</th><th>Teléfono</th></tr></thead><tbody>';
    pacientes.forEach(p => {
      html += '<tr>' +
        '<td><strong>' + p.nombre + '</strong></td>' +
        '<td>' + p.dni + '</td>' +
        '<td>' + (p.cobertura || '-') + '</td>' +
        '<td>' + (p.email    || '-') + '</td>' +
        '<td>' + (p.telefono || '-') + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div></div>';
    document.getElementById('admContent').innerHTML = html;
  } catch (e) {
    showToast('Error cargando pacientes: ' + e.message, 'error');
  }
}

// ============================================================
//  VISTA ADMIN — FACTURACIÓN (carga desde backend)
// ============================================================
async function _renderFacturacionAdmin() {
  try {
    const mes = new Date().toISOString().slice(0, 7);
    const f   = await apiCall('GET', '/facturacion?mes=' + mes);
    const oisfa      = f.oisfa      || { cantidad: 0, monto: 0 };
    const particular = f.particular || { cantidad: 0, monto: 0 };
    const totalMonto = (oisfa.monto || 0) + (particular.monto || 0);

    const mesLabel = new Date(mes + '-01').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

    const html =
      '<div class="dash-stat-grid">' +
        '<div class="dash-stat"><div class="ds-label">Período</div><div class="ds-value" style="font-size:1.1rem;">' + mesLabel + '</div></div>' +
        '<div class="dash-stat"><div class="ds-label">Total OISFA</div><div class="ds-value">$' + (oisfa.monto || 0).toLocaleString('es-AR') + '</div><span class="ds-change">' + (oisfa.cantidad || 0) + ' estudios</span></div>' +
        '<div class="dash-stat"><div class="ds-label">Total Particular</div><div class="ds-value">$' + (particular.monto || 0).toLocaleString('es-AR') + '</div><span class="ds-change">' + (particular.cantidad || 0) + ' estudios</span></div>' +
        '<div class="dash-stat"><div class="ds-label">Total Mes</div><div class="ds-value" style="color:var(--color-success);">$' + totalMonto.toLocaleString('es-AR') + '</div></div>' +
      '</div>' +
      '<div class="dash-card"><div class="dash-card-header"><h4>Circuito OISFA</h4><span class="badge badge-pending">Pendiente remito</span></div><div class="dash-card-body">' +
        '<p style="font-size:0.85rem;color:var(--color-text-muted);margin-bottom:1rem;">' + (oisfa.cantidad || 0) + ' estudios confirmados. Monto total: $' + (oisfa.monto || 0).toLocaleString('es-AR') + '</p>' +
        '<button class="btn btn-primary" onclick="showToast(\'Remito OISFA generado\')">📄 Generar Remito OISFA</button>' +
      '</div></div>' +
      '<div class="dash-card"><div class="dash-card-header"><h4>Circuito Particular</h4><span class="badge badge-approved">Facturado</span></div><div class="dash-card-body">' +
        '<p style="font-size:0.85rem;color:var(--color-text-muted);margin-bottom:1rem;">' + (particular.cantidad || 0) + ' estudios confirmados. Monto total: $' + (particular.monto || 0).toLocaleString('es-AR') + '</p>' +
        '<button class="btn btn-outline" style="border-color:var(--color-border);color:var(--color-primary);" onclick="showToast(\'Reporte exportado\',\'info\')">📊 Exportar Detalle</button>' +
      '</div></div>';

    document.getElementById('admContent').innerHTML = html;
  } catch (e) {
    showToast('Error cargando facturación: ' + e.message, 'error');
  }
}

// ============================================================
//  OVERRIDE showAdmView — recarga datos frescos del backend
// ============================================================
function showAdmView(view) {
  document.querySelectorAll('#sidebarAdm .sidebar-link').forEach(l => l.classList.remove('active'));
  event && event.target && event.target.closest && event.target.closest('.sidebar-link') && event.target.closest('.sidebar-link').classList.add('active');

  const titles = {
    'dashboard':   'Dashboard',
    'agenda':      'Agenda del Día',
    'solicitudes': 'Órdenes Médicas',
    'pacientes':   'Pacientes',
    'facturacion': 'Facturación Mensual',
    'reportes':    'Reportes'
  };
  document.getElementById('admViewTitle').textContent = titles[view] || 'Admin';
  const content = document.getElementById('admContent');
  document.getElementById('sidebarAdm').classList.remove('mobile-open');
  document.getElementById('sidebarOverlayAdm').classList.remove('active');

  // Vistas que usan datos del backend directamente
  if (view === 'pacientes') {
    content.innerHTML = '<p style="color:var(--color-text-muted);text-align:center;padding:3rem;">Cargando...</p>';
    _renderPacientesAdmin();
    return;
  }
  if (view === 'facturacion') {
    content.innerHTML = '<p style="color:var(--color-text-muted);text-align:center;padding:3rem;">Cargando...</p>';
    _renderFacturacionAdmin();
    return;
  }

  // Resto de vistas: recargar turnos del backend antes de renderizar
  content.innerHTML = '<p style="color:var(--color-text-muted);text-align:center;padding:3rem;">Cargando...</p>';
  cargarTurnos().then(() => {
    if (view === 'dashboard') {
      content.innerHTML = renderAdmDashboard();
      _verificarRecordatoriosPendientes();
    }
    else if (view === 'agenda')      content.innerHTML = renderAgenda();
    else if (view === 'solicitudes') content.innerHTML = renderSolicitudes();
    else if (view === 'reportes')    content.innerHTML = renderReportes();
  });
}

// ============================================================
//  OVERRIDE showPacView — recarga datos frescos del backend
// ============================================================
function showPacView(view) {
  document.querySelectorAll('#sidebarPac .sidebar-link').forEach(l => l.classList.remove('active'));
  event && event.target && event.target.closest && event.target.closest('.sidebar-link') && event.target.closest('.sidebar-link').classList.add('active');

  const titles = {
    'inicio':       'Inicio',
    'nuevo-turno':  'Nuevo Turno',
    'mis-turnos':   'Mis Turnos',
    'mis-estudios': 'Mis Estudios',
    'mi-perfil':    'Mi Perfil'
  };
  document.getElementById('pacViewTitle').textContent = titles[view] || 'Portal';
  const content = document.getElementById('pacContent');
  document.getElementById('sidebarPac').classList.remove('mobile-open');
  document.getElementById('sidebarOverlayPac').classList.remove('active');

  if (view === 'nuevo-turno') {
    content.innerHTML = renderNuevoTurno();
    // Reemplazar las 6 tarjetas default por la lista completa de estudios
    const studyCont = content.querySelector('.study-options');
    if (studyCont) studyCont.innerHTML = _generarTarjetasEstudios();
    initWizard();
    return;
  }
  if (view === 'mi-perfil') {
    content.innerHTML = renderMiPerfil();
    return;
  }
  if (view === 'mis-estudios') {
    content.innerHTML = renderMisEstudios();
    return;
  }

  // inicio y mis-turnos: recargar datos frescos
  content.innerHTML = '<p style="color:var(--color-text-muted);text-align:center;padding:3rem;">Cargando...</p>';
  cargarTurnos().then(() => {
    if (view === 'inicio')     content.innerHTML = renderPacInicio();
    else if (view === 'mis-turnos') content.innerHTML = renderMisTurnos();
  });
}

// ============================================================
//  CHAT — conectado al backend
// ============================================================
async function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  const container = document.getElementById('chatMessages');
  container.innerHTML += '<div class="chat-msg user"><div class="chat-bubble">' + msg + '</div></div>';
  input.value = '';
  container.scrollTop = container.scrollHeight;

  try {
    const data = await apiCall('POST', '/chat', { mensaje: msg });
    setTimeout(() => {
      container.innerHTML += '<div class="chat-msg bot"><div class="chat-bubble">' + data.respuesta + '</div></div>';
      container.scrollTop = container.scrollHeight;
    }, 600);
  } catch (e) {
    setTimeout(() => {
      container.innerHTML += '<div class="chat-msg bot"><div class="chat-bubble">Gracias por tu consulta. Para una respuesta más detallada, contactanos en horario de atención (Lunes a Viernes 8:00-13:00hs).</div></div>';
      container.scrollTop = container.scrollHeight;
    }, 600);
  }
}

// ============================================================
//  PRECIO EN PASO 6 DEL WIZARD (solo Particular)
// ============================================================
// Override buildConfirmation para agregar precio si es Particular
const _origBuildConfirmation = typeof buildConfirmation === 'function' ? buildConfirmation : null;
function buildConfirmation() {
  if (_origBuildConfirmation) _origBuildConfirmation();

  // Si ya se eligió cobertura Particular, mostrar precio
  const r = document.getElementById('turnoResumen');
  if (!r) return;

  const cob    = turnoData.cobertura || '';
  const precio = PRECIOS_PARTICULAR[turnoData.estudio];

  if (cob === 'Particular' && precio) {
    // Agregar fila de precio al resumen
    const precioRow = document.createElement('div');
    precioRow.className = 'conf-row';
    precioRow.style.cssText = 'background:#e8f5e9;border-radius:6px;margin-top:8px;';
    precioRow.innerHTML =
      '<span class="cr-label" style="color:#2e7d32;font-weight:700;">💰 Precio estimado</span>' +
      '<span class="cr-value" style="color:#2e7d32;font-size:1.1rem;font-weight:700;">$' +
      precio.toLocaleString('es-AR') + '</span>';
    r.appendChild(precioRow);
  }
}

// ============================================================
//  LISTA COMPLETA DE ESTUDIOS (tarjetas del wizard paso 1)
// ============================================================
function _generarTarjetasEstudios() {
  const estudios = [
    // ── Centellogramas ───────────────────────────────────────
    { key: 'Centellograma Óseo',         icon: '⚛️',  label: 'Centellograma Óseo',           desc: 'Rastreo corporal total' },
    { key: 'Centellograma Cardíaco',     icon: '🫀',  label: 'Centellograma Cardíaco',        desc: 'Perfusión miocárdica' },
    { key: 'Centellograma Tiroideo',     icon: '🦠',  label: 'Centellograma Tiroideo',        desc: 'Función tiroidea' },
    { key: 'CaptacionTiroideo',          icon: '🎯',  label: 'Captación Tiroidea',            desc: 'Captación de yodo' },
    { key: 'Centello. PerfPulmon(Q)',    icon: '🫁',  label: 'Centellograma Pulmonar (Q)',    desc: 'Perfusión pulmonar' },
    { key: 'Centello.VentPulmon (V)',    icon: '💨',  label: 'Ventilación Pulmonar (V)',      desc: 'Ventilación pulmonar' },
    { key: 'Centello. RenalDMSA',        icon: '🧬',  label: 'Centellograma Renal DMSA',     desc: 'Función renal estática' },
    { key: 'Centello. RenalDTPArrg',     icon: '🧬',  label: 'Centellograma Renal DTPA',     desc: 'Función renal dinámica' },
    { key: 'Centello. Hepatico',         icon: '🏥',  label: 'Centellograma Hepático',        desc: 'Hígado' },
    { key: 'Centello. Salivares',        icon: '💧',  label: 'Centellograma Salivares',       desc: 'Glándulas salivales' },
    { key: 'Centello. Mamario',          icon: '🎯',  label: 'Centellograma Mamario',         desc: 'Mama / MIBI' },
    { key: 'CentCerebral',               icon: '🧠',  label: 'Centellograma Cerebral',        desc: 'Perfusión cerebral' },
    { key: 'Centello. Linfografia',      icon: '🔗',  label: 'Linfografía',                   desc: 'Sistema linfático' },
    { key: 'Centello. ParatirSustrac',   icon: '🔬',  label: 'Paratiroides (Sustracción)',    desc: 'Centellograma' },
    { key: 'ReflujoGE',                  icon: '🏥',  label: 'Reflujo Gastroesofágico',       desc: 'Tránsito digestivo' },
    { key: 'VaciamiG Gastrico',          icon: '🏥',  label: 'Vaciamiento Gástrico',          desc: 'Motilidad gástrica' },
    { key: 'TestVesicula',               icon: '🏥',  label: 'Test Vesícula',                 desc: 'Función vesicular' },
    { key: 'Cisternografia',             icon: '🧠',  label: 'Cisternografía',                desc: 'LCR y circulación' },
    { key: 'Rastreo Galio67CorpTotal',   icon: '🔬',  label: 'Rastreo Galio-67',              desc: 'Cuerpo total' },
    // ── SPECT ────────────────────────────────────────────────
    { key: 'SPECT Cerebral',             icon: '🧠',  label: 'SPECT Cerebral',                desc: 'Perfusión cerebral SPECT' },
    { key: 'SPECTOseo',                  icon: '⚛️',  label: 'SPECT Óseo',                    desc: 'Huesos SPECT' },
    { key: 'SPECTTiroid',                icon: '🦠',  label: 'SPECT Tiroideo',                desc: 'Tiroides SPECT' },
    { key: 'SPECTParatir',               icon: '🔬',  label: 'SPECT Paratiroides',            desc: 'Paratiroides SPECT' },
    { key: 'SPECTPerR/S',                icon: '🫀',  label: 'SPECT Perf. Cardíaca R/S',      desc: 'Reposo y esfuerzo' },
    { key: 'SPECTHigPoo',                icon: '🏥',  label: 'SPECT Hígado Pool',             desc: 'Hígado SPECT' },
    { key: 'SPECTPulmon',                icon: '🫁',  label: 'SPECT Pulmón',                  desc: 'Pulmón SPECT' },
    { key: 'SPECT/CT (x region)',        icon: '🔬',  label: 'SPECT/CT',                      desc: 'Por región anatómica' },
    { key: 'SPECT/CT MIBI',              icon: '🫀',  label: 'SPECT/CT MIBI',                 desc: 'Cardiología nuclear' },
    // ── PET/CT ───────────────────────────────────────────────
    { key: 'PET/CT TOTAL',               icon: '💊',  label: 'PET/CT Total (FDG)',            desc: 'Cuerpo completo' },
    { key: 'PET/CT (FDG) PARCIAL',       icon: '💊',  label: 'PET/CT Parcial (FDG)',          desc: 'Región parcial' },
    { key: 'PET/CT (COLINA)',            icon: '💊',  label: 'PET/CT Colina',                 desc: 'Próstata / cerebro' },
    { key: 'PET/CT (FLUORDOPA)',         icon: '💊',  label: 'PET/CT Fluorodopa',             desc: 'Parkinson / tumores' },
    { key: 'PET/CT F-PSMA',             icon: '💊',  label: 'PET/CT F-PSMA',                desc: 'Cáncer de próstata' },
    // ── Otros ────────────────────────────────────────────────
    { key: 'Ergometria',                 icon: '🏃',  label: 'Ergometría',                    desc: 'Prueba de esfuerzo' },
    { key: 'Test Helicobacter Pylori',   icon: '🦠',  label: 'Test Helicobacter Pylori',      desc: 'Diagnóstico H. Pylori' },
  ];
  return estudios.map(e =>
    '<div class="study-option" onclick="selectStudy(this,' + JSON.stringify(e.key) + ')">' +
    '<div class="so-icon">' + e.icon + '</div>' +
    '<h5>' + e.label + '</h5>' +
    '<p>' + e.desc + '</p>' +
    '</div>'
  ).join('');
}

// Override selectStudy — corrige bug de recursión infinita
function selectStudy(el, name) {
  document.querySelectorAll('.study-option').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  turnoData.estudio = name;
}

// ============================================================
//  RECORDATORIOS PENDIENTES (panel admin)
// ============================================================
async function _verificarRecordatoriosPendientes() {
  try {
    const pendientes = await apiCall('GET', '/recordatorios/pendientes');
    if (pendientes.length === 0) return;

    // Mostrar banner en el dashboard del admin
    const content = document.getElementById('admContent');
    if (!content) return;

    const banner = document.createElement('div');
    banner.id = 'recordatoriosBanner';
    banner.style.cssText = 'background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px;margin-bottom:16px;';
    banner.innerHTML =
      '<strong style="color:#856404;">⏰ Recordatorios pendientes para mañana (' + pendientes.length + ' turno/s)</strong>' +
      '<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;">' +
      pendientes.map(t =>
        '<div style="background:#fff;border:1px solid #dee2e6;border-radius:6px;padding:8px 12px;font-size:0.85rem;">' +
        '<strong>' + t.paciente_nombre + '</strong> — ' + t.estudio + ' ' + t.hora + 'hs' +
        (t.whatsapp_url
          ? ' <a href="' + t.whatsapp_url + '" target="_blank" style="margin-left:8px;background:#25D366;color:#fff;padding:2px 8px;border-radius:4px;text-decoration:none;font-size:0.8rem;">📱 WhatsApp</a>'
          : '') +
        '</div>'
      ).join('') +
      '</div>';

    // Insertar al inicio del contenido si no existe ya
    if (!document.getElementById('recordatoriosBanner')) {
      content.insertBefore(banner, content.firstChild);
    }
  } catch (e) {
    // Silencioso — no es crítico
  }
}

// ============================================================
//  VERIFICAR CONEXIÓN AL INICIAR
// ============================================================
window.addEventListener('load', () => {
  fetch(API_URL + '/health')
    .then(r => r.json())
    .then(() => console.log('✅ Backend conectado'))
    .catch(() => console.warn('⚠️ Backend no disponible en ' + API_URL + '. Ejecutá: npm start en la carpeta cmdr-backend'));
});
