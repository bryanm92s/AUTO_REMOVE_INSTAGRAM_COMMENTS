/**
 * Instagram Bulk Comments Removal Script (EN/ES UI) - batches + pacing
 *
 * Run on: https://www.instagram.com/your_activity/interactions/comments
 * Stop anytime with: window.__STOP_IG_BULK_DELETE__ = true
 *
 * Adapted from the bulk-unlike script:
 * - Selects up to MAX comments per batch, scrolling to load more when needed.
 * - Randomized delays, plus a long rest every few batches.
 * - Stops by itself if Instagram shows a limit / "try again later" notice.
 * - Detects Instagram's "Something went wrong" error: the batch is NOT counted,
 *   the script backs off, and stops after repeated failures.
 * - Never reports "finished" when the list simply failed to load.
 */

(async function instagramBulkDeleteComments() {
  window.__STOP_IG_BULK_DELETE__ = false;

  // ---------- Configuration ----------
  const MAX = 100; // comments per batch (Instagram's per-action maximum; lower it if you get errors)
  const MAX_FAILURES = 2; // consecutive failed batches before stopping
  const BATCHES_BEFORE_REST = 2;

  const CYCLE_DELAY_MIN = 30_000;
  const CYCLE_DELAY_MAX = 60_000;
  const REST_MIN = 5 * 60_000;
  const REST_MAX = 10 * 60_000;

  const SELECT_DELAY = 1200;
  const ICON_DELAY_MIN = 250;
  const ICON_DELAY_MAX = 600;
  const LOAD_DELAY = 3500;
  const MAX_EMPTY_SCROLLS = 5;
  const ACTION_DELAY = 1200;
  const MODAL_DELAY = 1000;

  // Text variants (English / Spanish)
  const SELECT_LABELS = ["select", "seleccionar"];
  const DELETE_WORDS = "delete|eliminar|borrar";
  const RE_ACTION = new RegExp(`^(${DELETE_WORDS})(\\s*\\(\\d+\\))?$`, "i");
  const RE_COUNTER = new RegExp(`^(${DELETE_WORDS})\\s*\\((\\d+)\\)$`, "i");
  const RE_CONFIRM = new RegExp(`^(${DELETE_WORDS})$`, "i");

  // Error shown when Instagram fails to delete a batch
  const ERROR_HINTS = [
    "something went wrong",
    "problem deleting",
    "try deleting it again",
    "algo salió mal",
    "algo ha salido mal",
    "problema al eliminar",
    "intenta eliminarlo de nuevo",
  ];

  const BLOCK_HINTS = [
    "try again later",
    "action blocked",
    "we limit how often",
    "inténtalo de nuevo más tarde",
    "acción bloqueada",
  ];

  // ---------- Utilities ----------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (min, max) => Math.floor(min + Math.random() * (max - min));

  async function waitInterruptible(ms, label) {
    const end = Date.now() + ms;
    console.log(`${label}: waiting ${Math.round(ms / 1000)} s...`);
    while (Date.now() < end && !window.__STOP_IG_BULK_DELETE__) {
      await sleep(1000);
    }
  }

  function realClick(el, scroll = true) {
    if (scroll) el.scrollIntoView({ block: "center" });
    ["mousedown", "mouseup", "click"].forEach((t) =>
      el.dispatchEvent(
        new MouseEvent(t, { bubbles: true, cancelable: true, buttons: 1 }),
      ),
    );
  }

  const ownText = (el) =>
    [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join("");

  function detectBlock() {
    return [...document.querySelectorAll('[role="dialog"], [role="alert"]')].some(
      (d) => {
        const t = (d.innerText || "").toLowerCase();
        return BLOCK_HINTS.some((h) => t.includes(h));
      },
    );
  }

  function findErrorDialog() {
    return [...document.querySelectorAll('[role="dialog"], [role="alert"]')].find(
      (d) => {
        const t = (d.innerText || "").toLowerCase();
        return ERROR_HINTS.some((h) => t.includes(h));
      },
    );
  }

  async function dismissError() {
    const d = findErrorDialog();
    if (!d) return false;
    const ok = [...d.querySelectorAll('button, [role="button"]')].find((b) =>
      /^(ok|aceptar|cerrar|close)$/i.test((b.innerText || "").trim()),
    );
    if (ok) ok.click();
    await sleep(1000);
    return true;
  }

  // After confirming, watch for Instagram's error dialog for a few seconds
  async function deleteFailed() {
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      if (findErrorDialog()) {
        await dismissError();
        return true;
      }
      await sleep(500);
    }
    return false;
  }

  // Wait for checkboxes to appear. Returns the count (0 = list did not load
  // or is really empty; we cannot tell which, so the caller must not assume).
  async function waitForList() {
    for (let i = 0; i < 4; i++) {
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        const n = getSelectableIcons().length;
        if (n > 0) return n;
        await sleep(1000);
      }
      console.warn(`No checkboxes yet (attempt ${i + 1}/4)...`);
    }
    return 0;
  }

  // ---------- Page interactions ----------
  function findSelectButton() {
    return [...document.querySelectorAll("span, div")].find((el) =>
      SELECT_LABELS.includes(ownText(el).toLowerCase()),
    );
  }

  function getSelectableIcons() {
    return [
      ...document.querySelectorAll('[role="button"][aria-label="Toggle checkbox"]'),
    ];
  }

  async function activateSelectMode() {
    if (getSelectableIcons().length > 0) return; // already in select mode
    const btn = findSelectButton();
    if (!btn) throw new Error("Select button not found");
    realClick(btn);
    await sleep(SELECT_DELAY);
  }

  function getDiagnostics() {
    return {
      url: location.href,
      selectLabels: [...document.querySelectorAll("span, div")].filter((el) =>
        SELECT_LABELS.includes(ownText(el).toLowerCase()),
      ).length,
      checkboxButtons: getSelectableIcons().length,
      loadingIndicators: document.querySelectorAll('[role="progressbar"]').length,
      deleteButtonFound: !!findDeleteButton(),
      dialogText: (document.querySelector('[role="dialog"]')?.innerText || "")
        .replace(/\s+/g, " ")
        .slice(0, 120),
      selectedCounter: getSelectedCount(),
      buttonTexts: [
        ...new Set(
          [...document.querySelectorAll('[role="button"], button')]
            .map((e) => (e.innerText || "").trim())
            .filter(
              (t) =>
                t &&
                t.length < 30 &&
                /delete|eliminar|borrar|select|seleccionar|cancel|done|listo/i.test(t),
            ),
        ),
      ].join(" | "),
    };
  }

  function getScrollParent(el) {
    let p = el?.parentElement;
    while (p && p !== document.body) {
      const oy = getComputedStyle(p).overflowY;
      if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) {
        return p;
      }
      p = p.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  }

  async function scrollToLoadMore() {
    const all = getSelectableIcons();
    const last = all[all.length - 1];
    const sp = getScrollParent(last);
    if (last) last.scrollIntoView({ block: "end" });
    sp.scrollTop = Math.max(0, sp.scrollHeight - sp.clientHeight - 300);
    await sleep(400);
    sp.scrollTop = sp.scrollHeight;
    window.scrollTo(0, document.body.scrollHeight);
    sp.dispatchEvent(new Event("scroll", { bubbles: true }));
    await sleep(LOAD_DELAY);
  }

  // Reads the counter on the action button, e.g. "Delete (27)". null if unreadable.
  function getSelectedCount() {
    const els = [...document.querySelectorAll('span, div, [role="button"], button')];
    for (const el of els) {
      const m = (el.innerText || "").trim().match(RE_COUNTER);
      if (m) return parseInt(m[2], 10);
    }
    return null;
  }

  // Step 1: load enough items WITHOUT selecting (loading more resets the
  // selection). Step 2: select without scrolling.
  async function selectComments(max) {
    // --- Step 1: load ---
    let lastCount = getSelectableIcons().length;
    let emptyScrolls = 0;

    while (
      getSelectableIcons().length < max &&
      emptyScrolls < MAX_EMPTY_SCROLLS &&
      !window.__STOP_IG_BULK_DELETE__
    ) {
      await scrollToLoadMore();
      const n = getSelectableIcons().length;
      if (n === lastCount) emptyScrolls++;
      else {
        emptyScrolls = 0;
        lastCount = n;
      }
    }

    window.scrollTo(0, 0);
    await sleep(1000);

    // --- Step 2: select the first `max`, no scrolling ---
    const icons = getSelectableIcons();
    console.log(`Loaded ${icons.length} checkboxes; target ${max}.`);

    let scrollClicks = false;
    let selected = 0;
    let clicks = 0;
    let resets = 0;

    for (const btn of icons) {
      if (window.__STOP_IG_BULK_DELETE__) break;

      const before = getSelectedCount() ?? selected;
      realClick(btn, scrollClicks);
      clicks++;
      await sleep(rand(ICON_DELAY_MIN, ICON_DELAY_MAX));
      let now = getSelectedCount();

      // First click did not register: switch to scrolling clicks
      if (clicks === 1 && !scrollClicks && now === null && !findDeleteButton()) {
        console.warn("Click without scrolling did not register; using scrolling clicks.");
        scrollClicks = true;
        realClick(btn, true);
        await sleep(500);
        now = getSelectedCount();
      }

      // Counter not readable: count blindly
      if (now === null) {
        selected++;
        if (selected >= max) break;
        continue;
      }

      if (now < before) {
        if (before - now > 1) {
          console.warn(
            `Selection dropped from ${before} to ${now} at click ${clicks} (reset by Instagram).`,
          );
          resets++;
          if (resets >= 2) {
            selected = now;
            break;
          }
        } else {
          // We toggled OFF an item that was already selected: toggle it back
          await sleep(300);
          realClick(btn, scrollClicks);
          await sleep(rand(ICON_DELAY_MIN, ICON_DELAY_MAX));
          now = getSelectedCount() ?? now;
        }
      }

      selected = now;
      if (selected >= max) break;
    }

    await sleep(500);
    const shown = getSelectedCount();
    const finalCount = shown ?? selected;
    console.log(`Selected ${finalCount} of ${max} (clicks made: ${clicks}).`);

    if (clicks > 0 && shown === 0) {
      throw new Error("Selection was reset by Instagram (counter shows 0)");
    }
    return finalCount;
  }

  function findDeleteButton() {
    const el = [...document.querySelectorAll('[role="button"], button, span')].find(
      (e) => RE_ACTION.test((e.innerText || "").trim()),
    );
    return el?.closest('[role="button"], button') || el;
  }

  function findDeleteSpan() {
    return [...document.querySelectorAll("span")].find((el) =>
      RE_ACTION.test((el.innerText || "").trim()),
    );
  }

  // Default: span's closest button/div. useAlt: enclosing role="button" element.
  async function clickDelete(useAlt = false) {
    await sleep(ACTION_DELAY);
    const span = findDeleteSpan();
    if (!span) throw new Error("Delete action not found");
    const target = useAlt
      ? span.closest('[role="button"], button') || span
      : span.closest("button, div");
    realClick(target);
    return target;
  }

  function findModalConfirmButton(barBtn) {
    const cands = [...document.querySelectorAll('button, [role="button"]')].filter(
      (b) => RE_CONFIRM.test((b.innerText || "").trim()),
    );
    // Ignore the action-bar button itself; the confirmation sits on top
    const outside = cands.filter(
      (b) => !(barBtn && (b === barBtn || barBtn.contains(b) || b.contains(barBtn))),
    );
    const realButtons = outside.filter((b) => b.tagName === "BUTTON");
    return realButtons[realButtons.length - 1] || outside[outside.length - 1];
  }

  // Poll up to ~6 s for the confirmation modal
  async function confirmModal(barBtn) {
    await sleep(MODAL_DELAY);
    const deadline = Date.now() + 6000;
    while (Date.now() < deadline) {
      const btn = findModalConfirmButton(barBtn);
      if (btn) {
        btn.focus();
        await sleep(100);
        btn.click();
        return true;
      }
      await sleep(500);
    }
    return false;
  }

  // ---------- Main loop ----------
  let cycle = 1;
  let total = 0;
  let failures = 0;

  while (!window.__STOP_IG_BULK_DELETE__) {
    try {
      if (detectBlock()) {
        console.warn("Instagram is showing a limit notice. Stopping.");
        break;
      }

      await dismissError();
      await activateSelectMode();

      const loaded = await waitForList();
      if (!loaded) {
        console.warn(
          "No checkboxes found. Either you are finished or the page is stuck loading. " +
            "Reload the page and check before running again.",
        );
        console.table(getDiagnostics());
        break;
      }

      const selected = await selectComments(MAX);
      if (!selected) {
        console.warn("Nothing could be selected. Reload the page and try again.");
        break;
      }

      const barBtn = await clickDelete();
      let confirmed = await confirmModal(barBtn);
      if (!confirmed) {
        console.warn("Modal not found; retrying with the role=button element...");
        const barBtn2 = await clickDelete(true);
        confirmed = await confirmModal(barBtn2);
      }
      if (!confirmed) throw new Error("Modal confirmation not found");

      if (await deleteFailed()) {
        failures++;
        console.warn(
          `Instagram reported an error on batch ${cycle} (failure ${failures}/${MAX_FAILURES}). Batch NOT counted.`,
        );
        if (failures >= MAX_FAILURES) {
          console.warn(
            "Too many consecutive failures. Reload the page, check what is left, " +
              "lower MAX and try again later.",
          );
          break;
        }
        await waitInterruptible(rand(REST_MIN, REST_MAX), "Backing off after error");
        cycle++;
        continue;
      }
      failures = 0;

      total += selected;
      console.log(`Batch ${cycle}: deleted ${selected} (total: ${total})`);

      await sleep(2000);
      if (detectBlock()) {
        console.warn("Instagram is showing a limit notice. Stopping.");
        break;
      }

      if (cycle % BATCHES_BEFORE_REST === 0) {
        await waitInterruptible(rand(REST_MIN, REST_MAX), "Long rest");
      } else {
        await waitInterruptible(
          rand(CYCLE_DELAY_MIN, CYCLE_DELAY_MAX),
          "Pause between batches",
        );
      }
      cycle++;
    } catch (e) {
      console.warn("Stopped:", e.message);
      console.table(getDiagnostics());
      break;
    }
  }

  console.log(`Done. Total deleted (confirmed without errors): ${total}`);
})();
