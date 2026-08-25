(function () {
  var currentScript = document.currentScript;
  if (!currentScript) {
    return;
  }

  var widgetId = currentScript.getAttribute("data-workspace-id") || currentScript.getAttribute("data-widget-id") || "";
  if (!widgetId) {
    return;
  }

  var scriptUrl = new URL(currentScript.src, window.location.href);
  var platformOrigin = scriptUrl.origin;
  var position = currentScript.getAttribute("data-position") === "left" ? "left" : "right";
  var hostOrigin = window.location.origin;
  var iframe = document.createElement("iframe");
  var collapsedWidth = 96;
  var collapsedHeight = 176;

  iframe.title = "Book Now scheduling widget";
  iframe.src =
    platformOrigin +
    "/widget/" +
    encodeURIComponent(widgetId) +
    "?embedded=1&position=" +
    encodeURIComponent(position) +
    "&host_origin=" +
    encodeURIComponent(hostOrigin);
  iframe.loading = "lazy";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.sandbox = "allow-scripts allow-forms allow-same-origin allow-popups";
  iframe.style.position = "fixed";
  iframe.style.zIndex = "2147483000";
  iframe.style.border = "0";
  iframe.style.background = "transparent";
  iframe.style.colorScheme = "normal";
  iframe.style.width = collapsedWidth + "px";
  iframe.style.height = collapsedHeight + "px";
  iframe.style.maxWidth = "100vw";
  iframe.style.maxHeight = "100vh";
  iframe.style.bottom = "calc(50vh - " + collapsedHeight / 2 + "px)";
  iframe.style[position] = "0";

  function resize(data) {
    var width = Math.min(Number(data.width) || collapsedWidth, window.innerWidth);
    var height = Math.min(Number(data.height) || collapsedHeight, window.innerHeight);
    iframe.style.width = width + "px";
    iframe.style.height = height + "px";
    if (window.innerWidth < 720) {
      iframe.style.left = "0";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "100vw";
      iframe.style.height = data.modalOpen ? "100vh" : Math.min(height, 180) + "px";
      return;
    }
    iframe.style.left = position === "left" ? "0" : "auto";
    iframe.style.right = position === "right" ? "0" : "auto";
    iframe.style.bottom = "calc(50vh - " + height / 2 + "px)";
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== platformOrigin || !event.data || event.data.type !== "calendar-booking:resize") {
      return;
    }
    resize(event.data);
  });

  window.addEventListener("resize", function () {
    resize({ width: collapsedWidth, height: collapsedHeight });
  });

  function mount() {
    if (!document.body || iframe.parentNode) {
      return;
    }
    document.body.appendChild(iframe);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
