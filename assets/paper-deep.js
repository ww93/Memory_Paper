(() => {
  function renderList(items) {
    if (!items || !items.length) return "";
    return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
  }

  function setPanel(root, data, key) {
    const item = data[key];
    if (!item) return;
    root.querySelector("[data-hot-label]").textContent = item.label || key;
    root.querySelector("[data-hot-title]").textContent = item.title || "";
    root.querySelector("[data-hot-body]").innerHTML = item.body || "";
    root.querySelector("[data-hot-points]").innerHTML = renderList(item.points);
    root.querySelectorAll(".hotspot").forEach((button) => {
      button.classList.toggle("active", button.dataset.hotspot === key);
    });
  }

  document.querySelectorAll("[data-hotspot-root]").forEach((root) => {
    const name = root.dataset.hotspotRoot;
    const data = window.paperHotspots && window.paperHotspots[name];
    if (!data) return;
    const first = root.querySelector(".hotspot");
    if (first) setPanel(root, data, first.dataset.hotspot);
    root.querySelectorAll(".hotspot").forEach((button) => {
      const key = button.dataset.hotspot;
      button.addEventListener("mouseenter", () => setPanel(root, data, key));
      button.addEventListener("focus", () => setPanel(root, data, key));
      button.addEventListener("click", () => setPanel(root, data, key));
    });
  });
})();
