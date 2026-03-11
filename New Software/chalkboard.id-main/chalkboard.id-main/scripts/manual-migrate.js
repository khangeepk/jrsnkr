const { PGlite } = require('@electric-sql/pglite');
const { NodeFS } = require('@electric-sql/pglite/nodefs');
const os = require('os');
const path = require('path');
const fs = require('fs');

async function migrate() {
    const appName = 'com.jrsnooker.lounge';
    const platform = process.platform;
    let dataDir;

    if (platform === 'win32') {
        dataDir = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), appName, 'data');
    } else if (platform === 'darwin') {
        dataDir = path.join(os.homedir(), 'Library', 'Application Support', appName, 'data');
    } else {
        dataDir = path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), appName, 'data');
    }

    console.log(`Connecting to PGlite at: ${dataDir}`);

    if (!fs.existsSync(dataDir)) {
        console.log('Database directory does not exist yet. No manual migration needed.');
        return;
    }

    const pglite = new PGlite({ fs: new NodeFS(dataDir) });

    try {
        console.log('Adding game_type column...');
        await pglite.exec(`ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS game_type varchar(30) DEFAULT 'single';`);

        console.log('Adding players column...');
        await pglite.exec(`ALTER TABLE table_sessions ADD COLUMN IF NOT EXISTS players text;`);

        console.log('✅ Manual migration successful!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pglite.close();
    }
}

migrate();
