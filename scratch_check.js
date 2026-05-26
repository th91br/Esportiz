import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://crwaerhlrzqzxqaijkqc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyd2FlcmhscnpxenhxYWlqa3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Mjc3ODIsImV4cCI6MjA4NzAwMzc4Mn0.xScqfkFgu2Uy9YIRAWIyZks87Ga8Th2P_ON17C2OB88';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkUser() {
  console.log('--- Buscando perfis ---');
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, user_id, organization_id, ct_name, business_type');

  if (pError) {
    console.error('Erro profiles:', pError);
  } else {
    console.log('Perfis encontrados:', JSON.stringify(profiles, null, 2));
  }

  console.log('--- Buscando membros da organizacao ---');
  const { data: members, error: mError } = await supabase
    .from('organization_members')
    .select('id, organization_id, user_id, role, active');

  if (mError) {
    console.error('Erro membros:', mError);
  } else {
    console.log('Membros encontrados:', JSON.stringify(members, null, 2));
  }

  console.log('--- Buscando organizacoes ---');
  const { data: orgs, error: oError } = await supabase
    .from('organizations')
    .select('id, name, owner_user_id');

  if (oError) {
    console.error('Erro organizacoes:', oError);
  } else {
    console.log('Organizacoes encontradas:', JSON.stringify(orgs, null, 2));
  }
}

checkUser();
