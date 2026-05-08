const form = document.getElementById('loginForm');
const msg = document.getElementById('msg');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const submitBtn = document.getElementById('submitBtn');

if (localStorage.getItem('idp_token')) {
  window.location.href = '/dashboard.html';
}

document.querySelectorAll('.demo-accounts .acc').forEach((el) => {
  el.addEventListener('click', () => {
    emailInput.value = el.dataset.email;
    passwordInput.value = el.dataset.password;
    emailInput.focus();
  });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  msg.className = 'msg';
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Connexion...';

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
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
      Se connecter
    `;
  }
});
