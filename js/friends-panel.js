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

    const saved = localStorage.getItem(PANEL_KEY) === '1';
    setPanelCollapsed(saved);

    toggleBtn?.addEventListener('click', () => {
        setPanelCollapsed(!dashboard.classList.contains('friends-panel-collapsed'));
    });

    reopenTab?.addEventListener('click', () => setPanelCollapsed(false));
}

initFriendsPanel();

export { setPanelCollapsed };
