/**
 * Migration script to update existing SABS tasks from "Lawyer" to "Paralegal"
 * Run this once to fix existing tasks in the database
 */

import { getSupabase } from '../lib/supabase/singleton'

// SABS-related task title patterns
const SABS_TASK_PATTERNS = [
  'U&R with Client',
  'George Review',
  'Prepare OCF-1',
  'Get OCF-3',
  'Get OCF-2',
  'Send AC & HK Forms',
  'Submit OCF-1',
  'Renew OCF-3',
  'Refer for Psychological',
  'Refer for Physiatry',
  'Refer for CPA/Neuro',
  'Prepare IRB & Medical Review',
  'Send SABS Notice',
  'Submit Initial Expenses',
  'Request FD CNRs',
  'Request Hospital Records',
  'Ensure Client Attending Treatment',
  'Ensure Productions Requested',
  'Request Updated CNRs',
]

async function updateSABSTasks() {
  const supabase = getSupabase()
  
  console.log('Fetching all tasks assigned to Lawyer...')
  
  // Get all tasks assigned to Lawyer
  const { data: tasks, error: fetchError } = await supabase
    .from('tasks')
    .select('id, title, assigned_to_role')
    .eq('assigned_to_role', 'Lawyer')
  
  if (fetchError) {
    console.error('Error fetching tasks:', fetchError)
    return
  }
  
  if (!tasks || tasks.length === 0) {
    console.log('No tasks assigned to Lawyer found.')
    return
  }
  
  console.log(`Found ${tasks.length} tasks assigned to Lawyer`)
  
  // Filter to SABS-related tasks
  const sabsTasks = tasks.filter(task => 
    SABS_TASK_PATTERNS.some(pattern => task.title.includes(pattern))
  )
  
  console.log(`Found ${sabsTasks.length} SABS-related tasks to update`)
  
  if (sabsTasks.length === 0) {
    console.log('No SABS tasks to update.')
    return
  }
  
  // Update each task
  let updated = 0
  let errors = 0
  
  for (const task of sabsTasks) {
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ assigned_to_role: 'Paralegal' })
      .eq('id', task.id)
    
    if (updateError) {
      console.error(`Error updating task ${task.id} (${task.title}):`, updateError)
      errors++
    } else {
      console.log(`✓ Updated: ${task.title}`)
      updated++
    }
  }
  
  console.log(`\n✅ Migration complete!`)
  console.log(`   Updated: ${updated} tasks`)
  console.log(`   Errors: ${errors} tasks`)
}

// Run if called directly
if (require.main === module) {
  updateSABSTasks()
    .then(() => {
      console.log('Done!')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Fatal error:', err)
      process.exit(1)
    })
}

export { updateSABSTasks }

