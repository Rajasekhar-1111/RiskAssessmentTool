import sqlite3

conn = sqlite3.connect('riskdb.sqlite')
cursor = conn.cursor()

# Check if modules column exists
cursor.execute("PRAGMA table_info(projects)")
cols = [row[1] for row in cursor.fetchall()]
print("Current project columns:", cols)

if 'modules' not in cols:
    cursor.execute("ALTER TABLE projects ADD COLUMN modules TEXT DEFAULT ''")
    conn.commit()
    print("Added 'modules' column to projects table")
else:
    print("'modules' column already exists")

conn.close()
print("Migration complete!")
