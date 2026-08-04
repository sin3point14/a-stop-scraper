/**
 * A-STOP Precomputed Showcase Browser
 * Full client-side interactive engine with multi-tag union logic, shelf sorting,
 * last-viewed auto-resume, image lightbox, and precomputed dataset integration.
 */

(function () {
  'use strict';

  // Application State
  const state = {
    cases: [],
    tags: [],
    filteredCases: [],
    selectedTags: new Set(),
    activeBlock: 'ALL',
    searchQuery: '',
    tagSearchQuery: '',
    sortOrder: 'block-asc', // 'block-asc' (Letter A-79 -> B-01), 'number-asc', 'number-desc', 'date-desc'
    multiTagLogic: 'union',  // 'union' (Match Any) or 'intersect' (Match All)
    displayMode: 'filter',   // 'filter' (Hide non-matching) or 'highlight' (Highlight matching)
    imgSize: 'size-lg',      // 'size-md', 'size-lg' (default), 'size-xl'
    
    // Lightbox State
    lightbox: {
      isOpen: false,
      caseItem: null,
      imageIndex: 0
    }
  };

  // DOM Elements
  const el = {
    loadingSpinner: document.getElementById('loading-spinner'),
    emptyState: document.getElementById('empty-state'),
    casesList: document.getElementById('cases-list'),
    caseFeed: document.getElementById('case-feed'),
    
    // Search & Inputs
    globalSearch: document.getElementById('global-search'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    tagSearchInput: document.getElementById('tag-search-input'),
    sortSelect: document.getElementById('sort-select'),
    
    // Stats
    statVisibleCases: document.getElementById('stat-visible-cases'),
    statTotalCases: document.getElementById('stat-total-cases'),
    statTotalImages: document.getElementById('stat-total-images'),
    
    // Tags & Sidebar
    sidebar: document.getElementById('sidebar'),
    toggleSidebarBtn: document.getElementById('toggle-sidebar-btn'),
    blockChipsContainer: document.getElementById('block-chips-container'),
    selectedTagsBar: document.getElementById('selected-tags-bar'),
    activeTagsList: document.getElementById('active-tags-list'),
    clearAllTagsBtn: document.getElementById('clear-all-tags-btn'),
    tagCloudContainer: document.getElementById('tag-cloud-container'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    
    // Lightbox Modal
    lightboxModal: document.getElementById('lightbox-modal'),
    lightboxBackdrop: document.querySelector('.lightbox-backdrop'),
    lightboxClose: document.getElementById('lightbox-close'),
    lightboxPrev: document.getElementById('lightbox-prev'),
    lightboxNext: document.getElementById('lightbox-next'),
    lightboxImg: document.getElementById('lightbox-img'),
    lightboxCaseId: document.getElementById('lightbox-case-id'),
    lightboxCounter: document.getElementById('lightbox-counter'),
    lightboxTitle: document.getElementById('lightbox-title'),
    lightboxCaption: document.getElementById('lightbox-caption'),
    lightboxTags: document.getElementById('lightbox-tags'),
    lightboxAstopLink: document.getElementById('lightbox-astop-link')
  };

  // Init Application
  async function init() {
    // Collapse sidebar by default so main view gets 100% width
    el.sidebar.classList.add('collapsed');
    
    loadLocalState();
    setupEventListeners();
    await loadData();
  }

  // Load saved state from LocalStorage
  function loadLocalState() {
    try {
      const savedLogic = localStorage.getItem('astop_tag_logic');
      if (savedLogic) state.multiTagLogic = savedLogic;

      const savedMode = localStorage.getItem('astop_display_mode');
      if (savedMode) state.displayMode = savedMode;

      const savedSize = localStorage.getItem('astop_img_size');
      if (savedSize) state.imgSize = savedSize;

      applyImageSizeClass();
    } catch (e) {
      console.warn('LocalStorage unavailable:', e);
    }
  }

  function applyImageSizeClass() {
    el.caseFeed.classList.remove('size-md', 'size-lg', 'size-xl');
    el.caseFeed.classList.add(state.imgSize);

    document.querySelectorAll('.size-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === state.imgSize);
    });
  }

  // Save current state to LocalStorage
  function saveLocalState() {
    try {
      if (state.lastViewedCaseId) {
        localStorage.setItem('astop_last_viewed_case', state.lastViewedCaseId);
      }
      localStorage.setItem('astop_tag_logic', state.multiTagLogic);
      localStorage.setItem('astop_display_mode', state.displayMode);
      localStorage.setItem('astop_img_size', state.imgSize);
    } catch (e) {
      // ignore
    }
  }

  function updateResumeButtons(caseId) {
    if (caseId) {
      el.resumeCaseId.textContent = caseId;
      el.resumeBannerId.textContent = caseId;
      el.resumeBtn.classList.remove('hidden');
    }
  }

  // Load JSON Data
  async function loadData() {
    try {
      const response = await fetch('cases_data.json');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      state.cases = data.cases || [];
      state.tags = data.tags || [];

      // Update total stats
      el.statTotalCases.textContent = state.cases.length;
      el.statTotalImages.textContent = data.total_images || calculateTotalImages(state.cases);

      // Render block chips & tag cloud
      renderBlockChips();
      renderTagCloud();
      
      // Hide loading spinner
      el.loadingSpinner.classList.add('hidden');
      
      // Initial Filter & Render
      applyFiltersAndSort();

    } catch (err) {
      console.error("Failed to load dataset:", err);
      el.loadingSpinner.innerHTML = `
        <div class="empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <h3>Dataset Loading...</h3>
        <p style="max-width: 400px; margin: 0 auto; color: var(--text-muted);">
          Scraper is building cases_data.json. Page will automatically retry in 3 seconds.
        </p>
      `;
      setTimeout(loadData, 3000);
    }
  }

  function calculateTotalImages(cases) {
    return cases.reduce((acc, c) => acc + (c.images ? c.images.length : 0), 0);
  }

  // Setup UI Event Listeners
  function setupEventListeners() {
    // Global Search
    el.globalSearch.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      el.clearSearchBtn.classList.toggle('hidden', !state.searchQuery);
      applyFiltersAndSort();
    });

    el.clearSearchBtn.addEventListener('click', () => {
      el.globalSearch.value = '';
      state.searchQuery = '';
      el.clearSearchBtn.classList.add('hidden');
      applyFiltersAndSort();
    });

    // Tag Search
    el.tagSearchInput.addEventListener('input', (e) => {
      state.tagSearchQuery = e.target.value.trim().toLowerCase();
      renderTagCloud();
    });

    // Clear All Tags Button
    el.clearAllTagsBtn.addEventListener('click', () => {
      state.selectedTags.clear();
      updateTagUI();
      applyFiltersAndSort();
    });

    // Sort Dropdown
    el.sortSelect.addEventListener('change', (e) => {
      state.sortOrder = e.target.value;
      applyFiltersAndSort();
    });

    // Sidebar Segmented Controls (Logic & Display mode)
    document.querySelectorAll('.segmented-control').forEach(control => {
      control.addEventListener('click', (e) => {
        const btn = e.target.closest('.segment');
        if (!btn) return;
        
        const parent = btn.parentElement;
        parent.querySelectorAll('.segment').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (btn.dataset.logic) {
          state.multiTagLogic = btn.dataset.logic;
          saveLocalState();
          applyFiltersAndSort();
        } else if (btn.dataset.mode) {
          state.displayMode = btn.dataset.mode;
          saveLocalState();
          applyFiltersAndSort();
        }
      });
    });

    // Image Size Selector Buttons (M, L, XL)
    document.querySelectorAll('.size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.imgSize = btn.dataset.size;
        applyImageSizeClass();
        saveLocalState();
      });
    });

    // Toggle Sidebar
    el.toggleSidebarBtn.addEventListener('click', () => {
      el.sidebar.classList.toggle('collapsed');
    });

    el.resetFiltersBtn.addEventListener('click', resetAllFilters);

    // Lightbox Modal Controls
    el.lightboxClose.addEventListener('click', closeLightbox);
    el.lightboxBackdrop.addEventListener('click', closeLightbox);
    el.lightboxPrev.addEventListener('click', showPrevLightboxImage);
    el.lightboxNext.addEventListener('click', showNextLightboxImage);

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (!state.lightbox.isOpen) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showPrevLightboxImage();
      if (e.key === 'ArrowRight') showNextLightboxImage();
    });
  }

  function resetAllFilters() {
    state.selectedTags.clear();
    state.activeBlock = 'ALL';
    state.searchQuery = '';
    state.tagSearchQuery = '';
    el.globalSearch.value = '';
    el.tagSearchInput.value = '';
    el.clearSearchBtn.classList.add('hidden');

    document.querySelectorAll('.block-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.block === 'ALL');
    });

    updateTagUI();
    applyFiltersAndSort();
  }

  // Render Block Chips (A, B, C, E, F...)
  function renderBlockChips() {
    const blocks = new Set();
    state.cases.forEach(c => {
      if (c.letter) blocks.add(c.letter.toUpperCase());
    });

    const sortedBlocks = ['ALL', ...Array.from(blocks).sort()];
    el.blockChipsContainer.innerHTML = '';

    sortedBlocks.forEach(b => {
      const chip = document.createElement('button');
      chip.className = `block-chip ${b === state.activeBlock ? 'active' : ''}`;
      chip.dataset.block = b;
      chip.textContent = b === 'ALL' ? 'ALL' : `Block ${b}`;
      
      chip.addEventListener('click', () => {
        state.activeBlock = b;
        document.querySelectorAll('.block-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        applyFiltersAndSort();
      });

      el.blockChipsContainer.appendChild(chip);
    });
  }

  // Render Tag Cloud in Sidebar
  function renderTagCloud() {
    // Count occurrences of each tag
    const tagCounts = {};
    state.cases.forEach(c => {
      if (c.tags) {
        c.tags.forEach(t => {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        });
      }
    });

    // Filter tags by sidebar search query
    let filteredTags = state.tags;
    if (state.tagSearchQuery) {
      filteredTags = filteredTags.filter(t => t.toLowerCase().includes(state.tagSearchQuery));
    }

    el.tagCloudContainer.innerHTML = '';
    
    filteredTags.forEach(tag => {
      const isSelected = state.selectedTags.has(tag);
      const pill = document.createElement('div');
      pill.className = `tag-pill ${isSelected ? 'active' : ''}`;
      pill.innerHTML = `
        <span>${escapeHtml(tag)}</span>
        <span class="tag-count">${tagCounts[tag] || 0}</span>
      `;

      pill.addEventListener('click', () => toggleTagSelection(tag));
      el.tagCloudContainer.appendChild(pill);
    });
  }

  function toggleTagSelection(tag) {
    if (state.selectedTags.has(tag)) {
      state.selectedTags.delete(tag);
    } else {
      state.selectedTags.add(tag);
    }
    updateTagUI();
    applyFiltersAndSort();
  }

  function updateTagUI() {
    renderTagCloud();
    renderActiveTagsBar();
  }

  function renderActiveTagsBar() {
    const activeCount = state.selectedTags.size;
    el.selectedTagsBar.classList.toggle('hidden', activeCount === 0);
    el.clearAllTagsBtn.classList.toggle('hidden', activeCount === 0);

    el.activeTagsList.innerHTML = '';
    state.selectedTags.forEach(tag => {
      const pill = document.createElement('div');
      pill.className = 'tag-pill active';
      pill.innerHTML = `
        <span>${escapeHtml(tag)}</span>
        <i class="fa-solid fa-xmark remove-icon"></i>
      `;
      pill.addEventListener('click', () => toggleTagSelection(tag));
      el.activeTagsList.appendChild(pill);
    });
  }

  // Main Filtering and Sorting Logic
  function applyFiltersAndSort() {
    const query = state.searchQuery;
    const selectedTagsArr = Array.from(state.selectedTags);
    const activeBlock = state.activeBlock;

    state.filteredCases = state.cases.map(caseItem => {
      // 1. Block Filter
      if (activeBlock !== 'ALL' && caseItem.letter.toUpperCase() !== activeBlock) {
        return { item: caseItem, matches: false };
      }

      // 2. Global Keyword Search
      if (query) {
        const idMatch = caseItem.id.toLowerCase().includes(query) || caseItem.code.toLowerCase().includes(query);
        const titleMatch = caseItem.title.toLowerCase().includes(query);
        const captionMatch = caseItem.caption.toLowerCase().includes(query);
        const tagMatch = caseItem.tags && caseItem.tags.some(t => t.toLowerCase().includes(query));
        
        if (!idMatch && !titleMatch && !captionMatch && !tagMatch) {
          return { item: caseItem, matches: false };
        }
      }

      // 3. Multi-Tag Logic (UNION vs INTERSECT)
      if (selectedTagsArr.length > 0) {
        const caseTags = new Set(caseItem.tags || []);
        if (state.multiTagLogic === 'union') {
          // UNION: Case must contain ANY of the selected tags
          const matchesAny = selectedTagsArr.some(tag => caseTags.has(tag));
          if (!matchesAny) return { item: caseItem, matches: false };
        } else {
          // INTERSECT: Case must contain ALL of the selected tags
          const matchesAll = selectedTagsArr.every(tag => caseTags.has(tag));
          if (!matchesAll) return { item: caseItem, matches: false };
        }
      }

      return { item: caseItem, matches: true };
    });

    // Sorting
    sortFilteredCases();

    // Render Feed
    renderCasesFeed();
  }

  function sortFilteredCases() {
    const order = state.sortOrder;
    state.filteredCases.sort((a, b) => {
      const ca = a.item;
      const cb = b.item;

      if (order === 'number-asc') {
        if (ca.number !== cb.number) return ca.number - cb.number;
        return ca.letter.localeCompare(cb.letter);
      } else if (order === 'number-desc') {
        if (ca.number !== cb.number) return cb.number - ca.number;
        return ca.letter.localeCompare(cb.letter);
      } else if (order === 'block-asc') {
        const letterCmp = ca.letter.localeCompare(cb.letter);
        if (letterCmp !== 0) return letterCmp;
        return ca.number - cb.number;
      } else if (order === 'date-desc') {
        return (cb.date || '').localeCompare(ca.date || '');
      }
      return 0;
    });
  }

  // Render Case Rows
  function renderCasesFeed() {
    el.casesList.innerHTML = '';
    
    // Determine visible cases based on display mode
    let visibleCount = 0;

    state.filteredCases.forEach(({ item, matches }) => {
      if (state.displayMode === 'filter' && !matches) {
        return; // Hide non-matching cases
      }

      visibleCount++;
      const rowCard = createCaseRowCard(item, matches);
      el.casesList.appendChild(rowCard);
    });

    el.statVisibleCases.textContent = visibleCount;
    el.emptyState.classList.toggle('hidden', visibleCount > 0);
  }

  // Create single Case Row Element
  function createCaseRowCard(item, isMatch) {
    const card = document.createElement('article');
    card.className = 'case-row-card';
    card.id = `case-${item.id}`;
    card.dataset.caseId = item.id;

    if (state.selectedTags.size > 0 || state.searchQuery) {
      if (isMatch) {
        card.classList.add('highlighted-match');
      } else if (state.displayMode === 'highlight') {
        card.classList.add('dimmed');
      }
    }

    if (item.id === state.lastViewedCaseId) {
      card.classList.add('last-viewed-active');
    }

    // Build Tags HTML
    let tagsHtml = '';
    if (item.tags && item.tags.length > 0) {
      tagsHtml = item.tags.map(t => {
        const isTagMatched = state.selectedTags.has(t);
        return `<span class="case-tag-badge ${isTagMatched ? 'tag-match' : ''}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</span>`;
      }).join('');
    } else {
      tagsHtml = `<span class="case-tag-badge" style="opacity: 0.5;">No tags</span>`;
    }

    // Build Lineup Images HTML
    let lineupHtml = '';
    if (item.images && item.images.length > 0) {
      lineupHtml = item.images.map((imgUrl, idx) => `
        <div class="lineup-item ${idx === 0 ? 'rep-img' : ''}" data-img-idx="${idx}">
          <img src="${imgUrl}" loading="lazy" alt="${escapeHtml(item.title)} image ${idx + 1}" onerror="this.src='https://www.astop.co.jp/zone/wp-content/themes/astop_zone/dest/assets/image/blankImg.jpg';" />
          <span class="lineup-index-badge">${idx + 1}/${item.images.length}</span>
        </div>
      `).join('');
    }

    const caseCode = item.code || item.id.replace('-', '');
    const shelfPageUrl = `cases/${caseCode}.html`;

    card.innerHTML = `
      <div class="case-row-header">
        <div class="case-info-main">
          <a href="${shelfPageUrl}" class="case-badge" title="Open individual shelf page">${escapeHtml(item.id)}</a>
          <span class="case-number-tag">Shelf #${item.number}</span>
          <div class="case-tags-inline">
            ${tagsHtml}
          </div>
        </div>

        <div class="case-meta-right">
          ${item.date ? `<span class="case-date"><i class="fa-regular fa-clock"></i> ${escapeHtml(item.date)}</span>` : ''}
          <a href="${shelfPageUrl}" class="astop-link-btn share-page-btn" title="Open or Share Discord preview page">
            <i class="fa-solid fa-share-nodes"></i> Share Shelf
          </a>
          <a href="${item.url}" target="_blank" rel="noopener" class="astop-link-btn" title="Open detail page on ASTOP">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> ASTOP Page
          </a>
        </div>
      </div>

      <div class="case-lineup-container">
        ${lineupHtml}
      </div>
    `;

    // Add Tag Click Handlers
    card.querySelectorAll('.case-tag-badge[data-tag]').forEach(badge => {
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        const tag = badge.dataset.tag;
        toggleTagSelection(tag);
      });
    });

    // Add Image Lightbox Click Handlers
    card.querySelectorAll('.lineup-item').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const idx = parseInt(thumb.dataset.imgIdx, 10);
        openLightbox(item, idx);
      });
    });

    return card;
  }

  // Scroll Tracking & Resume State (IntersectionObserver)
  let scrollObserver = null;
  function setupScrollObserver() {
    if (scrollObserver) scrollObserver.disconnect();

    scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
          const caseId = entry.target.dataset.caseId;
          if (caseId && caseId !== state.lastViewedCaseId) {
            state.lastViewedCaseId = caseId;
            saveLocalState();
            updateResumeButtons(caseId);
          }
        }
      });
    }, {
      root: el.casesList.parentElement, // #case-feed container
      threshold: [0.4, 0.7]
    });

    // Observe all rendered case cards
    document.querySelectorAll('.case-row-card').forEach(card => {
      scrollObserver.observe(card);
    });
  }

  function scrollToCase(caseId, highlight = false) {
    const targetCard = document.getElementById(`case-${caseId}`);
    if (targetCard) {
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (highlight) {
        targetCard.style.transition = 'all 0.5s ease';
        targetCard.style.outline = '3px solid var(--accent-pink)';
        targetCard.style.boxShadow = '0 0 30px rgba(236, 72, 153, 0.5)';
        setTimeout(() => {
          targetCard.style.outline = '';
          targetCard.style.boxShadow = '';
        }, 2000);
      }
      
      // Show resume banner
      el.resumeBannerId.textContent = caseId;
      el.resumeBanner.classList.remove('hidden');
    }
  }

  // Lightbox Modal Logic
  function openLightbox(item, imgIndex) {
    state.lightbox.isOpen = true;
    state.lightbox.caseItem = item;
    state.lightbox.imageIndex = imgIndex;

    renderLightboxContent();
    el.lightboxModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    state.lightbox.isOpen = false;
    el.lightboxModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function showPrevLightboxImage() {
    const { caseItem, imageIndex } = state.lightbox;
    if (!caseItem || !caseItem.images) return;
    state.lightbox.imageIndex = (imageIndex - 1 + caseItem.images.length) % caseItem.images.length;
    renderLightboxContent();
  }

  function showNextLightboxImage() {
    const { caseItem, imageIndex } = state.lightbox;
    if (!caseItem || !caseItem.images) return;
    state.lightbox.imageIndex = (imageIndex + 1) % caseItem.images.length;
    renderLightboxContent();
  }

  function renderLightboxContent() {
    const { caseItem, imageIndex } = state.lightbox;
    if (!caseItem) return;

    const imgUrl = caseItem.images[imageIndex];
    el.lightboxImg.src = imgUrl;
    el.lightboxCaseId.textContent = caseItem.id;
    el.lightboxCounter.textContent = `${imageIndex + 1} of ${caseItem.images.length}`;
    el.lightboxTitle.textContent = caseItem.title || 'Shelf Detail';
    el.lightboxCaption.textContent = caseItem.caption || '';
    el.lightboxAstopLink.href = caseItem.url;

    // Render tags inside lightbox
    el.lightboxTags.innerHTML = (caseItem.tags || []).map(t => `
      <span class="tag-pill active">${escapeHtml(t)}</span>
    `).join('');
  }

  // Utility
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Start app when DOM ready
  document.addEventListener('DOMContentLoaded', init);

})();
