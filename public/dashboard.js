const token = localStorage.getItem('idp_token');
const user = JSON.parse(localStorage.getItem('idp_user') || 'null');

if (!token || !user) {
  window.location.href = '/';
}

// ===== Header / sidebar user =====
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const userAvatar = document.getElementById('userAvatar');
userName.textContent = user.fullName;
userRole.textContent = user.role;
userAvatar.textContent = (user.fullName || '?').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

if (user.role === 'admin') {
  document.querySelectorAll('.admin-only').forEach((el) => (el.style.display = ''));
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('idp_token');
  localStorage.removeItem('idp_user');
  window.location.href = '/';
});

const authHeaders = () => ({ Authorization: `Bearer ${token}` });

// ===== Toast =====
function toast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  const icon =
    type === 'ok'
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
      : type === 'error'
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  t.innerHTML = `${icon}<span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ===== Navigation =====
function setActivePage(pageName) {
  document.querySelectorAll('.page').forEach((p) => p.classList.toggle('active', p.dataset.page === pageName));
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.page === pageName));
  if (pageName === 'system') loadSystem();
  if (pageName === 'status') loadStatus();
}
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => setActivePage(btn.dataset.page));
});

// ===== Documents =====
function categoryClass(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('rh') || c.includes('hr')) return 'rh';
  if (c.includes('it') || c.includes('infra')) return 'it';
  if (c.includes('direction')) return 'direction';
  return '';
}

function fileIcon() {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
}

async function loadFiles() {
  const list = document.getElementById('filesList');
  try {
    const res = await fetch('/api/files', { headers: authHeaders() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const docs = await res.json();
    list.innerHTML = '';
    document.getElementById('kpiDocs').textContent = docs.length;
    document.getElementById('docCount').textContent = `${docs.length} fichier(s)`;
    docs.forEach((d) => {
      const item = document.createElement('div');
      item.className = 'doc-item';
      item.dataset.id = d.id;
      item.innerHTML = `
        <div class="doc-icon">${fileIcon()}</div>
        <div class="doc-info">
          <div class="doc-name">${d.name}</div>
          <div class="doc-meta">${d.createdAt} · ${d.owner}</div>
        </div>
        <span class="doc-tag ${categoryClass(d.category)}">${d.category}</span>
      `;
      item.addEventListener('click', () => {
        document.querySelectorAll('.doc-item').forEach((i) => i.classList.remove('active'));
        item.classList.add('active');
        loadFile(d.id);
      });
      list.appendChild(item);
    });
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Erreur : ${err.message}</div>`;
  }
}

async function loadFile(id) {
  const preview = document.getElementById('filePreview');
  preview.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const res = await fetch(`/api/files/${id}`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) {
      preview.innerHTML = `<div class="empty-state">${data.error || 'Erreur'}</div>`;
      return;
    }
    preview.innerHTML = `
      <h3>${data.name}</h3>
      <div class="desc">${data.description}</div>
      <hr/>
      <pre></pre>
    `;
    preview.querySelector('pre').textContent = data.content;
  } catch (err) {
    preview.innerHTML = `<div class="empty-state">Erreur : ${err.message}</div>`;
  }
}

// ===== Uploads =====
async function loadUploads() {
  const el = document.getElementById('uploadsList');
  try {
    const res = await fetch('/api/uploads', { headers: authHeaders() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const files = await res.json();
    document.getElementById('kpiUploads').textContent = files.length;
    document.getElementById('uploadsCount').textContent = `${files.length} fichier(s)`;
    if (files.length === 0) {
      el.innerHTML = `<div class="empty-state">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <div>Aucun fichier téléversé pour le moment.</div>
      </div>`;
      return;
    }
    el.innerHTML = '';
    files.forEach((f) => {
      const div = document.createElement('div');
      div.className = 'doc-item';
      div.innerHTML = `
        <div class="doc-icon">${fileIcon()}</div>
        <div class="doc-info">
          <div class="doc-name">${f.name}</div>
          <div class="doc-meta">${(f.size / 1024).toFixed(1)} Ko · ${new Date(f.uploadedAt).toLocaleString('fr-FR')}</div>
        </div>
      `;
      el.appendChild(div);
    });
  } catch (err) {
    el.innerHTML = `<div class="empty-state">Erreur : ${err.message}</div>`;
  }
}

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formEl = e.currentTarget;
  const msg = document.getElementById('uploadMsg');
  msg.textContent = '';
  msg.className = 'msg';

  const fd = new FormData(formEl);
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) {
      msg.textContent = data.error || 'Erreur';
      msg.classList.add('error');
      toast(data.error || 'Erreur upload', 'error');
      return;
    }
    msg.textContent = `OK — ${data.file.originalName} (${(data.file.size / 1024).toFixed(1)} Ko)`;
    msg.classList.add('ok');
    toast(`Document « ${data.file.originalName} » téléversé`, 'ok');
    formEl.reset();
    loadUploads();
  } catch (err) {
    msg.textContent = 'Erreur : ' + err.message;
    msg.classList.add('error');
  }
});

// ===== Status =====
async function loadStatus() {
  const box = document.getElementById('statusBox');
  box.textContent = '…';
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    box.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    box.textContent = 'Erreur : ' + err.message;
  }
}

// ===== System Health (admin) =====
async function loadSystem() {
  const kpis = document.getElementById('systemKpis');
  const hostInfo = document.getElementById('hostInfo');
  const containersTable = document.getElementById('containersTable');
  const imagesTable = document.getElementById('imagesTable');
  const containersCount = document.getElementById('containersCount');
  const imagesCount = document.getElementById('imagesCount');
  const alert = document.getElementById('systemAlert');

  hostInfo.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  containersTable.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  imagesTable.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  kpis.innerHTML = '';

  try {
    const res = await fetch('/api/admin/system', { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) {
      hostInfo.innerHTML = `<div class="empty-state">${data.error || 'Erreur'}</div>`;
      containersTable.innerHTML = '';
      imagesTable.innerHTML = '';
      return;
    }

    const h = data.host;
    hostInfo.innerHTML = `
      <div class="doc-item"><div class="doc-info"><div class="doc-name">Hostname</div><div class="doc-meta">${h.hostname}</div></div></div>
      <div class="doc-item"><div class="doc-info"><div class="doc-name">Plateforme</div><div class="doc-meta">${h.platform} ${h.arch}</div></div></div>
      <div class="doc-item"><div class="doc-info"><div class="doc-name">Node.js</div><div class="doc-meta">${h.nodeVersion}</div></div></div>
      <div class="doc-item"><div class="doc-info"><div class="doc-name">CPU</div><div class="doc-meta">${h.cpus} cœur(s)</div></div></div>
      <div class="doc-item"><div class="doc-info"><div class="doc-name">Mémoire</div><div class="doc-meta">${(h.memTotalMb / 1024).toFixed(1)} Go (libre : ${(h.memFreeMb / 1024).toFixed(1)} Go)</div></div></div>
      <div class="doc-item"><div class="doc-info"><div class="doc-name">Uptime</div><div class="doc-meta">${Math.floor(h.uptimeSec / 3600)} h ${Math.floor((h.uptimeSec % 3600) / 60)} min</div></div></div>
    `;

    if (!data.docker.available) {
      alert.className = 'alert danger';
      alert.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div><strong>Docker Engine inaccessible.</strong><br/>${data.docker.reason}</div>
      `;
      kpis.innerHTML = '';
      containersTable.innerHTML = '<div class="empty-state">Aucune donnée Docker disponible.</div>';
      imagesTable.innerHTML = '';
      containersCount.textContent = '';
      imagesCount.textContent = '';
      return;
    }

    alert.className = 'alert info';
    alert.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      <div><strong>Connexion au Docker Engine établie</strong> via <code>/var/run/docker.sock</code>. Cette pratique est <strong>déconseillée en production</strong> — voir <code>docs/HARDENING.md</code>.</div>
    `;

    const info = data.docker.info;
    kpis.innerHTML = `
      <div class="kpi"><div class="icon ok"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div><div><div class="label">Docker</div><div class="value">${info.serverVersion}</div></div></div>
      <div class="kpi"><div class="icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="2" width="20" height="20" rx="2"/></svg></div><div><div class="label">Conteneurs</div><div class="value">${info.containers}</div></div></div>
      <div class="kpi"><div class="icon ok"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div><div><div class="label">En cours</div><div class="value">${info.containersRunning}</div></div></div>
      <div class="kpi"><div class="icon warn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg></div><div><div class="label">Images</div><div class="value">${info.images}</div></div></div>
    `;

    containersCount.textContent = `${data.docker.containers.length} conteneur(s)`;
    if (data.docker.containers.length === 0) {
      containersTable.innerHTML = '<div class="empty-state">Aucun conteneur.</div>';
    } else {
      containersTable.innerHTML = `
        <table class="t">
          <thead><tr><th></th><th>Nom</th><th>Image</th><th>État</th><th>ID</th></tr></thead>
          <tbody>
            ${data.docker.containers
              .map(
                (c) => `
              <tr>
                <td><span class="status-dot ${c.state === 'running' ? 'ok' : 'warn'}"></span></td>
                <td><strong>${c.name}</strong></td>
                <td><code>${c.image}</code></td>
                <td>${c.status}</td>
                <td><code>${c.id}</code></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      `;
    }

    imagesCount.textContent = `${data.docker.images.length} image(s)`;
    if (data.docker.images.length === 0) {
      imagesTable.innerHTML = '<div class="empty-state">Aucune image.</div>';
    } else {
      imagesTable.innerHTML = `
        <table class="t">
          <thead><tr><th>Tag</th><th>Taille</th><th>ID</th></tr></thead>
          <tbody>
            ${data.docker.images
              .map(
                (img) => `
              <tr>
                <td><code>${img.tags.join(', ') || '<none>'}</code></td>
                <td>${img.sizeMb} Mo</td>
                <td><code>${img.id}</code></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      `;
    }
  } catch (err) {
    hostInfo.innerHTML = `<div class="empty-state">Erreur : ${err.message}</div>`;
  }
}

document.getElementById('refreshSystemBtn').addEventListener('click', loadSystem);

// ===== Init =====
document.getElementById('kpiRole').textContent = user.role;
loadFiles();
loadUploads();
