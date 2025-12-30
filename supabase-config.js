// Supabase Registration Sync Configuration
// This integrates with Supabase Cloud for serverless data collection

// Load credentials from localStorage (set in admin-setup.qmd)
const SUPABASE_CONFIG = {
  // Get these from your Supabase project settings
  SUPABASE_URL: localStorage.getItem('supabase_url') || '',
  SUPABASE_ANON_KEY: localStorage.getItem('supabase_key') || '',
  TABLE_NAME: 'msp_registrations',
  AUTO_SYNC: true,
  SYNC_INTERVAL: 60000, // Sync every 60 seconds
};

// Initialize Supabase client
let supabaseClient = null;
let supabaseInitialized = false;

async function initSupabase() {
  if (supabaseClient) return supabaseClient;
  
  // Check if credentials are configured
  if (!SUPABASE_CONFIG.SUPABASE_URL || !SUPABASE_CONFIG.SUPABASE_ANON_KEY) {
    console.warn('Supabase credentials not configured. Registrations will save locally only.');
    return null;
  }
  
  try {
    // Dynamically load Supabase library if not already loaded
    if (!window.supabase) {
      console.log('Loading Supabase library...');
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.0';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    
    console.log('Initializing Supabase client with URL:', SUPABASE_CONFIG.SUPABASE_URL);
    
    supabaseClient = window.supabase.createClient(
      SUPABASE_CONFIG.SUPABASE_URL,
      SUPABASE_CONFIG.SUPABASE_ANON_KEY
    );
    
    supabaseInitialized = true;
    console.log('✓ Supabase client initialized successfully');
    return supabaseClient;
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
    return null;
  }
}

// Save registration to Supabase
async function saveRegistrationToSupabase(registrationData) {
  try {
    console.log('=== SAVING REGISTRATION ===');
    console.log('Registration data:', registrationData);
    
    const client = await initSupabase();
    if (!client) {
      console.warn('⚠️ Supabase not initialized. Data saved locally only.');
      return false;
    }
    
    console.log('Inserting into table:', SUPABASE_CONFIG.TABLE_NAME);
    
    const { data, error } = await client
      .from(SUPABASE_CONFIG.TABLE_NAME)
      .insert([{
        name: registrationData.name,
        email: registrationData.email,
        phone: registrationData.phone || null,
        organization: registrationData.organization,
        role: registrationData.role,
        gender: registrationData.gender,
        origin: registrationData.origin,
        experience: registrationData.experience,
        interests: registrationData.interests,
        timestamp: registrationData.timestamp
      }]);
    
    if (error) {
      console.error('❌ Supabase insert error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      return false;
    }
    
    console.log('✓ Registration saved to Supabase successfully');
    console.log('Response data:', data);
    return true;
  } catch (error) {
    console.error('❌ Exception while saving to Supabase:', error);
    return false;
  }
}

// Sync local registrations to Supabase
async function syncToSupabase() {
  try {
    console.log('Starting sync to Supabase...');
    
    const client = await initSupabase();
    if (!client) {
      console.log('Supabase not initialized, skipping sync');
      return false;
    }
    
    const registrations = JSON.parse(localStorage.getItem('msp_registrations') || '[]');
    
    if (registrations.length === 0) {
      console.log('No registrations to sync');
      return true;
    }
    
    console.log(`Syncing ${registrations.length} registration(s)...`);
    
    // Insert all registrations
    const { data, error } = await client
      .from(SUPABASE_CONFIG.TABLE_NAME)
      .insert(
        registrations.map(reg => ({
          name: reg.name,
          email: reg.email,
          phone: reg.phone || null,
          organization: reg.organization,
          role: reg.role,
          gender: reg.gender,
          origin: reg.origin,
          experience: reg.experience,
          interests: reg.interests,
          timestamp: reg.timestamp
        }))
      );
    
    if (error) {
      console.error('❌ Supabase sync error:', error);
      return false;
    }
    
    console.log('✓ All registrations synced to Supabase');
    return true;
  } catch (error) {
    console.error('❌ Error syncing to Supabase:', error);
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
