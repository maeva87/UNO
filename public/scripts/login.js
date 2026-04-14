const container   = document.getElementById('container');
const btnSignUp   = document.getElementById('signUp');
const btnSignIn   = document.getElementById('signIn');

const signupForm  = document.getElementById('signup-form');
const suUsername  = document.getElementById('su-username');
const suPassword  = document.getElementById('su-password');
const suUserErr   = document.getElementById('su-username-err');
const suPassErr   = document.getElementById('su-password-err');
const ppInput     = document.getElementById('pp-input');
const ppPreview   = document.getElementById('pp-preview');
const strengthBar = document.getElementById('strength-bar');
const strengthLbl = document.getElementById('strength-label');

const signinForm  = document.getElementById('signin-form');
const siUsername  = document.getElementById('si-username');
const siPassword  = document.getElementById('si-password');
const siUserErr   = document.getElementById('si-username-err');
const siPassErr   = document.getElementById('si-password-err');

btnSignUp.addEventListener('click', () => {
  container.classList.add('right-panel-active');
});

btnSignIn.addEventListener('click', () => {
  container.classList.remove('right-panel-active');
});

ppInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please select an image (JPG, PNG, etc.)', 'error');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showToast("The image must be less than 5 MB.", 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => { ppPreview.src = ev.target.result; };
  reader.readAsDataURL(file);
});

document.querySelectorAll('.toggle-pw').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.textContent = isHidden ? '🙈' : '👁';
  });
});

const STRENGTH_LEVELS = [
  { label: 'Short',  color: '#E63946', width: '15%'  },
  { label: 'Low',      color: '#f4a261', width: '35%'  },
  { label: 'Medium',       color: '#e9c46a', width: '60%'  },
  { label: 'Strengh',        color: '#2a9d5c', width: '85%'  },
  { label: 'Excalibur !', color: '#1d8a4e', width: '100%' },
];

function getPasswordScore(value) {
  let score = 0;
  if (value.length >= 6)                      score++;
  if (value.length >= 12)                     score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/[0-9]/.test(value))                    score++;
  if (/[$#@!%&*?^~\-_=+]/.test(value))       score++;
  return Math.min(score, STRENGTH_LEVELS.length - 1);
}

suPassword.addEventListener('input', () => {
  const val = suPassword.value;

  if (!val) {
    strengthBar.style.width    = '0%';
    strengthLbl.textContent    = '';
    return;
  }

  const lvl = STRENGTH_LEVELS[getPasswordScore(val)];
  strengthBar.style.width      = lvl.width;
  strengthBar.style.background = lvl.color;
  strengthLbl.textContent      = lvl.label;
  strengthLbl.style.color      = lvl.color;
});

function validateUsername(val) {
  const v = val.trim();
  if (v.length < 3)  return 'At least 3 characters.';
  if (v.length > 20) return 'Maximum 20 characters.';
  return null;
}

function validatePassword(val) {
  if (val.length < 6)                         return 'At least 6 characters.';
  if (!/[a-zA-Z]/.test(val))                 return 'Must contain at least one letter.';
  if (!/[0-9]/.test(val))                    return 'Must contain at least one digit.';
  if (!/[$#@!%&*?^~\-_=+]/.test(val))       return 'Must contain a special character ($, #, @...).';
  return null;
}

function setFieldState(input, errorEl, errorMsg) {
  if (errorMsg) {
    errorEl.textContent = errorMsg;
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
  } else {
    errorEl.textContent = '';
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
  }
  return !errorMsg;
}

suUsername.addEventListener('input', () =>
  setFieldState(suUsername, suUserErr, validateUsername(suUsername.value))
);
suPassword.addEventListener('input', () =>
  setFieldState(suPassword, suPassErr, validatePassword(suPassword.value))
);
siUsername.addEventListener('input', () =>
  setFieldState(siUsername, siUserErr, validateUsername(siUsername.value))
);
siPassword.addEventListener('input', () =>
  setFieldState(siPassword, siPassErr, validatePassword(siPassword.value))
);

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const usernameOK = setFieldState(suUsername, suUserErr, validateUsername(suUsername.value));
  const passwordOK = setFieldState(suPassword, suPassErr, validatePassword(suPassword.value));

  if (!usernameOK || !passwordOK) return;

  const payload = {
    username: suUsername.value.trim(),
    password: suPassword.value,
  };

  try {
    const res  = await fetch('/api/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'An error occurred whilst creating the account.', 'error');
      return;
    }
    localStorage.setItem('token',    data.token);
    localStorage.setItem('userId',   data.userId);
    localStorage.setItem('username', payload.username);
    showToast('Account created! Welcomee 🎉', 'success');
    setTimeout(() => { window.location.href = 'lobby.html'; }, 1200);
  } catch (err) {
    console.error('[Sign Up] Network error :', err);
    showToast('Unable to contact the server.', 'error');
  }
});

signinForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const usernameOK = setFieldState(siUsername, siUserErr, validateUsername(siUsername.value));
  const passwordOK = setFieldState(siPassword, siPassErr, validatePassword(siPassword.value));

  if (!usernameOK || !passwordOK) return;

  const payload = {
    username: siUsername.value.trim(),
    password: siPassword.value,
  };

  try {
    const res  = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Nice to see you again.', 'error');
      return;
    }
    localStorage.setItem('token',    data.token);
    localStorage.setItem('userId',   data.userId);
    localStorage.setItem('username', data.username);
    showToast(`Nice to see you, ${data.username} ! 🃏`, 'success');
    setTimeout(() => { window.location.href = 'lobby.html'; }, 1200);
  } catch (err) {
    console.error('[Sign In] Network error :', err);
    showToast('Unable to contact the server.', 'error');
  }
});

function showToast(message, type = 'info') {
  document.querySelector('.toast')?.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;

  const colors = { success: '#2a9d5c', error: '#E63946', info: '#457B9D' };
  Object.assign(toast.style, {
    position:     'fixed',
    bottom:       '28px',
    left:         '50%',
    transform:    'translateX(-50%)',
    background:   colors[type] ?? colors.info,
    color:        '#fff',
    padding:      '10px 24px',
    borderRadius: '30px',
    fontFamily:   "'Nunito', sans-serif",
    fontWeight:   '700',
    fontSize:     '0.88rem',
    boxShadow:    '0 6px 20px rgba(0,0,0,.25)',
    zIndex:       '9999',
    animation:    'toastIn .3s ease',
    whiteSpace:   'nowrap',
  });

  if (!document.getElementById('toast-style')) {
    const s = document.createElement('style');
    s.id = 'toast-style';
    s.textContent = `
      @keyframes toastIn  { from { opacity:0; bottom:10px } to { opacity:1; bottom:28px } }
      @keyframes toastOut { from { opacity:1; bottom:28px } to { opacity:0; bottom:10px } }
    `;
    document.head.appendChild(s);
  }
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
