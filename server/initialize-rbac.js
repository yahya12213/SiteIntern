import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const initializeRBAC = async () => {
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is not defined');
        process.exit(1);
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('📦 Connected to Railway for RBAC setup...');

        // 1. Create Tables
        console.log('🏗️ Creating RBAC tables...');
        await client.query(`
      DROP TABLE IF EXISTS user_roles CASCADE;
      DROP TABLE IF EXISTS role_permissions CASCADE;
      DROP TABLE IF EXISTS permissions CASCADE;
      DROP TABLE IF EXISTS roles CASCADE;

      CREATE TABLE roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text UNIQUE NOT NULL,
        description text,
        is_system_role boolean DEFAULT false,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );

      CREATE TABLE permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        module text NOT NULL,
        menu text NOT NULL,
        action text NOT NULL,
        code text UNIQUE NOT NULL,
        label text NOT NULL,
        description text,
        sort_order integer DEFAULT 0,
        permission_type text CHECK (permission_type IN ('menu', 'sous_menu', 'page', 'bouton')),
        created_at timestamp DEFAULT now()
      );

      CREATE TABLE role_permissions (
        role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
        permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
        granted_at timestamp DEFAULT now(),
        PRIMARY KEY (role_id, permission_id)
      );

      CREATE TABLE user_roles (
        user_id text REFERENCES profiles(id) ON DELETE CASCADE,
        role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
        assigned_at timestamp DEFAULT now(),
        PRIMARY KEY (user_id, role_id)
      );
    `);

        // 2. Seed Roles
        console.log('🎭 Seeding Roles...');
        const roles = [
            { name: 'Admin', desc: 'Accès complet au système', system: true },
            { name: 'Professeur', desc: 'Gestion des cours et sessions', system: true },
            { name: 'Gérant', desc: 'Gestion administrative locale', system: true }
        ];

        const roleMap = {};
        for (const r of roles) {
            const res = await client.query(
                'INSERT INTO roles (name, description, is_system_role) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id',
                [r.name, r.desc, r.system]
            );
            roleMap[r.name] = res.rows[0].id;
        }

        // 3. Seed Permissions (Essential for Dashboard)
        console.log('🔑 Seeding Permissions...');
        const perms = [
            { code: 'accounting.dashboard.view', label: 'Voir Tableau de Bord', module: 'Comptabilité', menu: 'Dashboard', action: 'view', type: 'page' },
            { code: 'accounting.declarations.create', label: 'Créer Déclaration', module: 'Comptabilité', menu: 'Déclarations', action: 'create', type: 'bouton' },
            { code: 'formation.sessions.view', label: 'Voir Sessions', module: 'Formation', menu: 'Sessions', action: 'view', type: 'page' },
            { code: 'formation.analytics.view', label: 'Voir Analytics', module: 'Formation', menu: 'Analytics', action: 'view', type: 'page' }
        ];

        const permIds = [];
        for (const p of perms) {
            const res = await client.query(
                'INSERT INTO permissions (code, label, module, menu, action, permission_type) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label RETURNING id',
                [p.code, p.label, p.module, p.menu, p.action, p.type]
            );
            permIds.push(res.rows[0].id);
        }

        // 4. Map Permissions to Admin Role
        console.log('🔗 Mapping permissions to Admin...');
        for (const pid of permIds) {
            await client.query(
                'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [roleMap['Admin'], pid]
            );
        }

        // 5. Link Users to Roles
        console.log('👥 Linking users to roles...');
        const users = await client.query("SELECT id, role FROM profiles");
        for (const u of users.rows) {
            let roleName = 'Admin'; // Default fallback
            if (u.role === 'professor') roleName = 'Professeur';
            if (u.role === 'gerant') roleName = 'Gérant';

            await client.query(
                'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [u.id, roleMap[roleName]]
            );
        }

        console.log('✅ RBAC INITIALIZED SUCCESSFULLY!');

    } catch (error) {
        console.error('❌ Error initializing RBAC:', error.message);
    } finally {
        await client.end();
    }
};

initializeRBAC();
