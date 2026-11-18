(function (global) {
  'use strict';

  function removeToast(toast) {
    if (!toast || toast.classList.contains('removing')) return;
    toast.classList.add('removing');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 350);
  }

  function showToast(title, message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) {
      console.warn('Contentor de notificações não encontrado.');
      return null;
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      info: 'fa-info-circle'
    };

    const icon = icons[type] || icons.info;
    toast.innerHTML = `
      <div class="toast-icon ${type}"><i class="fas ${icon}"></i></div>
      <div class="toast-content"><div class="toast-title"></div><div class="toast-message"></div></div>
      <button class="toast-close" type="button" aria-label="Fechar notificação"><i class="fas fa-times"></i></button>
    `;

    toast.querySelector('.toast-title').textContent = title;
    toast.querySelector('.toast-message').textContent = message;
    container.appendChild(toast);
    toast.querySelector('.toast-close').addEventListener('click', () => removeToast(toast));

    if (duration > 0) setTimeout(() => removeToast(toast), duration);
    return toast;
  }

  function showShareToast(message) {
    const toast = document.getElementById('shareToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3000);
  }

  global.BeatsAoNotifications = Object.freeze({
    showToast,
    showShareToast
  });
})(window);
