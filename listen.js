document.addEventListener('DOMContentLoaded', async () => {
  const errorState = document.getElementById('error-state');
  const trackListsContainer = document.getElementById('track-lists-container');
  const playerContainer = document.getElementById('player-container');
  const audioElement = document.getElementById('audio-element');

  const npTitle = document.getElementById('np-title');
  const npDesc = document.getElementById('np-desc');
  const timeCurrent = document.getElementById('time-current');
  const timeDuration = document.getElementById('time-duration');
  const progressBar = document.getElementById('progress-bar');
  const progressWrapper = document.getElementById('progress-wrapper');

  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnPlayPause = document.getElementById('btn-play-pause');
  const iconPlay = document.getElementById('icon-play');
  const iconPause = document.getElementById('icon-pause');

  let tracks = [];
  let currentTrackIndex = -1;

  // Expected Series Order
  const seriesOrder = [
    "The Evolution of Spirit",
    "The Seven Densities",
    "Reflections"
  ];

  try {
    const response = await fetch('audio/narrations/tracks.json');
    if (!response.ok) throw new Error('Manifest not found');
    tracks = await response.json();

    if (tracks.length === 0) {
      throw new Error('No tracks in manifest');
    }

    renderTrackLists(tracks);

    // Resume logic
    const lastPlayedId = localStorage.getItem('listen_last_played_id');
    if (lastPlayedId) {
      const idx = tracks.findIndex(t => t.id === lastPlayedId);
      if (idx !== -1) {
        loadTrack(idx, false);
      }
    }
  } catch (error) {
    console.error('Failed to load audio manifest:', error);
    errorState.classList.remove('hidden');
  }

  function renderTrackLists(trackData) {
    const grouped = {
      "The Evolution of Spirit": [],
      "The Seven Densities": [],
      "Reflections": []
    };

    trackData.forEach((track, index) => {
      // Map global index for prev/next
      track.globalIndex = index;
      if (grouped[track.series]) {
        grouped[track.series].push(track);
      } else {
        grouped["Reflections"].push(track);
      }
    });

    trackListsContainer.innerHTML = '';

    seriesOrder.forEach(seriesName => {
      const seriesTracks = grouped[seriesName];
      if (seriesTracks && seriesTracks.length > 0) {
        const section = document.createElement('section');
        section.className = 'series-section';

        const h2 = document.createElement('h2');
        h2.className = 'series-title';
        h2.textContent = seriesName;
        section.appendChild(h2);

        const ul = document.createElement('ul');
        ul.className = 'track-list';

        seriesTracks.forEach(track => {
          const li = document.createElement('li');
          li.className = 'track-item';
          li.dataset.id = track.id;
          li.dataset.index = track.globalIndex;

          li.innerHTML = `
            <div class="track-title">${track.title}</div>
            <div class="track-desc">${track.description}</div>
          `;

          li.addEventListener('click', () => {
            if (currentTrackIndex === track.globalIndex) {
              togglePlay();
            } else {
              loadTrack(track.globalIndex, true);
            }
          });

          ul.appendChild(li);
        });

        section.appendChild(ul);
        trackListsContainer.appendChild(section);
      }
    });
  }

  function loadTrack(index, autoPlay = false) {
    currentTrackIndex = index;
    const track = tracks[index];

    // Update UI
    npTitle.textContent = track.title;
    npDesc.textContent = track.description;
    playerContainer.classList.remove('hidden');

    // Highlight active track
    document.querySelectorAll('.track-item').forEach(el => {
      el.classList.remove('playing');
      if (parseInt(el.dataset.index) === index) {
        el.classList.add('playing');
      }
    });

    // Set Audio Source
    audioElement.src = `audio/narrations/${track.file}`;

    // Load saved position
    const savedPos = localStorage.getItem(`listen_pos_${track.id}`);
    if (savedPos) {
      audioElement.currentTime = parseFloat(savedPos);
    } else {
      audioElement.currentTime = 0;
    }

    updateProgress();
    localStorage.setItem('listen_last_played_id', track.id);

    if (autoPlay) {
      audioElement.play().catch(e => console.error("Playback failed", e));
    } else {
      updatePlayPauseIcon();
    }
  }

  function togglePlay() {
    if (audioElement.paused) {
      audioElement.play();
    } else {
      audioElement.pause();
    }
  }

  function updatePlayPauseIcon() {
    if (audioElement.paused) {
      iconPlay.classList.remove('hidden');
      iconPause.classList.add('hidden');
    } else {
      iconPlay.classList.add('hidden');
      iconPause.classList.remove('hidden');
    }
  }

  // Audio Event Listeners
  audioElement.addEventListener('play', updatePlayPauseIcon);
  audioElement.addEventListener('pause', updatePlayPauseIcon);

  audioElement.addEventListener('timeupdate', () => {
    updateProgress();
    if (currentTrackIndex !== -1) {
      const track = tracks[currentTrackIndex];
      localStorage.setItem(`listen_pos_${track.id}`, audioElement.currentTime);
    }
  });

  audioElement.addEventListener('loadedmetadata', updateProgress);

  audioElement.addEventListener('ended', () => {
    if (currentTrackIndex !== -1) {
      const track = tracks[currentTrackIndex];
      localStorage.removeItem(`listen_pos_${track.id}`);
      playNext();
    }
  });

  // Progress Bar Logic
  function updateProgress() {
    const current = audioElement.currentTime || 0;
    const duration = audioElement.duration || (tracks[currentTrackIndex] ? tracks[currentTrackIndex].durationSecs : 0) || 0;

    timeCurrent.textContent = formatTime(current);
    timeDuration.textContent = formatTime(duration);

    if (duration > 0) {
      const percent = (current / duration) * 100;
      progressBar.style.width = `${percent}%`;
    } else {
      progressBar.style.width = '0%';
    }
  }

  progressWrapper.addEventListener('click', (e) => {
    if (currentTrackIndex === -1) return;
    const rect = progressWrapper.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const duration = audioElement.duration || tracks[currentTrackIndex].durationSecs;
    if (duration) {
      audioElement.currentTime = pos * duration;
    }
  });

  // Controls
  btnPlayPause.addEventListener('click', () => {
    if (currentTrackIndex === -1 && tracks.length > 0) {
      loadTrack(0, true);
    } else {
      togglePlay();
    }
  });

  function playPrev() {
    if (currentTrackIndex > 0) {
      loadTrack(currentTrackIndex - 1, true);
    } else if (tracks.length > 0) {
      loadTrack(tracks.length - 1, true); // loop to end
    }
  }

  function playNext() {
    if (currentTrackIndex < tracks.length - 1) {
      loadTrack(currentTrackIndex + 1, true);
    } else if (tracks.length > 0) {
      loadTrack(0, true); // loop to start
    }
  }

  btnPrev.addEventListener('click', playPrev);
  btnNext.addEventListener('click', playNext);

  // Utils
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
});
