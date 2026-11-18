(function (global) {
  'use strict';

  let user = null;
  let emailVisible = true;

  function setUser(nextUser) {
    user = nextUser || null;
  }

  function maskEmail(email) {
    return email.replace(/[^@]/g, '•');
  }

  function load() {
    const saved = localStorage.getItem('bestBeatsEmailVisible');
    const email = user?.email || 'usuario@email.com';
    const emailElement = document.getElementById('emailText');
    const eyeIcon = document.getElementById('emailEyeIcon');
    if (!emailElement || !eyeIcon) return;

    emailVisible = saved !== 'false';
    emailElement.textContent = emailVisible ? email : maskEmail(email);
    eyeIcon.className = emailVisible ? 'fas fa-eye' : 'fas fa-eye-slash';
  }

  function toggle() {
    emailVisible = !emailVisible;
    const email = user?.email || 'usuario@email.com';
    const emailElement = document.getElementById('emailText');
    const eyeIcon = document.getElementById('emailEyeIcon');
    if (!emailElement || !eyeIcon) return;

    emailElement.textContent = emailVisible ? email : maskEmail(email);
    eyeIcon.className = emailVisible ? 'fas fa-eye' : 'fas fa-eye-slash';
    localStorage.setItem('bestBeatsEmailVisible', String(emailVisible));

    if (global.BeatsAoNotifications) {
      global.BeatsAoNotifications.showToast(
        emailVisible ? 'Email visível' : 'Email oculto',
        emailVisible ? 'O email está visível.' : 'O email foi ocultado.',
        'info',
        2000
      );
    }
  }

  global.BeatsAoProfilePrivacy = Object.freeze({ setUser, load, toggle });
})(window);
