import toast from "react-hot-toast";
import { translationApi } from "../services/apiService";
import logoUrl from "../assets/logo.png";

/**
 * Renders the Job Work chitthi in the BROWSER (HTML + window.print) instead of the server PNG.
 *
 * Why: the server render (iText) cannot shape Devanagari/Gujarati conjuncts and left-side matras,
 * so party names printed garbled while the underlying dictionary text was correct. The browser
 * shapes complex scripts natively, so the exact same saved Hindi/Gujarati now prints correctly.
 *
 * The party/finish tri-lingual lines are built here from the same translation dictionary the
 * editor uses — party matched by party_id, finish by its text — so print == dialog, always.
 */

// Session cache so we don't refetch the dictionary on every print.
const dictCache = { PARTY: null, FINISH: null };

async function getDictionary(type) {
  if (dictCache[type]) return dictCache[type];
  const res = await translationApi.getTranslations(type);
  const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
  dictCache[type] = list;
  return list;
}

/** Clears the cached dictionaries so the next print refetches (call after editing translations). */
export const invalidateChitthiDictionary = () => {
  dictCache.PARTY = null;
  dictCache.FINISH = null;
};

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** "Base / हिंदी / ગુજરાતી" — drops empty scripts so a missing translation never shows a stray slash. */
const tri = (base, hindi, gujarati) =>
  [base, (hindi || "").trim(), (gujarati || "").trim()].filter(Boolean).join(" / ");

const dec3 = (v, suffix) =>
  v == null || v === "" || isNaN(Number(v)) ? "—" : `${Number(v).toFixed(3)}${suffix}`;

const int0 = (v) => (v == null || v === "" || isNaN(Number(v)) ? "—" : String(Math.round(Number(v))));

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return `${d.getDate()}-${d.getMonth() + 1}-${String(d.getFullYear()).slice(-2)}`;
};

const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const sumReturns = (returns, field) => {
  const vals = (returns || []).map((r) => r?.[field]).filter((v) => v != null && !isNaN(Number(v)));
  return vals.length ? vals.reduce((a, b) => a + Number(b), 0) : null;
};

/** All chitthi CSS, scaled by k (A6 = 1, A8 = 0.5), for the given page size. */
function buildCss(k, pageW, pageH) {
  const mm = (n) => `${+(n * k).toFixed(3)}mm`;
  const px = (n) => `${+(n * k).toFixed(2)}px`;
  const pt = (n) => `${+(n * k).toFixed(2)}pt`;
  return `
    * {
      margin: 0; padding: 0; box-sizing: border-box;
      /* Browsers drop background colors when printing unless forced to keep them. */
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    @page { margin: 0; size: ${pageW}mm ${pageH}mm; }
    html, body {
      width: ${pageW}mm; background: #fff;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    body {
      font-family: "Kantumruy Pro", "Noto Sans Devanagari", "Noto Sans Gujarati", "Nirmala UI", Arial, sans-serif;
      font-weight: 500; color: #241C17; font-size: ${px(10)}; line-height: 1.3;
    }
    .ticket { width: ${mm(100)}; margin: ${mm(2.5)}; border: ${pt(1.6)} solid #241C17; overflow: hidden; }
    .frame { width: 100%; border-collapse: collapse; }
    .logo-band { background: #fff; text-align: center; padding: ${mm(1.6)} 0 ${mm(1.2)} 0; }
    .logo-band img { height: ${mm(7.5)}; width: auto; }
    .title-band { background: #E8A736; color: #241C17; text-align: center; font-weight: 700;
      font-size: ${px(13)}; letter-spacing: ${px(0.4)}; padding: ${mm(1.8)} 0;
      border-top: ${pt(1)} solid #241C17; border-bottom: ${pt(1.2)} solid #241C17; }
    table.meta { width: 100%; border-collapse: collapse; background: #FDF3E0; }
    table.meta td { padding: ${mm(1.6)} ${mm(2.5)}; font-size: ${px(11.5)}; border-bottom: ${pt(1)} solid #E2D3B4; }
    table.meta td.r { text-align: right; }
    .job-no { font-size: ${px(15)}; font-weight: 700; color: #B87813; }
    .meta-k { color: #7A6E5F; }
    .meta-hl { font-weight: 700; color: #B87813; }
    table.info { width: 100%; border-collapse: collapse; }
    table.info td { padding: ${mm(1.7)} ${mm(2.5)}; vertical-align: top; border-bottom: ${pt(0.6)} solid #EDE6DA; }
    table.info td.k { width: ${mm(27)}; color: #7A6E5F; font-size: ${px(11)}; background: #FAF7F1; border-right: ${pt(0.6)} solid #EDE6DA; }
    table.info td.v { font-weight: 700; font-size: ${px(11.5)}; word-break: break-word; }
    table.info tr.finish-row td { background: #FFF3D6; border-bottom: ${pt(1)} solid #E8A736; }
    table.info tr.finish-row td.k { color: #8A5A12; background: #FBE7BC; }
    table.info tr.finish-row td.v { color: #A5620A; font-size: ${px(12.5)}; }
    table.chips { width: 100%; border-collapse: collapse; }
    table.chips td { width: 50%; padding: ${mm(1.4)} ${mm(2.5)}; font-size: ${px(9.5)}; border-bottom: ${pt(0.6)} solid #EDE6DA; }
    td.chip-pcs { background: #EAF3FB; border-right: ${pt(0.6)} solid #EDE6DA; }
    td.chip-sti { background: #F3EEFA; }
    .chip-k { color: #6B6259; }
    .chip-v { font-weight: 700; font-size: ${px(11.5)}; color: #1B4F7A; }
    .chip-v2 { font-weight: 700; font-size: ${px(11.5)}; color: #5B3E8F; }
    table.ja { width: 100%; border-collapse: collapse; border-top: ${pt(1.2)} solid #241C17; }
    table.ja th { font-size: ${px(11.5)}; font-weight: 700; padding: ${mm(1.5)} 0; color: #fff; letter-spacing: ${px(0.6)}; }
    th.h-javak { background: #1B6CA8; }
    th.h-aavak { background: #17875A; }
    table.ja.dual th.h-javak { border-right: ${pt(1)} solid #241C17; }
    table.ja td.col { padding: ${mm(1.7)} ${mm(2.5)}; vertical-align: top; background: #F2F8FD; }
    table.ja.dual td.col { width: 50%; }
    td.c-javak { background: #F2F8FD; }
    table.ja.dual td.c-javak { border-right: ${pt(1)} solid #241C17; }
    td.c-aavak { background: #F0F9F4; }
    .fr { margin-bottom: ${mm(1.8)}; }
    .fr .fk { color: #6B6259; font-size: ${px(9)}; }
    .fr .fv { font-weight: 700; font-size: ${px(10.5)}; }
    .fr.net { margin-bottom: 0; padding-top: ${mm(1.2)}; border-top: ${pt(0.6)} dashed #B9C6D2; }
    .net-javak .fv { color: #14507E; font-size: ${px(12.5)}; }
    .net-aavak .fv { color: #10653F; font-size: ${px(12.5)}; }
    .ghati { background: #FBEDEB; border-top: ${pt(1.2)} solid #241C17; padding: ${mm(1.8)} ${mm(2.5)};
      font-size: ${px(11)}; font-weight: 700; color: #A63325; }
    .ghati .gk { color: #6B6259; font-weight: 500; font-size: ${px(9.5)}; }
    .footer { background: #E8A736; border-top: ${pt(1.2)} solid #241C17; text-align: center;
      padding: ${mm(1.4)} 0; font-size: ${px(8.5)}; font-weight: 700; color: #241C17; letter-spacing: ${px(0.3)}; }
  `;
}

function buildBody(jw, formType, ctx) {
  const isInside = jw.jobWorkType === "INHOUSE";
  const isAavak = formType === "AAVAK";
  const title =
    jw.jobWorkType === "OUTSIDE"
      ? "Out Side Job Work"
      : isInside
        ? "In Side Job Work"
        : "Job Work";

  const petiLabel = jw.elementType === "DRUM" ? "Drum" : "Peti";
  const logo = new URL(logoUrl, window.location.href).href;

  const javakCol = `
    <div class="fr"><div class="fk">${esc(petiLabel)}</div><div class="fv">${esc(int0(jw.elementCount))}</div></div>
    <div class="fr"><div class="fk">Kg</div><div class="fv">${esc(dec3(jw.grossKg, " Kg"))}</div></div>
    <div class="fr net net-javak"><div class="fk">Net Kg</div><div class="fv">${esc(dec3(jw.qtyKg, " kg"))}</div></div>`;

  const returns = jw.jobWorkReturns || [];
  const aavakCol = `
    <div class="fr"><div class="fk">${esc(petiLabel)}</div><div class="fv">${esc(int0(sumReturns(returns, "returnElementCount")))}</div></div>
    <div class="fr"><div class="fk">Kg</div><div class="fv">${esc(dec3(sumReturns(returns, "grossKg"), " Kg"))}</div></div>
    <div class="fr net net-aavak"><div class="fk">Net Kg</div><div class="fv">${esc(dec3(sumReturns(returns, "returnKg"), " kg"))}</div></div>`;

  const jaTable = isAavak
    ? `<table class="ja dual">
         <tr><th class="h-javak">JAVAK</th><th class="h-aavak">AAVAK</th></tr>
         <tr><td class="col c-javak">${javakCol}</td><td class="col c-aavak">${aavakCol}</td></tr>
       </table>`
    : `<table class="ja">
         <tr><th class="h-javak">JAVAK</th></tr>
         <tr><td class="col c-javak">${javakCol}</td></tr>
       </table>`;

  const ghatiRow = isAavak
    ? `<tr><td class="ghati"><span class="gk">Ghati :-</span> ${esc(dec3(sumReturns(returns, "ghati"), ""))}</td></tr>`
    : "";

  const chipsRow = isInside
    ? `<tr><td style="padding:0;">
         <table class="chips"><tr>
           <td class="chip-pcs"><span class="chip-k">Total Pcs</span><br/>
             <span class="chip-v">${esc(jw.qtyPc != null ? `${int0(jw.qtyPc)} Pcs` : "—")}</span></td>
           <td class="chip-sti"><span class="chip-k">Total Sti</span><br/>
             <span class="chip-v2">${esc(jw.stickerQty != null ? `${int0(jw.stickerQty)} Sti` : "—")}</span></td>
         </tr></table>
       </td></tr>`
    : "";

  const toRow = isInside
    ? `<tr><td class="k">To :-</td><td class="v">In Side</td></tr>
       <tr><td class="k">Party Name :-</td><td class="v">${esc(ctx.partyTri)}</td></tr>`
    : `<tr><td class="k">To :-</td><td class="v">${esc(ctx.partyTri)}</td></tr>`;

  return `
    <div class="ticket">
      <table class="frame">
        <tr><td class="logo-band"><img src="${logo}" alt="Ishita Industries"/></td></tr>
        <tr><td class="title-band">${esc(title)}</td></tr>
        <tr><td style="padding:0;">
          <table class="meta"><tr>
            <td><span class="meta-k">Job No.</span> <span class="job-no">${esc(jw.jobWorkLabel || `JW-${jw.id}`)}</span></td>
            <td class="r">
              <span class="meta-k">Date :-</span> <span class="meta-hl">${esc(ctx.dt)}</span><br/>
              <span class="meta-k">Time :-</span> <span class="meta-hl">${esc(ctx.tm)}</span>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:0;">
          <table class="info">
            <tr><td class="k">From :-</td><td class="v">Ishita Industries</td></tr>
            ${toRow}
            <tr class="finish-row"><td class="k">Finishing :-</td><td class="v">${esc(ctx.finishTri)}</td></tr>
            <tr><td class="k">Doz. :-</td><td class="v">${esc(jw.size?.itemName || "—")}</td></tr>
            <tr><td class="k">Size :-</td><td class="v">${esc(jw.size?.sizeInInch || "—")}</td></tr>
          </table>
        </td></tr>
        ${chipsRow}
        <tr><td style="padding:0;">${jaTable}</td></tr>
        ${ghatiRow}
        <tr><td class="footer">ISHITA INDUSTRIES &nbsp;•&nbsp; Precision Customise Components &amp; Fasteners</td></tr>
      </table>
    </div>`;
}

/**
 * Prints a Job Work chitthi via the browser.
 * @param jw        the job work object (needs party{id,name}, finish, size, kg/peti fields, returns)
 * @param formType  "JAVAK" (out only) or "AAVAK" (out + returns + ghati)
 * @param paperSize "A6" or "A8"
 * @param setLoadingKey optional loading-state setter (same contract as the old PNG printer)
 */
export const printJobWorkChitthi = async (jw, formType, paperSize, setLoadingKey) => {
  const key = String(formType || "").toLowerCase();
  setLoadingKey?.(key);
  try {
    const [partyDict, finishDict] = await Promise.all([getDictionary("PARTY"), getDictionary("FINISH")]);

    const partyRow =
      partyDict.find((r) => jw.party?.id != null && r.partyId === jw.party.id) ||
      partyDict.find((r) => (r.sourceText || "").trim() === (jw.party?.name || "").trim());
    const finishRow = finishDict.find((r) => (r.sourceText || "").trim() === (jw.finish || "").trim());

    const ctx = {
      partyTri: tri(jw.party?.name, partyRow?.hindi, partyRow?.gujarati),
      finishTri: tri(jw.finish, finishRow?.hindi, finishRow?.gujarati),
      dt: fmtDate(jw.chitthiDate || jw.jobDate),
      tm: jw.orderTime || nowTime(),
    };

    const a8 = String(paperSize).toUpperCase() === "A8";
    const css = a8 ? buildCss(0.5, 52, 74) : buildCss(1, 105, 148);
    const body = buildBody(jw, formType, ctx);

    // Real (off-screen) size so html2canvas can rasterize the ticket at its true dimensions.
    const iframe = document.createElement("iframe");
    iframe.style.cssText = `position:fixed;top:-9999px;left:-9999px;border:0;width:${a8 ? 52 : 105}mm;height:${a8 ? 74 : 148}mm;`;
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Job Work ${esc(jw.jobWorkLabel || jw.id)}</title>
      <style>${css}</style></head><body>${body}</body></html>`);
    doc.close();

    // Wait for web fonts + the logo image so neither the PNG nor the print is half-rendered.
    const waitFonts = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
    await Promise.race([waitFonts, new Promise((r) => setTimeout(r, 2000))]);
    await Promise.all(
      Array.from(doc.images).map((img) =>
        img.complete ? Promise.resolve() : new Promise((res) => { img.onload = img.onerror = res; })
      )
    );

    // Download a PNG snapshot alongside printing. html2canvas rasterizes the already-shaped DOM,
    // so Hindi/Gujarati and the band colors are baked into the image correctly. Best-effort —
    // a capture failure must never block the print.
    try {
      const { default: html2canvas } = await import("html2canvas");
      // Capture the body (not just .ticket): the ticket's 2.5mm margin then becomes white
      // padding inside the snapshot, so its outer border is never clipped at the canvas edge.
      const canvas = await html2canvas(doc.body, {
        scale: 3,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });
      const label = formType === "AAVAK" ? "aavak" : "javak";
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `job-work-${jw.jobWorkLabel || jw.id}-${label}-${String(paperSize).toLowerCase()}.png`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (imgErr) {
      console.warn("Chitthi image export failed", imgErr);
    }

    const win = iframe.contentWindow;
    win.focus();
    win.print();
    setTimeout(() => iframe.parentNode && iframe.parentNode.removeChild(iframe), 60000);

    toast.success(`${key.toUpperCase()} (${String(paperSize).toUpperCase()}) downloaded — print dialog opening…`);
  } catch (err) {
    toast.error(err?.response?.data?.message || err?.message || "Failed to generate print");
  } finally {
    setLoadingKey?.(null);
  }
};
