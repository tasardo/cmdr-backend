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

// ============================================================
//  HELPERS DE VALIDACIÓN ARGENTINA
// ============================================================

// DNI: solo números, máximo 8 dígitos, auto-formatea con puntos
function _setupDNIInput(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.maxLength = 10; // XX.XXX.XXX
  el.setAttribute('inputmode', 'numeric');
  el.addEventListener('input', function() {
    let v = this.value.replace(/\D/g, '').slice(0, 8);
    if (v.length > 6)      this.value = v.slice(0,2) + '.' + v.slice(2,5) + '.' + v.slice(5);
    else if (v.length > 3) this.value = v.slice(0,2) + '.' + v.slice(2);
    else                   this.value = v;
  });
}

// Codigos de área por provincia (Argentina)
const CODIGOS_AREA = [
  { code:'11',  label:'CABA / GBA' },
  { code:'220', label:'Luján / Mercedes (BA)' },
  { code:'221', label:'La Plata' },
  { code:'223', label:'Mar del Plata' },
  { code:'230', label:'Pergamino / Colón' },
  { code:'236', label:'Junín' },
  { code:'237', label:'Moreno / Merlo' },
  { code:'249', label:'Tandil / Azul' },
  { code:'261', label:'Mendoza' },
  { code:'264', label:'San Juan' },
  { code:'266', label:'San Luis' },
  { code:'280', label:'Trelew / Rawson' },
  { code:'291', label:'Bahía Blanca' },
  { code:'297', label:'Comodoro Rivadavia' },
  { code:'299', label:'Neuquén / Cipolletti' },
  { code:'341', label:'Rosario' },
  { code:'342', label:'Santa Fe' },
  { code:'343', label:'Paraná' },
  { code:'351', label:'Córdoba Capital' },
  { code:'353', label:'Villa María' },
  { code:'358', label:'Río Cuarto' },
  { code:'362', label:'Resistencia' },
  { code:'370', label:'Corrientes Capital' },
  { code:'376', label:'Posadas' },
  { code:'381', label:'Tucumán Capital' },
  { code:'383', label:'Catamarca' },
  { code:'385', label:'Santiago del Estero' },
  { code:'387', label:'Salta' },
  { code:'388', label:'Jujuy' },
];

// Genera el HTML del campo teléfono con selector de código de área
function _telInputHTML(idArea, idNum) {
  const opts = CODIGOS_AREA.map(c =>
    '<option value="' + c.code + '">' + c.code + ' — ' + c.label + '</option>'
  ).join('');
  return '<div style="display:flex;gap:.5rem;align-items:flex-start;">' +
    '<div style="flex:0 0 auto;">' +
      '<label style="font-size:0.75rem;color:#888;display:block;margin-bottom:4px;">Cod. área</label>' +
      '<select id="' + idArea + '" style="padding:.55rem .5rem;border:1.5px solid var(--color-border);border-radius:var(--radius-sm);font-size:0.85rem;background:#fff;">' +
      opts + '</select>' +
    '</div>' +
    '<div style="flex:1;">' +
      '<label style="font-size:0.75rem;color:#888;display:block;margin-bottom:4px;">Número (sin 15)</label>' +
      '<input type="tel" id="' + idNum + '" placeholder="Ej: 55557890" inputmode="numeric" maxlength="8" ' +
      'style="width:100%;padding:.55rem .75rem;border:1.5px solid var(--color-border);border-radius:var(--radius-sm);font-size:0.9rem;" ' +
      'oninput="this.value=this.value.replace(/\\D/g,\'\').slice(0,8)">' +
    '</div>' +
  '</div>' +
  '<p style="font-size:0.75rem;color:#888;margin-top:4px;">📱 WhatsApp: +54 9 <span id="' + idArea + '_preview">11</span> <span id="' + idNum + '_preview">——</span></p>';
}

// Lee y combina área + número en formato WhatsApp
function _getTelValue(idArea, idNum) {
  const area = (document.getElementById(idArea) || {}).value || '';
  const num  = (document.getElementById(idNum)  || {}).value || '';
  // Preview en tiempo real
  const pa = document.getElementById(idArea + '_preview');
  const pn = document.getElementById(idNum  + '_preview');
  if (pa) pa.textContent = area;
  if (pn) pn.textContent = num || '——';
  return area && num ? area + num : '';
}

// ── Formato de fecha argentino DD/MM/AAAA ───────────────────
function _fmtFecha(f) {
  if (!f) return '-';
  // Si ya está en DD/MM/AAAA, dejarlo
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(f)) return f;
  // Convertir YYYY-MM-DD → DD/MM/AAAA
  const [y, m, d] = f.split('-');
  if (y && m && d) return d + '/' + m + '/' + y;
  return f;
}

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
    fecha: _fmtFecha(t.fecha || ''),
    hora: t.hora || '',
    estado: t.estado || 'Pendiente de autorización',
    cobertura: t.cobertura || '',
    email: t.email || '',
    orden: t.orden_archivo || 'No cargada',
    informe: t.informe_archivo || null,
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
  const nombre = (document.getElementById('loginNombre') || {}).value || '';
  const consent = document.getElementById('loginConsentimiento');
  if (!dni || !fecha) { showToast('Completá DNI y fecha de nacimiento', 'error'); return; }
  if (consent && !consent.checked) { showToast('Debés aceptar la Política de Privacidad para continuar', 'error'); return; }

  const btn = document.querySelector('#loginPaciente .btn-login');
  if (btn) { btn.disabled = true; btn.textContent = 'Ingresando...'; }

  try {
    const data = await apiCall('POST', '/auth/paciente', { dni, nacimiento: fecha, nombre: nombre.trim() || undefined });
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
//  LOGIN MÉDICO
// ============================================================
async function loginMedico() {
  const user = document.getElementById('loginMedUser').value.trim();
  const pass = document.getElementById('loginMedPass').value;
  if (!user || !pass) { showToast('Ingresá usuario y contraseña', 'error'); return; }

  const btn = document.querySelector('#loginMedico .btn-login');
  if (btn) { btn.disabled = true; btn.textContent = 'Ingresando...'; }

  try {
    const data = await apiCall('POST', '/auth/admin', { username: user, password: pass });
    if (data.rol !== 'medico') { showToast('Acceso solo para médicos', 'error'); return; }

    API_TOKEN = data.token;
    APP.currentRole = 'medico';
    APP.medico = { username: data.username, nombre: data.nombre || data.username };

    await cargarTurnos();

    hideLogin();
    hideAllDashboards();
    document.getElementById('dashMedico').classList.add('active');
    document.getElementById('medUserName').textContent = APP.medico.nombre;
    showMedView('hoy');
    showToast('Bienvenido/a, ' + APP.medico.nombre);
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Ingresar como Médico'; }
  }
}

// ============================================================
//  PORTAL MÉDICO — VISTAS
// ============================================================
function showMedView(view) {
  document.querySelectorAll('#sidebarMed .sidebar-link').forEach(l => l.classList.remove('active'));
  event && event.target && event.target.closest && event.target.closest('.sidebar-link') &&
    event.target.closest('.sidebar-link').classList.add('active');

  const titles = { 'hoy': 'Agenda de Hoy', 'semana': 'Esta Semana', 'todos': 'Todos los Turnos', 'pacientes': 'Pacientes' };
  document.getElementById('medViewTitle').textContent = titles[view] || 'Portal Médico';

  const content = document.getElementById('medContent');
  document.getElementById('sidebarMed').classList.remove('mobile-open');
  document.getElementById('sidebarOverlayMed').classList.remove('active');

  content.innerHTML = '<p style="color:var(--color-text-muted);text-align:center;padding:3rem;">Cargando...</p>';
  cargarTurnos().then(() => {
    if      (view === 'hoy')       content.innerHTML = _medAgendaHoy();
    else if (view === 'semana')    content.innerHTML = _medAgendaSemana();
    else if (view === 'todos')     content.innerHTML = _medTodosTurnos();
    else if (view === 'pacientes') _medPacientes(content);
  });
}

function _badgeEstado(estado) {
  const cls = {
    'Confirmado':                'badge-confirmed',
    'Aprobado':                  'badge-approved',
    'Pendiente de autorización': 'badge-pending',
    'Revisar':                   'badge-info',
    'Denegado':                  'badge-denied',
  };
  return '<span class="badge ' + (cls[estado] || 'badge-pending') + '">' + estado + '</span>';
}

function _medAgendaHoy() {
  const hoy = new Date();
  const dd  = String(hoy.getDate()).padStart(2,'0');
  const mm  = String(hoy.getMonth()+1).padStart(2,'0');
  const yyyy = hoy.getFullYear();
  const hoyArg  = dd + '/' + mm + '/' + yyyy;
  const turnos  = APP.turnos.filter(t => t.fecha === hoyArg && t.estado !== 'Denegado');

  if (!turnos.length) {
    return '<div class="dash-card"><div class="dash-card-body" style="text-align:center;padding:3rem;">' +
      '<div style="font-size:3rem;margin-bottom:1rem;">🗓️</div>' +
      '<p style="color:var(--color-text-muted);">No hay turnos confirmados para hoy (' + hoyArg + ')</p>' +
      '</div></div>';
  }

  turnos.sort((a,b) => a.hora.localeCompare(b.hora));

  let html = '<div style="margin-bottom:1rem;"><strong style="font-size:1.1rem;">📅 ' + hoyArg + '</strong> — ' +
    '<span style="color:var(--color-text-muted);">' + turnos.length + ' turno' + (turnos.length!==1?'s':'') + '</span></div>';

  turnos.forEach(t => {
    html += '<div class="dash-card" style="margin-bottom:1rem;">' +
      '<div class="dash-card-body">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.5rem;">' +
        '<div>' +
          '<div style="font-size:1.4rem;font-weight:800;color:var(--color-primary);">' + t.hora + ' hs</div>' +
          '<div style="font-size:1rem;font-weight:700;margin-top:.25rem;">' + t.paciente + '</div>' +
          '<div style="color:var(--color-text-muted);font-size:0.85rem;">' + t.estudio + '</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
          _badgeEstado(t.estado) + '<br>' +
          '<span style="font-size:0.8rem;color:var(--color-text-muted);">' + (t.cobertura||'-') + '</span>' +
        '</div>' +
      '</div>' +
      (t.datosClinic && t.datosClinic.motivo ? '<div style="margin-top:.75rem;font-size:0.85rem;background:#f8f9fa;padding:8px 12px;border-radius:6px;color:#555;"><strong>Motivo:</strong> ' + t.datosClinic.motivo + '</div>' : '') +
      '</div></div>';
  });
  return html;
}

function _medAgendaSemana() {
  const hoy = new Date();
  const semana = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(hoy); d.setDate(hoy.getDate() + i);
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    semana.push(dd + '/' + d.getFullYear().toString().slice(2) + '/' + d.getFullYear() );
    // simpler: store full arg date
    semana[i] = dd + '/' + mm + '/' + d.getFullYear();
  }

  let html = '';
  semana.forEach(fechaArg => {
    const turnos = APP.turnos.filter(t => t.fecha === fechaArg && t.estado !== 'Denegado');
    if (!turnos.length) return;
    html += '<div class="dash-card" style="margin-bottom:1rem;"><div class="dash-card-header"><h4>📅 ' + fechaArg + '</h4>' +
      '<span class="badge badge-approved">' + turnos.length + ' turno' + (turnos.length!==1?'s':'') + '</span></div>' +
      '<div class="dash-card-body"><table class="data-table"><thead><tr><th>Hora</th><th>Paciente</th><th>Estudio</th><th>Estado</th></tr></thead><tbody>';
    turnos.sort((a,b) => a.hora.localeCompare(b.hora)).forEach(t => {
      html += '<tr><td><strong>' + t.hora + '</strong></td><td>' + t.paciente + '</td><td style="font-size:0.85rem;">' + t.estudio + '</td><td>' + _badgeEstado(t.estado) + '</td></tr>';
    });
    html += '</tbody></table></div></div>';
  });

  if (!html) html = '<div class="dash-card"><div class="dash-card-body" style="text-align:center;padding:3rem;"><div style="font-size:3rem;">📅</div><p style="color:var(--color-text-muted);">No hay turnos esta semana</p></div></div>';
  return html;
}

function _medTodosTurnos() {
  const turnos = [...APP.turnos].filter(t => t.estado !== 'Denegado').sort((a,b) => {
    if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
    return a.hora.localeCompare(b.hora);
  });

  if (!turnos.length) return '<div class="dash-card"><div class="dash-card-body" style="text-align:center;padding:3rem;"><p>No hay turnos</p></div></div>';

  let html = '<div class="dash-card"><div class="dash-card-body" style="overflow-x:auto;"><table class="data-table">' +
    '<thead><tr><th>Fecha</th><th>Hora</th><th>Paciente</th><th>Estudio</th><th>Cobertura</th><th>Estado</th></tr></thead><tbody>';
  turnos.forEach(t => {
    html += '<tr>' +
      '<td>' + t.fecha + '</td>' +
      '<td><strong>' + t.hora + '</strong></td>' +
      '<td>' + t.paciente + '</td>' +
      '<td style="font-size:0.85rem;">' + t.estudio + '</td>' +
      '<td>' + (t.cobertura||'-') + '</td>' +
      '<td>' + _badgeEstado(t.estado) + '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div></div>';
  return html;
}

async function _medPacientes(content) {
  try {
    const pacientes = await apiCall('GET', '/pacientes');
    let html = '<div class="dash-card"><div class="dash-card-body" style="overflow-x:auto;"><table class="data-table">' +
      '<thead><tr><th>Paciente</th><th>DNI</th><th>Cobertura</th><th>Teléfono</th></tr></thead><tbody>';
    pacientes.forEach(p => {
      html += '<tr><td><strong>' + p.nombre + '</strong></td><td>' + p.dni + '</td>' +
        '<td>' + (p.cobertura||'-') + '</td><td>' + (p.telefono||'-') + '</td></tr>';
    });
    html += '</tbody></table></div></div>';
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = '<p style="color:red;padding:2rem;">Error: ' + e.message + '</p>';
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

    // Si es médico, redirigir al portal médico
    if (data.rol === 'medico') {
      API_TOKEN = data.token;
      APP.currentRole = 'medico';
      APP.medico = { username: data.username, nombre: data.nombre || data.username };
      await cargarTurnos();
      hideLogin();
      hideAllDashboards();
      document.getElementById('dashMedico').classList.add('active');
      document.getElementById('medUserName').textContent = APP.medico.nombre;
      showMedView('hoy');
      showToast('Bienvenido/a, ' + APP.medico.nombre);
      return;
    }

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
      telefono:     turnoData.telefono || null,
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

    const etiquetas = {
      'Confirmado': '✅ Turno confirmado',
      'Aprobado':   '✅ Orden aprobada',
      'Denegado':   '❌ Turno denegado',
      'Revisar':    '🔍 Orden enviada a revisión',
    };
    showToast(etiquetas[nuevoEstado] || 'Estado actualizado a: ' + nuevoEstado);

    // Email enviado automáticamente si está configurado
    if (updated.email) {
      showToast('📧 Mail enviado a ' + updated.email, 'info');
    }

    // Abrir WhatsApp si hay número de teléfono
    if (updated.whatsapp_url) {
      setTimeout(() => {
        showToast('📱 Abriendo WhatsApp...', 'info');
        window.open(updated.whatsapp_url, '_blank');
      }, 800);
    }

    // Mostrar botón de Google Calendar si el turno fue confirmado
    if (nuevoEstado === 'Confirmado' && updated.calendar_url) {
      setTimeout(() => {
        const msg = '📅 <a href="' + updated.calendar_url + '" target="_blank" style="color:#1a73e8;font-weight:600;">Agregar al calendario</a>';
        const div = document.createElement('div');
        div.style.cssText = 'background:#e8f0fe;border:1px solid #4285f4;border-radius:8px;padding:12px 16px;margin:12px 0;font-size:0.9rem;';
        div.innerHTML = '📅 Turno confirmado — <a href="' + updated.calendar_url + '" target="_blank" style="color:#1a73e8;font-weight:700;">Agregar a Google Calendar</a>';
        const content = document.getElementById('admContent');
        if (content) content.insertBefore(div, content.firstChild);
      }, 1200);
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
    // Lista completa de estudios
    const studyCont = content.querySelector('.study-options');
    if (studyCont) studyCont.innerHTML = _generarTarjetasEstudios();
    // Input de teléfono con selector de provincia
    const telCont = document.getElementById('turnoTelContainer');
    if (telCont) telCont.innerHTML = _telInputHTML('turnoTelArea', 'turnoTelNum');
    // Actualizar preview en tiempo real
    ['turnoTelArea','turnoTelNum'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => _getTelValue('turnoTelArea','turnoTelNum'));
      if (el) el.addEventListener('change', () => _getTelValue('turnoTelArea','turnoTelNum'));
    });
    initWizard();
    return;
  }
  if (view === 'mi-perfil') {
    content.innerHTML = renderMiPerfil();
    _setupDNIInput('perfDNI');
    return;
  }
  if (view === 'mis-estudios') {
    content.innerHTML = '<p style="color:var(--color-text-muted);text-align:center;padding:3rem;">Cargando...</p>';
    cargarTurnos().then(() => { content.innerHTML = renderMisEstudios(); });
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
//  PASO 6 DEL WIZARD — Resumen completo (override directo)
// ============================================================
function buildConfirmation() {
  const r = document.getElementById('turnoResumen');
  if (!r) return;

  const dc     = turnoData.datosClinic || {};
  const precio = turnoData.cobertura === 'Particular' ? PRECIOS_PARTICULAR[turnoData.estudio] : null;

  r.innerHTML =
    '<div class="conf-row"><span class="cr-label">Estudio</span><span class="cr-value">'    + (turnoData.estudio   || '-') + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Fecha</span><span class="cr-value">'      + (turnoData.fecha     || '-') + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Hora</span><span class="cr-value">'       + (turnoData.hora      || '-') + ' hs</span></div>' +
    '<div class="conf-row"><span class="cr-label">Cobertura</span><span class="cr-value">'  + (turnoData.cobertura || '-') + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Orden médica</span><span class="cr-value">' + (turnoData.orden   || 'No cargada') + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Peso / Altura / Edad</span><span class="cr-value">' +
      (dc.peso ? dc.peso + ' kg / ' + dc.altura + ' cm / ' + dc.edad + ' años' : '-') +
    '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Sexo</span><span class="cr-value">'         + (dc.sexo         || '-') + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Alergias</span><span class="cr-value">'     + (dc.alergias     || '-') + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Medicación</span><span class="cr-value">'   + (dc.medicacion   || '-') + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Motivo</span><span class="cr-value">'       + (dc.motivo       || '-') + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Email</span><span class="cr-value">'        + (turnoData.email    || '-') + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">WhatsApp</span><span class="cr-value">'     + (turnoData.telefono || '-') + '</span></div>' +
    (precio
      ? '<div class="conf-row" style="background:#e8f5e9;border-radius:6px;padding:8px 4px;margin-top:4px;">' +
        '<span class="cr-label" style="color:#2e7d32;font-weight:700;">💰 Precio estimado (Particular)</span>' +
        '<span class="cr-value" style="color:#2e7d32;font-size:1.1rem;font-weight:700;">$' + precio.toLocaleString('es-AR') + '</span></div>'
      : '');
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
    '<div class="study-option" data-estudio="' + e.key.replace(/"/g, '&quot;') + '" onclick="selectStudy(this, this.dataset.estudio)">' +
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
//  VISOR DE ÓRDENES MÉDICAS — admin puede abrir/descargar
// ============================================================
function _ordenHTML(ordenFilename) {
  if (!ordenFilename || ordenFilename === 'No cargada') return '<span style="color:#aaa;">No cargada</span>';
  // Si es URL de Cloudinary (https://...) usarla directa; si no, usar endpoint local con token
  const isCloudinary = ordenFilename.startsWith('http');
  const base = isCloudinary ? ordenFilename : (API_URL + '/archivos/' + ordenFilename + '?token=' + API_TOKEN);
  const ext  = ordenFilename.split('.').pop().toLowerCase().split('?')[0];
  let preview = '';
  if (['jpg','jpeg','png'].includes(ext)) {
    preview = '<div style="margin-top:8px;"><img src="' + base + '" style="max-width:100%;max-height:300px;border-radius:6px;border:1px solid #ddd;" onerror="this.style.display=\'none\'"></div>';
  } else if (ext === 'pdf') {
    preview = '<div style="margin-top:8px;"><iframe src="' + base + '" style="width:100%;height:300px;border:1px solid #ddd;border-radius:6px;" title="Orden médica"></iframe></div>';
  }
  return '<div>' +
    '<a href="' + base + '" target="_blank" style="color:var(--color-info);font-weight:600;text-decoration:none;">📄 Ver orden</a>' +
    ' &nbsp; ' +
    '<a href="' + base + '&download=1" style="color:var(--color-primary);font-weight:600;text-decoration:none;">⬇️ Descargar</a>' +
    preview +
    '</div>';
}

// Override viewTurnoDetail para mostrar botones de archivo
function viewTurnoDetail(id) {
  const t = APP.turnos.find(x => x.id === id);
  if (!t) return;
  const dc = t.datosClinic || {};
  const content = document.getElementById('admContent');
  const estadoBadge = {
    'Confirmado': 'badge-confirmed', 'Aprobado': 'badge-approved',
    'Pendiente de autorización': 'badge-pending', 'Revisar': 'badge-review', 'Denegado': 'badge-denied'
  };

  content.innerHTML =
    '<button class="btn btn-outline" style="margin-bottom:1rem;font-size:0.85rem;border-color:var(--color-border);color:var(--color-primary);" onclick="showAdmView(\'solicitudes\')">← Volver</button>' +
    '<div class="dash-card"><div class="dash-card-header"><h4>Solicitud #' + t.id + '</h4>' +
    '<span class="badge ' + (estadoBadge[t.estado] || 'badge-pending') + '">' + t.estado + '</span></div>' +
    '<div class="dash-card-body">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;flex-wrap:wrap;">' +

    // Datos del turno
    '<div><h4 style="font-size:0.85rem;color:var(--color-text-muted);margin-bottom:1rem;text-transform:uppercase;letter-spacing:1px;">Datos del Turno</h4>' +
    '<div class="confirmation-summary">' +
    '<div class="conf-row"><span class="cr-label">Paciente</span><span class="cr-value">' + t.paciente + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">DNI</span><span class="cr-value">' + t.dni + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Estudio</span><span class="cr-value">' + t.estudio + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Fecha / Hora</span><span class="cr-value">' + t.fecha + ' — ' + t.hora + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Cobertura</span><span class="cr-value">' + (t.cobertura || '-') + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Email</span><span class="cr-value">' + (t.email || '-') + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">WhatsApp</span><span class="cr-value">' + (t.telefono || '-') + '</span></div>' +
    '</div></div>' +

    // Datos clínicos
    '<div><h4 style="font-size:0.85rem;color:var(--color-text-muted);margin-bottom:1rem;text-transform:uppercase;letter-spacing:1px;">Datos Clínicos</h4>' +
    '<div class="confirmation-summary">' +
    '<div class="conf-row"><span class="cr-label">Peso / Altura / Edad</span><span class="cr-value">' + (dc.peso||'-') + ' kg / ' + (dc.altura||'-') + ' cm / ' + (dc.edad||'-') + ' años</span></div>' +
    '<div class="conf-row"><span class="cr-label">Sexo</span><span class="cr-value">' + (dc.sexo||'-') + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Alergias</span><span class="cr-value">' + (dc.alergias||'-') + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Medicación</span><span class="cr-value">' + (dc.medicacion||'-') + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Antecedentes</span><span class="cr-value">' + (dc.antecedentes||'-') + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Motivo</span><span class="cr-value">' + (dc.motivo||'-') + '</span></div>' +
    '</div></div></div>' +

    // Orden médica
    '<div style="margin-top:1.5rem;"><h4 style="font-size:0.85rem;color:var(--color-text-muted);margin-bottom:.75rem;text-transform:uppercase;letter-spacing:1px;">Orden Médica</h4>' +
    _ordenHTML(t.orden) + '</div>' +

    // Acciones
    '<div style="display:flex;gap:1rem;margin-top:2rem;flex-wrap:wrap;">' +
    (t.estado === 'Pendiente de autorización' || t.estado === 'Revisar'
      ? '<button class="btn btn-primary" onclick="changeEstado(' + t.id + ',\'Aprobado\')">✅ Aprobar Orden</button>' +
        '<button class="btn btn-outline" style="border-color:var(--color-warning);color:var(--color-warning);" onclick="changeEstado(' + t.id + ',\'Revisar\')">⚠️ Solicitar Revisión</button>' +
        '<button class="btn btn-outline" style="border-color:var(--color-danger);color:var(--color-danger);" onclick="changeEstado(' + t.id + ',\'Denegado\')">❌ Denegar</button>'
      : '') +
    (t.estado === 'Aprobado'
      ? '<button class="btn btn-primary" onclick="changeEstado(' + t.id + ',\'Confirmado\')">📌 Confirmar Turno</button>'
      : '') +
    '</div>' +
    '</div></div>';
}

// ============================================================
//  CONSENTIMIENTO Y POLÍTICA DE PRIVACIDAD (Ley 25.326)
// ============================================================
function _mostrarPoliticaPrivacidad() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
  modal.innerHTML =
    '<div style="background:#fff;border-radius:12px;max-width:600px;width:100%;max-height:85vh;overflow-y:auto;padding:2rem;">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;">' +
    '<h3 style="color:#1a3a5c;margin:0;">Política de Privacidad y Protección de Datos</h3>' +
    '<button onclick="this.closest(\'div[style*=position]\').remove()" style="border:none;background:none;font-size:1.4rem;cursor:pointer;color:#888;">✕</button>' +
    '</div>' +
    '<div style="font-size:0.85rem;color:#444;line-height:1.6;">' +

    '<p><strong>Responsable del tratamiento:</strong> Centro Médico de Diagnóstico Radioisotópico (CMDR) — Hospital Militar Central, Buenos Aires, Argentina.</p>' +

    '<h4 style="color:#1a3a5c;margin-top:1.2rem;">1. Datos que recopilamos</h4>' +
    '<p>Nombre completo, DNI, fecha de nacimiento, email, teléfono, cobertura médica, datos clínicos (peso, altura, edad, sexo, alergias, medicación, antecedentes, motivo de consulta) e historial de turnos. Estos datos son considerados <strong>datos sensibles</strong> conforme al Art. 2 de la Ley 25.326.</p>' +

    '<h4 style="color:#1a3a5c;margin-top:1.2rem;">2. Finalidad del tratamiento</h4>' +
    '<p>Gestión de turnos médicos, comunicaciones relacionadas con su atención, recordatorios, y facturación. Los datos no serán utilizados para fines distintos sin su consentimiento expreso.</p>' +

    '<h4 style="color:#1a3a5c;margin-top:1.2rem;">3. Datos sensibles (Art. 7 y 8, Ley 25.326)</h4>' +
    '<p>Sus datos de salud son datos sensibles. Usted <strong>no está obligado/a a proporcionarlos</strong>; sin embargo, son necesarios para gestionar correctamente su turno médico. El tratamiento se realiza en el marco de la relación médico-paciente, respetando el secreto profesional.</p>' +

    '<h4 style="color:#1a3a5c;margin-top:1.2rem;">4. Transferencia a terceros (Art. 11, Ley 25.326)</h4>' +
    '<p>Sus datos de salud <strong>no serán transferidos a terceros</strong> sin su consentimiento previo y expreso, salvo exigencia legal o requerimiento de autoridad sanitaria competente.</p>' +

    '<h4 style="color:#1a3a5c;margin-top:1.2rem;">5. Seguridad (Art. 9, Ley 25.326)</h4>' +
    '<p>Adoptamos medidas técnicas y organizativas para garantizar la seguridad y confidencialidad de sus datos: comunicaciones encriptadas (HTTPS/TLS), control de accesos con autenticación individual, registros de auditoría de accesos, y separación de entornos.</p>' +

    '<h4 style="color:#1a3a5c;margin-top:1.2rem;">6. Conservación (Art. 18, Ley 26.529)</h4>' +
    '<p>Los datos de salud se conservan por un mínimo de <strong>10 años</strong> desde el último registro, conforme a la legislación vigente sobre historia clínica.</p>' +

    '<h4 style="color:#1a3a5c;margin-top:1.2rem;">7. Sus derechos (Arts. 14–16, Ley 25.326)</h4>' +
    '<p>Usted tiene derecho a <strong>acceder</strong> a sus datos en forma gratuita (cada 6 meses), <strong>rectificarlos</strong>, <strong>actualizarlos</strong>, <strong>suprimirlos</strong> y a la <strong>confidencialidad</strong>. Para ejercer estos derechos, contáctenos en: <a href="mailto:cemedirahmc@gmail.com">cemedirahmc@gmail.com</a></p>' +
    '<p>También puede presentar una denuncia ante la <strong>AAIP</strong> (Agencia de Acceso a la Información Pública): datospersonales@aaip.gob.ar</p>' +

    '<p style="margin-top:1.5rem;font-size:0.78rem;color:#888;">Este aviso de privacidad cumple con la Ley 25.326 de Protección de Datos Personales (Argentina), la Ley 26.529 de Derechos del Paciente, y la Resolución 47/2018 de la AAIP.</p>' +
    '</div>' +
    '<button onclick="this.closest(\'div[style*=position]\').remove()" style="width:100%;margin-top:1.5rem;padding:.75rem;background:#1a3a5c;color:#fff;border:none;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;">Cerrar</button>' +
    '</div>';
  document.body.appendChild(modal);
}

// ============================================================
//  VERIFICAR CONEXIÓN AL INICIAR
// ============================================================
window.addEventListener('load', () => {
  fetch(API_URL + '/health')
    .then(r => r.json())
    .then(() => console.log('✅ Backend conectado'))
    .catch(() => console.warn('⚠️ Backend no disponible en ' + API_URL));

  // Auto-formato DNI en el login
  _setupDNIInput('loginDNI');
});

// ============================================================
//  PORTAL MÉDICO — DETALLE DE TURNO + SUBIR INFORME
// ============================================================
function viewMedTurnoDetail(id) {
  const t = APP.turnos.find(x => x.id === id);
  if (!t) return;
  const dc = t.datosClinic || {};
  const content = document.getElementById('medContent');

  const informeSection = t.informe
    ? '<div style="margin-top:1rem;padding:12px;background:#e8f5e9;border-radius:8px;border:1px solid #c8e6c9;">' +
      '<strong style="color:#2e7d32;">&#x2705; Informe cargado</strong><br>' +
      '<a href="' + _archivoURL(t.informe) + '" target="_blank" style="color:#1565c0;">&#x1F4C4; Ver informe</a>' +
      ' &nbsp; <a href="' + _archivoURL(t.informe) + '&download=1" style="color:#1565c0;">&#x2B07;&#xFE0F; Descargar</a>' +
      '</div>'
    : '';

  content.innerHTML =
    '<button class="btn btn-outline" style="margin-bottom:1rem;font-size:0.85rem;" onclick="showMedView(\'hoy\')">&#x2190; Volver</button>' +
    '<div class="dash-card"><div class="dash-card-header"><h4>' + t.paciente + ' &#x2014; ' + t.estudio + '</h4>' +
    _badgeEstado(t.estado) + '</div>' +
    '<div class="dash-card-body">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">' +
    '<div><h4 style="font-size:0.8rem;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:.75rem;">Turno</h4>' +
    '<div class="confirmation-summary">' +
    '<div class="conf-row"><span class="cr-label">Fecha / Hora</span><span class="cr-value">' + t.fecha + ' &#x2014; ' + t.hora + ' hs</span></div>' +
    '<div class="conf-row"><span class="cr-label">DNI</span><span class="cr-value">' + t.dni + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Cobertura</span><span class="cr-value">' + (t.cobertura||'-') + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Email</span><span class="cr-value">' + (t.email||'-') + '</span></div>' +
    '</div></div>' +
    '<div><h4 style="font-size:0.8rem;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:.75rem;">Datos Cl&#xED;nicos</h4>' +
    '<div class="confirmation-summary">' +
    '<div class="conf-row"><span class="cr-label">Peso/Altura/Edad</span><span class="cr-value">' + (dc.peso||'-') + ' kg / ' + (dc.altura||'-') + ' cm / ' + (dc.edad||'-') + ' a&#xF1;os</span></div>' +
    '<div class="conf-row"><span class="cr-label">Sexo</span><span class="cr-value">' + (dc.sexo||'-') + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Alergias</span><span class="cr-value">' + (dc.alergias||'-') + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Medicaci&#xF3;n</span><span class="cr-value">' + (dc.medicacion||'-') + '</span></div>' +
    '<div class="conf-row"><span class="cr-label">Motivo</span><span class="cr-value">' + (dc.motivo||'-') + '</span></div>' +
    '</div></div></div>' +
    '<div style="margin-top:1.5rem;border-top:1px solid var(--color-border);padding-top:1.5rem;">' +
    '<h4 style="font-size:0.85rem;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:.75rem;">Informe M&#xE9;dico</h4>' +
    informeSection +
    '<div style="margin-top:1rem;">' +
    '<label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:.5rem;">' + (t.informe ? 'Reemplazar informe:' : 'Subir informe (PDF/JPG/PNG):') + '</label>' +
    '<input type="file" id="informeFile_' + id + '" accept=".pdf,.jpg,.jpeg,.png" style="font-size:0.85rem;">' +
    '<button class="btn btn-primary" style="margin-top:.75rem;" onclick="uploadInforme(' + id + ')">&#x1F4E4; Subir Informe</button>' +
    '</div></div>' +
    '</div></div>';
}

function _archivoURL(filename) {
  if (!filename) return '';
  return filename.startsWith('http') ? filename : (API_URL + '/archivos/' + filename + '?token=' + API_TOKEN);
}

async function uploadInforme(turnoId) {
  const fileInput = document.getElementById('informeFile_' + turnoId);
  if (!fileInput || !fileInput.files[0]) { showToast('Seleccion&#xE1; un archivo primero', 'error'); return; }
  const formData = new FormData();
  formData.append('informe', fileInput.files[0]);
  try {
    showToast('Subiendo informe...', 'info');
    const res = await fetch(API_URL + '/archivos/informe/' + turnoId, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + API_TOKEN },
      body: formData
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error al subir'); }
    showToast('Informe cargado correctamente');
    await cargarTurnos();
    viewMedTurnoDetail(turnoId);
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

// Agenda de hoy con boton de detalle
function _medAgendaHoyV2() {
  const hoy = new Date();
  const dd  = String(hoy.getDate()).padStart(2,'0');
  const mm  = String(hoy.getMonth()+1).padStart(2,'0');
  const yyyy = hoy.getFullYear();
  const hoyArg = dd + '/' + mm + '/' + yyyy;
  const turnos = APP.turnos.filter(t => t.fecha === hoyArg && t.estado !== 'Denegado');

  if (!turnos.length) {
    return '<div class="dash-card"><div class="dash-card-body" style="text-align:center;padding:3rem;">' +
      '<div style="font-size:3rem;margin-bottom:1rem;">&#x1F5D3;&#xFE0F;</div>' +
      '<p style="color:var(--color-text-muted);">No hay turnos para hoy (' + hoyArg + ')</p></div></div>';
  }
  turnos.sort((a,b) => a.hora.localeCompare(b.hora));
  let html = '<div style="margin-bottom:1rem;"><strong style="font-size:1.1rem;">&#x1F4C5; ' + hoyArg + '</strong> &#x2014; ' +
    '<span style="color:var(--color-text-muted);">' + turnos.length + ' turno' + (turnos.length!==1?'s':'') + '</span></div>';
  turnos.forEach(t => {
    html += '<div class="dash-card" style="margin-bottom:1rem;"><div class="dash-card-body">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;">' +
      '<div>' +
        '<div style="font-size:1.4rem;font-weight:800;color:var(--color-primary);">' + t.hora + ' hs</div>' +
        '<div style="font-size:1rem;font-weight:700;margin-top:.25rem;">' + t.paciente + '</div>' +
        '<div style="color:var(--color-text-muted);font-size:0.85rem;">' + t.estudio + '</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:.5rem;">' +
        _badgeEstado(t.estado) +
        (t.informe ? '<span style="font-size:0.75rem;color:#2e7d32;font-weight:600;">&#x2705; Informe cargado</span>' : '<span style="font-size:0.75rem;color:#f57c00;">&#x1F4CB; Sin informe</span>') +
        '<button class="btn btn-outline" style="font-size:0.8rem;padding:4px 12px;" onclick="viewMedTurnoDetail(' + t.id + ')">Ver detalle &#x2192;</button>' +
      '</div></div></div></div>';
  });
  return html;
}

// Override showMedView para usar las nuevas funciones
const _origShowMedView = showMedView;
function showMedView(view) {
  document.querySelectorAll('#sidebarMed .sidebar-link').forEach(l => l.classList.remove('active'));
  if (typeof event !== 'undefined' && event && event.target && event.target.closest)
    event.target.closest('.sidebar-link') && event.target.closest('.sidebar-link').classList.add('active');

  const titles = { 'hoy': 'Agenda de Hoy', 'semana': 'Esta Semana', 'todos': 'Todos los Turnos', 'pacientes': 'Pacientes' };
  document.getElementById('medViewTitle').textContent = titles[view] || 'Portal M&#xE9;dico';

  const content = document.getElementById('medContent');
  document.getElementById('sidebarMed').classList.remove('mobile-open');
  const overlay = document.getElementById('sidebarOverlayMed');
  if (overlay) overlay.classList.remove('active');

  content.innerHTML = '<p style="color:var(--color-text-muted);text-align:center;padding:3rem;">Cargando...</p>';
  cargarTurnos().then(() => {
    if      (view === 'hoy')       content.innerHTML = _medAgendaHoyV2();
    else if (view === 'semana')    content.innerHTML = _medAgendaSemanaV2();
    else if (view === 'todos')     content.innerHTML = _medTodosTurnosV2();
    else if (view === 'pacientes') _medPacientes(content);
  });
}

function _medAgendaSemanaV2() {
  const hoy = new Date();
  const semana = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(hoy); d.setDate(hoy.getDate() + i);
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    semana.push(dd + '/' + mm + '/' + d.getFullYear());
  }
  let html = '';
  semana.forEach(fechaArg => {
    const turnos = APP.turnos.filter(t => t.fecha === fechaArg && t.estado !== 'Denegado');
    if (!turnos.length) return;
    html += '<div class="dash-card" style="margin-bottom:1rem;"><div class="dash-card-header"><h4>&#x1F4C5; ' + fechaArg + '</h4>' +
      '<span class="badge badge-approved">' + turnos.length + ' turno' + (turnos.length!==1?'s':'') + '</span></div>' +
      '<div class="dash-card-body"><table class="data-table"><thead><tr><th>Hora</th><th>Paciente</th><th>Estudio</th><th>Estado</th><th>Informe</th><th></th></tr></thead><tbody>';
    turnos.sort((a,b) => a.hora.localeCompare(b.hora)).forEach(t => {
      html += '<tr><td><strong>' + t.hora + '</strong></td><td>' + t.paciente + '</td>' +
        '<td style="font-size:0.85rem;">' + t.estudio + '</td><td>' + _badgeEstado(t.estado) + '</td>' +
        '<td>' + (t.informe ? '<span style="color:#2e7d32;font-size:0.8rem;">&#x2705; Cargado</span>' : '<span style="color:#f57c00;font-size:0.8rem;">Pendiente</span>') + '</td>' +
        '<td><button class="btn btn-outline" style="font-size:0.75rem;padding:3px 10px;" onclick="viewMedTurnoDetail(' + t.id + ')">Ver &#x2192;</button></td></tr>';
    });
    html += '</tbody></table></div></div>';
  });
  if (!html) html = '<div class="dash-card"><div class="dash-card-body" style="text-align:center;padding:3rem;"><div style="font-size:3rem;">&#x1F4C5;</div><p style="color:var(--color-text-muted);">No hay turnos esta semana</p></div></div>';
  return html;
}

function _medTodosTurnosV2() {
  const turnos = [...APP.turnos].filter(t => t.estado !== 'Denegado').sort((a,b) => {
    if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
    return a.hora.localeCompare(b.hora);
  });
  if (!turnos.length) return '<div class="dash-card"><div class="dash-card-body" style="text-align:center;padding:3rem;"><p>No hay turnos</p></div></div>';
  let html = '<div class="dash-card"><div class="dash-card-body" style="overflow-x:auto;"><table class="data-table">' +
    '<thead><tr><th>Fecha</th><th>Hora</th><th>Paciente</th><th>Estudio</th><th>Estado</th><th>Informe</th><th></th></tr></thead><tbody>';
  turnos.forEach(t => {
    html += '<tr>' +
      '<td>' + t.fecha + '</td><td><strong>' + t.hora + '</strong></td>' +
      '<td>' + t.paciente + '</td><td style="font-size:0.85rem;">' + t.estudio + '</td>' +
      '<td>' + _badgeEstado(t.estado) + '</td>' +
      '<td>' + (t.informe ? '<span style="color:#2e7d32;font-size:0.8rem;">&#x2705;</span>' : '<span style="color:#bbb;font-size:0.8rem;">&#x2014;</span>') + '</td>' +
      '<td><button class="btn btn-outline" style="font-size:0.75rem;padding:3px 10px;" onclick="viewMedTurnoDetail(' + t.id + ')">Ver &#x2192;</button></td>' +
      '</tr>';
  });
  html += '</tbody></table></div></div>';
  return html;
}

// ============================================================
//  PACIENTE — MIS ESTUDIOS (con informes)
// ============================================================
function renderMisEstudios() {
  const turnos = APP.turnos
    .filter(t => t.estado !== 'Denegado' && t.estado !== 'Pendiente de autorizaci\xF3n')
    .sort((a,b) => b.fecha.localeCompare(a.fecha));

  if (!turnos.length) {
    return '<div class="dash-card"><div class="dash-card-body" style="text-align:center;padding:3rem;">' +
      '<div style="font-size:3rem;margin-bottom:1rem;">&#x1F4CA;</div>' +
      '<p style="color:var(--color-text-muted);">Todav&#xED;a no ten&#xE9;s estudios realizados.</p></div></div>';
  }

  let html = '<p style="color:var(--color-text-muted);margin-bottom:1rem;font-size:0.9rem;">Tus estudios confirmados y aprobados</p>';
  turnos.forEach(t => {
    html += '<div class="dash-card" style="margin-bottom:1rem;"><div class="dash-card-body">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;">' +
      '<div>' +
        '<div style="font-weight:700;font-size:1rem;color:var(--color-primary);">' + t.estudio + '</div>' +
        '<div style="color:var(--color-text-muted);font-size:0.85rem;margin-top:.25rem;">&#x1F4C5; ' + t.fecha + ' &#x2014; ' + t.hora + ' hs</div>' +
        '<div style="margin-top:.25rem;">' + _badgeEstado(t.estado) + '</div>' +
      '</div>' +
      '<div>';
    if (t.informe) {
      html +=
        '<div style="background:#e8f5e9;border:1px solid #c8e6c9;border-radius:8px;padding:10px 14px;text-align:center;">' +
        '<div style="font-size:0.8rem;color:#2e7d32;font-weight:700;margin-bottom:6px;">&#x2705; Informe disponible</div>' +
        '<a href="' + _archivoURL(t.informe) + '" target="_blank" class="btn btn-primary" style="font-size:0.8rem;padding:6px 14px;margin-right:4px;">&#x1F4C4; Ver</a>' +
        '<a href="' + _archivoURL(t.informe) + '&download=1" class="btn btn-outline" style="font-size:0.8rem;padding:6px 14px;border-color:var(--color-border);color:var(--color-primary);">&#x2B07;&#xFE0F; Descargar</a>' +
        '</div>';
    } else {
      html += '<div style="font-size:0.8rem;color:var(--color-text-muted);padding:8px 12px;background:#f8f9fa;border-radius:6px;">&#x1F4CB; Informe no disponible a&#xFA;n</div>';
    }
    html += '</div></div></div></div>';
  });
  return html;
}


// ============================================================
//  PORTAL MÉDICO — NAVEGADOR POR DÍA (reemplaza Agenda de Hoy)
// ============================================================

// Estado del navegador de días
if (!window.APP) window.APP = {};
APP.medNavDate = new Date();

function _formatFechaArg(date) {
  const dd = String(date.getDate()).padStart(2,'0');
  const mm = String(date.getMonth()+1).padStart(2,'0');
  return dd + '/' + mm + '/' + date.getFullYear();
}

function _formatFechaLabel(date) {
  const dias = ['Domingo','Lunes','Martes','Mi\xE9rcoles','Jueves','Viernes','S\xE1bado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return dias[date.getDay()] + ', ' + date.getDate() + ' de ' + meses[date.getMonth()] + ' de ' + date.getFullYear();
}

function medNavDay(delta) {
  APP.medNavDate = new Date(APP.medNavDate);
  APP.medNavDate.setDate(APP.medNavDate.getDate() + delta);
  const content = document.getElementById('medContent');
  content.innerHTML = _renderDayNavigator();
}

function _renderDayNavigator() {
  const date   = APP.medNavDate;
  const fechaArg = _formatFechaArg(date);
  const label  = _formatFechaLabel(date);
  const turnos = APP.turnos.filter(t => t.fecha === fechaArg && t.estado !== 'Denegado')
                   .sort((a,b) => a.hora.localeCompare(b.hora));

  const isHoy = _formatFechaArg(new Date()) === fechaArg;

  let html =
    // Navegador de fecha
    '<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap;">' +
    '<button onclick="medNavDay(-1)" style="width:40px;height:40px;border-radius:50%;border:2px solid var(--color-border);background:var(--color-white);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="D\xEDa anterior">&#x2190;</button>' +
    '<div style="flex:1;text-align:center;">' +
      '<div style="font-size:1.15rem;font-weight:800;color:var(--color-primary);">' + label + '</div>' +
      (isHoy ? '<span style="font-size:0.75rem;background:var(--color-primary);color:white;padding:2px 10px;border-radius:99px;">Hoy</span>' : '') +
    '</div>' +
    '<button onclick="medNavDay(1)" style="width:40px;height:40px;border-radius:50%;border:2px solid var(--color-border);background:var(--color-white);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="D\xEDa siguiente">&#x2192;</button>' +
    '<button onclick="APP.medNavDate=new Date();document.getElementById(\'medContent\').innerHTML=_renderDayNavigator();" style="font-size:0.8rem;padding:6px 14px;border-radius:6px;border:1px solid var(--color-border);background:white;cursor:pointer;color:var(--color-primary);">Hoy</button>' +
    '</div>';

  if (!turnos.length) {
    html += '<div class="dash-card"><div class="dash-card-body" style="text-align:center;padding:3rem;">' +
      '<div style="font-size:3rem;margin-bottom:1rem;">&#x1F5D3;&#xFE0F;</div>' +
      '<p style="color:var(--color-text-muted);">No hay turnos para este d\xEDa</p>' +
      '</div></div>';
    return html;
  }

  html += '<div style="margin-bottom:.75rem;color:var(--color-text-muted);font-size:0.9rem;">' +
    turnos.length + ' paciente' + (turnos.length !== 1 ? 's' : '') + ' agendado' + (turnos.length !== 1 ? 's' : '') +
    '</div>';

  turnos.forEach(t => {
    const dc = t.datosClinic || {};
    const tieneInforme = !!t.informe;
    const fileInputId = 'infFile_' + t.id;

    html +=
      '<div class="dash-card" style="margin-bottom:1.25rem;">' +
      '<div class="dash-card-header" style="background:var(--color-bg);">' +
        '<div style="display:flex;align-items:center;gap:1rem;">' +
          '<div style="background:var(--color-primary);color:var(--color-gold);font-weight:800;font-size:1rem;padding:8px 14px;border-radius:8px;">' + t.hora + '</div>' +
          '<div>' +
            '<div style="font-weight:700;font-size:1rem;">' + t.paciente + '</div>' +
            '<div style="font-size:0.85rem;color:var(--color-text-muted);">' + t.estudio + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:.5rem;">' +
          _badgeEstado(t.estado) +
          (tieneInforme ? '<span style="font-size:0.75rem;color:#2e7d32;font-weight:700;background:#e8f5e9;padding:3px 8px;border-radius:99px;">&#x2705; Informe</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="dash-card-body">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1rem;">' +

          // Datos clínicos
          '<div>' +
          '<h5 style="font-size:0.78rem;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:.6rem;">Datos Cl\xEDnicos</h5>' +
          '<div style="font-size:0.85rem;display:grid;gap:.3rem;">' +
            _datoRow('Peso', dc.peso ? dc.peso + ' kg' : '-') +
            _datoRow('Altura', dc.altura ? dc.altura + ' cm' : '-') +
            _datoRow('Edad', dc.edad ? dc.edad + ' a\xF1os' : '-') +
            _datoRow('Sexo', dc.sexo || '-') +
            _datoRow('Alergias', dc.alergias || 'Ninguna') +
            _datoRow('Medicaci\xF3n', dc.medicacion || 'Ninguna') +
            _datoRow('Motivo', dc.motivo || '-') +
          '</div></div>' +

          // Informe
          '<div>' +
          '<h5 style="font-size:0.78rem;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:.6rem;">Informe M\xE9dico</h5>' +
          (tieneInforme
            ? '<div style="background:#e8f5e9;border:1px solid #c8e6c9;border-radius:8px;padding:10px;margin-bottom:.75rem;">' +
              '<div style="font-size:0.8rem;color:#2e7d32;font-weight:700;margin-bottom:6px;">&#x2705; Informe cargado</div>' +
              '<a href="' + _archivoURL(t.informe) + '" target="_blank" style="font-size:0.82rem;color:#1565c0;margin-right:8px;">&#x1F4C4; Ver</a>' +
              '<a href="' + _archivoURL(t.informe) + '&download=1" style="font-size:0.82rem;color:#1565c0;">&#x2B07;&#xFE0F; Descargar</a>' +
              '</div>'
            : '') +
          '<label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:.4rem;">' +
            (tieneInforme ? 'Reemplazar informe:' : 'Cargar informe (PDF/JPG/PNG):') +
          '</label>' +
          '<input type="file" id="' + fileInputId + '" accept=".pdf,.jpg,.jpeg,.png" style="font-size:0.82rem;width:100%;margin-bottom:.5rem;">' +
          '<button class="btn btn-primary" style="font-size:0.82rem;padding:6px 16px;width:100%;" onclick="uploadInformeDay(' + t.id + ',\'' + fileInputId + '\')">&#x1F4E4; Subir Informe</button>' +
          '</div>' +

        '</div>' +
      '</div></div>';
  });

  return html;
}

function _datoRow(label, value) {
  return '<div style="display:flex;gap:.5rem;"><span style="color:var(--color-text-muted);min-width:80px;">' + label + ':</span><span style="font-weight:600;">' + value + '</span></div>';
}

async function uploadInformeDay(turnoId, fileInputId) {
  const fileInput = document.getElementById(fileInputId);
  if (!fileInput || !fileInput.files[0]) { showToast('Seleccion\xE1 un archivo primero', 'error'); return; }
  const formData = new FormData();
  formData.append('informe', fileInput.files[0]);
  try {
    showToast('Subiendo informe...', 'info');
    const res = await fetch(API_URL + '/archivos/informe/' + turnoId, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + API_TOKEN },
      body: formData
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error al subir'); }
    showToast('Informe cargado correctamente');
    await cargarTurnos();
    document.getElementById('medContent').innerHTML = _renderDayNavigator();
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

// Override definitivo de showMedView con navegador de dias
showMedView = function(view) {
  document.querySelectorAll('#sidebarMed .sidebar-link').forEach(l => l.classList.remove('active'));
  if (typeof event !== 'undefined' && event && event.target && event.target.closest)
    event.target.closest && event.target.closest('.sidebar-link') && event.target.closest('.sidebar-link').classList.add('active');

  const titles = { 'hoy': 'Agenda', 'semana': 'Esta Semana', 'todos': 'Todos los Turnos', 'pacientes': 'Pacientes' };
  document.getElementById('medViewTitle').textContent = titles[view] || 'Portal M\xE9dico';

  const content = document.getElementById('medContent');
  const overlay = document.getElementById('sidebarOverlayMed');
  document.getElementById('sidebarMed').classList.remove('mobile-open');
  if (overlay) overlay.classList.remove('active');

  content.innerHTML = '<p style="color:var(--color-text-muted);text-align:center;padding:3rem;">Cargando...</p>';

  cargarTurnos().then(() => {
    if (view === 'hoy') {
      APP.medNavDate = new Date();
      content.innerHTML = _renderDayNavigator();
    } else if (view === 'semana') {
      content.innerHTML = _medAgendaSemanaV2();
    } else if (view === 'todos') {
      content.innerHTML = _medTodosTurnosV2();
    } else if (view === 'pacientes') {
      _medPacientes(content);
    }
  });
};

// ============================================================
//  PORTAL MÉDICO — PACIENTES: lista clickeable + detalle
// ============================================================

async function _medPacientesV2(content) {
  try {
    const pacientes = await apiCall('GET', '/pacientes');
    // Guardar lista para acceder desde el detalle
    APP._medPacientesList = pacientes;

    let html =
      '<p style="color:var(--color-text-muted);font-size:0.85rem;margin-bottom:1rem;">Hac\xE9 clic en un paciente para ver su historia cl\xEDnica y cargar informes.</p>' +
      '<div class="dash-card"><div class="dash-card-body" style="overflow-x:auto;">' +
      '<table class="data-table"><thead><tr><th>Paciente</th><th>DNI</th><th>Cobertura</th><th>Tel\xE9fono</th><th></th></tr></thead><tbody>';

    pacientes.forEach(p => {
      html +=
        '<tr style="cursor:pointer;" onclick="_medPatientDetail(\'' + p.dni.replace(/\./g,'') + '\')">' +
        '<td><strong>' + p.nombre + '</strong></td>' +
        '<td>' + p.dni + '</td>' +
        '<td>' + (p.cobertura||'-') + '</td>' +
        '<td>' + (p.telefono||'-') + '</td>' +
        '<td><button class="btn btn-outline" style="font-size:0.78rem;padding:3px 12px;" onclick="event.stopPropagation();_medPatientDetail(\'' + p.dni.replace(/\./g,'') + '\')">Ver &#x2192;</button></td>' +
        '</tr>';
    });
    html += '</tbody></table></div></div>';
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = '<p style="color:red;padding:2rem;">Error: ' + e.message + '</p>';
  }
}

async function _medPatientDetail(dni) {
  const content = document.getElementById('medContent');
  content.innerHTML = '<p style="color:var(--color-text-muted);text-align:center;padding:3rem;">Cargando...</p>';

  try {
    // Cargar datos del paciente y sus turnos frescos
    await cargarTurnosPorDni(dni);
    const p = APP._medPacientesList && APP._medPacientesList.find(x => x.dni.replace(/\./g,'') === dni);
    const nombre = p ? p.nombre : 'Paciente ' + dni;
    const turnos = APP._medPatientTurnos || [];

    let html =
      '<button class="btn btn-outline" style="margin-bottom:1rem;font-size:0.85rem;" onclick="_medPacientesV2(document.getElementById(\'medContent\'))">&#x2190; Volver a Pacientes</button>' +

      // Header paciente
      '<div class="dash-card" style="margin-bottom:1.5rem;">' +
      '<div class="dash-card-header"><h4>&#x1F464; ' + nombre + '</h4></div>' +
      '<div class="dash-card-body">' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;font-size:0.9rem;">' +
      '<div><span style="color:var(--color-text-muted);">DNI</span><br><strong>' + (p ? p.dni : dni) + '</strong></div>' +
      '<div><span style="color:var(--color-text-muted);">Cobertura</span><br><strong>' + (p ? (p.cobertura||'-') : '-') + '</strong></div>' +
      '<div><span style="color:var(--color-text-muted);">Tel\xE9fono</span><br><strong>' + (p ? (p.telefono||'-') : '-') + '</strong></div>' +
      '<div><span style="color:var(--color-text-muted);">Email</span><br><strong>' + (p ? (p.email||'-') : '-') + '</strong></div>' +
      '</div></div></div>' +

      // Historial de turnos
      '<h4 style="font-size:0.9rem;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:1rem;">Historia Cl\xEDnica (' + turnos.length + ' turno' + (turnos.length!==1?'s':'') + ')</h4>';

    if (!turnos.length) {
      html += '<div class="dash-card"><div class="dash-card-body" style="text-align:center;padding:2rem;color:var(--color-text-muted);">Sin turnos registrados</div></div>';
    }

    turnos.sort((a,b) => b.fecha.localeCompare(a.fecha)).forEach(t => {
      const dc = t.datosClinic || {};
      const fileId = 'infPac_' + t.id;
      const tieneInforme = !!t.informe;

      html +=
        '<div class="dash-card" style="margin-bottom:1rem;">' +
        '<div class="dash-card-header" style="background:var(--color-bg);">' +
          '<div>' +
            '<div style="font-weight:700;">' + t.estudio + '</div>' +
            '<div style="font-size:0.85rem;color:var(--color-text-muted);">&#x1F4C5; ' + t.fecha + ' &#x2014; ' + t.hora + ' hs</div>' +
          '</div>' +
          '<div style="display:flex;gap:.5rem;align-items:center;">' +
            _badgeEstado(t.estado) +
            (tieneInforme ? '<span style="font-size:0.75rem;color:#2e7d32;font-weight:700;background:#e8f5e9;padding:3px 8px;border-radius:99px;">&#x2705; Informe</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="dash-card-body">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">' +

            // Datos clinicos
            '<div>' +
            '<h5 style="font-size:0.78rem;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:.6rem;">Datos Cl\xEDnicos</h5>' +
            '<div style="font-size:0.85rem;display:grid;gap:.3rem;">' +
              _datoRow('Peso',       dc.peso      ? dc.peso + ' kg'      : '-') +
              _datoRow('Altura',     dc.altura    ? dc.altura + ' cm'    : '-') +
              _datoRow('Edad',       dc.edad      ? dc.edad + ' a\xF1os' : '-') +
              _datoRow('Sexo',       dc.sexo      || '-') +
              _datoRow('Alergias',   dc.alergias  || 'Ninguna') +
              _datoRow('Medicaci\xF3n', dc.medicacion || 'Ninguna') +
              _datoRow('Antecedentes', dc.antecedentes || '-') +
              _datoRow('Motivo',     dc.motivo    || '-') +
            '</div></div>' +

            // Informe
            '<div>' +
            '<h5 style="font-size:0.78rem;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:.6rem;">Informe M\xE9dico</h5>' +
            (tieneInforme
              ? '<div style="background:#e8f5e9;border:1px solid #c8e6c9;border-radius:8px;padding:10px;margin-bottom:.75rem;">' +
                '<div style="font-size:0.8rem;color:#2e7d32;font-weight:700;margin-bottom:6px;">&#x2705; Informe cargado</div>' +
                '<a href="' + _archivoURL(t.informe) + '" target="_blank" style="font-size:0.82rem;color:#1565c0;margin-right:8px;">&#x1F4C4; Ver</a>' +
                '<a href="' + _archivoURL(t.informe) + '&download=1" style="font-size:0.82rem;color:#1565c0;">&#x2B07;&#xFE0F; Descargar</a>' +
                '</div>'
              : '') +
            '<label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:.4rem;">' + (tieneInforme ? 'Reemplazar:' : 'Cargar informe (PDF/JPG/PNG):') + '</label>' +
            '<input type="file" id="' + fileId + '" accept=".pdf,.jpg,.jpeg,.png" style="font-size:0.82rem;width:100%;margin-bottom:.5rem;">' +
            '<button class="btn btn-primary" style="font-size:0.82rem;padding:6px 16px;width:100%;" onclick="uploadInformePac(' + t.id + ',\'' + fileId + '\',\'' + dni + '\')">&#x1F4E4; Subir Informe</button>' +
            '</div>' +

          '</div>' +
        '</div></div>';
    });

    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = '<p style="color:red;padding:2rem;">Error: ' + e.message + '</p>';
  }
}

async function cargarTurnosPorDni(dni) {
  try {
    const turnos = await apiCall('GET', '/turnos?dni=' + dni);
    APP._medPatientTurnos = turnos.map(normalizeTurno);
  } catch (e) {
    // fallback: filtrar desde APP.turnos
    APP._medPatientTurnos = APP.turnos.filter(t => t.dni === dni);
  }
}

async function uploadInformePac(turnoId, fileInputId, dni) {
  const fileInput = document.getElementById(fileInputId);
  if (!fileInput || !fileInput.files[0]) { showToast('Seleccion\xE1 un archivo primero', 'error'); return; }
  const formData = new FormData();
  formData.append('informe', fileInput.files[0]);
  try {
    showToast('Subiendo informe...', 'info');
    const res = await fetch(API_URL + '/archivos/informe/' + turnoId, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + API_TOKEN },
      body: formData
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error al subir'); }
    showToast('Informe cargado correctamente');
    await cargarTurnos();
    _medPatientDetail(dni);
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

// Override final de showMedView — usa _medPacientesV2
showMedView = function(view) {
  document.querySelectorAll('#sidebarMed .sidebar-link').forEach(l => l.classList.remove('active'));
  if (typeof event !== 'undefined' && event && event.target && event.target.closest)
    event.target.closest('.sidebar-link') && event.target.closest('.sidebar-link').classList.add('active');

  const titles = { 'hoy': 'Agenda', 'semana': 'Esta Semana', 'todos': 'Todos los Turnos', 'pacientes': 'Pacientes' };
  document.getElementById('medViewTitle').textContent = titles[view] || 'Portal M\xE9dico';

  const content = document.getElementById('medContent');
  document.getElementById('sidebarMed').classList.remove('mobile-open');
  const ov = document.getElementById('sidebarOverlayMed');
  if (ov) ov.classList.remove('active');

  content.innerHTML = '<p style="color:var(--color-text-muted);text-align:center;padding:3rem;">Cargando...</p>';

  if (view === 'pacientes') {
    _medPacientesV2(content);
    return;
  }

  cargarTurnos().then(() => {
    if (view === 'hoy') {
      APP.medNavDate = new Date();
      content.innerHTML = _renderDayNavigator();
    } else if (view === 'semana') {
      content.innerHTML = _medAgendaSemanaV2();
    } else if (view === 'todos') {
      content.innerHTML = _medTodosTurnosV2();
    }
  });
};
