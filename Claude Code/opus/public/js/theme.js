// Applies the saved theme before first paint (classic script, loaded in <head>).
(function () {
  try {
    var t = localStorage.getItem('pp.theme');
    if (t === '"light"' || t === '"dark"') document.documentElement.dataset.theme = JSON.parse(t);
  } catch (e) { /* storage unavailable */ }
})();
