const signInTab = document.getElementById('signInTab');
const registerTab = document.getElementById('registerTab');
const signInPanel = document.getElementById('signInPanel');
const registerPanel = document.getElementById('registerPanel');
const signInForm = document.getElementById('signInForm');
const registerForm = document.getElementById('registerForm');
const signInMessage = document.getElementById('signInMessage');
const registerMessage = document.getElementById('registerMessage');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const AUTH_API_BASE = '/api/auth';

let googleClientId = '';
let googleInitialized = false;

function saveAuthSession(user, token) {
  const payload = JSON.stringify(user);

  sessionStorage.setItem('gdgCurrentUser', payload);
  sessionStorage.setItem('gdgAuthToken', token);
  localStorage.removeItem('gdgCurrentUser');
  localStorage.removeItem('gdgAuthToken');
}

function getRedirectTarget() {
  const url = new URL(window.location.href);
  const target = url.searchParams.get('redirect');
  return target || 'main page.html';
}

function switchPanel(target) {
  const toSignIn = target === 'signin';

  signInTab.classList.toggle('active', toSignIn);
  registerTab.classList.toggle('active', !toSignIn);

  signInTab.setAttribute('aria-selected', String(toSignIn));
  registerTab.setAttribute('aria-selected', String(!toSignIn));

  signInPanel.classList.toggle('active', toSignIn);
  registerPanel.classList.toggle('active', !toSignIn);

  signInPanel.hidden = !toSignIn;
  registerPanel.hidden = toSignIn;

  signInMessage.textContent = '';
  registerMessage.textContent = '';
  signInMessage.className = 'form-message';
  registerMessage.className = 'form-message';
}

signInTab.addEventListener('click', () => switchPanel('signin'));
registerTab.addEventListener('click', () => switchPanel('register'));

setupGoogleSignIn();

if (googleSignInBtn) {
  googleSignInBtn.addEventListener('click', () => {
    triggerGoogleSignIn();
  });
}

document.querySelectorAll('.toggle-visibility').forEach((button) => {
  button.addEventListener('click', () => {
    const targetInput = document.getElementById(button.dataset.target);
    const icon = button.querySelector('i');
    const isHidden = targetInput.type === 'password';

    targetInput.type = isHidden ? 'text' : 'password';
    icon.classList.toggle('fa-eye', !isHidden);
    icon.classList.toggle('fa-eye-slash', isHidden);
  });
});

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function setupGoogleSignIn() {
  if (!googleSignInBtn) return;

  try {
    const response = await fetch(`${AUTH_API_BASE}/google-config`);
    const result = await response.json();

    if (!response.ok || !result.success || !result.enabled || !result.clientId) {
      googleSignInBtn.style.display = 'none';
      return;
    }

    googleClientId = result.clientId;
  } catch (error) {
    googleSignInBtn.style.display = 'none';
  }
}

function ensureGoogleInitialized() {
  if (googleInitialized) return true;
  if (!googleClientId) return false;
  if (!window.google || !window.google.accounts || !window.google.accounts.id) {
    return false;
  }

  window.google.accounts.id.initialize({
    client_id: googleClientId,
    callback: handleGoogleCredential,
    ux_mode: 'popup'
  });

  googleInitialized = true;
  return true;
}

function triggerGoogleSignIn() {
  if (!googleSignInBtn) return;

  if (!ensureGoogleInitialized()) {
    signInMessage.textContent = 'تعذر تهيئة تسجيل الدخول عبر Google حالياً.';
    signInMessage.className = 'form-message error';
    return;
  }

  signInMessage.textContent = '';
  signInMessage.className = 'form-message';

  window.google.accounts.id.prompt();
}

async function handleGoogleCredential(googleResponse) {
  const credential = String(googleResponse && googleResponse.credential ? googleResponse.credential : '').trim();

  if (!credential) {
    signInMessage.textContent = 'لم يتم استلام بيانات Google. حاول مرة أخرى.';
    signInMessage.className = 'form-message error';
    return;
  }

  try {
    const response = await fetch(`${AUTH_API_BASE}/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ idToken: credential })
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'فشل تسجيل الدخول عبر Google.');
    }

    saveAuthSession(result.user, result.token);
    signInMessage.textContent = 'تم تسجيل الدخول عبر Google بنجاح.';
    signInMessage.className = 'form-message success';
    setTimeout(() => {
      window.location.href = getRedirectTarget();
    }, 450);
  } catch (error) {
    signInMessage.textContent = error.message || 'تعذر تسجيل الدخول عبر Google.';
    signInMessage.className = 'form-message error';
  }
}

signInForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = signInForm.email.value.trim();
  const password = signInForm.password.value;

  if (!isValidEmail(email)) {
    signInMessage.textContent = 'يرجى إدخال بريد إلكتروني صحيح.';
    signInMessage.className = 'form-message error';
    return;
  }

  if (password.length < 8) {
    signInMessage.textContent = 'يجب أن تكون كلمة المرور 8 أحرف على الأقل.';
    signInMessage.className = 'form-message error';
    return;
  }

  try {
    const response = await fetch(`${AUTH_API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'فشل تسجيل الدخول.');
    }

    saveAuthSession(result.user, result.token);
    signInMessage.textContent = 'تم تسجيل الدخول بنجاح.';
    signInMessage.className = 'form-message success';
    setTimeout(() => {
      window.location.href = getRedirectTarget();
    }, 450);
  } catch (error) {
    signInMessage.textContent = error.message || 'حدث خطأ أثناء تسجيل الدخول.';
    signInMessage.className = 'form-message error';
  }
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const fullName = registerForm.name.value.trim();
  const email = registerForm.email.value.trim();
  const password = registerForm.password.value;
  const confirmPassword = registerForm.confirmPassword.value;

  if (fullName.length < 3) {
    registerMessage.textContent = 'يجب أن يكون الاسم الكامل 3 أحرف على الأقل.';
    registerMessage.className = 'form-message error';
    return;
  }

  if (!isValidEmail(email)) {
    registerMessage.textContent = 'يرجى إدخال بريد إلكتروني صحيح.';
    registerMessage.className = 'form-message error';
    return;
  }

  if (password.length < 8) {
    registerMessage.textContent = 'يجب أن تكون كلمة المرور 8 أحرف على الأقل.';
    registerMessage.className = 'form-message error';
    return;
  }

  if (password !== confirmPassword) {
    registerMessage.textContent = 'تأكيد كلمة المرور غير مطابق.';
    registerMessage.className = 'form-message error';
    return;
  }

  try {
    const response = await fetch(`${AUTH_API_BASE}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: fullName,
        email,
        password
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'فشل إنشاء الحساب.');
    }

    saveAuthSession(result.user, result.token);
    registerMessage.textContent = 'تم إنشاء الحساب بنجاح. سيتم تحويلك الآن.';
    registerMessage.className = 'form-message success';
    registerForm.reset();
    setTimeout(() => {
      window.location.href = getRedirectTarget();
    }, 550);
  } catch (error) {
    registerMessage.textContent = error.message || 'حدث خطأ أثناء إنشاء الحساب.';
    registerMessage.className = 'form-message error';
  }
});
