const { Client } = require('pg');
const xlsx = require('xlsx');
require('dotenv').config();

const newStudents = [
  ['106', 'Priya', 'Present', '5000', '4000', '1000', 'priya.kumar@gmail.com', '9876543210'],
  ['107', 'Rohan', 'Absent', '5000', '2500', '2500', 'rohan.sharma@gmail.com', '9123456780'],
  ['108', 'Meena', 'Present', '5000', '5000', '0', 'meena.verma@gmail.com', '9988776655'],
  ['109', 'Vikram', 'Present', '5000', '3000', '2000', 'vikram.singh@gmail.com', '9345678123'],
  ['110', 'Kavya', 'Absent', '5000', '1000', '4000', 'kavya.nair@gmail.com', '9456123789'],
  ['111', 'Anil', 'Present', '5000', '5000', '0', 'anil.reddy@gmail.com', '9765432109'],
  ['112', 'Sneha', 'Present', '5000', '4500', '500', 'sneha.menon@gmail.com', '9321456780'],
  ['113', 'Deepak', 'Absent', '5000', '2000', '3000', 'deepak.joshi@gmail.com', '9871203456'],
  ['114', 'Neha', 'Present', '5000', '5000', '0', 'neha.iyer@gmail.com', '9134567890'],
  ['115', 'Karan', 'Present', '5000', '3500', '1500', 'karan.malhotra@gmail.com', '9345678901'],
  ['116', 'Pooja', 'Absent', '5000', '2500', '2500', 'pooja.shah@gmail.com', '9456789012'],
  ['117', 'Sunil', 'Present', '5000', '5000', '0', 'sunil.patel@gmail.com', '9767890123'],
  ['118', 'Tanya', 'Present', '5000', '4000', '1000', 'tanya.rao@gmail.com', '9326789014'],
  ['119', 'Ajay', 'Absent', '5000', '1500', '3500', 'ajay.kapoor@gmail.com', '9878901234'],
  ['120', 'Divya', 'Present', '5000', '5000', '0', 'divya.mishra@gmail.com', '9137890125'],
  ['121', 'Mohan', 'Present', '5000', '3000', '2000', 'mohan.chowdhury@gmail.com', '9347890126'],
  ['122', 'Ritu', 'Absent', '5000', '2000', '3000', 'ritu.banerjee@gmail.com', '9457890127'],
  ['123', 'Suresh', 'Present', '5000', '5000', '0', 'suresh.naidu@gmail.com', '9768901235'],
  ['124', 'Ananya', 'Present', '5000', '4500', '500', 'ananya.gupta@gmail.com', '9328901236'],
  ['125', 'Varun', 'Absent', '5000', '2500', '2500', 'varun.khan@gmail.com', '9879012345'],
  ['126', 'Shreya', 'Present', '5000', '5000', '0', 'shreya.pillai@gmail.com', '9139012346'],
  ['127', 'Manish', 'Present', '5000', '3500', '1500', 'manish.saxena@gmail.com', '9349012347'],
  ['128', 'Aarti', 'Absent', '5000', '1000', '4000', 'aarti.jain@gmail.com', '9459012348'],
  ['129', 'Rohit', 'Present', '5000', '5000', '0', 'rohit.bose@gmail.com', '9760123456'],
  ['130', 'Nisha', 'Present', '5000', '4000', '1000', 'nisha.das@gmail.com', '9320123457']
];

async function updateDb() {
    console.log("Updating Database...");
    const appClient = new Client({
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        password: String(process.env.PGPASSWORD),
        port: process.env.PGPORT,
        database: 'whatsapp_agent',
    });
    await appClient.connect();
    
    // The db currently has 5 rows. Let's insert these 25 new rows.
    for (let row of newStudents) {
        const [studentId, name, attendance, totalFee, feePaid, feeDue, email, phone] = row;
        await appClient.query(
            'INSERT INTO students (record_date, student_id, name, attendance, total_fee, fee_paid, fee_due, email, phone) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            ['2026-01-01', studentId, name, attendance, totalFee, feePaid, feeDue, email, phone]
        );
    }
    console.log("Database updated successfully with 25 new students!");
    await appClient.end();
}

function updateExcel() {
    try {
        console.log("Updating Excel...");
        const workbook = xlsx.readFile('c:/Users/HP/OneDrive/Desktop/whats-web.js/data (1).xlsx');
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to array of arrays to manipulate easily
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Delete all rows except Header (row 0) and the first 5 unique students (rows 1 to 5)
        const cleanedData = data.slice(0, 6);
        
        // Append the 25 new students
        for (let row of newStudents) {
            cleanedData.push(['2026-01-01', row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7]]);
        }
        
        // Convert back to sheet and save
        const newWorksheet = xlsx.utils.aoa_to_sheet(cleanedData);
        workbook.Sheets[sheetName] = newWorksheet;
        xlsx.writeFile(workbook, 'c:/Users/HP/OneDrive/Desktop/whats-web.js/data_updated.xlsx');
        console.log("Excel updated successfully!");
    } catch (e) {
        console.error("Excel update error", e);
    }
}

async function run() {
    updateExcel();
    await updateDb();
}

run();
