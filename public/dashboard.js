const token = localStorage.getItem('idp_token');
const user = JSON.parse(localStorage.getItem('idp_user') || 'null');

if (!token || !user) {
  window.location.href = '/';
}

const userInfo = document.getElementById('userInfo');
userInfo.textContent = `${user.fullName} — ${user.role}`;

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('idp_token');
  localStorage.removeItem('idp_user');
  window.location.href = '/';
});

const authHeaders = () => ({ Authorization: `Bearer ${token}` });

async function loadFiles() {
  const list = document.getElementById('filesList');
  try {
    const res = await fetch('/api/files', { headers: authHeaders() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const docs = await res.json();
    list.innerHTML = '';
    docs.forEach((d) => {
      const item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML = `
        <div>
          <div><strong>${d.name}</strong></div>
          <div class="meta">${d.category} • ${d.createdAt} • ${d.owner}</div>
        </div>
        <button>Lire</button>
      `;
      item.addEventListener('click', () => loadFile(d.id));
      list.appendChild(item);
    });
  } catch (err) {
    list.textContent = 'Erreur : ' + err.message;
  }
}

async function loadFile(id) {
  const preview = document.getElementById('filePreview');
  preview.textContent = 'Chargement…';
  try {
    const res = await fetch(`/api/files/${id}`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) {
      preview.textContent = data.error || 'Erreur';
      return;
    }
    preview.innerHTML = `<h3>${data.name}</h3><div class="meta">${data.description}</div><hr/>`;
    const pre = document.createElement('pre');
    pre.textContent = data.content;
    preview.appendChild(pre);
  } catch (err) {
    preview.textContent = 'Erreur : ' + err.message;
  }
}

async function loadUploads() {
  const el = document.getElementById('uploadsList');
  try {
    const res = await fetch('/api/uploads', { headers: authHeaders() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const files = await res.json();
    if (files.length === 0) {
      el.innerHTML = '<em>Aucun fichier uploadé.</em>';
      return;
    }
    el.innerHTML = '';
    files.forEach((f) => {
      const div = document.createElement('div');
      div.className = 'file-item';
      div.innerHTML = `<span>${f.name}</span><span class="meta">${(f.size / 1024).toFixed(1)} Ko</span>`;
      el.appendChild(div);
    });
  } catch (err) {
    el.textContent = 'Erreur : ' + err.message;
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
      return;
    }
    msg.textContent = `OK — ${data.file.originalName} stocké sous ${data.file.storedAs}`;
    msg.classList.add('ok');
    formEl.reset();
    loadUploads();
  } catch (err) {
    msg.textContent = 'Erreur : ' + err.message;
    msg.classList.add('error');
  }
});

async function loadStatus() {
  const box = document.getElementById('statusBox');
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    box.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    box.textContent = 'Erreur : ' + err.message;
  }
}

loadFiles();
loadUploads();
loadStatus();
