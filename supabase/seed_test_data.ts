import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

const TENANT_ID = 'your-tenant-id' // Replace with a valid tenant ID

async function generateData() {
  console.log('Generating 5,000 employees...')
  
  const employees: any[] = []
  for (let i = 0; i < 5000; i++) {
    employees.push({
      tenant_id: TENANT_ID,
      employee_external_id: `EMP-${i.toString().padStart(5, '0')}`,
      full_name: `Employee ${i}`,
      country_code: i % 2 === 0 ? 'US' : 'GB',
      job_title: 'Software Engineer',
      status: 'ACTIVE'
    })
  }

  const { error: empError } = await supabase.from('employees').insert(employees)
  if (empError) console.error('Error inserting employees:', empError)

  console.log('Done.')
}

generateData()
