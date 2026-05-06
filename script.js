/* =============================================
   HEAVEN BEAUTY PARLOUR — script.js
   Cloudinary (image storage) + JSONBin (shared DB)
   Photos visible to ALL visitors everywhere!
   ============================================= */

/* ---------- CONFIGURATION ---------- */
const WP_NUMBER     = '919853448984';
const CLOUD_NAME    = 'dw2bbebao';
const UPLOAD_PRESET = 'ml_default';

/* JSONBin — shared database for photo URLs */
const JSONBIN_KEY    = '$2a$10$JxDaTxfmbHwQ/ujrKwbRQegA1ojchupbpBqnX5X2ug5IULn7dWeVC';
const JSONBIN_BIN_ID_KEY = 'heaven_bin_id'; // stored in localStorage after first creation

const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/* ---------- SERVICE INFO ---------- */
const serviceInfo = {
  hair:  { title: 'Hair Styling',       desc: 'Expert cuts, blowouts, and glamour styling tailored to your personal look.',      wp: 'Hair Styling' },
  skin:  { title: 'Skin Care & Facials', desc: 'Deep cleansing, glowing facials, and anti-aging treatments for flawless skin.',  wp: 'Skin Care / Facial' },
  nails: { title: 'Nail Care',           desc: 'Manicures, pedicures, and nail art to complete your polished finish.',           wp: 'Nail Care' }
};

/* ---------- STATE ---------- */
let pendingFiles    = [];
let storedPhotos    = [];   // [{url, public_id, addedAt}, ...]
let makeupOpen      = false;
let bookingFormOpen = false;
let lightboxIndex   = 0;

/* =============================================
   JSONBIN HELPERS
   ============================================= */
const JSONBIN_BASE = 'https://api.jsonbin.io/v3';

async function getBinId() {
  /* Check if we already created a bin before */
  let binId = localStorage.getItem(JSONBIN_BIN_ID_KEY);
  if (binId) return binId;

  /* First time: create a new bin */
  const res = await fetch(`${JSONBIN_BASE}/b`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': JSONBIN_KEY,
      'X-Bin-Name':   'heaven_makeup_gallery',
      'X-Bin-Private': 'false'
    },
    body: JSON.stringify({ photos: [] })
  });
  const data = await res.json();
  binId = data.metadata.id;
  localStorage.setItem(JSONBIN_BIN_ID_KEY, binId);
  return binId;
}

async function readPhotos() {
  try {
    const binId = await getBinId();
    const res   = await fetch(`${JSONBIN_BASE}/b/${binId}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_KEY }
    });
    const data = await res.json();
    return data.record.photos || [];
  } catch (e) {
    return [];
  }
}

async function writePhotos(photos) {
  const binId = await getBinId();
  await fetch(`${JSONBIN_BASE}/b/${binId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': JSONBIN_KEY
    },
    body: JSON.stringify({ photos })
  });
}

/* =============================================
   NAV TOGGLE
   ============================================= */
const navToggle = document.getElementById('navToggle');
const mainNav   = document.getElementById('mainNav');
navToggle.addEventListener('click', () => mainNav.classList.toggle('open'));
mainNav.querySelectorAll('a').forEach(l => l.addEventListener('click', () => mainNav.classList.remove('open')));

/* =============================================
   WHATSAPP
   ============================================= */
function buildWpUrl(msg) {
  return `https://wa.me/${WP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

/* =============================================
   BOOKING FORM
   ============================================= */
function toggleBookingForm() {
  bookingFormOpen = !bookingFormOpen;
  document.getElementById('inlineBookingForm').style.display = bookingFormOpen ? 'block' : 'none';
  const arrow = document.getElementById('formArrow');
  if (arrow) arrow.textContent = bookingFormOpen ? '−' : '+';
}

function submitFormWP() {
  const name    = document.getElementById('bName').value.trim();
  const phone   = document.getElementById('bPhone').value.trim();
  const service = document.getElementById('bService').value;
  const date    = document.getElementById('bDate').value;
  const msg     = document.getElementById('bMsg').value.trim();
  if (!name || !phone) { showToast('Please enter your name and phone number.'); return; }
  const text = [
    `Hi! I'd like to book an appointment at Heaven Beauty Parlour, Kuruda, Baleshwar.`,
    ``,
    `*Name:* ${name}`,
    `*Phone:* ${phone}`,
    `*Service:* ${service}`,
    `*Date:* ${date || 'Flexible'}`,
    msg ? `*Note:* ${msg}` : ''
  ].filter(Boolean).join('\n');
  window.open(buildWpUrl(text), '_blank', 'noopener');
}

/* =============================================
   SERVICE CARDS
   ============================================= */
function openServicePanel(el) {
  const type = el.dataset.service;
  document.querySelectorAll('.service-card').forEach(c => c.classList.remove('active'));
  el.classList.add('active');

  if (type === 'makeup') {
    const panel  = document.getElementById('makeupPanel');
    const isOpen = panel.style.display === 'block';
    document.getElementById('svcQuickPanel').style.display = 'none';
    if (isOpen) {
      panel.style.display = 'none';
      makeupOpen = false;
      el.classList.remove('active');
    } else {
      panel.style.display = 'block';
      makeupOpen = true;
      loadGallery();
      setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
  } else {
    document.getElementById('makeupPanel').style.display = 'none';
    makeupOpen = false;
    const info       = serviceInfo[type];
    const quickPanel = document.getElementById('svcQuickPanel');
    document.getElementById('svcPanelTitle').textContent = info.title;
    document.getElementById('svcPanelDesc').textContent  = info.desc;
    const wpBtn = document.getElementById('svcWpBtn');
    wpBtn.href   = buildWpUrl(`Hi! I'd like to book *${info.wp}* at Heaven Beauty Parlour, Kuruda, Baleshwar. Please share available slots.`);
    wpBtn.target = '_blank'; wpBtn.rel = 'noopener';
    quickPanel.style.display = 'block';
    setTimeout(() => quickPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }
}

/* =============================================
   TABS
   ============================================= */
function switchTab(tab) {
  document.getElementById('tabGalleryBtn').classList.toggle('active', tab === 'gallery');
  document.getElementById('tabAdminBtn').classList.toggle('active',   tab === 'admin');
  document.getElementById('tabGallery').style.display = tab === 'gallery' ? 'block' : 'none';
  document.getElementById('tabAdmin').style.display   = tab === 'admin'   ? 'block' : 'none';
}

/* =============================================
   LOAD GALLERY FROM JSONBIN
   ============================================= */
async function loadGallery() {
  const grid = document.getElementById('photoGrid');
  grid.innerHTML = `<div class="loading-photos"><span>⏳ Loading photos…</span></div>`;
  storedPhotos = await readPhotos();
  renderGallery();
}

/* =============================================
   RENDER GALLERY
   ============================================= */
function renderGallery() {
  const grid = document.getElementById('photoGrid');
  if (!storedPhotos.length) {
    grid.innerHTML = `
      <div class="empty-gallery">
        <div class="empty-icon">💄</div>
        <p>No makeup photos yet.</p>
        <p class="empty-hint">Switch to the Admin Upload tab to add your photos.</p>
      </div>`;
    return;
  }
  grid.innerHTML = storedPhotos.map((photo, i) => `
    <div class="photo-item">
      <img src="${photo.url}" alt="Makeup photo ${i + 1}" loading="lazy" onclick="openLightbox(${i})" style="cursor:pointer;" />
      <div class="photo-overlay">
        <button class="share-btn" onclick="sharePhoto(${i})">&#128257; Share</button>
        <button class="del-btn"   onclick="deletePhoto(${i})" title="Delete">&#128465;</button>
      </div>
    </div>
  `).join('');
}

/* =============================================
   DELETE PHOTO
   ============================================= */
async function deletePhoto(i) {
  if (!confirm('Remove this photo from the gallery for everyone?')) return;
  storedPhotos.splice(i, 1);
  renderGallery();
  showToast('Deleting…');
  await writePhotos(storedPhotos);
  showToast('Photo deleted for all visitors.');
}

/* =============================================
   SHARE PHOTO
   ============================================= */
function sharePhoto(i) {
  const url = storedPhotos[i].url;
  if (navigator.share) {
    navigator.share({ title: 'Heaven Beauty Parlour – Makeup Look', text: 'Check out this gorgeous look from Heaven Beauty Parlour! 💄', url }).catch(() => {});
    return;
  }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => showToast('Photo link copied! Share it anywhere.')).catch(() => showToast('Share the page URL manually.'));
  }
}

/* =============================================
   FILE PREVIEW (before upload)
   ============================================= */
function handleFiles(files) {
  pendingFiles = Array.from(files);
  if (!pendingFiles.length) return;
  const previewGrid = document.getElementById('previewGrid');
  previewGrid.style.display = 'grid';
  previewGrid.innerHTML = pendingFiles.map((_, i) =>
    `<div class="preview-thumb"><img id="prev${i}" alt="Preview ${i+1}" /></div>`
  ).join('');
  pendingFiles.forEach((file, i) => {
    const r = new FileReader();
    r.onload = e => { const img = document.getElementById('prev'+i); if(img) img.src = e.target.result; };
    r.readAsDataURL(file);
  });
  document.getElementById('uploadBtn').style.display = 'block';
}

/* =============================================
   UPLOAD TO CLOUDINARY → SAVE URL TO JSONBIN
   ============================================= */
async function uploadPhotos() {
  if (!pendingFiles.length) return;
  const btn = document.getElementById('uploadBtn');
  btn.disabled = true;
  let uploaded = 0;
  const errors = [];

  for (const file of pendingFiles) {
    btn.textContent = `Uploading ${uploaded + 1} / ${pendingFiles.length}…`;
    const fd = new FormData();
    fd.append('file',          file);
    fd.append('upload_preset', UPLOAD_PRESET);
    fd.append('folder',        'heaven_beauty');
    try {
      const res  = await fetch(UPLOAD_URL, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.secure_url) {
        storedPhotos.push({ url: data.secure_url, public_id: data.public_id, addedAt: Date.now() });
        uploaded++;
      } else { errors.push(file.name); }
    } catch(e) { errors.push(file.name); }
  }

  /* Save all URLs to JSONBin so everyone sees them */
  if (uploaded > 0) {
    btn.textContent = 'Saving to cloud database…';
    await writePhotos(storedPhotos);
  }

  /* Reset UI */
  btn.textContent   = 'Save Photos to Gallery';
  btn.disabled      = false;
  btn.style.display = 'none';
  document.getElementById('previewGrid').style.display = 'none';
  document.getElementById('previewGrid').innerHTML     = '';
  document.getElementById('photoInput').value          = '';
  pendingFiles = [];

  showToast(errors.length
    ? `${uploaded} uploaded, ${errors.length} failed.`
    : `${uploaded} photo(s) live! Visible to ALL visitors now. 🎉`
  );
  switchTab('gallery');
  renderGallery();
}

/* =============================================
   LIGHTBOX
   ============================================= */
function openLightbox(i) {
  lightboxIndex = i;
  updateLightbox();
  document.getElementById('lightboxOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  document.getElementById('lightboxOverlay').classList.remove('active');
  document.body.style.overflow = '';
}
function updateLightbox() {
  const photo = storedPhotos[lightboxIndex];
  const img   = document.getElementById('lightboxImg');
  img.style.animation = 'none'; img.offsetHeight; img.style.animation = '';
  img.src = photo.url;
  img.alt = `Makeup photo ${lightboxIndex + 1}`;
  document.getElementById('lightboxCounter').textContent = `${lightboxIndex + 1} / ${storedPhotos.length}`;
  const show = storedPhotos.length > 1;
  document.getElementById('lightboxPrev').style.display = show ? 'flex' : 'none';
  document.getElementById('lightboxNext').style.display = show ? 'flex' : 'none';
}
function lightboxNav(dir) {
  lightboxIndex = (lightboxIndex + dir + storedPhotos.length) % storedPhotos.length;
  updateLightbox();
}
function lightboxBgClick(e) {
  if (e.target === document.getElementById('lightboxOverlay') ||
      e.target === document.getElementById('lightboxImgWrap')) closeLightbox();
}
document.addEventListener('keydown', e => {
  const ov = document.getElementById('lightboxOverlay');
  if (!ov.classList.contains('active')) return;
  if      (e.key === 'ArrowRight') lightboxNav(1);
  else if (e.key === 'ArrowLeft')  lightboxNav(-1);
  else if (e.key === 'Escape')     closeLightbox();
});

/* =============================================
   TOAST
   ============================================= */
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.display = 'block';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.display = 'none'; }, 3500);
}

/* =============================================
   SMOOTH SCROLL
   ============================================= */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function(e) {
    const t = document.querySelector(this.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
  });
});
