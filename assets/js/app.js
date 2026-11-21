  (function() {

    // ============================================================
    // API URL - SUPABASE EDGE FUNCTION
    // ============================================================
    const API_URL = window.BeatsAoApi.baseUrl;

    // ============================================================
    // 1. ESTADO GLOBAL
    // ============================================================
    let beatsData = [];
    let adminBeatsData = [];
    let filteredBeats = [];
    let editMode = false;
    let editingId = null;
    let isLoggedIn = false;
    let currentUser = null;
    let selectedCoverFile = null;
    let currentBeatId = null;
    let selectedFormat = null;

    // Captura o fluxo de recuperação antes de o Supabase limpar o fragmento da URL.
    let recoveryRequested = /(?:^|[&#])type=recovery(?:&|$)/.test(window.location.hash.slice(1))
      || new URLSearchParams(window.location.search).get('type') === 'recovery';

    BeatsAoApi.auth.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') recoveryRequested = true;
    });
    

    // ============================================================
    // 2. TOAST
    // ============================================================
    function showToast(title, message, type = 'info', duration = 4000) {
      return window.BeatsAoNotifications.showToast(title, message, type, duration);
    }

    // ============================================================
    // 3. EMAIL TOGGLE
    // ============================================================
    function toggleEmailVisibility() {
      window.BeatsAoProfilePrivacy.toggle();
    }

    function loadEmailVisibility() {
      window.BeatsAoProfilePrivacy.setUser(currentUser);
      window.BeatsAoProfilePrivacy.load();
    }

    // ============================================================
    // 4. PLAYLIST
    // ============================================================
    function getPlaylist() {
      return window.BeatsAoPlaylist.getAll();
    }

    function savePlaylist(ids) {
      window.BeatsAoPlaylist.save(ids);
    }

    function togglePlaylist(beatId) {
      return window.BeatsAoPlaylist.toggle(beatId);
    }

    function isInPlaylist(beatId) {
      return window.BeatsAoPlaylist.includes(beatId);
    }

    function updatePlaylistCount() {
      window.BeatsAoPlaylist.updateCount();
    }

    // ============================================================
    // 5. CART
    // ============================================================
    function updateCart() {
      window.BeatsAoCart.updateCount();
    }

    function toggleCart(beatId) {
      return window.BeatsAoCart.toggle(beatId);
    }

    function isInCart(beatId) {
      return window.BeatsAoCart.includes(beatId);
    }

    function removeFromCart(beatId) {
      window.BeatsAoCart.remove(beatId);
    }

    function getCartBeats() {
      return window.BeatsAoCart.getBeats(beatsData);
    }

    function getCartTotal() {
      return window.BeatsAoCart.getTotal(beatsData);
    }

    // ============================================================
    // 6. RATING
    // ============================================================
    async function loadRatings() {
      return window.BeatsAoRatings.load(BeatsAoApi);
    }

    async function rateBeat(beatId, rating) {
      try {
        await window.BeatsAoRatings.submit(BeatsAoApi, beatId, rating, currentUser?.id || 'anonymous');
        renderBeats();
        showToast('Avaliação enviada', 'Obrigado pela sua avaliação!', 'success');
      } catch (error) {
        console.error('Erro ao salvar avaliação:', error);
        showToast('Erro', 'Não foi possível salvar sua avaliação.', 'error');
      }
    }

    function getBeatAverageRating(beatId) {
      return window.BeatsAoRatings.getAverage(beatId);
    }

    function getBeatRatingCount(beatId) {
      return window.BeatsAoRatings.getCount(beatId);
    }

    // ============================================================
    // 7. SHARE
    // ============================================================
    function showShareToast(message) {
      window.BeatsAoNotifications.showShareToast(message);
    }

    function getBeatDetailUrl(slug) {
      if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        return null;
      }
      return `/beats/${encodeURIComponent(slug)}/`;
    }

    function shareBeat(beat) {
      const relativeUrl = getBeatDetailUrl(beat.slug);
      if (!relativeUrl) {
        showToast('Link indisponível', 'Este beat ainda não tem um slug válido.', 'error');
        return;
      }
      const shareUrl = new URL(relativeUrl, window.location.origin).toString();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => showShareToast('Link do beat copiado'))
          .catch(() => fallbackCopy(shareUrl));
      } else { fallbackCopy(shareUrl); }
    }

    function fallbackCopy(text) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try { document.execCommand('copy'); showShareToast('Link do beat copiado'); }
      catch (err) { showShareToast('Copie o link manualmente'); }
      document.body.removeChild(textArea);
    }

    // ============================================================
    // 8. THEME
    // ============================================================
    function toggleTheme() {
      window.BeatsAoTheme.toggle();
    }

    function loadTheme() {
      window.BeatsAoTheme.load();
    }

    // ============================================================
    // 9. PLAYS
    // ============================================================
    async function incrementPlays(beatId) {
      try {
        const response = await BeatsAoApi.post('play', { beatId: beatId });
        if (!response.ok) throw new Error('Erro ao atualizar plays');
        const data = await response.json();
        const newPlays = data.plays;
        
        const beat = beatsData.find(b => b.id === beatId);
        if (beat) beat.plays = newPlays;
        updateBeatPlaysDisplay(beatId, newPlays);
      } catch (error) {
        console.error('Erro ao incrementar plays:', error);
      }
    }

    function updateBeatPlaysDisplay(beatId, newPlays) {
      const cards = document.querySelectorAll('.beat-card');
      cards.forEach(card => {
        if (parseInt(card.dataset.id) === beatId) {
          const stats = card.querySelector('.beat-stats');
          if (stats) {
            const playSpan = stats.querySelector('.beat-plays');
            if (playSpan) {
              playSpan.innerHTML = `<i class="fas fa-headphones"></i> ${newPlays} plays`;
              playSpan.classList.add('highlight');
              setTimeout(() => playSpan.classList.remove('highlight'), 800);
            }
          }
        }
      });
    }

    // ============================================================
    // 10. LOAD BEATS
    // ============================================================
    async function loadBeats() {
      try {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('beatsContainer').innerHTML = '';
        
        const response = await BeatsAoApi.get('beats');
        if (!response.ok) throw new Error('Erro ao buscar beats');
        const data = await response.json();
        beatsData = data || [];
        
        await loadRatings();
        
        const genres = [...new Set(beatsData.map(b => b.genre).filter(Boolean))];
        const filterSelect = document.getElementById('filterGenre');
        const currentVal = filterSelect.value;
        filterSelect.innerHTML = '<option value="all">Todos os gêneros</option>';
        genres.forEach(g => {
          const opt = document.createElement('option');
          opt.value = g;
          opt.textContent = g;
          filterSelect.appendChild(opt);
        });
        filterSelect.value = currentVal;
        
        applyFilters();
        updatePlaylistCount();
        updateCart();
      } catch (error) {
        console.error('Erro ao carregar beats:', error);
        showToast('Erro ao carregar', 'Não foi possível carregar os beats.', 'error');
      } finally {
        document.getElementById('loading').style.display = 'none';
      }
    }

    // ============================================================
    // 11. FILTERS
    // ============================================================
    function applyFilters() {
      const search = document.getElementById('searchInput').value.toLowerCase();
      const genre = document.getElementById('filterGenre').value;
      const sort = document.getElementById('sortBy').value;

      filteredBeats = beatsData.filter(b => {
        const matchSearch = b.title.toLowerCase().includes(search) || b.artist.toLowerCase().includes(search);
        const matchGenre = genre === 'all' || b.genre === genre;
        return matchSearch && matchGenre;
      });

      switch(sort) {
        case 'recent': filteredBeats.sort((a, b) => b.id - a.id); break;
        case 'popular': filteredBeats.sort((a, b) => (b.plays || 0) - (a.plays || 0)); break;
        case 'price-low': filteredBeats.sort((a, b) => parseFloat(a.price.replace(/[^0-9.]/g, '')) - parseFloat(b.price.replace(/[^0-9.]/g, ''))); break;
        case 'price-high': filteredBeats.sort((a, b) => parseFloat(b.price.replace(/[^0-9.]/g, '')) - parseFloat(a.price.replace(/[^0-9.]/g, ''))); break;
        case 'rating': filteredBeats.sort((a, b) => getBeatAverageRating(b.id) - getBeatAverageRating(a.id)); break;
      }

      renderBeats();
    }

    // ============================================================
    // 12. RENDER
    // ============================================================
    function renderBeats() {
      const container = document.getElementById('beatsContainer');
      const list = filteredBeats.length > 0 ? filteredBeats : beatsData;
      
      if (list.length === 0) {
        container.innerHTML = `
          <div style="text-align:center;padding:3rem 0;color:var(--text-muted);">
            <i class="fas fa-search" style="font-size:2.5rem;display:block;opacity:0.3;margin-bottom:0.8rem;"></i>
            <p style="font-size:1.1rem;font-weight:300;">Nenhum beat encontrado</p>
            <p style="font-size:0.85rem;">Tente ajustar sua busca ou filtros</p>
          </div>
        `;
        updateUI();
        return;
      }

      container.innerHTML = '';
      list.forEach(beat => {
        const card = createBeatCard(beat);
        container.appendChild(card);
      });
      updateUI();
    }

    // ============================================================
    // 13. CREATE BEAT CARD
    // ============================================================
    function createBeatCard(beat) {
      const card = document.createElement('div');
      card.className = 'beat-card';
      card.dataset.id = beat.id;

      if ((beat.plays || 0) > 3) {
        const badge = document.createElement('div');
        badge.className = 'popularity-badge';
        badge.innerHTML = '<i class="fas fa-fire"></i> Popular';
        card.appendChild(badge);
      }

      const editBtn = document.createElement('button');
      editBtn.className = 'card-edit-btn';
      if (isLoggedIn) editBtn.classList.add('visible');
      editBtn.innerHTML = '<i class="fas fa-pen"></i>';
      editBtn.addEventListener('click', (e) => { e.stopPropagation(); if (isLoggedIn) openEditModal(beat.id); });
      card.appendChild(editBtn);

      if (isLoggedIn) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'card-edit-btn';
        deleteBtn.style.right = '52px';
        deleteBtn.style.color = '#ff6b6b';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteBeat(beat.id); });
        card.appendChild(deleteBtn);
      }

      // PLAYER
      const playerWrapper = document.createElement('div');
      playerWrapper.className = 'player-wrapper';
      
      const bgImg = document.createElement('img');
      bgImg.className = 'player-bg';
      bgImg.src = beat.cover || 'https://picsum.photos/seed/default/400/400';
      bgImg.alt = `${beat.title} cover`;
      bgImg.loading = 'lazy';
      
      const overlay = document.createElement('div');
      overlay.className = 'player-overlay';
      
      const artistSpan = document.createElement('div');
      artistSpan.className = 'player-artist';
      artistSpan.textContent = beat.artist;
      
      const titleSpan = document.createElement('div');
      titleSpan.className = 'player-title';
      titleSpan.textContent = beat.title;
      
      const controls = document.createElement('div');
      controls.className = 'player-controls';
      
      const playBtn = document.createElement('button');
      playBtn.className = 'btn-play';
      playBtn.innerHTML = '<i class="fas fa-play"></i>';
      
      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn-next';
      nextBtn.innerHTML = '<i class="fas fa-forward"></i>';
      
      const playlistBtn = document.createElement('button');
      playlistBtn.className = 'btn-playlist';
      if (isInPlaylist(beat.id)) { 
        playlistBtn.innerHTML = '<i class="fas fa-check"></i> Added'; 
        playlistBtn.classList.add('added'); 
      } else { 
        playlistBtn.innerHTML = '<i class="fas fa-plus"></i> Add'; 
      }
      playlistBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const added = togglePlaylist(beat.id);
        if (added) { 
          showToast('Adicionado', `${beat.title} foi adicionado à sua playlist.`, 'success');
          playlistBtn.innerHTML = '<i class="fas fa-check"></i> Added'; 
          playlistBtn.classList.add('added'); 
        } else { 
          showToast('Removido', `${beat.title} foi removido da sua playlist.`, 'info');
          playlistBtn.innerHTML = '<i class="fas fa-plus"></i> Add'; 
          playlistBtn.classList.remove('added'); 
        }
        updatePlaylistCount();
      });
      
      controls.appendChild(playBtn);
      controls.appendChild(nextBtn);
      controls.appendChild(playlistBtn);
      
      const progressArea = document.createElement('div');
      progressArea.className = 'progress-area';
      const progress = document.createElement('input');
      progress.type = 'range';
      progress.className = 'progress-bar';
      progress.min = 0; progress.max = 100; progress.value = 0;
      const timeDisplay = document.createElement('span');
      timeDisplay.className = 'time-display';
      timeDisplay.textContent = '0:00';
      progressArea.appendChild(progress);
      progressArea.appendChild(timeDisplay);
      
      const volumeWrap = document.createElement('div');
      volumeWrap.className = 'volume-wrap';
      const volIcon = document.createElement('i');
      volIcon.className = 'fas fa-volume-low';
      const volSlider = document.createElement('input');
      volSlider.type = 'range';
      volSlider.className = 'volume-slider';
      volSlider.min = 0; volSlider.max = 100; volSlider.value = 70;
      volumeWrap.appendChild(volIcon);
      volumeWrap.appendChild(volSlider);
      
      const genreBadge = document.createElement('span');
      genreBadge.className = 'badge-genre';
      genreBadge.textContent = beat.genre;
      
      overlay.appendChild(artistSpan);
      overlay.appendChild(titleSpan);
      overlay.appendChild(controls);
      overlay.appendChild(progressArea);
      overlay.appendChild(volumeWrap);
      overlay.appendChild(genreBadge);
      
      playerWrapper.appendChild(bgImg);
      playerWrapper.appendChild(overlay);

      // INFO
      const infoDiv = document.createElement('div');
      infoDiv.className = 'beat-info';
      
      const detailUrl = getBeatDetailUrl(beat.slug);
      const titleInfo = document.createElement(detailUrl ? 'a' : 'div');
      titleInfo.className = 'beat-title';
      if (detailUrl) {
        titleInfo.href = detailUrl;
        titleInfo.setAttribute('aria-label', `Abrir detalhes do beat ${beat.title}`);
      }
      titleInfo.textContent = beat.title || 'Beat';
      const titleIcon = document.createElement('i');
      titleIcon.className = 'fas fa-wave-square';
      titleInfo.append(' ', titleIcon);

      const metaDiv = document.createElement('div');
      metaDiv.className = 'beat-meta';
      const genreSpan = document.createElement('span');
      genreSpan.className = 'beat-genre';
      const genreIcon = document.createElement('i');
      genreIcon.className = 'fas fa-tag';
      genreSpan.append(genreIcon, document.createTextNode(` ${beat.genre || 'Género não indicado'}`));

      const priceSpan = document.createElement('span');
      priceSpan.className = 'beat-price';
      const priceIcon = document.createElement('i');
      priceIcon.className = 'fas fa-coins';
      priceSpan.append(priceIcon, document.createTextNode(` ${beat.price || 'Preço sob consulta'}`));
      metaDiv.appendChild(genreSpan);
      metaDiv.appendChild(priceSpan);

      const exclusivo = document.createElement('div');
      exclusivo.className = 'beat-exclusivo';
      const exclusiveIcon = document.createElement('i');
      exclusiveIcon.className = 'fas fa-certificate';
      exclusivo.append(exclusiveIcon, document.createTextNode(' exclusivo · apenas aqui'));

      const avgRating = getBeatAverageRating(beat.id);
      const ratingCount = getBeatRatingCount(beat.id);
      const starsFull = Math.max(0, Math.min(5, Math.round(avgRating)));
      const starsEmpty = 5 - starsFull;

      const statsDiv = document.createElement('div');
      statsDiv.className = 'beat-stats';

      const playsSpan = document.createElement('span');
      playsSpan.className = 'beat-plays';
      const playsIcon = document.createElement('i');
      playsIcon.className = 'fas fa-headphones';
      playsSpan.append(playsIcon, document.createTextNode(` ${Number(beat.plays || 0)} plays`));
      statsDiv.appendChild(playsSpan);

      const ratingSpan = document.createElement('span');
      ratingSpan.className = 'beat-rating';
      const ratingIcon = document.createElement('i');
      ratingIcon.className = 'fas fa-star';
      const starsSpan = document.createElement('span');
      starsSpan.className = 'stars';
      starsSpan.textContent = '★'.repeat(starsFull) + '☆'.repeat(starsEmpty);
      const ratingValue = document.createElement('span');
      ratingValue.style.fontSize = '0.6rem';
      ratingValue.style.color = 'var(--text-muted)';
      ratingValue.textContent = `${avgRating ? avgRating.toFixed(1) : '0.0'} (${ratingCount})`;
      ratingSpan.append(ratingIcon, document.createTextNode(' '), starsSpan, document.createTextNode(' '), ratingValue);
      statsDiv.appendChild(ratingSpan);

      if (beat.bpm) {
        const bpmSpan = document.createElement('span');
        const bpmIcon = document.createElement('i');
        bpmIcon.className = 'fas fa-waveform';
        bpmSpan.append(bpmIcon, document.createTextNode(` ${beat.bpm} BPM`));
        statsDiv.appendChild(bpmSpan);
      }
      if (beat.key) {
        const keySpan = document.createElement('span');
        const keyIcon = document.createElement('i');
        keyIcon.className = 'fas fa-music';
        keySpan.append(keyIcon, document.createTextNode(` ${beat.key}`));
        statsDiv.appendChild(keySpan);
      }
      
      // DOWNLOAD BOTÕES
      const downloadDiv = document.createElement('div');
      downloadDiv.className = 'download-buttons';
      
      const availableFormats = beat.available_formats || {};

      const mp3Btn = availableFormats.mp3 === true
        ? document.createElement('button')
        : null;
      if (mp3Btn) {
        mp3Btn.className = 'btn-download btn-mp3';
        mp3Btn.innerHTML = '<i class="fas fa-file-audio"></i> MP3';
        mp3Btn.dataset.format = 'mp3';
        mp3Btn.dataset.beatId = beat.id;
        downloadDiv.appendChild(mp3Btn);
      }

      const wavBtn = availableFormats.wav === true
        ? document.createElement('button')
        : null;
      if (wavBtn) {
        wavBtn.className = 'btn-download btn-wav';
        wavBtn.innerHTML = '<i class="fas fa-file-audio"></i> WAV';
        wavBtn.dataset.format = 'wav';
        wavBtn.dataset.beatId = beat.id;
        downloadDiv.appendChild(wavBtn);
      }
      
      // AÇÕES
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'beat-actions';
      
      const shareBtn = document.createElement('button');
      shareBtn.className = 'btn-share';
      shareBtn.innerHTML = '<i class="fas fa-share-alt"></i> Compartilhar';
      shareBtn.addEventListener('click', (e) => { e.preventDefault(); shareBeat(beat); });
      
      const rateBtn = document.createElement('button');
      rateBtn.className = 'btn-share';
      rateBtn.innerHTML = '<i class="fas fa-star"></i> Avaliar';
      rateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('ratingBeatId').value = beat.id;
        document.getElementById('ratingValue').value = 0;
        document.querySelectorAll('#ratingStars span').forEach(s => {
          s.style.color = 'var(--text-muted)';
        });
        document.getElementById('ratingModal').classList.add('active');
      });
      
      const cartBtn = document.createElement('button');
      cartBtn.className = 'btn-cart';
      if (isInCart(beat.id)) { 
        cartBtn.classList.add('in-cart'); 
        cartBtn.innerHTML = '<i class="fas fa-check"></i> No Carrinho'; 
      } else { 
        cartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Comprar'; 
      }
      cartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const added = toggleCart(beat.id);
        if (added) { 
          cartBtn.classList.add('in-cart'); 
          cartBtn.innerHTML = '<i class="fas fa-check"></i> No Carrinho'; 
          showToast('Adicionado', `${beat.title} foi adicionado ao carrinho.`, 'success'); 
        } else { 
          cartBtn.classList.remove('in-cart'); 
          cartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Comprar'; 
          showToast('Removido', `${beat.title} foi removido do carrinho.`, 'info'); 
        }
        updateCart();
      });
      
      if (detailUrl) {
        const detailsBtn = document.createElement('a');
        detailsBtn.className = 'btn-details';
        detailsBtn.href = detailUrl;
        detailsBtn.innerHTML = '<i class="fas fa-arrow-up-right-from-square"></i> Ver detalhes';
        detailsBtn.setAttribute('aria-label', `Ver detalhes do beat ${beat.title}`);
        actionsDiv.appendChild(detailsBtn);
      }

      const negociarBtn = document.createElement('a');
      negociarBtn.className = 'btn-negociar';
      negociarBtn.href = '#';
      negociarBtn.innerHTML = `<i class="fab fa-whatsapp"></i> Negociar`;
      negociarBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const msg = encodeURIComponent(`Olá! Gostaria de negociar o beat "${beat.title}" de ${beat.artist}.`);
        window.open(`https://wa.me/244926261011?text=${msg}`, '_blank');
      });
      
      actionsDiv.appendChild(shareBtn);
      actionsDiv.appendChild(rateBtn);
      actionsDiv.appendChild(cartBtn);
      actionsDiv.appendChild(negociarBtn);
      
      infoDiv.appendChild(titleInfo);
      infoDiv.appendChild(metaDiv);
      infoDiv.appendChild(exclusivo);
      infoDiv.appendChild(statsDiv);
      if (mp3Btn || wavBtn) infoDiv.appendChild(downloadDiv);
      infoDiv.appendChild(actionsDiv);
      
      card.appendChild(playerWrapper);
      card.appendChild(infoDiv);

      // PLAYER INDIVIDUAL DO BEAT
      window.BeatsAoCardPlayer.attach({
        url: beat.audio,
        playButton: playBtn,
        nextButton: nextBtn,
        progress: progress,
        timeDisplay: timeDisplay,
        volumeSlider: volSlider,
        volumeIcon: volIcon,
        onPlay: () => incrementPlays(beat.id),
        onUnavailable: () => showToast(
          'Áudio indisponível',
          'Este beat não possui um arquivo de áudio.',
          'error'
        )
      });

      // DOWNLOAD
      if (mp3Btn) {
        mp3Btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          openPasswordModal(beat.id, 'mp3');
        });
      }

      if (wavBtn) {
        wavBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          openPasswordModal(beat.id, 'wav');
        });
      }

      return card;
    }

    // ============================================================
    // 14. MODAL DE SENHA
    // ============================================================
    function openPasswordModal(beatId, format) {
      currentBeatId = beatId;
      selectedFormat = format;
      
      const modal = document.getElementById('passwordModal');
      const passwordInput = document.getElementById('passwordInput');
      const errorMsg = document.getElementById('errorMsg');
      
      passwordInput.value = '';
      passwordInput.className = '';
      errorMsg.style.display = 'none';
      modal.classList.add('active');
      setTimeout(() => passwordInput.focus(), 100);
    }

    document.getElementById('modalConfirm').addEventListener('click', async function() {
      const passwordInput = document.getElementById('passwordInput');
      const errorMsg = document.getElementById('errorMsg');
      const password = passwordInput.value.trim();
      
      if (!password) {
        errorMsg.textContent = 'Digite a senha primeiro';
        errorMsg.style.display = 'block';
        passwordInput.className = 'error';
        setTimeout(() => {
          passwordInput.className = '';
          errorMsg.style.display = 'none';
        }, 2000);
        return;
      }
      
      try {
        const beat = beatsData.find(b => b.id === currentBeatId);
        if (!beat) {
          errorMsg.textContent = 'Beat não encontrado';
          errorMsg.style.display = 'block';
          return;
        }
        
        const slug = beat.slug || beat.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        
        const response = await BeatsAoApi.post('download', {
          password: password,
          format: selectedFormat,
          beatSlug: slug
        });

        const data = await response.json();

        if (data.success) {
          passwordInput.className = 'success';
          errorMsg.style.display = 'none';

          const link = document.createElement('a');
          link.href = data.url;
          link.download = data.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setTimeout(() => {
            document.getElementById('passwordModal').classList.remove('active');
            passwordInput.className = '';
          }, 500);

        } else {
          passwordInput.className = 'error';
          errorMsg.textContent = data.error || 'Senha incorreta';
          errorMsg.style.display = 'block';
          passwordInput.value = '';
          setTimeout(() => passwordInput.focus(), 100);

          setTimeout(() => {
            passwordInput.className = '';
          }, 2000);
        }
      } catch (error) {
        errorMsg.textContent = 'Erro de conexão. Tente novamente.';
        errorMsg.style.display = 'block';
        passwordInput.className = 'error';
        setTimeout(() => {
          passwordInput.className = '';
          errorMsg.style.display = 'none';
        }, 3000);
      }
    });

    document.getElementById('modalCancel').addEventListener('click', function() {
      document.getElementById('passwordModal').classList.remove('active');
      document.getElementById('passwordInput').className = '';
      document.getElementById('errorMsg').style.display = 'none';
    });

    document.getElementById('passwordInput').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        document.getElementById('modalConfirm').click();
      }
    });

    document.getElementById('passwordModal').addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.remove('active');
        document.getElementById('passwordInput').className = '';
        document.getElementById('errorMsg').style.display = 'none';
      }
    });

    // ============================================================
    // 15. MODALS
    // ============================================================
    function openFormModal(beat = null) {
      if (!isLoggedIn) return;
      
      document.getElementById('fCoverFile').value = '';
      document.getElementById('coverStatus').textContent = 'Upload de ficheiros será ativado numa etapa própria.';
      document.getElementById('fCoverUrl').value = '';
      document.getElementById('previewContainer').innerHTML = '';
      document.getElementById('fAudioStream').value = '';
      document.getElementById('fAudioMp3').value = '';
      document.getElementById('fAudioWav').value = '';
      document.getElementById('fPassword').value = '';
      
      if (beat) {
        document.getElementById('modalTitle').querySelector('span').textContent = 'Editar Beat';
        document.getElementById('fTitle').value = beat.title;
        document.getElementById('fArtist').value = beat.artist;
        document.getElementById('fGenre').value = beat.genre;
        document.getElementById('fPrice').value = beat.price;
        document.getElementById('fBpm').value = beat.bpm || '';
        document.getElementById('fKey').value = beat.key || '';
        document.getElementById('fAudioStream').value = beat.audio || '';
        document.getElementById('fAudioMp3').value = beat.audio_download_mp3 || '';
        document.getElementById('fAudioWav').value = beat.audio_download_wav || '';
        document.getElementById('fPassword').value = beat.password || '';
        document.getElementById('fCoverUrl').value = beat.cover || '';
        document.getElementById('fStatus').value = beat.status || 'published';
        editingId = beat.id;
        if (beat.cover) { 
          const div = document.createElement('div'); 
          div.className = 'preview-item'; 
          div.innerHTML = `<img src="${beat.cover}" alt="capa"> <span>Capa atual</span>`; 
          document.getElementById('previewContainer').appendChild(div); 
        }
      } else {
        document.getElementById('modalTitle').querySelector('span').textContent = 'Novo Beat';
        document.getElementById('beatForm').reset();
        document.getElementById('fBpm').value = '';
        document.getElementById('fKey').value = '';
        document.getElementById('fCoverUrl').value = '';
        document.getElementById('fStatus').value = 'draft';
        editingId = null;
      }
      document.getElementById('formModal').classList.add('active');
      document.getElementById('mainDropdown').classList.remove('active');
    }

    function closeFormModal() {
      document.getElementById('formModal').classList.remove('active');
      editingId = null;
    }

    function openEditModal(id) {
      const beat = adminBeatsData.find(b => Number(b.id) === Number(id)) || beatsData.find(b => Number(b.id) === Number(id));
      if (beat) openFormModal(beat);
    }

    function parseAdminPrice(value) {
      const cleaned = String(value || '').trim().replace(/[^0-9,.-]/g, '');
      const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
      const amount = Number(normalized);
      return Number.isFinite(amount) && amount >= 0 ? amount : NaN;
    }

    async function refreshAdminBeats() {
      const response = await BeatsAoApi.adminGet('admin/beats');
      if (!response.ok) throw new Error('Não foi possível carregar os beats administrativos.');
      adminBeatsData = await response.json();
      return adminBeatsData;
    }

    async function saveBeat(e) {
      e.preventDefault();
      if (!isLoggedIn) return;
      const payload = {
        title: document.getElementById('fTitle').value.trim(),
        artist: document.getElementById('fArtist').value.trim(),
        genre: document.getElementById('fGenre').value.trim(),
        price: parseAdminPrice(document.getElementById('fPrice').value),
        bpm: document.getElementById('fBpm').value.trim() ? Number(document.getElementById('fBpm').value) : null,
        key: document.getElementById('fKey').value.trim() || null,
        cover: document.getElementById('fCoverUrl').value.trim() || null,
        audio: document.getElementById('fAudioStream').value.trim(),
        audio_download_mp3: document.getElementById('fAudioMp3').value.trim() || null,
        audio_download_wav: document.getElementById('fAudioWav').value.trim() || null,
        status: document.getElementById('fStatus').value
      };
      const downloadPassword = document.getElementById('fPassword').value;
      if (downloadPassword) payload.password = downloadPassword;
      if (!payload.title || !payload.artist || !payload.genre || !payload.audio || !Number.isFinite(payload.price)) {
        showToast('Dados inválidos', 'Confere título, artista, género, preço e link de streaming.', 'error');
        return;
      }
      const button = document.getElementById('modalSave');
      button.disabled = true;
      try {
        const response = editingId
          ? await BeatsAoApi.adminPut('admin/beats/' + editingId, payload)
          : await BeatsAoApi.adminPost('admin/beats', payload);
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Não foi possível guardar o beat.');
        await refreshAdminBeats();
        await loadBeats();
        closeFormModal();
        showToast('Guardado', 'Os dados do beat foram atualizados.', 'success');
      } catch (error) {
        console.error('Admin save failed:', error);
        showToast('Erro ao guardar', error.message || 'Não foi possível guardar o beat.', 'error');
      } finally {
        button.disabled = false;
      }
    }

    // ============================================================
    // 16. UI UPDATE
    // ============================================================
    function updateUI() {
      if (isLoggedIn && currentUser) {
        document.getElementById('userInfoDisplay').style.display = 'flex';
        document.getElementById('userNameDisplay').textContent = currentUser.user_metadata?.name || 'Administrador';
        document.getElementById('emailText').textContent = currentUser.email || 'usuario@email.com';
        document.getElementById('avatarContainer').innerHTML = `<img src="eu.jpg" alt="Admin" class="admin-avatar-small">`;
        document.getElementById('dividerAfterUser').style.display = 'block';
        document.getElementById('dropdownLogin').style.display = 'none';
        document.getElementById('dropdownNewBeat').style.display = 'flex';
        document.getElementById('dropdownToggleEdit').style.display = 'flex';
        document.getElementById('dropdownDashboard').style.display = 'flex';
        document.getElementById('dividerBeforeLogout').style.display = 'block';
        document.getElementById('dropdownLogout').style.display = 'flex';
        document.getElementById('dropdownToggleEdit').innerHTML = editMode ? '<i class="fas fa-edit"></i> Desativar Edição' : '<i class="fas fa-edit"></i> Editar';
        document.getElementById('menuLabel').textContent = 'Admin';
        loadEmailVisibility();
      } else {
        document.getElementById('userInfoDisplay').style.display = 'none';
        document.getElementById('avatarContainer').innerHTML = '';
        document.getElementById('dividerAfterUser').style.display = 'none';
        document.getElementById('dropdownLogin').style.display = 'flex';
        document.getElementById('dropdownNewBeat').style.display = 'none';
        document.getElementById('dropdownToggleEdit').style.display = 'none';
        document.getElementById('dropdownDashboard').style.display = 'none';
        document.getElementById('dividerBeforeLogout').style.display = 'none';
        document.getElementById('dropdownLogout').style.display = 'none';
        document.getElementById('menuLabel').textContent = 'Menu';
      }
      document.querySelectorAll('.card-edit-btn').forEach(btn => {
        if (isLoggedIn) btn.classList.add('visible');
        else btn.classList.remove('visible');
      });
      updatePlaylistCount();
      updateCart();
    }

    function updatePlaylistButtons(beatId) {
      document.querySelectorAll('.beat-card').forEach(card => {
        if (parseInt(card.dataset.id) === beatId) {
          const btn = card.querySelector('.btn-playlist');
          if (btn) {
            if (isInPlaylist(beatId)) {
              btn.innerHTML = '<i class="fas fa-check"></i> Added';
              btn.classList.add('added');
            } else {
              btn.innerHTML = '<i class="fas fa-plus"></i> Add';
              btn.classList.remove('added');
            }
          }
        }
      });
    }

    // ============================================================
    // 17. PLAYLIST MODAL
    // ============================================================
    function openPlaylistModal() {
      const container = document.getElementById('playlistContainer');
      const emptyMsg = document.getElementById('emptyPlaylist');
      const playlist = getPlaylist();
      window.BeatsAoPlaylistPlayer.stop();
      if (playlist.length === 0) { container.innerHTML = ''; emptyMsg.style.display = 'block'; }
      else {
        emptyMsg.style.display = 'none';
        container.innerHTML = '';
        playlist.forEach(id => {
          const beat = beatsData.find(b => b.id === id);
          if (beat) {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.innerHTML = `
              <img src="${beat.cover || 'https://picsum.photos/seed/default/100/100'}" alt="${beat.title}" class="cover">
              <div class="info">
                <div class="title">${beat.title}</div>
                <div class="sub">${beat.artist} · ${beat.genre} · ${beat.price}</div>
              </div>
              <div class="actions">
                <button class="btn-play-mini" data-id="${beat.id}" data-audio="${beat.audio || ''}">
                  <i class="fas fa-play"></i>
                </button>
                <div class="progress-mini"><div class="progress-mini-bar" id="playlist-progress-${beat.id}"></div></div>
                <span class="time-mini" id="playlist-time-${beat.id}">0:00</span>
                <button class="btn-remove" data-id="${beat.id}"><i class="fas fa-trash"></i> Remover</button>
              </div>
            `;
            const removeBtn = item.querySelector('.btn-remove');
            removeBtn.addEventListener('click', () => {
              const newPlaylist = getPlaylist().filter(id => id !== beat.id);
              savePlaylist(newPlaylist);
              updatePlaylistButtons(beat.id);
              showToast('Removido', `${beat.title} foi removido da sua playlist.`, 'info');
              openPlaylistModal();
            });
            const playMiniBtn = item.querySelector('.btn-play-mini');
            const progressMini = item.querySelector('.progress-mini-bar');
            const timeMini = document.getElementById(`playlist-time-${beat.id}`);
            playMiniBtn.addEventListener('click', () => {
              const audioUrl = playMiniBtn.dataset.audio;
              if (!audioUrl) { showToast('Áudio indisponível', 'Este beat não possui áudio.', 'error'); return; }
              window.BeatsAoPlaylistPlayer.toggle({
                id: beat.id,
                url: audioUrl,
                button: playMiniBtn,
                progress: progressMini,
                time: timeMini
              });
            });
            container.appendChild(item);
          }
        });
      }
      document.getElementById('playlistModal').classList.add('active');
      document.getElementById('mainDropdown').classList.remove('active');
    }

    // ============================================================
    // 18. CART MODAL
    // ============================================================
    function openCartModal() {
      const container = document.getElementById('cartContainer');
      const emptyMsg = document.getElementById('emptyCart');
      const totalDiv = document.getElementById('cartTotal');
      const cartBeats = getCartBeats();
      if (cartBeats.length === 0) { container.innerHTML = ''; emptyMsg.style.display = 'block'; totalDiv.style.display = 'none'; }
      else {
        emptyMsg.style.display = 'none';
        totalDiv.style.display = 'block';
        container.innerHTML = '';
        cartBeats.forEach(beat => {
          const item = document.createElement('div');
          item.className = 'cart-item';
          item.innerHTML = `
            <img src="${beat.cover || 'https://picsum.photos/seed/default/50/50'}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0;">
            <div class="info">
              <div class="title">${beat.title}</div>
              <div class="sub">${beat.artist} · ${beat.price}</div>
            </div>
            <button class="remove-item" data-id="${beat.id}"><i class="fas fa-times"></i></button>
          `;
          const removeBtn = item.querySelector('.remove-item');
          removeBtn.addEventListener('click', () => {
            removeFromCart(beat.id);
            updateCart();
            openCartModal();
            updatePlaylistButtons(beat.id);
          });
          container.appendChild(item);
        });
        document.getElementById('cartTotalValue').textContent = `Kz ${getCartTotal().toFixed(2)}`;
      }
      document.getElementById('cartModal').classList.add('active');
    }

    // ============================================================
    // 19. DASHBOARD
    // ============================================================
    function openDashboard() {
      const totalBeats = beatsData.length;
      const totalPlays = beatsData.reduce((sum, b) => sum + (b.plays || 0), 0);
      const avgRating = window.BeatsAoRatings.getOverallAverage();
      const genres = {};
      beatsData.forEach(b => { genres[b.genre] = (genres[b.genre] || 0) + 1; });
      const topGenre = Object.keys(genres).sort((a, b) => genres[b] - genres[a])[0] || '-';
      document.getElementById('totalBeats').textContent = totalBeats;
      document.getElementById('totalPlays').textContent = totalPlays;
      document.getElementById('avgRating').textContent = avgRating ? avgRating.toFixed(1) : '0.0';
      document.getElementById('topGenre').textContent = topGenre;
      const topBeats = [...beatsData].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 5);
      const topContainer = document.getElementById('topBeats');
      topContainer.innerHTML = '';
      topBeats.forEach((b, i) => {
        const div = document.createElement('div');
        div.style.cssText = 'display:flex;justify-content:space-between;padding:0.2rem 0;border-bottom:1px solid var(--border-color);font-size:0.8rem;';
        div.innerHTML = `<span>${i+1}. ${b.title}</span><span style="color:var(--gold);">${b.plays || 0} plays</span>`;
        topContainer.appendChild(div);
      });
      document.getElementById('dashboardModal').classList.add('active');
    }

    // ============================================================
    // 20. RECUPERAÇÃO DE SENHA
    // ============================================================
    function openPasswordRecovery() {
      let modal = document.getElementById('passwordRecoveryModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'passwordRecoveryModal';
        modal.className = 'modal-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'passwordRecoveryTitle');
        modal.innerHTML = `
          <div class="modal">
            <h2 id="passwordRecoveryTitle"><i class="fas fa-lock"></i> Definir nova senha</h2>
            <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:1rem;">Crie uma nova senha para a sua conta administrativa.</p>
            <form id="passwordRecoveryForm">
              <label for="recoveryPassword">Nova senha</label>
              <input id="recoveryPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="Mínimo de 8 caracteres">
              <label for="recoveryPasswordConfirm">Confirmar nova senha</label>
              <input id="recoveryPasswordConfirm" type="password" autocomplete="new-password" minlength="8" required placeholder="Repita a nova senha">
              <p id="passwordRecoveryError" class="login-error" role="alert"></p>
              <div class="modal-actions">
                <button class="btn-save" id="passwordRecoverySubmit" type="submit">Guardar nova senha</button>
              </div>
            </form>
          </div>`;
        document.body.appendChild(modal);
        modal.querySelector('#passwordRecoveryForm').addEventListener('submit', async (event) => {
          event.preventDefault();
          const password = modal.querySelector('#recoveryPassword').value;
          const confirmation = modal.querySelector('#recoveryPasswordConfirm').value;
          const errorBox = modal.querySelector('#passwordRecoveryError');
          const submit = modal.querySelector('#passwordRecoverySubmit');
          errorBox.style.display = 'none';
          if (password.length < 8) {
            errorBox.textContent = 'A senha deve ter pelo menos 8 caracteres.';
            errorBox.style.display = 'block';
            return;
          }
          if (password !== confirmation) {
            errorBox.textContent = 'As senhas não coincidem.';
            errorBox.style.display = 'block';
            return;
          }
          submit.disabled = true;
          submit.textContent = 'A guardar...';
          try {
            const { data, error } = await BeatsAoApi.auth.auth.updateUser({ password });
            if (error) throw error;
            if (!data?.user) throw new Error('O Supabase não confirmou a alteração da senha.');
            await BeatsAoApi.auth.auth.signOut();
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
            modal.querySelector('.modal').innerHTML = `
              <h2><i class="fas fa-check-circle"></i> Senha atualizada</h2>
              <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:1rem;">A nova senha foi guardada. Entre novamente com a nova senha.</p>
              <div class="modal-actions">
                <button class="btn-primary" id="passwordRecoveryGoLogin" type="button">Ir para o início de sessão</button>
              </div>`;
            modal.querySelector('#passwordRecoveryGoLogin').addEventListener('click', () => {
              modal.classList.remove('active');
              document.getElementById('loginModal').classList.add('active');
              document.getElementById('loginError').style.display = 'none';
              document.getElementById('loginEmail').focus();
            });
          } catch (error) {
            console.error('Password recovery failed:', error);
            errorBox.textContent = error.message || 'Não foi possível atualizar a senha. Solicite um novo link de recuperação.';
            errorBox.style.display = 'block';
            submit.disabled = false;
            submit.textContent = 'Guardar nova senha';
          }
        });
      }
      modal.classList.add('active');
      modal.querySelector('#recoveryPassword')?.focus();
    }

    // ============================================================
    // 21. AUTH - LOGIN ADMINISTRATIVO
    // ============================================================
    async function doLogin(e) {
      e.preventDefault();
      const errorBox = document.getElementById('loginError');
      errorBox.style.display = 'none';
      try {
        const { data, error } = await BeatsAoApi.auth.auth.signInWithPassword({
          email: document.getElementById('loginEmail').value.trim(),
          password: document.getElementById('loginPass').value
        });
        if (error || !data?.user) throw new Error('Email ou senha inválidos.');
        if (data.user.id !== 'da274bef-08da-44e7-bd8f-0541c3847273') {
          await BeatsAoApi.auth.auth.signOut();
          throw new Error('Esta conta não tem autorização administrativa.');
        }
        currentUser = data.user;
        await refreshAdminBeats();
        isLoggedIn = true;
        document.getElementById('loginModal').classList.remove('active');
        document.getElementById('loginPass').value = '';
        await loadBeats();
        updateUI();
        showToast('Sessão iniciada', 'Acesso administrativo autorizado.', 'success');
      } catch (error) {
        console.error('Admin login failed:', error);
        errorBox.textContent = error.message || 'Não foi possível iniciar sessão.';
        errorBox.style.display = 'block';
      }
    }

    async function doLogout() {
      await BeatsAoApi.auth.auth.signOut();
      isLoggedIn = false;
      currentUser = null;
      adminBeatsData = [];
      editMode = false;
      await loadBeats();
      updateUI();
      showToast('Sessão terminada', 'Saiu do painel administrativo.', 'info');
    }

    async function deleteBeat(id) {
      if (!isLoggedIn || !confirm('Tens a certeza de que pretendes apagar este beat?')) return;
      try {
        const response = await BeatsAoApi.adminDelete('admin/beats/' + id);
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Não foi possível apagar o beat.');
        await refreshAdminBeats();
        await loadBeats();
        showToast('Beat apagado', 'O beat foi removido.', 'success');
      } catch (error) {
        console.error('Admin delete failed:', error);
        showToast('Erro', error.message || 'Não foi possível apagar o beat.', 'error');
      }
    }

    // ============================================================
    // 22. EVENTOS
    // ============================================================
    document.getElementById('menuBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('mainDropdown').classList.toggle('active');
    });
    document.addEventListener('click', () => document.getElementById('mainDropdown').classList.remove('active'));
    
    document.getElementById('toggleEmailBtn').addEventListener('click', toggleEmailVisibility);
    
    document.getElementById('dropdownLogin').addEventListener('click', () => {
      document.getElementById('loginModal').classList.add('active');
      document.getElementById('loginError').style.display = 'none';
      document.getElementById('mainDropdown').classList.remove('active');
    });
    document.getElementById('loginCancel').addEventListener('click', () => document.getElementById('loginModal').classList.remove('active'));
    document.getElementById('loginForm').addEventListener('submit', doLogin);
    document.getElementById('beatForm').addEventListener('submit', saveBeat);
    
    document.getElementById('dropdownNewBeat').addEventListener('click', () => openFormModal());
    document.getElementById('formCancel').addEventListener('click', closeFormModal);
    
    document.getElementById('fCoverFile').addEventListener('change', () => {
      showToast('Upload ainda não disponível', 'Por enquanto, informa o URL da imagem no campo próprio.', 'info');
      document.getElementById('fCoverFile').value = '';
    });
    
    document.getElementById('dropdownToggleEdit').addEventListener('click', function() {
      if (!isLoggedIn) return;
      editMode = !editMode;
      this.innerHTML = editMode ? '<i class="fas fa-edit"></i> Desativar Edição' : '<i class="fas fa-edit"></i> Editar';
      document.querySelectorAll('.card-edit-btn').forEach(btn => {
        if (editMode && isLoggedIn) btn.style.display = 'flex';
        else btn.style.display = 'none';
      });
      document.getElementById('mainDropdown').classList.remove('active');
    });
    
    document.getElementById('dropdownLogout').addEventListener('click', doLogout);
    document.getElementById('dropdownPlaylist').addEventListener('click', openPlaylistModal);
    document.getElementById('playlistCancel').addEventListener('click', () => {
      window.BeatsAoPlaylistPlayer.stop();
      document.getElementById('playlistModal').classList.remove('active');
    });
    
    document.getElementById('cartBtn').addEventListener('click', openCartModal);
    document.getElementById('cartCancel').addEventListener('click', () => document.getElementById('cartModal').classList.remove('active'));
    document.getElementById('cartCheckout').addEventListener('click', () => {
      const cartBeats = getCartBeats();
      if (cartBeats.length === 0) { showToast('Carrinho vazio', 'Adicione beats ao carrinho.', 'error'); return; }
      const msg = encodeURIComponent(`Olá! Gostaria de comprar os seguintes beats:\n${cartBeats.map(b => `- ${b.title} (${b.artist}) - ${b.price}`).join('\n')}\nTotal: Kz ${getCartTotal().toFixed(2)}`);
      window.open(`https://wa.me/244926261011?text=${msg}`, '_blank');
      document.getElementById('cartModal').classList.remove('active');
    });
    
    document.getElementById('dropdownDashboard').addEventListener('click', openDashboard);
    document.getElementById('dashboardCancel').addEventListener('click', () => document.getElementById('dashboardModal').classList.remove('active'));
    
    document.getElementById('dropdownProfile').addEventListener('click', () => {
      const saved = JSON.parse(localStorage.getItem('bestBeatsProfile') || '{"name":"","bio":"","social":""}');
      document.getElementById('profName').value = saved.name || '';
      document.getElementById('profBio').value = saved.bio || '';
      document.getElementById('profSocial').value = saved.social || '';
      document.getElementById('profileModal').classList.add('active');
      document.getElementById('mainDropdown').classList.remove('active');
    });
    document.getElementById('profileCancel').addEventListener('click', () => document.getElementById('profileModal').classList.remove('active'));
    document.getElementById('profileForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const profile = {
        name: document.getElementById('profName').value.trim(),
        bio: document.getElementById('profBio').value.trim(),
        social: document.getElementById('profSocial').value.trim()
      };
      localStorage.setItem('bestBeatsProfile', JSON.stringify(profile));
      showToast('Perfil salvo', 'Suas informações foram atualizadas.', 'success');
      document.getElementById('profileModal').classList.remove('active');
    });
    
    document.getElementById('dropdownAbout').addEventListener('click', () => {
      document.getElementById('aboutModal').classList.add('active');
      document.getElementById('mainDropdown').classList.remove('active');
    });
    document.getElementById('aboutCancel').addEventListener('click', () => document.getElementById('aboutModal').classList.remove('active'));
    
    document.getElementById('ratingCancel').addEventListener('click', () => document.getElementById('ratingModal').classList.remove('active'));
    document.getElementById('ratingSubmit').addEventListener('click', async () => {
      const beatId = parseInt(document.getElementById('ratingBeatId').value);
      const rating = parseInt(document.getElementById('ratingValue').value);
      if (rating === 0) { showToast('Avaliação', 'Selecione uma nota de 1 a 5.', 'info'); return; }
      await rateBeat(beatId, rating);
      document.getElementById('ratingModal').classList.remove('active');
    });
    document.querySelectorAll('#ratingStars span').forEach(star => {
      star.addEventListener('click', function() {
        const val = parseInt(this.dataset.value);
        document.getElementById('ratingValue').value = val;
        document.querySelectorAll('#ratingStars span').forEach(s => {
          if (parseInt(s.dataset.value) <= val) s.style.color = 'var(--gold)';
          else s.style.color = 'var(--text-muted)';
        });
      });
      star.addEventListener('mouseenter', function() {
        const val = parseInt(this.dataset.value);
        document.querySelectorAll('#ratingStars span').forEach(s => {
          if (parseInt(s.dataset.value) <= val) s.style.color = 'var(--gold)';
          else s.style.color = 'var(--text-muted)';
        });
      });
      star.addEventListener('mouseleave', function() {
        const current = parseInt(document.getElementById('ratingValue').value) || 0;
        document.querySelectorAll('#ratingStars span').forEach(s => {
          if (parseInt(s.dataset.value) <= current) s.style.color = 'var(--gold)';
          else s.style.color = 'var(--text-muted)';
        });
      });
    });
    
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('filterGenre').addEventListener('change', applyFilters);
    document.getElementById('sortBy').addEventListener('change', applyFilters);
    document.getElementById('clearSearch').addEventListener('click', () => {
      document.getElementById('searchInput').value = '';
      document.getElementById('clearSearch').classList.remove('visible');
      applyFilters();
    });
    document.getElementById('searchInput').addEventListener('input', function() {
      document.getElementById('clearSearch').classList.toggle('visible', this.value.length > 0);
    });
    
    document.getElementById('logoLink').addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = window.location.pathname;
    });
    
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    });

    // ============================================================
    // 23. INIT
    // ============================================================
    async function init() {
      loadTheme();
      isLoggedIn = false;
      currentUser = null;

      // Um link de recuperação tem prioridade sobre o arranque normal do painel.
      // Não validar nem terminar a sessão administrativa antes de atualizar a senha.
      const { data: sessionData, error: sessionError } = await BeatsAoApi.auth.auth.getSession();
      if (recoveryRequested) {
        if (sessionError) {
          console.error('Recovery session could not be loaded:', sessionError);
        }
        openPasswordRecovery();
        return;
      }

      const savedUser = sessionData?.session?.user;
      if (savedUser?.id === 'da274bef-08da-44e7-bd8f-0541c3847273') {
        try {
          currentUser = savedUser;
          await refreshAdminBeats();
          isLoggedIn = true;
        } catch (error) {
          console.warn('Admin session could not be verified:', error);
          await BeatsAoApi.auth.auth.signOut();
          currentUser = null;
          isLoggedIn = false;
        }
      } else if (savedUser) {
        await BeatsAoApi.auth.auth.signOut();
      }

      await loadBeats();
      updateUI();
      console.log('Beats Ao v1.0 - Supabase Edge Function');
      console.log('📱 WhatsApp: +244 926 261 011');
      console.log('📧 Email: agtbeatsxpalha@email.com');
      console.log('🔗 API URL:', API_URL);
    }
    init();

  })();
