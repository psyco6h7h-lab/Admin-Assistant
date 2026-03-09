const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool for our PostgreSQL database
const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    password: String(process.env.PGPASSWORD),
    port: process.env.PGPORT,
    database: 'whatsapp_agent',
});

// Test the connection pool
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error acquiring client for PostgreSQL pool', err.stack);
    } else {
        console.log('PostgreSQL Connected Successfully!');
    }
    if (client) release();
});

/**
 * Searches the database for a student by name.
 * @param {string} searchName - The name (or partial name) to search for
 */
async function getStudentInfo(searchName) {
    try {
        const query = 'SELECT * FROM students WHERE name ILIKE $1 ORDER BY record_date DESC LIMIT 5';
        const values = [`%${searchName}%`]; // ILIKE + % allows case-insensitive partial matches
        
        const res = await pool.query(query, values);
        
        if (res.rows.length === 0) {
            return `No student found matching the name "${searchName}".`;
        }
        
        let output = `Found ${res.rows.length} record(s) matching "${searchName}":\n`;
        res.rows.forEach(record => {
            const dateStr = record.record_date || 'Unknown Date';
            output += `\n[${dateStr}] Name: ${record.name}\n`;
            output += `Attendance: ${record.attendance} | Phone: ${record.phone} | Email: ${record.email}\n`;
            output += `Fees - Total: ${record.total_fee}, Paid: ${record.fee_paid}, Due: ${record.fee_due}\n`;
        });
        
        return output;
    } catch (err) {
        return `Database Error searching for student: ${err.message}`;
    }
}

/**
 * Saves a new fault report into the database.
 * @param {string} description - What is broken
 * @param {string} location - Where it is broken
 * @param {string} reportedBy - Name/Phone of the person reporting
 */
async function reportFault(description, location, reportedBy) {
    try {
        const query = `
            INSERT INTO faults (description, location, reported_by) 
            VALUES ($1, $2, $3) RETURNING id
        `;
        const values = [description, location, reportedBy || 'Unknown User'];
        
        const res = await pool.query(query, values);
        
        return `Fault successfully reported! Ticket ID: #${res.rows[0].id}`;
    } catch (err) {
        return `Database Error reporting fault: ${err.message}`;
    }
}

/**
 * Lists all currently open fault reports.
 */
async function listOpenFaults() {
    try {
        const query = "SELECT * FROM faults WHERE status = 'Open' ORDER BY created_at DESC";
        const res = await pool.query(query);
        
        if (res.rows.length === 0) {
            return "There are currently no open faults. Everything is working perfectly!";
        }
        
        let output = `There are ${res.rows.length} open fault(s):\n\n`;
        res.rows.forEach(fault => {
            // Format the date simply
            const dateStr = fault.created_at ? new Date(fault.created_at).toLocaleDateString() : 'Unknown Date';
            output += `[Ticket #${fault.id}] - ${fault.location}\nIssue: ${fault.description}\nReported By: ${fault.reported_by} on ${dateStr}\n\n`;
        });
        
        return output;
    } catch (err) {
        return `Database Error listing faults: ${err.message}`;
    }
}

/**
 * Lists all students in the database (up to 50 for readability).
 */
async function listAllStudents() {
    try {
        const query = "SELECT DISTINCT name, student_id FROM students LIMIT 50";
        const res = await pool.query(query);
        
        if (res.rows.length === 0) {
            return "There are no students in the database yet.";
        }
        
        let output = `Here are the distinct students in the database:\n\n`;
        res.rows.forEach(student => {
            output += `- ID: ${student.student_id} | Name: ${student.name}\n`;
        });
        
        return output;
    } catch (err) {
        return `Database Error listing students: ${err.message}`;
    }
}

/**
 * Calculates the total number of present and absent students.
 */
async function getAttendanceSummary() {
    try {
        const query = "SELECT attendance, COUNT(*) as count FROM students GROUP BY attendance";
        const res = await pool.query(query);
        
        let output = "Attendance Summary for all students:\n";
        let total = 0;
        res.rows.forEach(row => {
            const status = row.attendance || 'Unknown';
            const count = parseInt(row.count) || 0;
            output += `- ${status}: ${count}\n`;
            total += count;
        });
        output += `\nTotal Records: ${total}`;
        return output;
    } catch (err) {
        return `Database Error aggregating attendance: ${err.message}`;
    }
}

/**
 * Allows the AI to execute arbitrary real-time SQL queries for unlimited reading and calculation.
 * STRICTLY blocks any modifying commands (INSERT, UPDATE, DELETE).
 * @param {string} sql - The SQL query to execute
 */
async function executeReadOnlyQuery(sql) {
    try {
        const uppercaseSql = sql.toUpperCase();
        // Safety lock: Only allow SELECT queries
        if (uppercaseSql.includes('INSERT') || uppercaseSql.includes('UPDATE') || 
            uppercaseSql.includes('DELETE') || uppercaseSql.includes('DROP') || 
            uppercaseSql.includes('ALTER') || uppercaseSql.includes('TRUNCATE')) {
            return "Execution Rejected: You are only allowed to run SELECT queries to read data. No modifications allowed.";
        }

        const res = await pool.query(sql);
        
        if (res.rows.length === 0) {
            return "The query was successful, but returned 0 rows.";
        }
        
        // Limit output to prevent crashing the agent's context window with thousands of rows
        const maxRows = 50;
        let output = `Query returned ${res.rows.length} row(s). `;
        output += res.rows.length > maxRows ? `Showing first ${maxRows}:\n\n` : `Data:\n\n`;
        
        const displayRows = res.rows.slice(0, maxRows);
        displayRows.forEach((row, index) => {
            output += `Row ${index + 1}: ${JSON.stringify(row)}\n`;
        });
        
        return output;
    } catch (err) {
        return `Database Error executing custom SQL: ${err.message}`;
    }
}

module.exports = {
    pool,
    getStudentInfo,
    reportFault,
    listOpenFaults,
    listAllStudents,
    getAttendanceSummary,
    executeReadOnlyQuery
};
