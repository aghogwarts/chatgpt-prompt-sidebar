console.log("Prompt Navigator Loaded");

let sidebarVisible = false;
let promptObserver = null;

/* ========================= */
/* WAIT FOR CHAT LOAD        */
/* ========================= */

function waitForChat() {
  const check = setInterval(() => {
    const main = document.querySelector("main");
    if (main) {
      clearInterval(check);
      injectSidebar();
      observeChat();
      observeMenu();
    }
  }, 500);
}

/* ========================= */
/* SIDEBAR                   */
/* ========================= */

function injectSidebar() {
  if (document.getElementById("prompt-sidebar")) return;

  const sidebar = document.createElement("div");
  sidebar.id = "prompt-sidebar";
  sidebar.style.display = "none";

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <h3>Prompt List</h3>
      <label class="toggle-row">
        <input type="checkbox" id="sidebar-toggle" />
        Enable
      </label>
      <input type="text" id="prompt-search" placeholder="Search..." />
    </div>
    <div id="prompt-list"></div>
  `;

  document.body.appendChild(sidebar);

  document.getElementById("sidebar-toggle").addEventListener("change", (e) => {
    toggleSidebar(e.target.checked);
  });
}

function toggleSidebar(show) {
  const sidebar = document.getElementById("prompt-sidebar");
  const main = document.querySelector("main");

  sidebarVisible = show;

  if (show) {
    sidebar.style.display = "block";
    if (main) main.style.marginRight = "260px";
    extractPrompts();
  } else {
    sidebar.style.display = "none";
    if (main) main.style.marginRight = "0px";
  }
}

/* ========================= */
/* PROMPT EXTRACTION         */
/* ========================= */

function extractPrompts() {
  if (!sidebarVisible) return;

  const promptNodes = document.querySelectorAll(
    '[data-message-author-role="user"]',
  );
  const list = document.getElementById("prompt-list");
  if (!list) return;

  list.innerHTML = "";

  const promptsArray = [];

  promptNodes.forEach((node) => {
    const fullText = node.innerText.trim();
    const shortText = fullText.slice(0, 120);

    promptsArray.push(fullText);

    const item = document.createElement("div");
    item.className = "prompt-item";
    item.innerText = shortText;

    item.onclick = () => {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    list.appendChild(item);
  });

  // Save per-chat
  const chatId = window.location.pathname;
  browser.storage.local.set({ [chatId]: promptsArray });

  observeVisiblePrompts(promptNodes);

  browser.storage.local.get().then((data) => {
    console.log("Extension storage:", data);
  });
}

/* ========================= */
/* HIGHLIGHT CURRENT PROMPT  */
/* ========================= */

function observeVisiblePrompts(promptNodes) {
  const sidebarItems = document.querySelectorAll(".prompt-item");

  if (promptObserver) {
    promptObserver.disconnect();
  }

  promptObserver = new IntersectionObserver(
    (entries) => {
      let mostVisible = null;

      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (
            !mostVisible ||
            entry.intersectionRatio > mostVisible.intersectionRatio
          ) {
            mostVisible = entry;
          }
        }
      });

      if (!mostVisible) return;

      const visibleText = mostVisible.target.innerText.trim().slice(0, 120);

      sidebarItems.forEach((item) => {
        const isActive = item.innerText === visibleText;
        item.classList.toggle("active", isActive);

        if (isActive) {
          const list = document.getElementById("prompt-list");
          const itemRect = item.getBoundingClientRect();
          const listRect = list.getBoundingClientRect();

          if (
            itemRect.top < listRect.top ||
            itemRect.bottom > listRect.bottom
          ) {
            item.scrollIntoView({
              block: "nearest",
              behavior: "smooth",
            });
          }
        }
      });
    },
    { threshold: [0.4, 0.6, 0.8] },
  );

  promptNodes.forEach((node) => promptObserver.observe(node));
}

/* ========================= */
/* CHAT OBSERVER (OPTIMIZED) */
/* ========================= */

function observeChat() {
  const main = document.querySelector("main");
  if (!main) return;

  const observer = new MutationObserver((mutations) => {
    let added = false;

    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        added = true;
        break;
      }
    }

    if (added) {
      extractPrompts();
    }
  });

  observer.observe(main, { childList: true });
}

/* ========================= */
/* MENU INTEGRATION          */
/* ========================= */

function observeMenu() {
  const bodyObserver = new MutationObserver(() => {
    const menus = document.querySelectorAll('[role="menu"]');

    menus.forEach((menu) => {
      if (menu.querySelector(".prompt-menu-item")) return;

      const item = document.createElement("div");
      item.className = "prompt-menu-item";
      item.innerText = "~ Prompt Sidebar";
      item.style.padding = "6px 20px";
      item.style.cursor = "pointer";

      item.onclick = () => {
        document.getElementById("sidebar-toggle").checked = true;
        toggleSidebar(true);
      };

      menu.appendChild(item);
    });
  });

  bodyObserver.observe(document.body, { childList: true, subtree: true });
}

/* ========================= */
/* SEARCH                    */
/* ========================= */

document.addEventListener("input", (e) => {
  if (e.target.id === "prompt-search") {
    const searchValue = e.target.value.toLowerCase();
    const items = document.querySelectorAll(".prompt-item");

    items.forEach((item) => {
      item.style.display = item.innerText.toLowerCase().includes(searchValue)
        ? "block"
        : "none";
    });
  }
});

waitForChat();
