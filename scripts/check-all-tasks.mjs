/**
 * Script to check all tasks in the database and their assignments
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Check .env.local file.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAllTasks() {
  console.log('Fetching all tasks...')
  
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, assigned_to_role, assigned_to_user_id, status, category')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching tasks:', error)
    return
  }
  
  if (!tasks || tasks.length === 0) {
    console.log('No tasks found in database.')
    return
  }
  
  console.log(`\nFound ${tasks.length} total tasks:\n`)
  
  // Group by assigned_to_role
  const byRole = {}
  const byUserId = {}
  
  tasks.forEach(task => {
    const role = task.assigned_to_role || 'No role'
    const userId = task.assigned_to_user_id || 'No user ID'
    
    if (!byRole[role]) byRole[role] = []
    byRole[role].push(task)
    
    if (!byUserId[userId]) byUserId[userId] = []
    byUserId[userId].push(task)
  })
  
  console.log('Tasks by role:')
  Object.entries(byRole).forEach(([role, taskList]) => {
    console.log(`  ${role}: ${taskList.length} tasks`)
    if (role === 'Lawyer' || role === 'Paralegal') {
      taskList.slice(0, 5).forEach(t => {
        console.log(`    - ${t.title} (${t.status})`)
      })
      if (taskList.length > 5) {
        console.log(`    ... and ${taskList.length - 5} more`)
      }
    }
  })
  
  console.log('\nSample tasks:')
  tasks.slice(0, 10).forEach(task => {
    console.log(`  - ${task.title}`)
    console.log(`    Role: ${task.assigned_to_role || 'None'}`)
    console.log(`    User ID: ${task.assigned_to_user_id || 'None'}`)
    console.log(`    Status: ${task.status}`)
    console.log(`    Category: ${task.category}`)
    console.log('')
  })
}

checkAllTasks()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })

