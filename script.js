const media = [
  { type: "image", src: "DSC00331.JPG" },
  { type: "video", folder: "skybox", src: "skybox1.mp4", previewStart: 3, previewEnd: 13 },
];

const scene         = document.querySelector(".scene");
const lightbox      = document.getElementById("lightbox");
const lightboxVideo = document.getElementById("lightboxVideo");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxClose   = document.getElementById("lightboxClose");
const lightboxOverlay = document.getElementById("lightboxOverlay");
const infoPanel       = document.getElementById("infoPanel");
const infoContent     = document.getElementById("infoContent");
const infoOverlay     = document.getElementById("infoOverlay");

const ORBIT_DURATION = 60000;
let hoveredCount  = 0;
let lightboxOpen  = false; // pauses orbit while media is being viewed

// Track which wrapper was clicked so close can animate back to it
let activeWrapper = null;
let activeCard    = null; // the gallery card element, hidden while lightbox is open

// Timeout ID for restoring the open media to flex layout after its animation
let openRestoreTimeout = null;

// Info panel state
let panelOpen           = false;
let panelRestoreTimeout = null;

function openLightbox(type, src, wrapperEl) {
  const cardRect = wrapperEl.getBoundingClientRect();
  activeWrapper = wrapperEl;

  const mediaEl = type === "video" ? lightboxVideo : lightboxImage;
  const otherEl = type === "video" ? lightboxImage : lightboxVideo;

  if (type === "video") lightboxVideo.src = src;
  else lightboxImage.src = src;

  otherEl.classList.remove("active");
  mediaEl.classList.remove("active");
  // Clear any leftover styles from a previous open/close animation
  clearTimeout(openRestoreTimeout);
  openRestoreTimeout = null;
  mediaEl.style.transition   = "none";
  mediaEl.style.transform    = "";
  mediaEl.style.borderRadius = "";
  mediaEl.style.position     = "";
  mediaEl.style.left         = "";
  mediaEl.style.top          = "";
  mediaEl.style.width        = "";
  mediaEl.style.height       = "";
  mediaEl.style.maxWidth     = "";
  mediaEl.style.maxHeight    = "";
  mediaEl.style.objectFit    = "";
  mediaEl.style.zIndex       = "";

  lightboxOpen = true; // freeze orbit so card stays put

  // Hide the gallery card so the lightbox media appears to BE it expanding
  activeCard = wrapperEl.querySelector(".media-card");
  activeCard.style.opacity = "0";

  // Keep media invisible until it's positioned at the card
  mediaEl.style.opacity = "0";

  // Show lightbox (transparent — overlay fades in separately)
  lightbox.classList.add("active");
  mediaEl.classList.add("active");

  requestAnimationFrame(() => {
    let fr = mediaEl.getBoundingClientRect();

    // For videos the lightbox element may not have its metadata loaded yet and
    // the browser can report a wrong default size (e.g. 300×150) in this first
    // frame. The preview card video is already playing, so its videoWidth /
    // videoHeight are always accurate — use those to compute exactly where the
    // lightbox video will settle once it finishes loading.
    if (type === "video") {
      const previewVid = wrapperEl.querySelector("video");
      if (previewVid && previewVid.videoWidth > 0) {
        const vw = previewVid.videoWidth;
        const vh = previewVid.videoHeight;
        const fitScale = Math.min(
          (window.innerWidth  * 0.9) / vw,
          (window.innerHeight * 0.9) / vh
        );
        const natW = vw * fitScale;
        const natH = vh * fitScale;
        fr = {
          width:  natW,
          height: natH,
          left:   (window.innerWidth  - natW) / 2,
          top:    (window.innerHeight - natH) / 2,
        };
      }
    }

    if (fr.width > 0 && fr.height > 0) {
      const ease = "cubic-bezier(0.76, 0, 0.24, 1)";

      // Pin media at the card's circle position (matches the preview)
      mediaEl.style.position     = "fixed";
      mediaEl.style.left         = cardRect.left   + "px";
      mediaEl.style.top          = cardRect.top    + "px";
      mediaEl.style.width        = cardRect.width  + "px";
      mediaEl.style.height       = cardRect.height + "px";
      mediaEl.style.maxWidth     = "none";
      mediaEl.style.maxHeight    = "none";
      mediaEl.style.objectFit    = "cover";
      mediaEl.style.zIndex       = "101";
      mediaEl.style.borderRadius = "50%";

      void mediaEl.offsetHeight; // commit starting state

      // Reveal and animate to final natural size / rounded rect
      mediaEl.style.opacity    = "1";
      mediaEl.style.transition = [
        `left 0.65s ${ease}`,
        `top 0.65s ${ease}`,
        `width 0.65s ${ease}`,
        `height 0.65s ${ease}`,
        `border-radius 0.55s ${ease}`,
      ].join(", ");

      mediaEl.style.left         = fr.left   + "px";
      mediaEl.style.top          = fr.top    + "px";
      mediaEl.style.width        = fr.width  + "px";
      mediaEl.style.height       = fr.height + "px";
      mediaEl.style.borderRadius = "10px";

      lightboxOverlay.style.opacity = "1";

      if (type === "video") setTimeout(() => lightboxVideo.play(), 260);

      // Restore to natural flex layout after animation completes
      openRestoreTimeout = setTimeout(() => {
        openRestoreTimeout = null;
        mediaEl.style.transition   = "";
        mediaEl.style.position     = "";
        mediaEl.style.left         = "";
        mediaEl.style.top          = "";
        mediaEl.style.width        = "";
        mediaEl.style.height       = "";
        mediaEl.style.maxWidth     = "";
        mediaEl.style.maxHeight    = "";
        mediaEl.style.objectFit    = "";
        mediaEl.style.zIndex       = "";
        mediaEl.style.borderRadius = "";
      }, 700);

    } else {
      // Fallback: dimensions not available yet, just show
      mediaEl.style.opacity         = "1";
      lightboxOverlay.style.opacity = "1";
      if (type === "video") setTimeout(() => lightboxVideo.play(), 260);
    }
  });
}

function closeLightbox() {
  lightboxVideo.pause();

  // Cancel any pending open-animation restore so it doesn't clobber cleanup
  clearTimeout(openRestoreTimeout);
  openRestoreTimeout = null;

  const mediaEl   = lightboxVideo.classList.contains("active") ? lightboxVideo : lightboxImage;
  const mediaRect = mediaEl.getBoundingClientRect();
  const cardRect  = activeWrapper ? activeWrapper.getBoundingClientRect() : null;

  // Fade overlay out
  lightboxOverlay.style.opacity = "0";

  if (cardRect && mediaRect.width > 0) {
    const ease = "cubic-bezier(0.76, 0, 0.24, 1)";

    // Pull the element out of the flex flow and pin it at its current
    // screen position. Animating width/height instead of scale means the
    // image crops to the card's 3:2 ratio as it shrinks rather than squishing,
    // so there's no aspect-ratio snap when it lands on the card.
    mediaEl.style.position  = "fixed";
    mediaEl.style.left      = mediaRect.left   + "px";
    mediaEl.style.top       = mediaRect.top    + "px";
    mediaEl.style.width     = mediaRect.width  + "px";
    mediaEl.style.height    = mediaRect.height + "px";
    mediaEl.style.maxWidth  = "none";
    mediaEl.style.maxHeight = "none";
    mediaEl.style.objectFit = "cover";
    mediaEl.style.zIndex    = "101";

    void mediaEl.offsetHeight; // commit starting state before transition

    mediaEl.style.transition = [
      `left 0.5s ${ease}`,
      `top 0.5s ${ease}`,
      `width 0.5s ${ease}`,
      `height 0.5s ${ease}`,
      `border-radius 0.45s ${ease}`,
    ].join(", ");

    mediaEl.style.left         = cardRect.left   + "px";
    mediaEl.style.top          = cardRect.top    + "px";
    mediaEl.style.width        = cardRect.width  + "px";
    mediaEl.style.height       = cardRect.height + "px";
    mediaEl.style.borderRadius = "50%";
  }

  const delay = cardRect && mediaRect.width > 0 ? 520 : 0;
  setTimeout(() => {
    // Show the gallery card one frame before hiding the lightbox so
    // there's no gap — the card sits under the shrunk media, then takes its place
    if (activeCard) { activeCard.style.opacity = ""; }

    requestAnimationFrame(() => {
      lightbox.classList.remove("active");
      mediaEl.style.transition   = "";
      mediaEl.style.transform    = "";
      mediaEl.style.borderRadius = "";
      mediaEl.style.opacity      = "";
      mediaEl.style.position     = "";
      mediaEl.style.left         = "";
      mediaEl.style.top          = "";
      mediaEl.style.width        = "";
      mediaEl.style.height       = "";
      mediaEl.style.maxWidth     = "";
      mediaEl.style.maxHeight    = "";
      mediaEl.style.objectFit    = "";
      mediaEl.style.zIndex       = "";
      lightboxVideo.src = "";
      lightboxVideo.classList.remove("active");
      lightboxImage.src = "";
      lightboxImage.classList.remove("active");
      activeCard    = null;
      activeWrapper = null;
      lightboxOpen  = false;
    });
  }, delay);
}

const cards = [];

media.forEach((item, i) => {
  const wrapper = document.createElement("div");
  wrapper.className = "card-wrapper";

  const card = document.createElement("div");
  card.className = "media-card";

  if (item.type === "video") {
    const videoPath = `videos/${item.folder}/${item.src}`;
    const posterPath = `videos/${item.folder}/${item.src.replace(/\.[^.]+$/, '.png')}`;
    const previewStart = item.previewStart ?? 0;
    const previewEnd   = item.previewEnd   ?? null;

    // Poster as CSS background — shows through the transparent video on all browsers
    card.style.backgroundImage    = `url('${posterPath}')`;
    card.style.backgroundSize     = "cover";
    card.style.backgroundPosition = "center";

    // Video starts invisible, fades in once confirmed playing at the right time
    const vid = document.createElement("video");
    vid.src         = videoPath;
    vid.muted       = true;
    vid.loop        = false;
    vid.playsInline = true;
    vid.autoplay    = true;
    vid.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity 0.5s ease;";

    let videoShown = false;
    const showVideo = () => {
      if (videoShown) return;
      videoShown = true;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        vid.style.opacity = "1";
        setTimeout(() => { card.style.backgroundImage = ""; }, 500);
      }));
    };

    vid.addEventListener("loadedmetadata", () => { vid.currentTime = previewStart; });
    vid.addEventListener("timeupdate", () => {
      if (!vid.seeking && vid.currentTime >= previewStart) showVideo();
      if (previewEnd !== null && vid.currentTime >= previewEnd) vid.currentTime = previewStart;
    });

    card.appendChild(vid);
    card.addEventListener("click", () => openLightbox("video", videoPath, wrapper));

  } else if (item.type === "image") {
    const img = document.createElement("img");
    img.src = `images/${item.src}`;
    img.alt = "";
    card.appendChild(img);
    card.addEventListener("click", () => openLightbox("image", `images/${item.src}`, wrapper));
  }

  wrapper.appendChild(card);
  scene.appendChild(wrapper);

  const state = {
    wrapper,
    angleAccum: (i / media.length) * Math.PI * 2,
    timeAccum: 0,
    speed: 1,
    x: 0,
    y: 0,
  };

  wrapper.addEventListener("mouseenter", () => { hoveredCount++; });
  wrapper.addEventListener("mouseleave", () => { hoveredCount--; });

  cards.push(state);
});

const label = document.querySelector(".centerLabel");
let lastFrame = null;

function animate(timestamp) {
  const delta = lastFrame ? timestamp - lastFrame : 0;
  lastFrame = timestamp;

  const isMobile  = window.innerWidth <= 768;
  const targetSpeed = (hoveredCount > 0 || lightboxOpen) ? 0 : 1;

  const cardHalfW = isMobile ? 55 : 90;
  const cardHalfH = cardHalfW; // circles are square
  const minRadius = (isMobile ? 60 : 95) + cardHalfW;

  const edgePad   = 15;
  const maxXRadius = window.innerWidth  / 2 - cardHalfW - edgePad;
  const maxYRadius = window.innerHeight / 2 - cardHalfH - edgePad;

  let xRadius, yRadius;
  if (isMobile) {
    xRadius = window.innerWidth  * 0.28;
    yRadius = window.innerHeight * 0.22;
  } else {
    xRadius = Math.min(window.innerWidth * 0.30, window.innerHeight * 0.34);
    yRadius = xRadius;
  }
  xRadius = Math.max(Math.min(xRadius, maxXRadius), minRadius);
  yRadius = Math.max(Math.min(yRadius, maxYRadius), minRadius);

  cards.forEach((state, i) => {
    state.speed += (targetSpeed - state.speed) * 0.035;

    const anglePerMs = (Math.PI * 2) / ORBIT_DURATION;
    state.angleAccum += anglePerMs * delta * state.speed;
    state.timeAccum  += delta * state.speed;

    const wobble = Math.sin(state.timeAccum * 0.00028 + i * 1.7);
    const drift  = Math.sin(state.timeAccum * 0.00051 + i * 2.4);
    const xR = Math.min(Math.max(xRadius + wobble * xRadius * 0.10, minRadius), maxXRadius);
    const yR = Math.min(Math.max(yRadius + wobble * yRadius * 0.10, minRadius), maxYRadius);

    state.x = Math.cos(state.angleAccum) * xR;
    state.y = Math.sin(state.angleAccum) * yR + drift * yRadius * 0.07;

    state.wrapper.style.transform =
      `translate(calc(-50% + ${state.x}px), calc(-50% + ${state.y}px))`;
  });

  // Shadow on label when a card passes underneath
  const lr  = label.getBoundingClientRect();
  const cx  = window.innerWidth  / 2;
  const cy  = window.innerHeight / 2;
  const cardW = isMobile ? 110 : 180;
  const cardH = cardW; // circles are square
  const anyUnder = cards.some(s => {
    const l = cx + s.x - cardW / 2, r = cx + s.x + cardW / 2;
    const t = cy + s.y - cardH / 2, b = cy + s.y + cardH / 2;
    return l < lr.right && r > lr.left && t < lr.bottom && b > lr.top;
  });
  label.classList.toggle("media-under", anyUnder);

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

// ---------- Info panel (centerLabel expands into an "About" card) ----------

function openInfoPanel() {
  if (panelOpen) return;
  panelOpen = true;

  clearTimeout(panelRestoreTimeout);
  panelRestoreTimeout = null;

  const labelRect = label.getBoundingClientRect();

  const finalW = Math.min(window.innerWidth * 0.82, 480);
  const finalH = finalW;
  const finalLeft = (window.innerWidth  - finalW) / 2;
  const finalTop  = (window.innerHeight - finalH) / 2;

  // Fade the label out first — the CSS transition (opacity 0.25s) makes it
  // visible; we delay the panel so the fade plays before the box covers it.
  label.style.pointerEvents = "none";
  label.style.opacity       = "0";

  setTimeout(() => {
    if (!panelOpen) return; // guard: user didn't cancel

    // Pin panel at label's position as a pill
    infoPanel.style.transition   = "none";
    infoPanel.style.left         = labelRect.left   + "px";
    infoPanel.style.top          = labelRect.top    + "px";
    infoPanel.style.width        = labelRect.width  + "px";
    infoPanel.style.height       = labelRect.height + "px";
    infoPanel.style.borderRadius = "999px";
    infoPanel.classList.add("active");

    requestAnimationFrame(() => {
      infoOverlay.classList.add("active");
    });

    void infoPanel.offsetHeight; // commit starting state

    const ease = "cubic-bezier(0.4, 0, 0.24, 1)";
    infoPanel.style.transition = [
      `left 0.55s ${ease}`,
      `top 0.55s ${ease}`,
      `width 0.55s ${ease}`,
      `height 0.55s ${ease}`,
      `border-radius 0.48s ${ease}`,
    ].join(", ");

    infoPanel.style.left         = finalLeft + "px";
    infoPanel.style.top          = finalTop  + "px";
    infoPanel.style.width        = finalW    + "px";
    infoPanel.style.height       = finalH    + "px";
    infoPanel.style.borderRadius = "20px";

    setTimeout(() => {
      if (panelOpen) infoContent.classList.add("visible");
    }, 500);
  }, 80); // brief pause for label fade before panel grows
}

function closeInfoPanel() {
  if (!panelOpen) return;
  panelOpen = false;

  clearTimeout(panelRestoreTimeout);
  panelRestoreTimeout = null;

  // Hide content instantly so no text reflow is visible during shrink
  infoContent.style.transition = "none";
  infoContent.style.opacity    = "0";
  infoContent.classList.remove("visible");
  infoOverlay.classList.remove("active");

  const labelRect = label.getBoundingClientRect();
  const ease = "cubic-bezier(0.76, 0, 0.24, 1)";

  infoPanel.style.transition = [
    `left 0.5s ${ease}`,
    `top 0.5s ${ease}`,
    `width 0.5s ${ease}`,
    `height 0.5s ${ease}`,
    `border-radius 0.45s ${ease}`,
  ].join(", ");

  infoPanel.style.left         = labelRect.left   + "px";
  infoPanel.style.top          = labelRect.top    + "px";
  infoPanel.style.width        = labelRect.width  + "px";
  infoPanel.style.height       = labelRect.height + "px";
  infoPanel.style.borderRadius = "999px";

  panelRestoreTimeout = setTimeout(() => {
    panelRestoreTimeout = null;
    infoPanel.classList.remove("active");
    infoPanel.style.transition       = "";
    infoPanel.style.left             = "";
    infoPanel.style.top              = "";
    infoPanel.style.width            = "";
    infoPanel.style.height           = "";
    infoPanel.style.borderRadius     = "";
    infoContent.style.transition     = "";
    infoContent.style.opacity        = "";
    label.style.opacity       = "";
    label.style.pointerEvents = "";
  }, 520);
}

// Blob cursor — desktop (pointer: fine) only
(() => {
  if (!window.matchMedia("(pointer: fine)").matches) return;
  const blob = document.getElementById("cursorBlob");
  if (!blob) return;

  let mouseX = 0, mouseY = 0;
  let blobX  = 0, blobY  = 0;
  const LERP = 0.45;

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    blob.style.opacity = "1";
  });

  document.documentElement.addEventListener("mouseenter", (e) => {
    blobX = e.clientX;
    blobY = e.clientY;
  });

  document.addEventListener("mousedown", (e) => {
    blobX = e.clientX;
    blobY = e.clientY;
  });

  document.documentElement.addEventListener("mouseleave", () => { blob.style.opacity = "0"; });

  const interactive = "a, button, .card-wrapper, .centerLabel, .panel-close, .lightbox-close";
  document.addEventListener("mouseover", (e) => {
    if (e.target.closest(interactive)) blob.classList.add("expanded");
  });
  document.addEventListener("mouseout", (e) => {
    if (e.target.closest(interactive)) blob.classList.remove("expanded");
  });

  (function tick() {
    blobX += (mouseX - blobX) * LERP;
    blobY += (mouseY - blobY) * LERP;
    blob.style.left = blobX + "px";
    blob.style.top  = blobY + "px";
    requestAnimationFrame(tick);
  })();
})();

label.addEventListener("click", (e) => {
  e.preventDefault();
  openInfoPanel();
});
infoOverlay.addEventListener("click", closeInfoPanel);
document.getElementById("panelClose").addEventListener("click", closeInfoPanel);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && panelOpen) closeInfoPanel();
});
