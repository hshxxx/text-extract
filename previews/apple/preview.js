document.querySelectorAll("[data-tab-group]").forEach((group) => {
  const buttons = group.querySelectorAll("[data-tab-target]");
  const panels = document.querySelectorAll(
    `[data-tab-panels="${group.getAttribute("data-tab-group")}"] [data-tab-panel]`,
  );

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-tab-target");

      buttons.forEach((item) => item.classList.toggle("active", item === button));
      panels.forEach((panel) => {
        panel.hidden = panel.getAttribute("data-tab-panel") !== target;
      });
    });
  });
});
