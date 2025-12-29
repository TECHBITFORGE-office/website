class CustomNavbar extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: "open" });
    this.render();
    this.initAuthListener();
  }

  render(isLoggedIn = false, userData = null) {
    const avatarURL = new URL(
      userData?.avatar_url || "/USER.png",
      window.location.origin
    ).href;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: 'Inter', sans-serif; }

        nav {
          background: linear-gradient(90deg, #0f0c29, #302b63, #24243e);
          box-shadow: 0 2px 10px rgba(0,0,0,0.6);
          padding: 0.8rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 10000;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .backdrop {
          position: fixed;
          top: 0; left: 0;
          width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.4);
          display: none;
          z-index: 9999;
        }
        .backdrop.show { display: block; }

        /* Logo */
        .logo img {
          height: 30px;
          filter: drop-shadow(0 0 4px #00ffff);
        }

        /* Desktop nav */
        .nav-links { 
          display: flex; gap: 1.5rem; list-style: none;
          margin: 0; padding: 0; align-items: center;
        }

        .nav-links a {
          color: #d1d5ff;
          text-decoration: none;
          font-weight: 500;
          letter-spacing: 0.3px;
          transition: 0.3s;
          text-shadow: 0 0 6px rgba(138,43,226,0.7);
        }

        .nav-links a:hover {
          color: #00ffff;
          text-shadow: 0 0 12px #00ffff;
        }

        /* Right action block */
        .nav-actions { 
          display: flex; align-items: center; gap: 0.8rem;
        }

        /* The pill menu + avatar container */
        .outline-none {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: rgba(255,255,255,0.05);
          padding: 0.25rem 0.7rem;
          border-radius: 2rem;
          border: 1.5px solid rgba(0,255,255,0.3);
          box-shadow: 0 0 8px rgba(0,255,255,0.2);
          transition: 0.25s;
        }

        .outline-none.active { 
          border-color: #8a2be2;
          box-shadow: 0 0 12px #8a2be2;
        }

        .icon-btn {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d1d5ff;
          transition: all 0.2s ease;
          text-shadow: 0 0 8px rgba(0,255,255,0.6);
        }

        .icon-btn:hover {
          color: #00ffff;
          text-shadow: 0 0 14px #00ffff;
        }

        .avatar-container { 
          position: relative;
          cursor: pointer;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid transparent;
          box-shadow: 0 0 8px rgba(138,43,226,0.6);
          transition: box-shadow 0.25s ease;
        }
        .user-avatar:hover { box-shadow: 0 0 14px #00ffff; }

        .user-avatar:hover {
          box-shadow: 0 0 14px #00ffff;
        }

        .dropdown {
          display: none;
          position: absolute;
          top: 48px;
          right: 0;
          background: rgba(20, 20, 40, 0.95);
          border: 1px solid rgba(0,255,255,0.3);
          border-radius: 0.6rem;
          width: 180px;
          box-shadow: 0 0 15px rgba(0,255,255,0.25);
          padding: 0.4rem 0;
          animation: fadeIn 0.2s ease-in;
          z-index: 10001;
          backdrop-filter: blur(8px);
        }

        .dropdown.open { display: block; }

        .dropdown a {
          display: block;
          padding: 0.6rem 1rem;
          text-decoration: none;
          color: #d1d5ff;
          font-size: 0.9rem;
          transition: all 0.25s ease;
        }

        .dropdown a:hover {
          background: rgba(0,255,255,0.1);
          color: #00ffff;
          text-shadow: 0 0 10px #00ffff;
        }

        .dropdown-divider {
          height: 1px;
          background: rgba(255,255,255,0.1);
          margin: 0.4rem 0;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .btn-signin, .btn-signup {
          padding: 0.45rem 1rem;
          border-radius: 0.6rem;
          font-weight: 600;
          font-size: 0.9rem;
          text-decoration: none;
          transition: all 0.25s ease;
          letter-spacing: 0.3px;
        }

        .btn-signin {
          background: transparent;
          color: #00ffff;
          border: 1px solid #00ffff;
          box-shadow: 0 0 8px rgba(0,255,255,0.4);
        }

        .btn-signin:hover {
          background: #00ffff;
          color: #0f0c29;
          box-shadow: 0 0 15px #00ffff;
        }

        .btn-signup {
          background: linear-gradient(90deg, #8a2be2, #00ffff);
          color: white;
          border: none;
          box-shadow: 0 0 15px rgba(138,43,226,0.7);
        }

        .btn-signup:hover {
          box-shadow: 0 0 20px #00ffff;
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          font-size: 1.7rem;
          cursor: pointer;
          color: #00ffff;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          align-items: center;
          justify-content: center;
          transition: all 0.25s ease;
        }

        .mobile-menu-btn:hover {
          text-shadow: 0 0 12px #00ffff;
        }

        .mobile-menu {
          display: none;
          position: fixed;
          top: 60px;
          left: 0;
          right: 0;
          background: rgba(20, 20, 40, 0.98);
          border-top: 1px solid rgba(0,255,255,0.3);
          box-shadow: 0 4px 20px rgba(0,0,0,0.6);
          padding: 1rem;
          z-index: 10000;
          flex-direction: column;
          gap: 0.7rem;
          max-height: calc(100vh - 60px);
          overflow-y: auto;
          backdrop-filter: blur(8px);
        }

        .mobile-menu.open { display: flex; }

        .mobile-menu a {
          padding: 0.75rem 1rem;
          text-decoration: none;
          color: #d1d5ff;
          font-weight: 500;
          border-radius: 0.5rem;
          transition: all 0.25s ease;
        }

        .mobile-menu a:hover {
          background: rgba(0,255,255,0.1);
          color: #00ffff;
        }

        .mobile-user-section {
          padding: 1rem;
          border-top: 1px solid rgba(255,255,255,0.1);
          margin-top: 0.5rem;
        }

        .mobile-user-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .mobile-user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          box-shadow: 0 0 10px rgba(0,255,255,0.5);
        }

        .mobile-username {
          font-weight: 600;
          color: #00ffff;
        }

        .mobile-auth-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        @media (max-width: 768px) {
          .nav-links { display: none; }
          .nav-actions .btn-signin,
          .nav-actions .btn-signup,
          .nav-actions .outline-none { display: none; }
          .mobile-menu-btn { display: flex; }
        }

        @media (min-width: 769px) {
          .mobile-menu { display: none !important; }
          .mobile-menu-btn { display: none !important; }
        }
      </style>

      <div class="backdrop" id="desktop-backdrop"></div>

      <nav>
        <a class="logo" href="/"><img src="/9020930.png" alt="Logo"></a>

        <ul class="nav-links">
          <li><a href="/Code_studio">Code studio</a></li>
          <li><a href="/Templates">Templates</a></li>
          <li><a href="/pricing">pricing</a></li>
          <li><a href="/About_us">About us</a></li>
        </ul>

        <div class="nav-actions">
          ${
            isLoggedIn
              ? `
              <div class="outline-none">
                <button class="icon-btn menu-btn">☰</button>
                <button class="icon-btn home-btn">🏠</button>

                <div class="avatar-container">
                  <img 
                      src="${userData?.avatar_url || '/USER.png'}" 
                      class="user-avatar user-dropdown"
                      alt="User Avatar"
                      referrerpolicy="no-referrer"
                    />
                  <div class="dropdown">
                    <a href="/credits">Credits</a>
                    <a href="/keys">Keys</a>
                    <a href="/activity">Activity</a>
                    <a href="/settings">Settings</a>
                    <a href="/enterprise">Enterprise</a>
                    <div class="dropdown-divider"></div>
                    <a href="/signout" style="color:#ff4b91;">Sign out</a>
                  </div>
                </div>
              </div>`
              : `
              <a href="/signin" class="btn-signin">Sign in</a>
              <a href="/signup" class="btn-signup">Get started</a>
            `
          }
        </div>

        <button class="mobile-menu-btn">☰</button>
      </nav>

      <div class="mobile-menu">
        <a href="/Code_studio">Code studio</a>
        <a href="/Templates">Templates</a>
        <a href="/pricing">pricing</a>
        <a href="/About_us">About us</a>

        <div class="mobile-user-section">
          ${
            isLoggedIn
              ? `
              <div class="mobile-user-profile">
                <img src="${avatarURL}" class="mobile-user-avatar">
                <span class="mobile-username">${userData?.full_name || "User"}</span>
              </div>

              <a href="/credits">Credits</a>
              <a href="/keys">Keys</a>
              <a href="/activity">Activity</a>
              <a href="/settings">Settings</a>
              <a href="/enterprise">Enterprise</a>
              <a href="/signout" style="color:#ff4b91;">Sign out</a>
            `
              : `
              <div class="mobile-auth-buttons">
                <a href="/signin" class="btn-signin" style="text-align:center;">Sign in</a>
                <a href="/signup" class="btn-signup" style="text-align:center;">Get started</a>
              </div>
            `
          }
        </div>
      </div>
    `;

    this.initDropdown();
    this.initMobileMenu();
  }

  initDropdown() {
    const dropdown = this.shadowRoot.querySelector(".dropdown");
    const avatar = this.shadowRoot.querySelector(".user-dropdown");
    const menuBtn = this.shadowRoot.querySelector(".menu-btn");
    const homeBtn = this.shadowRoot.querySelector(".home-btn");
    const backdrop = this.shadowRoot.querySelector("#desktop-backdrop");
    const outlineBox = this.shadowRoot.querySelector(".outline-none");

    if (!dropdown) return;

    let isDropdownOpen = false;

    const openDropdown = () => {
      dropdown.classList.add("open");
      backdrop.classList.add("show");
      outlineBox?.classList.add("active");
      if (menuBtn) menuBtn.textContent = "✕";
      isDropdownOpen = true;
    };

    const closeDropdown = () => {
      dropdown.classList.remove("open");
      backdrop.classList.remove("show");
      outlineBox?.classList.remove("active");
      if (menuBtn) menuBtn.textContent = "☰";
      isDropdownOpen = false;
    };

    const toggleDropdown = (e) => {
      e.stopPropagation();
      this.closeMobileMenu();
      if (isDropdownOpen) closeDropdown();
      else openDropdown();
    };

    if (menuBtn) menuBtn.addEventListener("click", toggleDropdown);
    if (avatar) avatar.addEventListener("click", toggleDropdown);

    if (homeBtn)
      homeBtn.addEventListener("click", () => {
        window.location.href = "/Code_studio";
      });

    backdrop.addEventListener("click", closeDropdown);

    document.addEventListener("click", (e) => {
      if (isDropdownOpen && !this.shadowRoot.contains(e.target))
        closeDropdown();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isDropdownOpen) closeDropdown();
    });
  }

  initMobileMenu() {
    const mobileMenuBtn = this.shadowRoot.querySelector(".mobile-menu-btn");
    const mobileMenu = this.shadowRoot.querySelector(".mobile-menu");

    const mobileBackdrop = document.createElement("div");
    mobileBackdrop.className = "backdrop";
    mobileBackdrop.id = "mobile-backdrop";
    this.shadowRoot.appendChild(mobileBackdrop);

    if (!mobileMenuBtn || !mobileMenu) return;

    let isMobileMenuOpen = false;

    const openMobileMenu = () => {
      mobileMenu.classList.add("open");
      mobileBackdrop.classList.add("show");
      mobileMenuBtn.textContent = "✕";
      document.body.style.overflow = "hidden";
      isMobileMenuOpen = true;
      this.closeDropdown();
    };

    const closeMobileMenu = () => {
      mobileMenu.classList.remove("open");
      mobileBackdrop.classList.remove("show");
      mobileMenuBtn.textContent = "☰";
      document.body.style.overflow = "";
      isMobileMenuOpen = false;
    };

    this.openMobileMenu = openMobileMenu;
    this.closeMobileMenu = closeMobileMenu;

    mobileMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isMobileMenuOpen) closeMobileMenu();
      else openMobileMenu();
    });

    mobileMenu.addEventListener("click", (e) => {
      if (e.target.tagName === "A") closeMobileMenu();
    });

    mobileBackdrop.addEventListener("click", closeMobileMenu);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isMobileMenuOpen) closeMobileMenu();
    });

    document.addEventListener("click", (e) => {
      if (isMobileMenuOpen && !this.shadowRoot.contains(e.target))
        closeMobileMenu();
    });
  }

  async initAuthListener() {
    try {
      const apiKey = localStorage.getItem("api_key");
      if (!apiKey) return this.render(false);

      const response = await fetch(`/get_user?id=${apiKey}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) return this.render(false);

      const data = await response.json();
      const userObj = data?.data?.[0] || null;

      this.render(true, userObj);
    } catch (error) {
      this.render(false);
    }
  }
}

customElements.define("custom-navbar", CustomNavbar);
