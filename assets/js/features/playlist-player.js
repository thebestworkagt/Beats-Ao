(function (global) {
  'use strict';
  let audio = null;
  let activeId = null;
  let activeControls = null;

  function resetControls(controls) {
    if (!controls) return;
    if (controls.button) {
      controls.button.innerHTML = '<i class="fas fa-play"></i>';
      controls.button.classList.remove('playing');
    }
    if (controls.progress) controls.progress.style.width = '0%';
    if (controls.time) controls.time.textContent = '0:00';
  }

  function stop() {
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    resetControls(activeControls);
    audio = null;
    activeId = null;
    activeControls = null;
  }

  function toggle(options) {
    const { id, url, button, progress, time } = options || {};
    if (!url || id == null || !button) return false;
    if (activeId === id && audio && !audio.paused) {
      stop();
      return false;
    }

    stop();
    const controls = { button, progress, time };
    const nextAudio = new Audio(url);
    nextAudio.volume = 0.7;
    audio = nextAudio;
    activeId = id;
    activeControls = controls;
    button.innerHTML = '<i class="fas fa-pause"></i>';
    button.classList.add('playing');

    nextAudio.addEventListener('timeupdate', () => {
      if (audio !== nextAudio || !nextAudio.duration) return;
      const percent = (nextAudio.currentTime / nextAudio.duration) * 100;
      if (progress) progress.style.width = percent + '%';
      const mins = Math.floor(nextAudio.currentTime / 60);
      const secs = Math.floor(nextAudio.currentTime % 60);
      if (time) time.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    });
    nextAudio.addEventListener('ended', () => {
      if (audio !== nextAudio) return;
      resetControls(controls);
      audio = null;
      activeId = null;
      activeControls = null;
    });
    nextAudio.play().catch(() => {
      if (audio !== nextAudio) return;
      resetControls(controls);
      audio = null;
      activeId = null;
      activeControls = null;
    });
    return true;
  }

  global.BeatsAoPlaylistPlayer = Object.freeze({ toggle, stop });
})(window);
