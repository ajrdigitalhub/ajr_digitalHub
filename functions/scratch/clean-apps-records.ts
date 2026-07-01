import { query } from '../src/config/db';

async function run() {
  try {
    const appsRes = await query('SELECT * FROM apps');
    console.log('Relational apps table count:', appsRes.rowCount);

    const recordsRes = await query("SELECT * FROM records WHERE collection = 'apps'");
    console.log('Modular records (collection = apps) count:', recordsRes.rowCount);

    const validIds = appsRes.rows.map(a => a.id);

    // 1. Delete records that are NOT in the relational apps table
    const toDelete = recordsRes.rows.filter(r => !validIds.includes(r.id));
    if (toDelete.length > 0) {
      const deleteIds = toDelete.map(r => r.id);
      await query('DELETE FROM records WHERE collection = \'apps\' AND id = ANY($1)', [deleteIds]);
      console.log(`Deleted ${toDelete.length} out-of-sync modular records.`);
    }

    // 2. Insert records that are in the relational apps table but missing in modular records
    const recordIds = recordsRes.rows.map(r => r.id);
    for (const app of appsRes.rows) {
      if (!recordIds.includes(app.id)) {
        // App is missing in modular records, insert it
        const recordData = {
          name: app.name,
          domain: app.domain,
          api_key: app.api_key,
          status: app.status,
          environment: app.environment,
          cpu_cores: app.cpu_cores,
          memory_mb: app.memory_mb,
          plan: app.plan,
          current_spend: app.current_spend,
          firebase_project_id: app.firebase_project_id,
          created_at: app.created_at,
          updated_at: app.updated_at
        };
        await query(
          'INSERT INTO records (id, collection, data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
          [app.id, 'apps', JSON.stringify(recordData), app.created_at, app.updated_at]
        );
        console.log(`Synced missing app to modular records: ${app.name} (${app.id})`);
      }
    }

    // Double check counts
    const finalRecordsRes = await query("SELECT * FROM records WHERE collection = 'apps'");
    console.log('Final Modular records count:', finalRecordsRes.rowCount);

  } catch (err) {
    console.error('Error running clean script:', err);
  }
  process.exit(0);
}

run();
