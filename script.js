/* =============================================
   HEAVEN BEAUTY PARLOUR — script.js
   Cloudinary (images) + Supabase (shared DB)
   Photos visible to ALL visitors!
   ============================================= */

/* ---------- CONFIGURATION ---------- */
const WP_NUMBER      = '919853448984';
const CLOUD_NAME     = 'dw2bbebao';
const UPLOAD_PRESET  = 'ml_default';
const SUPABASE_URL   = 'https://upfmeebhnecppnooanli.supabase.co';
const SUPABASE_KEY   = 'sb_publishable_mKyZB0_6QusSwDO5_2yXvg_gYlIy7O2';
const TABLE          = 'photos';

const UPLOAD_URL     = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const DB_URL         = `${SUPABASE_URL}/rest/v1/${TABLE}`;

const DB_HEADERS = {
  'apikey':        SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type':  'application/json',
  'Prefer':        'return=representation'
};

/* ---------- SERVICE INFO ---------- */
const serviceInfo = {
  hair:  { title: 'Hair Styling',        desc: 'Expert cuts, blowouts, and glamour styling tailored to your personal look.',     wp: 'Hair Styling' },
  skin:  { title: 'Skin Care & Facials', desc: 'Deep cleansing, glowing facials, and anti-aging treatments for flawless skin.',  wp: 'Skin Care / Facial' },
  nails: { title: 'Nail Care',           desc: 'Manicures, pedicures, and nail art to complete your polished finish.',           wp: 'Nail Care' }
};

/* ---------- STATE ---------- */
let pendingFiles    = [];
let storedPhotos    = [];
let makeupOpen      = false;
let bookingFormOpen = false;
let lightboxIndex   = 0;

/* =============================================
   SUPABASE HELPERS
   ============================================= */
async function dbGetPhotos() {
  try {
    const res  = await fetch(`${DB_URL}?select=id,url,created_at&order=created_at.asc`, {
      headers: DB_HEADERS
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  } catch (e) {
    console.error('Load error:', e);
    return [];
  }
}

async function dbAddPhoto(url) {
  const res = await fetch(DB_URL, {
    method:  'POST',
    headers: DB_HEADERS,
    body:    JSON.stringify({ url })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function dbDeletePhoto(id) {
  const res = await fetch(`${DB_URL}?id=eq.${id}`, {
    method:  'DELETE',
    headers: DB_HEADERS
  });
  if (!res.ok) throw new Error(await res.text());
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
  document.getElementById('tabGalleryBtn').classList.toggle('active', tab === 'gallery');
  document.getElementById('tabAdminBtn').classList.toggle('active',   tab === 'admin');
  document.getElementById('tabGallery').style.display = tab === 'gallery' ? 'block' : 'none';
  document.getElementById('tabAdmin').style.display   = tab === 'admin'   ? 'block' : 'none';
}

/* =============================================
   LOAD GALLERY FROM SUPABASE
   ============================================= */
async function loadGallery() {
  const grid = document.getElementById('photoGrid');
  grid.innerHTML = `<div class="loading-photos"><span>⏳ Loading photos…</span></div>`;
  storedPhotos = await dbGetPhotos();
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
      <img src="${photo.url}" alt="Makeup photo ${i + 1}" loading="lazy"
           onclick="openLightbox(${i})" style="cursor:pointer;" />
      <div class="photo-overlay">
        <button class="share-btn" onclick="sharePhoto(${i})">&#128257; Share</button>
        <button class="del-btn"   onclick="deletePhoto(${photo.id}, ${i})" title="Delete">&#128465;</button>
      </div>
    </div>
  `).join('');
}

/* =============================================
   DELETE PHOTO (from Supabase + local array)
   ============================================= */
async function deletePhoto(id, i) {
  if (!confirm('Delete this photo for ALL visitors?')) return;
  storedPhotos.splice(i, 1);
  renderGallery();
  try {
    await dbDeletePhoto(id);
    showToast('Photo deleted for everyone.');
  } catch(e) {
    showToast('Error deleting. Try again.');
  }
}

/* =============================================
   SHARE PHOTO
   ============================================= */
function sharePhoto(i) {
  const url = storedPhotos[i].url;
  if (navigator.share) {
    navigator.share({
      title: 'Heaven Beauty Parlour – Makeup Look',
      text:  'Check out this gorgeous look from Heaven Beauty Parlour, Baleshwar! 💄',
      url
    }).catch(() => {});
    return;
  }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url)
      .then(() => showToast('Photo link copied! Share it anywhere.'))
      .catch(() => showToast('Share the page URL manually.'));
  }
}

/* =============================================
   FILE PREVIEW
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
   UPLOAD: Cloudinary → save URL to Supabase
   ============================================= */
async function uploadPhotos() {
  if (!pendingFiles.length) return;
  const btn = document.getElementById('uploadBtn');
  btn.disabled = true;
  let uploaded = 0;
  const errors = [];

  for (const file of pendingFiles) {
    btn.textContent = `Uploading ${uploaded + 1} / ${pendingFiles.length}…`;

    /* 1. Upload image to Cloudinary */
    const fd = new FormData();
    fd.append('file',          file);
    fd.append('upload_preset', UPLOAD_PRESET);
    fd.append('folder',        'heaven_beauty');

    let imageUrl = null;
    try {
      const res  = await fetch(UPLOAD_URL, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.secure_url) imageUrl = data.secure_url;
      else errors.push(file.name);
    } catch(e) {
      errors.push(file.name);
      continue;
    }

    /* 2. Save URL to Supabase so everyone sees it */
    if (imageUrl) {
      try {
        btn.textContent = `Saving to database…`;
        const rows = await dbAddPhoto(imageUrl);
        const newPhoto = Array.isArray(rows) ? rows[0] : rows;
        storedPhotos.push({ id: newPhoto.id, url: imageUrl, created_at: newPhoto.created_at });
        uploaded++;
      } catch(e) {
        console.error('Supabase save error:', e);
        errors.push(file.name);
      }
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

  showToast(errors.length
    ? `${uploaded} uploaded, ${errors.length} failed. Check file size.`
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
  document.getElementById('lightboxCounter').textContent =
    `${lightboxIndex + 1} / ${storedPhotos.length}`;
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
  t.textContent   = msg;
  t.style.display = 'block';
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
