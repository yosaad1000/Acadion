// Debug Supabase Auth Settings
// Run this in browser console on your app

async function debugSupabaseAuth() {
    const supabaseUrl = 'https://scijpejtvneuqbhkoxuz.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaWpwZWp0dm5ldXFiaGtveHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTcxNDEsImV4cCI6MjA3MTE3MzE0MX0.Z6Q_DmsuHYOOvCGed5hcKDrT93XPL5hHwCyGDREcmmw';
    
    try {
        console.log('🔍 Checking Supabase Auth Settings...');
        
        const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (response.ok) {
            const settings = await response.json();
            console.log('✅ Auth Settings Retrieved:');
            console.log('📋 Full Settings:', settings);
            
            if (settings.external && settings.external.google) {
                console.log('🔑 Google OAuth Settings:');
                console.log('  - Enabled:', settings.external.google.enabled);
                console.log('  - Client ID:', settings.external.google.client_id ? 'Set' : 'Not Set');
            } else {
                console.log('❌ Google OAuth not configured');
            }
            
            return settings;
        } else {
            console.error('❌ Failed to get auth settings:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Error details:', errorText);
        }
    } catch (error) {
        console.error('❌ Network error:', error);
    }
}

// Run the debug
debugSupabaseAuth();