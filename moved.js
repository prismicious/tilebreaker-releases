// The sending end of the progress hand-over, on the old public address.
//
// The full game used to be served here, so this origin's IndexedDB and
// localStorage hold the saves of everybody who played it in this browser. This
// page offers to hand them to the gated site: it opens the gate's carry-over
// page in a new tab, waits for that page to say it is ready (which it only does
// once the visitor has signed in), and posts the saves to that one origin.
// Nothing is deleted here; the copy is the visitor's own, in their own browser.

(function () {
  "use strict";

  const fullUrl = document.querySelector('meta[name="tilebreaker-full-url"]').content;
  const fullOrigin = new URL(fullUrl).origin;
  const panel = document.getElementById("carry");
  const start = document.getElementById("carry-start");
  const status = document.getElementById("carry-status");
  let saves = null;
  let receiver = null;

  function say(text, warn = false) {
    status.textContent = text;
    status.classList.remove("hidden");
    status.classList.toggle("warn", warn);
  }

  function onMessage(event) {
    if (event.origin !== fullOrigin || event.source !== receiver || !event.data) return;
    if (event.data.type === "tilebreaker-carry-ready") {
      receiver.postMessage({ type: "tilebreaker-carry-saves", saves }, fullOrigin);
      say("Sent. Finish in the new tab.");
    } else if (event.data.type === "tilebreaker-carry-done") {
      say("Done. Your progress is at the new address now.");
    }
  }

  start.addEventListener("click", () => {
    receiver = window.open(new URL("/__gate/carry-over", fullUrl).href, "tilebreaker-carry-over");
    if (!receiver) {
      say("The new tab was blocked. Allow pop-ups for this page and press the button again.", true);
      return;
    }
    say("Sign in in the new tab. Your saves are sent as soon as you have.");
  });

  window.addEventListener("message", onMessage);

  window.TilebreakerSaves.collect().then((found) => {
    if (!window.TilebreakerSaves.hasProgress(found)) return;
    saves = found;
    panel.classList.remove("hidden");
  }).catch((error) => {
    say(`Your saves here could not be read: ${error.message}.`, true);
  });
})();
