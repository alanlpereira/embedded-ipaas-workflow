import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

(globalThis as any).WebSocket = WebSocket;

const url = 'https://wurfruxigmajgnqsyleq.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cmZydXhpZ21hamducXN5bGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjI0MzcsImV4cCI6MjEwMTUzODQzN30.zWo05gnMB4INe27AyGCiR2M2L9q-Yh5enUFecC8Fn10';

const supabase = createClient(url, key);

async function main() {
  const testId = crypto.randomUUID();
  console.log('Testing INSERT on flow_executions with ID:', testId);
  const ins = await supabase.from('flow_executions').insert([{
    id: testId,
    workflow_id: '64705f25-3dda-43df-a4e0-619c0672b6a7',
    status: 'running',
    current_node_id: '4df61531-65d9-42d2-bb53-d5d9134e7952',
    context_data: { test: true },
    started_at: new Date().toISOString()
  }]);
  console.log('Insert error:', ins.error);

  console.log('Testing SELECT on flow_executions...');
  const sel = await supabase.from('flow_executions').select('*').eq('id', testId);
  console.log('Select result error:', sel.error, 'inserted item:', sel.data);

  console.log('Testing Edge Function workflow-worker invocation...');
  const fn = await supabase.functions.invoke('workflow-worker', {
    body: { executionId: testId }
  });
  console.log('Edge Function result error:', fn.error, 'data:', fn.data);
}

main().catch(console.error);
