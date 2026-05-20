// ════════════════════════════════════════════════════════════════
//  navbar_auth.js  —  Student Pack · Global Auth UI
//
//  Include this script on EVERY page (index.html, tasks, exams…).
//  It calls authcheck.php once on load and:
//    • Injects the username into a #navUser element (if present)
//    • Shows/hides the logout button (#logoutBtn)
//    • Shows/hides the login link (#loginLink)
//    • Adds a data-username attribute to <body> for CSS hooks
//
//  Works from any subfolder depth — resolves the root automatically.
// ════════════════════════════════════════════════════════════════

(function () {
  // ── Resolve root-relative paths ─────────────────────────────
  // Count how many directories deep the current page is.
  // e.g.  /StudentPack/index.html          → depth 1 → prefix = './'
  //       /StudentPack/Time Table/timetable.php → depth 2 → prefix = '../'
  function getRootPrefix() {
    const parts = window.location.pathname.replace(/\/[^/]+$/, '').split('/').filter(Boolean);
    return parts.length <= 1 ? './' : '../'.repeat(parts.length - 1);
  }

  const root = getRootPrefix();

  // ── Run after DOM is ready ───────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const res  = await fetch(root + 'Authentification/authcheck.php', { credentials: 'same-origin' });
      const data = await res.json();
      updateNavbar(data.loggedIn, data.username, data.full_name);
    } catch (err) {
      // Server unreachable — silent fail, don't break the page
      console.warn('navbar_auth: could not reach authcheck.php', err);
    }
  });

  // ── DOM updates ──────────────────────────────────────────────
  function updateNavbar(loggedIn, username, fullName) {
    const displayName = fullName || username || '';
    
    // Mark body for CSS hooks
    document.body.dataset.loggedIn = loggedIn ? 'true' : 'false';
    if (username) document.body.dataset.username = username;

    // ── Elements that MAY exist on any page ─────────────────

    // #navUser → show the username (e.g. "👤 Jean Dupont")
    const navUser = document.getElementById('navUser');
    if (navUser) {
      if (loggedIn && displayName) {
        navUser.textContent = '👤 ' + displayName;
        navUser.style.display = '';
      } else {
        navUser.style.display = 'none';
      }
    }

    // #navUserBadge → compact pill badge version
    const badge = document.getElementById('navUserBadge');
    if (badge) {
      if (loggedIn && displayName) {
        badge.textContent  = displayName;
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    }

    // #logoutBtn → show only when logged in
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.style.display = loggedIn ? '' : 'none';

      // Attach logout handler if not already set via onclick=""
      if (!logoutBtn.dataset.authBound) {
        logoutBtn.dataset.authBound = '1';
        logoutBtn.addEventListener('click', async () => {
          try {
            await fetch(root + 'Authentification/logout.php', { credentials: 'same-origin' });
          } catch { /* ignore */ }
          window.location.href = root + 'Authentification/authentification.php';
        });
      }
    }

    // #loginLink → hide when logged in, show when logged out
    const loginLink = document.getElementById('loginLink');
    if (loginLink) {
      loginLink.style.display = loggedIn ? 'none' : '';
    }

    // #loginBtn → hide when logged in, show when logged out
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.style.display = loggedIn ? 'none' : '';
    }
   

    // ── Inject user pill into Bootstrap navbar (index.html) ──
    // If there's a navbar-right ul and no #navUser yet, inject one.
    if (loggedIn && displayName) {
      const navbarRight = document.querySelector('.navbar-right');
      if (navbarRight && !navbarRight.querySelector('#navUser')) {
        const li = document.createElement('li');
        li.innerHTML = `
          <a href="#" id="navUser" style="cursor:default; font-weight:600;">
            <span class="glyphicon glyphicon-user"></span> ${displayName}
          </a>`;
        // Insert before any existing items
        navbarRight.insertBefore(li, navbarRight.firstChild);
      }

      // Also inject a logout button into Bootstrap navbar
      if (navbarRight && !navbarRight.querySelector('#logoutBtn')) {
        const li = document.createElement('li');
        li.innerHTML = `
          <a href="#" id="logoutBtn">
            <span class="glyphicon glyphicon-log-out"></span> Déconnexion
          </a>`;
        navbarRight.appendChild(li);

        document.getElementById('logoutBtn').addEventListener('click', async (e) => {
          e.preventDefault();
          try {
            await fetch(root + 'Authentification/logout.php', { credentials: 'same-origin' });
          } catch { /* ignore */ }
          window.location.href = root + 'Authentification/authentification.php';
        });
      }

      // Hide the login link now that we're logged in
      const loginLi = navbarRight.querySelector('a[href*="authentification"]');
      if (loginLi) loginLi.closest('li').style.display = 'none';
    }

    // ── Dark navbar (timetable / dropout style) ───────────────
    // These pages already have .nav-links; inject a user chip.
    const navLinks = document.querySelector('.nav-links');
    if (navLinks && loggedIn && displayName && !navLinks.querySelector('.nav-user-chip')) {
      const chip = document.createElement('li');
      chip.className = 'nav-user-chip';
      chip.innerHTML = `
        <span style="
          display:inline-flex; align-items:center; gap:.4rem;
          padding:.35rem .85rem; border-radius:999px;
          font-size:.78rem; font-weight:600;
          background:rgba(99,102,241,.12);
          border:1px solid rgba(99,102,241,.25);
          color:#a5b4fc;
          white-space:nowrap;
        ">👤 ${displayName}</span>`;
      // Insert before last item (logout) or at end
      const logoutLi = navLinks.querySelector('li:last-child');
      navLinks.insertBefore(chip, logoutLi);
    }
  }
})();