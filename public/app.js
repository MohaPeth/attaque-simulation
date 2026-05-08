const form = document.getElementById('loginForm');
const msg = document.getElementById('msg');

if (localStorage.getItem('idp_token')) {
  window.location.href = '/dashboard.html';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  msg.className = 'msg';

  const data = Object.fromEntries(new FormData(form));

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (!res.ok) {
      msg.textContent = body.error || 'Erreur';
      msg.classList.add('error');
      return;
    }
    localStorage.setItem('idp_token', body.token);
    localStorage.setItem('idp_user', JSON.stringify(body.user));
    window.location.href = '/dashboard.html';
  } catch (err) {
    msg.textContent = 'Erreur réseau : ' + err.message;
    msg.classList.add('error');
  }
});
