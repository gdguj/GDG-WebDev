const signInTab = document.getElementById('signInTab');
const registerTab = document.getElementById('registerTab');
const signInPanel = document.getElementById('signInPanel');
const registerPanel = document.getElementById('registerPanel');
const signInForm = document.getElementById('signInForm');
const registerForm = document.getElementById('registerForm');
const signInMessage = document.getElementById('signInMessage');
const registerMessage = document.getElementById('registerMessage');

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

signInForm.addEventListener('submit', (event) => {
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

  signInMessage.textContent = 'نسخة تجريبية: تم التحقق من بيانات الدخول محليًا.';
  signInMessage.className = 'form-message success';
});

registerForm.addEventListener('submit', (event) => {
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

  registerMessage.textContent = 'نسخة تجريبية: الحساب جاهز للإرسال للواجهة الخلفية.';
  registerMessage.className = 'form-message success';
});
