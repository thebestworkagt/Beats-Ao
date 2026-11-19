(function (global) {
  'use strict';

  function attach(options) {
    const {
      url,
      playButton,
      nextButton,
      progress,
      timeDisplay,
      volumeSlider,
      volumeIcon,
      onPlay,
      onUnavailable
    } = options || {};

    let audio = null;
    let isPlaying = false;

    function updatePlayButton(playing) {
      isPlaying = playing;
      if (playButton) {
        playButton.innerHTML = playing
          ? '<i class="fas fa-pause"></i>'
          : '<i class="fas fa-play"></i>';
      }
    }

    function resetPlayback() {
      updatePlayButton(false);
      if (progress) progress.value = 0;
      if (timeDisplay) timeDisplay.textContent = '0:00';
    }

    function ensureAudio() {
      if (audio || !url) return audio;
      audio = new Audio(url);
      audio.volume = volumeSlider ? Number(volumeSlider.value) / 100 : 0.7;

      audio.addEventListener('timeupdate', () => {
        if (!audio || !audio.duration) return;
        const percent = (audio.currentTime / audio.duration) * 100;
        if (progress) progress.value = percent;
        const mins = Math.floor(audio.currentTime / 60);
        const secs = Math.floor(audio.currentTime % 60);
        if (timeDisplay) {
          timeDisplay.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
      });

      audio.addEventListener('ended', resetPlayback);
      audio.addEventListener('error', resetPlayback);
      return audio;
    }

    function startPlayback(countPlay) {
      const player = ensureAudio();
      if (!player) return false;

      const result = player.play();
      updatePlayButton(true);
      if (countPlay && typeof onPlay === 'function') onPlay();

      if (result && typeof result.catch === 'function') {
        result.catch(resetPlayback);
      }
      return true;
    }

    if (playButton) {
      playButton.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();

        if (!url) {
          if (typeof onUnavailable === 'function') onUnavailable();
          return;
        }

        if (isPlaying && audio) {
          audio.pause();
          updatePlayButton(false);
          return;
        }

        startPlayback(true);
      });
    }

    if (nextButton) {
      nextButton.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (!url) return;

        const player = ensureAudio();
        if (!player) return;
        try {
          player.currentTime = 0;
        } catch (error) {
          // O áudio pode ainda não ter metadata; o início fica para quando carregar.
        }
        if (!isPlaying) startPlayback(false);
      });
    }

    if (progress) {
      progress.addEventListener('input', () => {
        if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
          audio.currentTime = (Number(progress.value) / 100) * audio.duration;
        }
      });
    }

    if (volumeSlider) {
      volumeSlider.addEventListener('input', () => {
        if (!audio) return;
        audio.volume = Number(volumeSlider.value) / 100;
        if (volumeIcon) {
          volumeIcon.className = audio.volume === 0
            ? 'fas fa-volume-mute'
            : 'fas fa-volume-low';
        }
      });
    }

    return Object.freeze({
      pause: () => {
        if (!audio) return;
        audio.pause();
        updatePlayButton(false);
      },
      getAudio: () => audio
    });
  }

  global.BeatsAoCardPlayer = Object.freeze({ attach });
})(window);
