// Supabase Registration Sync Configuration
// This integrates with Supabase Cloud for serverless data collection

const SUPABASE_CONFIG = {
  // Get these from your Supabase project settings
  SUPABASE_URL: 'https://your-project.supabase.co',           // Replace with your Supabase URL
  SUPABASE_ANON_KEY: 'your-anon-key-here',                   // Replace with your anon public key
  TABLE_NAME: 'msp_registrations',
  AUTO_SYNC: true,
  SYNC_INTERVAL: 60000, // Sync every 60 seconds
};

// Initialize Supabase client
let supabaseClient = null;

async function initSupabase() {
  if (supabaseClient) return supabaseClient;
  
  try {
    // Dynamically load Supabase library
    if (!window.supabase) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.0';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    
    supabaseClient = window.supabase.createClient(
      SUPABASE_CONFIG.SUPABASE_URL,
      SUPABASE_CONFIG.SUPABASE_ANON_KEY
    );
    
    return supabaseClient;
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
    return null;
  }
}

// Save registration to Supabase
async function saveRegistrationToSupabase(registrationData) {
  try {
    const client = await initSupabase();
    if (!client) {
      console.warn('Supabase not initialized, saving locally only');
      return false;
    }
    
    const { data, error } = await client
      .from(SUPABASE_CONFIG.TABLE_NAME)
      .insert([registrationData]);
    
    if (error) {
      console.error('Supabase insert error:', error);
      return false;
    }
    
    console.log('✓ Registration saved to Supabase');
    return true;
  } catch (error) {
    console.error('Error saving to Supabase:', error);
    return false;
  }
}

// Sync local registrations to Supabase
async function syncToSupabase() {
  try {
    const client = await initSupabase();
    if (!client) return false;
    
    const registrations = JSON.parse(localStorage.getItem('msp_registrations') || '[]');
    
    if (registrations.length === 0) {
      console.log('No registrations to sync');
      return true;
    }
    
    // Insert all registrations (Supabase will ignore duplicates based on timestamp + email)
    const { error } = await client
      .from(SUPABASE_CONFIG.TABLE_NAME)
      .upsert(
        registrations.map(reg => ({
          name: reg.name,
          email: reg.email,
          phone: reg.phone,
          organization: reg.organization,
          role: reg.role,
          gender: reg.gender,
          origin: reg.origin,
          experience: reg.experience,
          interests: reg.interests,
          timestamp: reg.timestamp,
          synced_at: new Date().toISOString()
        })),
        { onConflict: 'email,timestamp' }
      );
    
    if (error) {
      console.error('Supabase sync error:', error);
      return false;
    }
    
    console.log('✓ All registrations synced to Supabase');
    return true;
  } catch (error) {
    console.error('Error syncing to Supabase:', error);
    return false;
  }
}

// Auto-sync to Supabase periodically
if (SUPABASE_CONFIG.AUTO_SYNC) {
  window.addEventListener('load', () => {
    // Try to sync on page load
    if (SUPABASE_CONFIG.SUPABASE_URL && SUPABASE_CONFIG.SUPABASE_URL.includes('supabase.co')) {
      syncToSupabase();
    }
    
    // Sync periodically
    setInterval(syncToSupabase, SUPABASE_CONFIG.SYNC_INTERVAL);
  });
}

// Export functions for use in other scripts
if (typeof window !== 'undefined') {
  window.initSupabase = initSupabase;
  window.saveRegistrationToSupabase = saveRegistrationToSupabase;
  window.syncToSupabase = syncToSupabase;
}
