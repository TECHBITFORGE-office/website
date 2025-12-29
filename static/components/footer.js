class CustomFooter extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        footer {
          background-color: #111827;
          color: white;
          padding: 3rem 2rem;
        }
        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 2rem;
        }
        .footer-logo {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
        }
        .footer-logo img {
          height: 30px;
          margin-right: 10px;
        }
        .footer-links h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #9ca3af;
        }
        .footer-links ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .footer-links li {
          margin-bottom: 0.5rem;
        }
        .footer-links a {
          color: #e5e7eb;
          text-decoration: none;
          transition: color 0.3s;
        }
        .footer-links a:hover {
          color: #818cf8;
        }
        .footer-bottom {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid #374151;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .social-links {
          display: flex;
          gap: 1rem;
        }
        .social-links a {
          color: #9ca3af;
          transition: color 0.3s;
        }
        .social-links a:hover {
          color: #818cf8;
        }
        @media (max-width: 768px) {
          .footer-container {
            grid-template-columns: 1fr 1fr;
          }
          .footer-bottom {
            flex-direction: column;
            text-align: center;
          }
        }
      </style>
      <footer>
        <div class="footer-container">
          <div>
            <div class="footer-logo">
              <img src='/9020930.png' alt="Logo">

            </div>
            <p class="text-gray-400">The unified interface for LLMs.</p>
</div>
          
        
        <div class="footer-bottom">
          <p>&copy; 2023-2025 APINOW. All rights reserved.</p>
<div class="social-links">
            <a href="https://discord.gg/fVyRaUDgxW" aria-label="Discord"><i data-feather="message-circle"></i></a>
            <a href="https://github.com/OpenRouterTeam" aria-label="GitHub"><i data-feather="github"></i></a>
            <a href="https://twitter.com/openrouterai" aria-label="Twitter"><i data-feather="twitter"></i></a>
            <a href="https://www.linkedin.com/company/104068329" aria-label="LinkedIn"><i data-feather="linkedin"></i></a>
          </div>
        </div>
      </footer>
    `;
  }
}

customElements.define('custom-footer', CustomFooter);