/* ==========================================================
   Stage setup shared by every overlay.

   1. Keeps the overlay on a fixed 1920x1080 stage. In OBS
      (a 1920x1080 browser source) nothing changes; in a normal
      window or a preview frame the stage scales down to fit.
   2. Adds a "Home" button, but only when the overlay is opened
      directly in a browser: never in OBS and never in the
      previews on the demo page, so it can't end up on stream.
   ========================================================== */

const STAGE_W = 1920;
const STAGE_H = 1080;

function fitStage() {
  const body = document.body;

  const apply = () => {
    const scale = Math.min(innerWidth / STAGE_W, innerHeight / STAGE_H);
    if (Math.abs(scale - 1) < 0.001) {
      body.style.transform = "";
      return;
    }
    const x = (innerWidth - STAGE_W * scale) / 2;
    const y = (innerHeight - STAGE_H * scale) / 2;
    body.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  };

  addEventListener("resize", apply);
  apply();
}

function addHomeButton() {
  const inObs = "obsstudio" in window;
  const inFrame = window.self !== window.top;
  if (inObs || inFrame) return;

  const link = document.createElement("a");
  link.href = "../";
  link.className = "home-button";
  link.textContent = "← Home";

  const style = document.createElement("style");
  style.textContent = `
    .home-button {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 1000;
      font-family: "Press Start 2P", monospace;
      font-size: 12px;
      line-height: 1;
      color: #140a24;
      background: #9be7ff;
      padding: 12px 14px;
      text-decoration: none;
      box-shadow: 4px 6px 0 rgba(0, 0, 0, 0.45);
    }
    .home-button:hover,
    .home-button:focus-visible { background: #ff6fb5; outline: none; }
  `;

  // Attached to <html>, outside the scaled stage, so it keeps its size
  document.documentElement.append(style, link);
}

export function setupStage() {
  fitStage();
  addHomeButton();
}
