const PANEL_KEY = 'gkey-friends-panel-collapsed';

const dashboard = document.querySelector('.dashboard-container');
const panel = document.getElementById('friends-panel');
const toggleBtn = document.getElementById('friends-panel-toggle');
const reopenTab = document.getElementById('friends-panel-tab');

function setPanelCollapsed(collapsed) {
    if (!dashboard || !panel) return;

    dashboard.classList.toggle('friends-panel-collapsed', collapsed);
    panel.classList.toggle('is-collapsed', collapsed);

    if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', String(!collapsed));
        toggleBtn.setAttribute(
            'aria-label',
            collapsed ? 'Mostrar panel de amigos' : 'Ocultar panel de amigos'
        );
    }

    localStorage.setItem(PANEL_KEY, collapsed ? '1' : '0');
}

function initFriendsPanel() {
    if (!panel || !dashboard) return;

    // Default to collapsed = true unless explicitly opened
    const saved = localStorage.getItem(PANEL_KEY);
    const isCollapsed = saved === null ? true : saved === '1';
    setPanelCollapsed(isCollapsed);

    toggleBtn?.addEventListener('click', () => {
        const currentlyCollapsed = panel.classList.contains('is-collapsed');
        setPanelCollapsed(!currentlyCollapsed);
    });

    reopenTab?.addEventListener('click', () => setPanelCollapsed(false));

    // Global listener for any friends icon / button across the UI
    document.querySelectorAll('.fa-users, [data-action="toggle-friends"]').forEach(icon => {
        const parentBtn = icon.closest('button, a, .dock-item');
        if (parentBtn && parentBtn !== toggleBtn) {
            parentBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const currentlyCollapsed = panel.classList.contains('is-collapsed');
                setPanelCollapsed(!currentlyCollapsed);
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initFriendsPanel();
});

export { setPanelCollapsed };
