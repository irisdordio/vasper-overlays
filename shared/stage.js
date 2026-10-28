/* ==========================================================
   Keeps every overlay on a fixed 1920x1080 stage.
   In OBS (a 1920x1080 browser source) nothing changes.
   In a normal browser window the whole stage scales down
   to fit and centres itself, so previews look like OBS.
   ========================================================== */

const STAGE_W = 1920;
const STAGE_H = 1080;

export function fitStage() {
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
