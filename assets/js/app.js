  (function() {

    // ============================================================
    // API URL - SUPABASE EDGE FUNCTION
    // ============================================================
    const API_URL = window.BeatsAoApi.baseUrl;

    // ============================================================
    // 1. ESTADO GLOBAL
    // ============================================================
    let beatsData = [];
    let filteredBeats = [];
    let editMode = false;
    let editingId = null;
    let isLoggedIn = false;
    let currentUser = null;
    let selectedCoverFile = null;
    let playlistAudio = null;
    let playlistAudioId = null;
    let currentBeatId = null;
    let selectedFormat = null;
    
    let cart = JSON.parse(localStorage.getItem('bestBeatsCart') || '[]');
    let userRatings = {};

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
      try { return JSON.parse(localStorage.getItem('favoriteBeats') || '[]'); } catch { return []; }
    }

    function savePlaylist(ids) {
      localStorage.setItem('favoriteBeats', JSON.stringify(ids));
      updatePlaylistCount();
    }

    function togglePlaylist(beatId) {
      let playlist = getPlaylist();
      const index = playlist.indexOf(beatId);
      if (index > -1) { playlist.splice(index, 1); savePlaylist(playlist); return false; }
      else { playlist.push(beatId); savePlaylist(playlist); return true; }
    }

    function isInPlaylist(beatId) { return getPlaylist().includes(beatId); }

    function updatePlaylistCount() {
      const count = getPlaylist().length;
      const el = document.getElementById('playlistCount');
      if (el) el.textContent = count;
    }

    // ============================================================
    // 5. CART
    // ============================================================
    function updateCart() {
      localStorage.setItem('bestBeatsCart', JSON.stringify(cart));
      document.getElementById('cartCount').textContent = cart.length;
    }

    function toggleCart(beatId) {
      const index = cart.indexOf(beatId);
      if (index > -1) { cart.splice(index, 1); updateCart(); return false; }
      else { cart.push(beatId); updateCart(); return true; }
    }

    function getCartBeats() {
      return beatsData.filter(b => cart.includes(b.id));
    }

    function getCartTotal() {
      return getCartBeats().reduce((sum, b) => {
        const price = parseFloat(b.price.replace(/[^0-9.]/g, ''));
        return sum + (isNaN(price) ? 0 : price);
      }, 0);
    }

    // ============================================================
    // 6. RATING
    // ============================================================
    async function loadRatings() {
      try {
        const response = await BeatsAoApi.get('ratings');
        if (!response.ok) throw new Error('Erro ao buscar avaliações');
        const data = await response.json();
        userRatings = {};
        if (data && data.length > 0) {
          data.forEach(r => {
            if (!userRatings[r.beat_id]) userRatings[r.beat_id] = [];
            userRatings[r.beat_id].push(r.rating);
          });
        }
      } catch (error) {
        console.warn('Erro ao carregar avaliações:', error);
        userRatings = {};
      }
    }

    async function rateBeat(beatId, rating) {
      try {
        const response = await BeatsAoApi.post('rate', {
          beatId: beatId,
          rating: rating,
          userId: currentUser?.id || 'anonymous'
        });
        if (!response.ok) throw new Error('Erro ao enviar avaliação');
        await loadRatings();
        renderBeats();
        showToast('Avaliação enviada', 'Obrigado pela sua avaliação!', 'success');
      } catch (error) {
        console.error('Erro ao salvar avaliação:', error);
        showToast('Erro', 'Não foi possível salvar sua avaliação.', 'error');
      }
    }

    function getBeatAverageRating(beatId) {
      const ratings = userRatings[beatId] || [];
      if (ratings.length === 0) return 0;
      const sum = ratings.reduce((a, b) => a + b, 0);
      return sum / ratings.length;
    }

    function getBeatRatingCount(beatId) {
      return (userRatings[beatId] || []).length;
    }

    // ============================================================
    // 7. SHARE
    // ============================================================
    function showShareToast(message) {
      window.BeatsAoNotifications.showShareToast(message);
    }

    function shareBeat(beat) {
      const baseUrl = window.location.origin + window.location.pathname;
      const slug = beat.slug || beat.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const shareUrl = `${baseUrl}?beat=${slug}`;
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
      
      const titleInfo = document.createElement('div');
      titleInfo.className = 'beat-title';
      titleInfo.innerHTML = `${beat.title} <i class="fas fa-wave-square"></i>`;
      
      const metaDiv = document.createElement('div');
      metaDiv.className = 'beat-meta';
      const genreSpan = document.createElement('span');
      genreSpan.className = 'beat-genre';
      genreSpan.innerHTML = `<i class="fas fa-tag"></i> ${beat.genre}`;
      const priceSpan = document.createElement('span');
      priceSpan.className = 'beat-price';
      priceSpan.innerHTML = `<i class="fas fa-coins"></i> ${beat.price}`;
      metaDiv.appendChild(genreSpan);
      metaDiv.appendChild(priceSpan);
      
      const exclusivo = document.createElement('div');
      exclusivo.className = 'beat-exclusivo';
      exclusivo.innerHTML = `<i class="fas fa-certificate"></i> exclusivo · apenas aqui`;
      
      const avgRating = getBeatAverageRating(beat.id);
      const ratingCount = getBeatRatingCount(beat.id);
      const starsFull = Math.round(avgRating);
      const starsEmpty = 5 - starsFull;
      
      const statsDiv = document.createElement('div');
      statsDiv.className = 'beat-stats';
      statsDiv.innerHTML = `
        <span class="beat-plays"><i class="fas fa-headphones"></i> ${beat.plays || 0} plays</span>
        <span class="beat-rating">
          <i class="fas fa-star"></i> 
          <span class="stars">${'★'.repeat(starsFull)}${'☆'.repeat(starsEmpty)}</span>
          <span style="font-size:0.6rem;color:var(--text-muted);">${avgRating ? avgRating.toFixed(1) : '0.0'} (${ratingCount})</span>
        </span>
        ${beat.bpm ? `<span><i class="fas fa-waveform"></i> ${beat.bpm} BPM</span>` : ''}
        ${beat.key ? `<span><i class="fas fa-music"></i> ${beat.key}</span>` : ''}
      `;
      
      // DOWNLOAD BOTÕES
      const downloadDiv = document.createElement('div');
      downloadDiv.className = 'download-buttons';
      
      const mp3Btn = document.createElement('button');
      mp3Btn.className = 'btn-download btn-mp3';
      mp3Btn.innerHTML = '<i class="fas fa-file-audio"></i> MP3';
      mp3Btn.dataset.format = 'mp3';
      mp3Btn.dataset.beatId = beat.id;
      
      const wavBtn = document.createElement('button');
      wavBtn.className = 'btn-download btn-wav';
      wavBtn.innerHTML = '<i class="fas fa-file-audio"></i> WAV';
      wavBtn.dataset.format = 'wav';
      wavBtn.dataset.beatId = beat.id;
      
      downloadDiv.appendChild(mp3Btn);
      downloadDiv.appendChild(wavBtn);
      
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
      if (cart.includes(beat.id)) { 
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
      infoDiv.appendChild(downloadDiv);
      infoDiv.appendChild(actionsDiv);
      
      card.appendChild(playerWrapper);
      card.appendChild(infoDiv);

      // ============================================================
      // ÁUDIO
      // ============================================================
      let audio = null;
      let isPlaying = false;

      playBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!beat.audio) { 
          showToast('Áudio indisponível', 'Este beat não possui um arquivo de áudio.', 'error'); 
          return; 
        }
        
        if (!audio) {
          audio = new Audio(beat.audio);
          audio.volume = 0.7;
          
          audio.addEventListener('timeupdate', () => {
            if (audio.duration) {
              const percent = (audio.currentTime / audio.duration) * 100;
              progress.value = percent;
              const mins = Math.floor(audio.currentTime / 60);
              const secs = Math.floor(audio.currentTime % 60);
              timeDisplay.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            }
          });
          
          audio.addEventListener('ended', () => {
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            isPlaying = false;
            progress.value = 0;
            timeDisplay.textContent = '0:00';
          });
        }
        
        if (isPlaying) { 
          audio.pause(); 
          playBtn.innerHTML = '<i class="fas fa-play"></i>'; 
          isPlaying = false;
        } else { 
          audio.play().catch(() => {});
          playBtn.innerHTML = '<i class="fas fa-pause"></i>';
          isPlaying = true;
          incrementPlays(beat.id);
        }
      });

      nextBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!beat.audio) return;
        if (!audio) {
          audio = new Audio(beat.audio);
          audio.volume = 0.7;
        }
        audio.currentTime = 0;
        if (!isPlaying) { 
          audio.play().catch(() => {}); 
          playBtn.innerHTML = '<i class="fas fa-pause"></i>'; 
          isPlaying = true; 
        }
      });

      progress.addEventListener('input', function() { 
        if (audio && audio.duration) {
          audio.currentTime = (progress.value / 100) * audio.duration; 
        }
      });

      volSlider.addEventListener('input', function() {
        if (audio) {
          audio.volume = volSlider.value / 100;
          volIcon.className = audio.volume === 0 ? 'fas fa-volume-mute' : 'fas fa-volume-low';
        }
      });

      // DOWNLOAD
      mp3Btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openPasswordModal(beat.id, 'mp3');
      });

      wavBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openPasswordModal(beat.id, 'wav');
      });

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
      document.getElementById('coverStatus').textContent = 'Selecionar';
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
      const beat = beatsData.find(b => b.id === id);
      if (beat) openFormModal(beat);
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
      if (playlistAudio) { playlistAudio.pause(); playlistAudio = null; playlistAudioId = null; }
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
              if (playlistAudioId === beat.id && playlistAudio && !playlistAudio.paused) {
                playlistAudio.pause(); playMiniBtn.innerHTML = '<i class="fas fa-play"></i>'; playMiniBtn.classList.remove('playing'); playlistAudioId = null; return;
              }
              if (playlistAudio) { playlistAudio.pause(); document.querySelectorAll('.btn-play-mini').forEach(b => { b.innerHTML = '<i class="fas fa-play"></i>'; b.classList.remove('playing'); }); }
              playlistAudio = new Audio(audioUrl);
              playlistAudio.volume = 0.7;
              playlistAudioId = beat.id;
              playMiniBtn.innerHTML = '<i class="fas fa-pause"></i>';
              playMiniBtn.classList.add('playing');
              playlistAudio.play().catch(() => {});
              playlistAudio.addEventListener('timeupdate', () => {
                if (playlistAudio.duration) {
                  const percent = (playlistAudio.currentTime / playlistAudio.duration) * 100;
                  if (progressMini) progressMini.style.width = percent + '%';
                  const mins = Math.floor(playlistAudio.currentTime / 60);
                  const secs = Math.floor(playlistAudio.currentTime % 60);
                  if (timeMini) timeMini.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                }
              });
              playlistAudio.addEventListener('ended', () => {
                playMiniBtn.innerHTML = '<i class="fas fa-play"></i>';
                playMiniBtn.classList.remove('playing');
                if (progressMini) progressMini.style.width = '0%';
                if (timeMini) timeMini.textContent = '0:00';
                playlistAudioId = null;
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
            cart = cart.filter(id => id !== beat.id);
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
      let allRatings = [];
      Object.values(userRatings).forEach(r => { allRatings = allRatings.concat(r); });
      const avgRating = allRatings.length > 0 ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length) : 0;
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
    // 20. AUTH - FUNÇÕES DESATIVADAS
    // ============================================================
    function doLogin(e) {
      e.preventDefault();
      showToast('Admin desativado', 'O modo administrador está temporariamente indisponível.', 'error');
    }

    function doLogout() {
      showToast('Admin desativado', 'O modo administrador está temporariamente indisponível.', 'error');
    }

    async function deleteBeat(id) {
      showToast('Funcionalidade indisponível', 'A exclusão de beats está temporariamente indisponível.', 'error');
    }

    // ============================================================
    // 21. EVENTOS
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
    
    document.getElementById('dropdownNewBeat').addEventListener('click', () => {
      showToast('Admin desativado', 'O modo administrador está temporariamente indisponível.', 'error');
    });
    document.getElementById('formCancel').addEventListener('click', closeFormModal);
    
    document.getElementById('fCoverFile').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) { document.getElementById('coverStatus').textContent = `📷 ${file.name} (${(file.size/1024).toFixed(1)} KB)`; }
      else { document.getElementById('coverStatus').textContent = 'Selecionar'; }
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
      if (playlistAudio) { playlistAudio.pause(); playlistAudio = null; playlistAudioId = null; }
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
    // 22. INIT
    // ============================================================
    async function init() {
      loadTheme();
      isLoggedIn = false;
      currentUser = null;
      await loadBeats();
      updateUI();
      console.log('Beats Ao v1.0 - Supabase Edge Function');
      console.log('📱 WhatsApp: +244 926 261 011');
      console.log('📧 Email: agtbeatsxpalha@email.com');
      console.log('🔗 API URL:', API_URL);
    }
    init();

  })();
