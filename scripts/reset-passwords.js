#!/usr/bin/env node
/**
 * Reset passwords for Ordus users
 * Usage: node scripts/reset-passwords.js <SUPABASE_SERVICE_ROLE_KEY>
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SERVICE_ROLE_KEY = process.argv[2] || process.env.SUPABASE_SERVICE_ROLE_KEY;

const USERS_TO_RESET = [
  { email: 'gjergjilaloshi@yahoo.com', password: 'Laerti2000' },
  { email: 'george@diamondlaw.ca', password: 'Laerti2000' },
  { email: 'glaloshilegal@gmail.com', password: 'Laerti2000' }
];

async function resetPasswords() {
  if (!SERVICE_ROLE_KEY) {
    console.error('❌ Error: Missing service role key');
    console.log('Usage: node scripts/reset-passwords.js <your-service-role-key>');
    console.log('Or set SUPABASE_SERVICE_ROLE_KEY environment variable');
    process.exit(1);
  }

  console.log('🔐 Connecting to Supabase...');
  console.log(`URL: ${SUPABASE_URL}`);
  
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('\n📝 Resetting passwords...\n');

  for (const user of USERS_TO_RESET) {
    try {
      // First, find the user by email
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
      
      if (userError) {
        console.error(`❌ Failed to list users: ${userError.message}`);
        continue;
      }

      const targetUser = userData.users.find(u => u.email === user.email);
      
      if (!targetUser) {
        console.log(`⚠️  User not found: ${user.email}`);
        console.log(`   Creating new user instead...`);
        
        // Create user if doesn't exist
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true // Auto-confirm email
        });
        
        if (createError) {
          console.error(`❌ Failed to create ${user.email}: ${createError.message}`);
        } else {
          console.log(`✅ Created ${user.email} with password`);
          
          // Create user metadata
          await supabase.from('users_metadata').upsert({
            id: newUser.user.id,
            name: user.email.split('@')[0],
            role: 'Admin',
            is_active: true,
            created_at: new Date().toISOString()
          });
        }
      } else {
        // Update existing user password
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          targetUser.id,
          { password: user.password }
        );
        
        if (updateError) {
          console.error(`❌ Failed to update ${user.email}: ${updateError.message}`);
        } else {
          console.log(`✅ Updated password for ${user.email}`);
        }
      }
    } catch (err) {
      console.error(`❌ Error processing ${user.email}: ${err.message}`);
    }
  }

  console.log('\n🎉 Password reset complete!');
  console.log('\nNew login credentials:');
  USERS_TO_RESET.forEach(u => {
    console.log(`  Email: ${u.email}`);
    console.log(`  Password: ${u.password}`);
    console.log('');
  });
}

// Run the script
resetPasswords().catch(console.error);
