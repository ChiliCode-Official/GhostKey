const menuToggle = document.getElementById('mobile-menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const menuBackdrop = document.getElementById('mobile-menu-backdrop');

function setMobileMenuOpen(isOpen) {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.checked = isOpen;
    mobileMenu.classList.toggle('is-open', isOpen);
    mobileMenu.setAttribute('aria-hidden', String(!isOpen));
    document.body.classList.toggle('mobile-menu-open', isOpen);
}

if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('change', () => {
        setMobileMenuOpen(menuToggle.checked);
    });

    menuBackdrop?.addEventListener('click', () => setMobileMenuOpen(false));

    mobileMenu.querySelectorAll('.mobile-menu__link').forEach((link) => {
        link.addEventListener('click', () => setMobileMenuOpen(false));
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menuToggle.checked) {
            setMobileMenuOpen(false);
        }
    });
}

export { setMobileMenuOpen };
