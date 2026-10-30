# Instagram Bulk Comments Removal Script

🌐 **English** | [Español](README.es.md)

A browser-console script that deletes your own Instagram comments in bulk, using Instagram's built-in **Your activity → Interactions → Comments** page. It automates the "Select → Delete" flow in batches, with randomized pauses and automatic stop if Instagram shows a limit notice.

> Adapted from the bulk-unlike script. Works with the **English and Spanish** Instagram web interface.

---

## ⚠️ Disclaimer

- This is an **unofficial** script and is **not affiliated with or endorsed by Instagram / Meta**.
- Automating actions may go against Instagram's Terms of Use. **Use it at your own risk.** Excessive automation can lead to temporary action blocks or other restrictions on your account.
- **Deleted comments cannot be recovered.** The script always selects the first comments in the list, so back up anything you want to keep first (for example, via *Download your information*).
- Instagram can change its page layout at any time, which may break the script.

---

## Features

- Deletes **100 comments per batch** by default (Instagram's per-action maximum; configurable).
- Scrolls automatically to load more items before selecting.
- Verifies the selection counter (`Delete (N)`) and recovers if Instagram resets the selection.
- **Randomized delays** between clicks and batches, plus a **long rest** every few batches.
- **Stops by itself** if a "try again later" / "action blocked" notice appears.
- Detects Instagram's **"Something went wrong"** error: the failed batch is not counted, the script backs off and stops after repeated failures.
- Never reports "finished" when the list simply failed to load.
- Can be stopped manually at any time.
- Prints diagnostics to the console if something goes wrong.

---

## Requirements

- A desktop browser (Chrome, Edge, Firefox, etc.).
- You must be logged in to Instagram on the web.
- Instagram interface language: **English or Spanish**.

---

## Usage

1. Open this page while logged in:

   ```
   https://www.instagram.com/your_activity/interactions/comments
   ```

2. Open the browser developer console:
   - **Windows / Linux:** `F12` or `Ctrl + Shift + J`
   - **macOS:** `Cmd + Option + J`

3. Copy the full contents of [`instagram-bulk-delete-comments.js`](instagram-bulk-delete-comments.js), paste it into the console and press **Enter**.
   *(Some browsers ask you to type `allow pasting` first.)*

4. Leave the tab open and in the foreground. Progress is logged in the console:

   ```
   Loaded 100 checkboxes; target 100.
   Selected 100 of 100 (clicks made: 100).
   Batch 1: deleted 100 (total: 100)
   Pause between batches: waiting 42 s...
   ```

### Stopping the script

Type this in the console at any time:

```js
window.__STOP_IG_BULK_DELETE__ = true;
```

The script finishes its current step and exits.

---

## Configuration

Edit the constants at the top of the script before running it.

| Constant | Default | Description |
| --- | --- | --- |
| `MAX` | `100` | Comments per batch (Instagram's maximum per action). Lower it (e.g. `50` or `25`) if you get errors. |
| `MAX_FAILURES` | `2` | Consecutive failed batches before the script stops. |
| `BATCHES_BEFORE_REST` | `2` | Number of batches before a long rest. |
| `CYCLE_DELAY_MIN` / `CYCLE_DELAY_MAX` | `30 s` / `60 s` | Random pause between batches. |
| `REST_MIN` / `REST_MAX` | `5 min` / `10 min` | Random long rest. |
| `ICON_DELAY_MIN` / `ICON_DELAY_MAX` | `250 ms` / `600 ms` | Random pause between each selection click. |
| `LOAD_DELAY` | `3500 ms` | Wait after scrolling to load more items. |
| `MAX_EMPTY_SCROLLS` | `5` | Give up loading after N scrolls with nothing new. |
| `SELECT_DELAY`, `ACTION_DELAY`, `MODAL_DELAY` | `1000–1200 ms` | UI wait times. |
| `BLOCK_HINTS` | see script | Texts that trigger an automatic stop (limit notices). |
| `ERROR_HINTS` | see script | Texts that identify Instagram's "Something went wrong" deletion error. |

**Tip:** if you get action blocks, make the pauses longer and/or lower `MAX`.

---

## How it works

1. Clicks **Select** to enter selection mode.
2. Scrolls the list until enough items are loaded (loading more items resets Instagram's selection, so this is done *before* selecting).
3. Clicks the checkboxes one by one and reads the `Delete (N)` counter to verify each click.
4. Clicks **Delete** and confirms the modal.
5. Checks for Instagram's error dialog. If it appears, the batch is **not** counted, the script rests and retries (stopping after `MAX_FAILURES` failures in a row).
6. Otherwise waits a random time (or takes a long rest) and repeats until no checkboxes are found, you stop it, or Instagram shows a limit notice.

---

## Troubleshooting

| Problem | What to try |
| --- | --- |
| `Select button not found` | Make sure you are on the comments page above and the interface is in English or Spanish. |
| `Selection was reset by Instagram` | Lower `MAX` (e.g. `50`) and increase `LOAD_DELAY`. |
| Instagram shows **"Something went wrong… problem deleting some or all of your content"** | Usually a temporary rate limit or an item that can't be deleted. Click OK, **reload the page**, lower `MAX` (e.g. `25`), lengthen the pauses and retry later. The script backs off by itself and stops after `MAX_FAILURES` failures. |
| The page keeps loading / `No checkboxes found` | The page got stuck after an error. Reload it and check what's left before running again. The script does not assume you are finished. |
| Many `net::ERR_BLOCKED_BY_CLIENT` errors in the console | Your ad blocker or an extension is blocking Instagram's analytics requests (`/ajax/bz`). They are harmless and unrelated to the script. |
| `Modal confirmation not found` | Instagram may have changed its UI. Check the diagnostics table printed in the console. |
| Script stops with a limit notice | Wait several hours (or a day) before running it again, with longer pauses. |
| Nothing happens after pasting | Type `allow pasting` in the console, then paste again. |

When the script fails it prints a `console.table` with diagnostics (found buttons, checkbox count, dialog text). Include it if you open an issue.

---

## Contributing

Issues and pull requests are welcome, especially for UI changes on Instagram's side or additional interface languages (add the translated words to `SELECT_LABELS`, `DELETE_WORDS` and `BLOCK_HINTS`).

## License

[MIT](LICENSE)
