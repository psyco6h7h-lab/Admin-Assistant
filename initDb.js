const { Client } = require('pg');
const xlsx = require('xlsx');
require('dotenv').config();

async function initDB() {
    console.log("Connecting to default 'postgres' database to ensure 'whatsapp_agent' exists...");
    
    // Connect to the default 'postgres' database first just to create our specific database
    const setupClient = new Client({
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        password: String(process.env.PGPASSWORD),
        port: process.env.PGPORT,
        database: 'postgres', 
    });

    try {
        await setupClient.connect();
        const res = await setupClient.query("SELECT datname FROM pg_catalog.pg_database WHERE datname = 'whatsapp_agent'");
        
        if (res.rowCount === 0) {
            console.log("Database 'whatsapp_agent' not found, creating it now...");
            await setupClient.query('CREATE DATABASE whatsapp_agent');
            console.log("Database created successfully!");
        } else {
            console.log("Database 'whatsapp_agent' already exists.");
        }
    } catch (err) {
        console.error("Error creating database:", err);
    } finally {
        await setupClient.end();
    }

    // Now connect to our actual application database
    console.log("\nConnecting to 'whatsapp_agent' database to create tables and insert data...");
    const appClient = new Client({
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        password: String(process.env.PGPASSWORD),
        port: process.env.PGPORT,
        database: 'whatsapp_agent',
    });

    try {
        await appClient.connect();

        console.log("Dropping existing 'students' table to re-import data correctly...");
        await appClient.query('DROP TABLE IF EXISTS students CASCADE');

        console.log("Creating 'students' table...");
        await appClient.query(`
            CREATE TABLE IF NOT EXISTS students (
                id SERIAL PRIMARY KEY,
                record_date VARCHAR(50),
                student_id VARCHAR(50),
                name VARCHAR(255) NOT NULL,
                attendance VARCHAR(50),
                total_fee VARCHAR(50),
                fee_paid VARCHAR(50),
                fee_due VARCHAR(50),
                email VARCHAR(255),
                phone VARCHAR(50)
            );
        `);

        console.log("Creating 'faults' table if it doesn't exist...");
        await appClient.query(`
            CREATE TABLE IF NOT EXISTS faults (
                id SERIAL PRIMARY KEY,
                description TEXT NOT NULL,
                location VARCHAR(255),
                status VARCHAR(50) DEFAULT 'Open',
                reported_by VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Tables created successfully!\n");

        console.log("Parsing 'c:/Users/HP/OneDrive/Desktop/whats-web.js/data (1).xlsx' for seed data...");
        const workbook = xlsx.readFile('c:/Users/HP/OneDrive/Desktop/whats-web.js/data (1).xlsx');
        
        const sheetNameList = workbook.SheetNames;
        console.log(`Found sheets: ${sheetNameList.join(', ')}`);
        
        // We assume the first sheet holds student/general data
        if (sheetNameList.length > 0) {
            const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNameList[0]]);
            console.log(`Found ${data.length} rows in the first sheet. Processing...`);
            
            for (let row of data) {
                // Read from exact columns seen in the screenshot
                const recordDate = row['Date'] || '';
                const studentId = row['Student_ID'] || '';
                const name = row['Student_Name'] || '';
                const attendance = row['Attendance (Present/Absent)'] || row['Attendance'] || '';
                const totalFee = row['Total_Fee'] || '';
                const feePaid = row['Fee_Paid'] || '';
                const feeDue = row['Fee_Due'] || '';
                const email = row['Email_id'] || '';
                const phone = row['numbers'] || 'Not Provided';
                
                if (name) {
                    // We purposefully DO NOT check for duplicates anymore so we can see attendance on different days
                    // Insert into DB
                    await appClient.query(
                        'INSERT INTO students (record_date, student_id, name, attendance, total_fee, fee_paid, fee_due, email, phone) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                        [String(recordDate).trim(), String(studentId).trim(), String(name).trim(), String(attendance).trim(), String(totalFee).trim(), String(feePaid).trim(), String(feeDue).trim(), String(email).trim(), String(phone).trim()]
                    );
                }
            }
            console.log("Student seeding from Excel complete!");
        }

        // Add one dummy fault if none exist
        const faultRes = await appClient.query("SELECT COUNT(*) FROM faults");
        if (parseInt(faultRes.rows[0].count) === 0) {
            console.log("Seeding one dummy fault report...");
            await appClient.query(
                "INSERT INTO faults (description, location, reported_by) VALUES ($1, $2, $3)",
                ['Projector bulb is blown and needs immediate replacement', 'Room 101', 'Admin System']
            );
        }

        console.log("\n✅ Database Initialization 100% Complete!");

    } catch (err) {
        console.error("App Client Error:", err);
    } finally {
        await appClient.end();
    }
}

initDB();
