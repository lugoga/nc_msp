// MSP Registration Sync Configuration
// This file stores the GitHub sync settings for collecting registrations on admin device

const SYNC_CONFIG = {
  // GitHub repository details (for admin to collect data)
  GITHUB_OWNER: 'lugoga',
  GITHUB_REPO: 'nc_msp',
  GITHUB_BRANCH: 'registrations-data',
  GITHUB_TOKEN: '', // Leave empty - will be set only on admin device
  DATA_FILE_PATH: 'data/registrations.json',
  
  // Settings
  AUTO_SYNC: true,           // Automatically sync new registrations
  SYNC_INTERVAL: 300000,     // Sync every 5 minutes (ms)
  SHOW_SYNC_STATUS: false,   // Show sync status on public pages (false = hidden from visitors)
};

// Check if this is admin device (if token is set, this is the collection point)
function isAdminDevice() {
  return SYNC_CONFIG.GITHUB_TOKEN && SYNC_CONFIG.GITHUB_TOKEN.trim() !== '';
}

// Get all registrations and sync to GitHub (admin only)
async function syncRegistrationsToGitHub() {
  if (!isAdminDevice()) return; // Only admin device syncs
  
  try {
    const registrations = JSON.parse(localStorage.getItem('msp_registrations') || '[]');
    
    const content = JSON.stringify(registrations, null, 2);
    const encodedContent = btoa(unescape(encodeURIComponent(content)));
    
    // Get current file SHA (for update)
    const getUrl = `https://api.github.com/repos/${SYNC_CONFIG.GITHUB_OWNER}/${SYNC_CONFIG.GITHUB_REPO}/contents/${SYNC_CONFIG.DATA_FILE_PATH}?ref=${SYNC_CONFIG.GITHUB_BRANCH}`;
    
    let sha = null;
    try {
      const getResponse = await fetch(getUrl, {
        headers: {
          'Authorization': `token ${SYNC_CONFIG.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (getResponse.ok) {
        const data = await getResponse.json();
        sha = data.sha;
      }
    } catch (e) {
      // File doesn't exist yet, will be created
    }
    
    // Upload/update file
    const putUrl = `https://api.github.com/repos/${SYNC_CONFIG.GITHUB_OWNER}/${SYNC_CONFIG.GITHUB_REPO}/contents/${SYNC_CONFIG.DATA_FILE_PATH}`;
    
    const response = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${SYNC_CONFIG.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Update registrations - ${new Date().toLocaleString()}`,
        content: encodedContent,
        branch: SYNC_CONFIG.GITHUB_BRANCH,
        ...(sha && { sha })
      })
    });
    
    if (response.ok) {
      console.log('✓ Registrations synced to GitHub');
      return true;
    } else {
      console.error('Failed to sync to GitHub:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Sync error:', error);
    return false;
  }
}

// Auto-sync registrations (admin device only)
if (isAdminDevice() && SYNC_CONFIG.AUTO_SYNC) {
  // Sync on page load
  window.addEventListener('load', syncRegistrationsToGitHub);
  
  // Sync periodically
  setInterval(syncRegistrationsToGitHub, SYNC_CONFIG.SYNC_INTERVAL);
}
