const menuToggles = document.querySelectorAll('input[id*="mobile-menu-toggle"]');
const mobileMenu = document.getElementById('mobile-menu');
const menuBackdrop = document.getElementById('mobile-menu-backdrop');

function setMobileMenuOpen(isOpen) {
    if (!mobileMenu) return;
    menuToggles.forEach(toggle => toggle.checked = isOpen);
    mobileMenu.classList.toggle('is-open', isOpen);
    mobileMenu.setAttribute('aria-hidden', String(!isOpen));
    document.body.classList.toggle('mobile-menu-open', isOpen);
}

menuToggles.forEach(toggle => {
    toggle.addEventListener('change', () => {
        setMobileMenuOpen(toggle.checked);
    });
});

if (mobileMenu) {
    menuBackdrop?.addEventListener('click', () => setMobileMenuOpen(false));

    mobileMenu.querySelectorAll('.mobile-menu__link').forEach((link) => {
        link.addEventListener('click', () => setMobileMenuOpen(false));
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
            setMobileMenuOpen(false);
        }
    });
}

export { setMobileMenuOpen };
