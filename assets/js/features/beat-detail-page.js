(function () {
  'use strict';

  const API = window.BeatsAoApi;
  const $ = (selector) => document.querySelector(selector);
  const elements = {
    loader: $('#detailLoader'),
    error: $('#detailError'),
    content: $('#detailContent'),
    title: $('#detailTitle'),
    artist: $('#detailArtist'),
    cover: $('#detailCover'),
    coverPlaceholder: $('#detailCoverPlaceholder'),
    genre: $('#detailGenre'),
    bpm: $('#detailBpm'),
    musicalKey: $('#detailKey'),
    plays: $('#detailPlays'),
    price: $('#detailPrice'),
    description: $('#detailDescription'),
    licenseSummary: $('#detailLicenseSummary'),
    licenseTerms: $('#detailLicenseTerms'),
    previewAudio: $('#detailAudio'),
    playButton: $('#detailPlay'),
    seek: $('#detailSeek'),
    currentTime: $('#detailCurrentTime'),
    duration: $('#detailDuration'),
    cartButton: $('#detailCart'),
    shareButton: $('#detailShare'),
    negotiateButton: $('#detailNegotiate'),
    mp3Button: $('#detailDownloadMp3'),
    wavButton: $('#detailDownloadWav'),
    ratingAverage: $('#detailRatingAverage'),
    ratingCount: $('#detailRatingCount'),
    ratingStars: $('#detailRatingStars'),
    ratingSubmit: $('#detailRatingSubmit'),
    notice: $('#detailNotice'),
    related: $('#detailRelated'),
    dialog: $('#downloadDialog'),
    downloadForm: $('#downloadForm'),
    downloadPassword: $('#downloadPassword'),
    downloadFormat: $('#downloadFormat'),
    downloadError: $('#downloadError')
  };

  let beat = null;
  let selectedRating = 0;

  function showNotice(message, isError) {
    elements.notice.textContent = message || '';
    elements.notice.style.color = isError ? '#ff8585' : '';
  }

  function showError(title, message) {
    elements.loader.hidden = true;
    elements.content.hidden = true;
    elements.error.hidden = false;
    $('#detailErrorTitle').textContent = title;
    $('#detailErrorMessage').textContent = message;
  }

  function safeImageUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value, window.location.origin);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  function setMeta(selector, attribute, value) {
    const element = $(selector);
    if (element && value) element.setAttribute(attribute, value);
  }

  function applyMetadata(item) {
    const title = `${item.title || 'Beat'} — ${item.artist || 'Beats Ao'}`;
    const description = (item.description || item.license_summary || `Ouve e descobre ${item.title} no Beats Ao.`).slice(0, 155);
    document.title = title;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', window.location.href);
    setMeta('meta[property="og:image"]', 'content', safeImageUrl(item.cover) || `${window.location.origin}/logo1.png`);

    const canonical = $('#detailCanonical');
    if (canonical) canonical.href = `${window.location.origin}/beats/${encodeURIComponent(item.slug)}/`;

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'MusicRecording',
      name: item.title || 'Beat',
      byArtist: { '@type': 'MusicGroup', name: item.artist || 'Beats Ao' },
      genre: item.genre || undefined,
      image: safeImageUrl(item.cover) || undefined,
      url: `${window.location.origin}/beats/${encodeURIComponent(item.slug)}/`,
      duration: undefined
    };
    $('#detailJsonLd').textContent = JSON.stringify(jsonLd);
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  function syncCartButton() {
    if (!window.BeatsAoCart || !beat) return;
    const inCart = window.BeatsAoCart.includes(beat.id);
    elements.cartButton.innerHTML = inCart
      ? '<i class="fas fa-check"></i> No carrinho'
      : '<i class="fas fa-cart-plus"></i> Adicionar ao carrinho';
    elements.cartButton.setAttribute('aria-pressed', String(inCart));
  }

  function bindPlayer() {
    const audio = elements.previewAudio;
    if (!beat.audio) {
      elements.playButton.disabled = true;
      elements.playButton.title = 'Preview indisponível';
      elements.duration.textContent = 'Sem preview';
      return;
    }

    audio.src = beat.audio;
    elements.playButton.addEventListener('click', async () => {
      if (audio.paused) {
        try {
          await audio.play();
          elements.playButton.innerHTML = '<i class="fas fa-pause"></i>';
          elements.playButton.setAttribute('aria-label', 'Pausar preview');
          API.post('play', { beatId: beat.id }).catch(() => {});
        } catch {
          showNotice('Não foi possível reproduzir o preview.', true);
        }
      } else {
        audio.pause();
      }
    });

    audio.addEventListener('pause', () => {
      elements.playButton.innerHTML = '<i class="fas fa-play"></i>';
      elements.playButton.setAttribute('aria-label', 'Reproduzir preview');
    });
    audio.addEventListener('ended', () => {
      elements.playButton.innerHTML = '<i class="fas fa-play"></i>';
      elements.playButton.setAttribute('aria-label', 'Reproduzir preview');
      elements.seek.value = '0';
      elements.currentTime.textContent = '0:00';
    });
    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      elements.seek.value = String((audio.currentTime / audio.duration) * 100);
      elements.currentTime.textContent = formatTime(audio.currentTime);
    });
    audio.addEventListener('loadedmetadata', () => {
      elements.duration.textContent = formatTime(audio.duration);
    });
    audio.addEventListener('error', () => showNotice('O preview não está disponível neste momento.', true));
    elements.seek.addEventListener('input', () => {
      if (audio.duration) audio.currentTime = (Number(elements.seek.value) / 100) * audio.duration;
    });
  }

  function bindDownloads() {
    const formats = beat.available_formats || {};
    elements.mp3Button.hidden = formats.mp3 !== true;
    elements.wavButton.hidden = formats.wav !== true;

    const openDownload = (format) => {
      elements.downloadFormat.value = format;
      elements.downloadPassword.value = '';
      elements.downloadError.textContent = '';
      elements.dialog.showModal();
      elements.downloadPassword.focus();
    };

    elements.mp3Button.addEventListener('click', () => openDownload('mp3'));
    elements.wavButton.addEventListener('click', () => openDownload('wav'));

    elements.downloadForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const password = elements.downloadPassword.value.trim();
      if (!password) {
        elements.downloadError.textContent = 'Introduz a palavra-passe.';
        return;
      }

      const submit = elements.downloadForm.querySelector('[type="submit"]');
      submit.disabled = true;
      elements.downloadError.textContent = 'A validar o download…';
      try {
        const response = await API.post('download', {
          password,
          format: elements.downloadFormat.value,
          beatSlug: beat.slug
        });
        const result = await response.json();
        if (!response.ok || !result.success || !result.url) {
          throw new Error(result.error || 'Não foi possível preparar o download.');
        }
        elements.dialog.close();
        window.location.assign(result.url);
      } catch (error) {
        elements.downloadError.textContent = error.message || 'Erro ao preparar o download.';
      } finally {
        submit.disabled = false;
      }
    });
  }

  async function loadRatings() {
    try {
      await window.BeatsAoRatings.load(API);
      const average = window.BeatsAoRatings.getAverage(beat.id);
      const count = window.BeatsAoRatings.getCount(beat.id);
      elements.ratingAverage.textContent = average ? average.toFixed(1) : '0.0';
      elements.ratingCount.textContent = `${count} avaliações`;
    } catch {
      elements.ratingAverage.textContent = '—';
      elements.ratingCount.textContent = 'Avaliações indisponíveis';
    }

    elements.ratingStars.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => {
        selectedRating = Number(button.dataset.value);
        elements.ratingStars.querySelectorAll('button').forEach((star) => {
          star.setAttribute('aria-pressed', String(Number(star.dataset.value) <= selectedRating));
        });
      });
    });

    elements.ratingSubmit.addEventListener('click', async () => {
      if (!selectedRating) {
        showNotice('Seleciona uma classificação de 1 a 5 estrelas.', true);
        return;
      }
      elements.ratingSubmit.disabled = true;
      try {
        await window.BeatsAoRatings.submit(API, beat.id, selectedRating, 'anonymous');
        await loadRatingsSummaryOnly();
        selectedRating = 0;
        elements.ratingStars.querySelectorAll('button').forEach((star) => star.setAttribute('aria-pressed', 'false'));
        showNotice('Obrigado pela tua avaliação.', false);
      } catch {
        showNotice('Não foi possível enviar a avaliação.', true);
      } finally {
        elements.ratingSubmit.disabled = false;
      }
    });
  }

  async function loadRatingsSummaryOnly() {
    await window.BeatsAoRatings.load(API);
    const average = window.BeatsAoRatings.getAverage(beat.id);
    const count = window.BeatsAoRatings.getCount(beat.id);
    elements.ratingAverage.textContent = average ? average.toFixed(1) : '0.0';
    elements.ratingCount.textContent = `${count} avaliações`;
  }

  async function loadRelated() {
    try {
      const response = await API.get('beats');
      if (!response.ok) return;
      const items = await response.json();
      const related = (Array.isArray(items) ? items : [])
        .filter((item) => item.id !== beat.id && item.genre && item.genre === beat.genre && item.slug)
        .slice(0, 3);

      if (!related.length) {
        $('#detailRelatedSection').hidden = true;
        return;
      }

      elements.related.replaceChildren();
      related.forEach((item) => {
        const link = document.createElement('a');
        link.className = 'detail-related-card';
        link.href = `/beats/${encodeURIComponent(item.slug)}/`;
        const imageUrl = safeImageUrl(item.cover);
        if (imageUrl) {
          const image = document.createElement('img');
          image.src = imageUrl;
          image.alt = '';
          image.loading = 'lazy';
          link.appendChild(image);
        } else {
          const placeholder = document.createElement('span');
          placeholder.className = 'detail-related-placeholder';
          placeholder.innerHTML = '<i class="fas fa-music"></i>';
          link.appendChild(placeholder);
        }
        const copy = document.createElement('span');
        copy.className = 'detail-related-copy';
        const title = document.createElement('strong');
        title.textContent = item.title || 'Beat';
        const artist = document.createElement('span');
        artist.textContent = item.artist || 'Artista';
        copy.append(title, artist);
        link.appendChild(copy);
        elements.related.appendChild(link);
      });
    } catch {
      $('#detailRelatedSection').hidden = true;
    }
  }

  function bindActions() {
    elements.cartButton.addEventListener('click', () => {
      if (!window.BeatsAoCart) return;
      window.BeatsAoCart.toggle(beat.id);
      window.BeatsAoCart.updateCount();
      syncCartButton();
      showNotice(window.BeatsAoCart.includes(beat.id)
        ? 'Beat adicionado ao carrinho.'
        : 'Beat removido do carrinho.');
    });

    elements.shareButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showNotice('Link do beat copiado.');
      } catch {
        showNotice(window.location.href);
      }
    });

    elements.negotiateButton.href = `https://wa.me/244926261011?text=${encodeURIComponent(`Olá! Gostaria de negociar o beat "${beat.title}" de ${beat.artist}.`)}`;
    elements.negotiateButton.target = '_blank';
    elements.negotiateButton.rel = 'noopener noreferrer';
  }

  async function init() {
    if (window.BeatsAoTheme) window.BeatsAoTheme.load();

    const match = window.location.pathname.match(/^\/beats\/([^/]+)\/?$/);
    if (!match) {
      showError('Página não encontrada', 'Este endereço não corresponde a uma página de beat. Volta ao catálogo.');
      return;
    }

    let slug;
    try { slug = decodeURIComponent(match[1]); }
    catch {
      showError('Endereço inválido', 'O endereço deste beat não é válido.');
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      showError('Endereço inválido', 'O slug deste beat não é válido.');
      return;
    }

    try {
      const response = await API.get(`beat/${encodeURIComponent(slug)}`);
      if (response.status === 404) {
        showError('Beat não encontrado', 'Este beat pode ter sido removido, arquivado ou ainda não está publicado.');
        return;
      }
      if (!response.ok) throw new Error('Não foi possível carregar os detalhes do beat.');

      beat = await response.json();
      if (!beat || !beat.id || beat.slug !== slug) {
        showError('Beat não encontrado', 'Não foi possível confirmar este beat.');
        return;
      }

      applyMetadata(beat);
      elements.title.textContent = beat.title || 'Beat';
      elements.artist.textContent = beat.artist || 'Artista';
      elements.genre.textContent = beat.genre || 'Género não indicado';
      elements.bpm.textContent = beat.bpm ? `${beat.bpm} BPM` : 'BPM não indicado';
      elements.musicalKey.textContent = beat.key || 'Tonalidade não indicada';
      elements.plays.textContent = `${Number(beat.plays || 0)} reproduções`;
      elements.price.textContent = beat.price || 'Preço sob consulta';
      elements.description.textContent = beat.description || 'Ainda não foi adicionada uma descrição para este beat.';
      elements.licenseSummary.textContent = beat.license_summary || 'As condições de licença serão apresentadas antes da compra.';
      elements.licenseTerms.textContent = beat.license_terms || 'Não foram publicados termos adicionais de licença.';

      const imageUrl = safeImageUrl(beat.cover);
      if (imageUrl) {
        elements.cover.src = imageUrl;
        elements.cover.alt = `Capa de ${beat.title || 'beat'}`;
        elements.cover.hidden = false;
        elements.coverPlaceholder.hidden = true;
      } else {
        elements.cover.hidden = true;
        elements.coverPlaceholder.hidden = false;
      }

      bindPlayer();
      bindDownloads();
      bindActions();
      syncCartButton();
      await Promise.all([loadRatings(), loadRelated()]);

      elements.loader.hidden = true;
      elements.content.hidden = false;
      elements.error.hidden = true;
    } catch (error) {
      showError('Não foi possível abrir este beat', error.message || 'Verifica a ligação e tenta novamente.');
    }
  }

  init();
})();
