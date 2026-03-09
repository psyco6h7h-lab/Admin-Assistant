const { sendEmailTool, listEmails, readEmail, deleteEmail } = require('../tools/gmailTool');
const { listEvents, createEvent, updateEvent, deleteEvent } = require('../tools/calendarTool');
const { searchFiles, createDriveFile, readFile, updateDriveFile, renameFile, deleteFile, exportDriveFile } = require('../tools/driveTool');
const { getStudentInfo, reportFault, listOpenFaults, listAllStudents, getAttendanceSummary, executeReadOnlyQuery } = require('../tools/databaseTool');
const { webSearch } = require('../tools/webTool');
const { broadcastMessage } = require('../tools/bulkMessageTool');
async function executeTool(toolName, args, originalMsg) {
    let result = '';
    try {
        if (toolName === 'sendEmail') {
            result = await sendEmailTool(args.to, args.subject, args.message);
        } else if (toolName === 'listEmails') {
            result = await listEmails(args.query, args.maxResults);
        } else if (toolName === 'readEmail') {
            result = await readEmail(args.messageId);
        } else if (toolName === 'deleteEmail') {
            result = await deleteEmail(args.messageId);
        } else if (toolName === 'listEvents') {
            result = await listEvents();
        } else if (toolName === 'createEvent') {
            result = await createEvent(args.summary, args.description, args.location, args.startTime, args.endTime);
        } else if (toolName === 'updateEvent') {
            result = await updateEvent(args.eventId, args.summary, args.description, args.location, args.startTime, args.endTime);
        } else if (toolName === 'deleteEvent') {
            result = await deleteEvent(args.eventId);
        } else if (toolName === 'searchFiles') {
            result = await searchFiles(args.query);
        } else if (toolName === 'createDriveFile') {
            result = await createDriveFile(args.name, args.content, args.mimeType);
        } else if (toolName === 'readFile') {
            result = await readFile(args.fileId);
        } else if (toolName === 'updateDriveFile') {
            result = await updateDriveFile(args.fileId, args.content, args.mimeType);
        } else if (toolName === 'renameFile') {
            result = await renameFile(args.fileId, args.newName);
        } else if (toolName === 'deleteFile') {
            result = await deleteFile(args.fileId);
        } else if (toolName === 'exportDriveFile') {
            result = await exportDriveFile(args.fileId, args.mimeType);
        } else if (toolName === 'getStudentInfo') {
            result = await getStudentInfo(args.searchName);
        } else if (toolName === 'reportFault') {
            result = await reportFault(args.description, args.location, args.reportedBy);
        } else if (toolName === 'listOpenFaults') {
            result = await listOpenFaults();
        } else if (toolName === 'listAllStudents') {
            result = await listAllStudents();
        } else if (toolName === 'getAttendanceSummary') {
            result = await getAttendanceSummary();
        } else if (toolName === 'executeReadOnlyQuery') {
            result = await executeReadOnlyQuery(args.sql);
        } else if (toolName === 'webSearch') {
            result = await webSearch(args.query);
        } else if (toolName === 'broadcastMessage') {
            result = await broadcastMessage(args.numbers, args.message);
        } else {
            result = `Error: Tool ${toolName} not found.`;
        }
    } catch (error) {
        result = `Tool Error: ${error.message}`;
    }
    return result;
}

module.exports = { executeTool };
