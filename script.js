/* =============================================
   HEAVEN BEAUTY PARLOUR — script.js
   Cloudinary cloud gallery (visible to ALL visitors)
   ============================================= */

/* ---------- CONFIGURATION ---------- */
const WP_NUMBER        = '919853448984';
const CLOUD_NAME       = 'dw2bbebao';
const UPLOAD_PRESET    = 'ml_default';
const GALLERY_TAG      = 'heaven_makeup';

const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const LIST_URL   = `https://res.cloudinary.com/${CLOUD_NAME}/image/list/${GALLERY_TAG}.json`;

/* ---------- SERVICE INFO ---------- */
const serviceInfo = {
  hair:  { title: 'Hair Styling',      desc: 'Expert cuts, blowouts, and glamour styling tailored to your personal look.',                   wp: 'Hair Styling' },
  skin:  { title: 'Skin Care & Facials', desc: 'Deep cleansing, glowing facials, and anti-aging treatments for flawless skin.',              wp: 'Skin Care / Facial' },
  nails: { title: 'Nail Care',          desc: 'Manicures, pedicures, and nail art to complete your polished finish.',                        wp: 'Nail Care' }
};

/* ---------- STATE ---------- */
let pendingFiles    = [];
let storedPhotos    = [];
let makeupOpen      = false;
let activeTab       = 'gallery';
let bookingFormOpen = false;
let lightboxIndex   = 0;

/* =============================================
   NAV TOGGLE
   ============================================= */
const navToggle = document.getElementById('navToggle');
const mainNav   = document.getElementById('mainNav');

navToggle.addEventListener('click', () => mainNav.classList.toggle('open'));
mainNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => mainNav.classList.remove('open')));

/* =============================================
   WHATSAPP
   ============================================= */
function buildWpUrl(message) {
  return `https://wa.me/${WP_NUMBER}?text=${encodeURIComponent(message)}`;
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
    const panel = document.getElementById('makeupPanel');
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
    wpBtn.href   = buildWpUrl(`Hi! I'd like to book an appointment for *${info.wp}* at Heaven Beauty Parlour, Kuruda, Baleshwar. Please let me know available slots.`);
    wpBtn.target = '_blank';
    wpBtn.rel    = 'noopener';
    quickPanel.style.display = 'block';
    setTimeout(() => quickPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }
}

/* =============================================
   TABS
   ============================================= */
function switchTab(tab) {
  activeTab = tab;
  document.getElementById('tabGalleryBtn').classList.toggle('active', tab === 'gallery');
  document.getElementById('tabAdminBtn').classList.toggle('active',   tab === 'admin');
  document.getElementById('tabGallery').style.display = tab === 'gallery' ? 'block' : 'none';
  document.getElementById('tabAdmin').style.display   = tab === 'admin'   ? 'block' : 'none';
}

/* =============================================
   CLOUDINARY — LOAD GALLERY
   ============================================= */
async function loadGallery() {
  const grid = document.getElementById('photoGrid');
  grid.innerHTML = `<div class="loading-photos"><span>⏳ Loading photos…</span></div>`;

  try {
    const res  = await fetch(`${LIST_URL}?max_results=100&_=${Date.now()}`);
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();

    storedPhotos = (data.resources || []).map(r => ({
      public_id: r.public_id,
      url: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/q_auto,f_auto,w_800/${r.public_id}`
    }));
  } catch (err) {
    storedPhotos = [];
  }

  renderGallery();
}

/* =============================================
   CLOUDINARY — RENDER GALLERY
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
   DELETE (hide from view — delete permanently
   from Cloudinary dashboard)
   ============================================= */
function deletePhoto(i) {
  if (!confirm('Hide this photo?\n(To permanently delete, go to your Cloudinary Media Library.)')) return;
  storedPhotos.splice(i, 1);
  renderGallery();
  showToast('Photo hidden. Delete permanently from Cloudinary dashboard.');
}

/* =============================================
   SHARE PHOTO
   ============================================= */
function sharePhoto(i) {
  const url = storedPhotos[i].url;
  if (navigator.share) {
    navigator.share({ title: 'Heaven Beauty Parlour – Makeup Look', text: 'Check out this gorgeous look from Heaven Beauty Parlour, Baleshwar! 💄', url }).catch(() => {});
    return;
  }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => showToast('Photo link copied! Share it anywhere.')).catch(() => showToast('Could not copy — share the page URL manually.'));
  } else {
    showToast('Share this page URL to show off the look!');
  }
}

/* =============================================
   ADMIN — FILE PREVIEW
   ============================================= */
function handleFiles(files) {
  pendingFiles = Array.from(files);
  if (!pendingFiles.length) return;

  const previewGrid = document.getElementById('previewGrid');
  previewGrid.style.display = 'grid';
  previewGrid.innerHTML = pendingFiles.map((_, i) =>
    `<div class="preview-thumb"><img id="prev${i}" alt="Preview ${i + 1}" /></div>`
  ).join('');

  pendingFiles.forEach((file, i) => {
    const reader = new FileReader();
    reader.onload = e => { const img = document.getElementById('prev' + i); if (img) img.src = e.target.result; };
    reader.readAsDataURL(file);
  });

  document.getElementById('uploadBtn').style.display = 'block';
}

/* =============================================
   ADMIN — UPLOAD TO CLOUDINARY
   ============================================= */
async function uploadPhotos() {
  if (!pendingFiles.length) return;

  const btn = document.getElementById('uploadBtn');
  btn.disabled = true;

  let uploaded = 0;
  const errors = [];

  for (const file of pendingFiles) {
    btn.textContent = `Uploading ${uploaded + 1} / ${pendingFiles.length}…`;
    const formData = new FormData();
    formData.append('file',          file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('tags',          GALLERY_TAG);
    formData.append('folder',        'heaven_beauty');

    try {
      const res  = await fetch(UPLOAD_URL, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        storedPhotos.push({
          public_id: data.public_id,
          url: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/q_auto,f_auto,w_800/${data.public_id}`
        });
        uploaded++;
      } else {
        errors.push(file.name);
      }
    } catch (e) {
      errors.push(file.name);
    }
  }

  /* Reset UI */
  btn.textContent   = 'Save Photos to Gallery';
  btn.disabled      = false;
  btn.style.display = 'none';
  document.getElementById('previewGrid').style.display = 'none';
  document.getElementById('previewGrid').innerHTML     = '';
  document.getElementById('photoInput').value          = '';
  pendingFiles = [];

  if (errors.length) {
    showToast(`${uploaded} uploaded. ${errors.length} failed — check file size.`);
  } else {
    showToast(`${uploaded} photo(s) uploaded! Visible to ALL visitors now. 🎉`);
  }

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
  img.style.animation = 'none';
  img.offsetHeight;
  img.style.animation = '';
  img.src = photo.url;
  img.alt = `Makeup photo ${lightboxIndex + 1}`;
  document.getElementById('lightboxCounter').textContent = `${lightboxIndex + 1} / ${storedPhotos.length}`;
  const showArrows = storedPhotos.length > 1;
  document.getElementById('lightboxPrev').style.display = showArrows ? 'flex' : 'none';
  document.getElementById('lightboxNext').style.display = showArrows ? 'flex' : 'none';
}

function lightboxNav(direction) {
  lightboxIndex = (lightboxIndex + direction + storedPhotos.length) % storedPhotos.length;
  updateLightbox();
}

function lightboxBgClick(e) {
  if (e.target === document.getElementById('lightboxOverlay') || e.target === document.getElementById('lightboxImgWrap')) {
    closeLightbox();
  }
}

document.addEventListener('keydown', e => {
  const overlay = document.getElementById('lightboxOverlay');
  if (!overlay.classList.contains('active')) return;
  if      (e.key === 'ArrowRight') lightboxNav(1);
  else if (e.key === 'ArrowLeft')  lightboxNav(-1);
  else if (e.key === 'Escape')     closeLightbox();
});

/* =============================================
   TOAST
   ============================================= */
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent   = message;
  toast.style.display = 'block';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

/* =============================================
   SMOOTH SCROLL
   ============================================= */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
  });
});