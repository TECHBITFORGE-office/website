// signout.js
// Works for Shadow DOM <custom-navbar> without editing navbar.js

(function () {
  // Wait until the page and custom elements are ready
  function waitForNavbar() {
    const navbar = document.querySelector("custom-navbar");

    if (!navbar) {
      return requestAnimationFrame(waitForNavbar);
    }

    // Wait until the Shadow DOM exists
    if (!navbar.shadowRoot) {
      return requestAnimationFrame(waitForNavbar);
    }

    attachSignOut(navbar);
  }

  function attachSignOut(navbar) {
    // Listen for clicks inside the navbar Shadow DOM
    navbar.shadowRoot.addEventListener("click", (e) => {
      const link = e.target.closest("a[href='/signout']");
      if (!link) return;

      e.preventDefault(); // Stop normal navigation
      runSignOut();
    });
  }

  function runSignOut() {
    console.log("Signing out...");

    // Clear all local & session storage
    localStorage.clear();
    sessionStorage.clear();

    // Remove all cookies
    document.cookie.split(";").forEach(cookie => {
      const name = cookie.split("=")[0].trim();
      document.cookie =
        `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
    });

    console.log("User signed out. Redirecting...");

    // Redirect to signin page
    window.location.replace("/signin");
  }

  // Start
  waitForNavbar();
})();
