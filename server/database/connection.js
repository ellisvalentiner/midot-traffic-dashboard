const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'storage', 'midot_traffic.db');
let db;

async function initializeDatabase() {
  try {
    // Create database connection
    db = new sqlite3.Database(dbPath);
    
    // Create tables if they don't exist
    await createTables();
    
    console.log('SQLite database connected successfully');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

async function createTables() {
  return new Promise((resolve, reject) => {
    const createCamerasTable = `
      CREATE TABLE IF NOT EXISTS cameras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        camera_id TEXT UNIQUE NOT NULL,
        name TEXT,
        description TEXT,
        latitude REAL,
        longitude REAL,
        direction TEXT,
        road_name TEXT,
        intersection TEXT,
        county TEXT,
        image_url TEXT,
        enabled BOOLEAN DEFAULT 0,
        ai_analysis_enabled BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createImagesTable = `
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        camera_id TEXT NOT NULL,
        image_url TEXT,
        local_path TEXT,
        image_hash TEXT,
        previous_hash TEXT,
        has_changed BOOLEAN DEFAULT 0,
        captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (camera_id) REFERENCES cameras(camera_id)
      );
    `;

    const createVehicleDetectionsTable = `
      CREATE TABLE IF NOT EXISTS vehicle_detections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_id INTEGER NOT NULL,
        camera_id TEXT NOT NULL,
        total_vehicles INTEGER DEFAULT 0,
        cars INTEGER DEFAULT 0,
        trucks INTEGER DEFAULT 0,
        motorcycles INTEGER DEFAULT 0,
        buses INTEGER DEFAULT 0,
        rvs INTEGER DEFAULT 0,
        emergency_vehicles INTEGER DEFAULT 0,
        construction_vehicles INTEGER DEFAULT 0,
        other_vehicles INTEGER DEFAULT 0,
        confidence_score REAL DEFAULT 0.0,
        gemini_response TEXT,
        processing_status TEXT DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        last_retry_at DATETIME,
        processed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (image_id) REFERENCES images(id),
        FOREIGN KEY (camera_id) REFERENCES cameras(camera_id)
      );
    `;

    const createVehicleBoundingBoxesTable = `
      CREATE TABLE IF NOT EXISTS vehicle_bounding_boxes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_detection_id INTEGER NOT NULL,
        image_id INTEGER NOT NULL,
        vehicle_type TEXT NOT NULL,
        x_min REAL NOT NULL,
        y_min REAL NOT NULL,
        x_max REAL NOT NULL,
        y_max REAL NOT NULL,
        confidence_score REAL DEFAULT 0.0,
        is_valid BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_detection_id) REFERENCES vehicle_detections(id),
        FOREIGN KEY (image_id) REFERENCES images(id)
      );
    `;

    db.serialize(() => {
      db.run(createCamerasTable, (err) => {
        if (err) {
          console.error('Error creating cameras table:', err);
          reject(err);
          return;
        }
        
        db.run(createImagesTable, (err) => {
          if (err) {
            console.error('Error creating images table:', err);
            reject(err);
            return;
          }

          db.run(createVehicleDetectionsTable, (err) => {
            if (err) {
              console.error('Error creating vehicle_detections table:', err);
              reject(err);
              return;
            }
            
            db.run(createVehicleBoundingBoxesTable, (err) => {
              if (err) {
                console.error('Error creating vehicle_bounding_boxes table:', err);
                reject(err);
                return;
              }
              
                          // Run migrations for existing databases
            runMigrations().then(() => {
              // Fix existing image paths
              return fixImagePaths();
            }).then(() => {
              console.log('Database tables created successfully');
              resolve();
            }).catch(reject);
            });
          });
        });
      });
    });
  });
}

async function runMigrations() {
  return new Promise((resolve, reject) => {
    const migrations = [
      'ALTER TABLE cameras ADD COLUMN intersection TEXT',
      'ALTER TABLE cameras ADD COLUMN image_url TEXT',
      'ALTER TABLE cameras ADD COLUMN ai_analysis_enabled BOOLEAN DEFAULT 0',
      'ALTER TABLE vehicle_bounding_boxes ADD COLUMN is_valid BOOLEAN DEFAULT 1'
    ];
    
    let completed = 0;
    
    migrations.forEach((migration, index) => {
      db.run(migration, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error(`Migration ${index + 1} failed:`, err);
        } else if (!err) {
          console.log(`Migration ${index + 1} completed successfully`);
        }
        
        completed++;
        if (completed === migrations.length) {
          resolve();
        }
      });
    });
  });
}

// Fix existing image paths to use only filenames
async function fixImagePaths() {
  return new Promise((resolve, reject) => {
    // Get all images with full paths
    db.all("SELECT id, local_path FROM images WHERE local_path LIKE '%/%'", (err, rows) => {
      if (err) {
        console.error('Error checking image paths:', err);
        resolve(); // Continue even if this fails
        return;
      }
      
      if (rows.length === 0) {
        console.log('No image path fixes needed');
        resolve();
        return;
      }
      
      console.log(`Found ${rows.length} images with full paths, fixing...`);
      
      let completed = 0;
      rows.forEach(row => {
        const filename = row.local_path.split('/').pop();
        db.run("UPDATE images SET local_path = ? WHERE id = ?", [filename, row.id], (err) => {
          if (err) {
            console.error(`Error fixing path for image ${row.id}:`, err);
          } else {
            console.log(`Fixed path for image ${row.id}: ${filename}`);
          }
          
          completed++;
          if (completed === rows.length) {
            console.log('Image path fixes completed');
            resolve();
          }
        });
      });
    });
  });
}

// Helper function to run queries
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Helper function to run single queries
function runSingle(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Helper function to run insert/update/delete
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

module.exports = {
  db,
  initializeDatabase,
  createTables,
  runQuery,
  runSingle,
  run
};
