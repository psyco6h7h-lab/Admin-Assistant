const { google } = require('googleapis');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
);

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

/**
 * Lists upcoming calendar events
 */
async function listEvents() {
    try {
        const res = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime',
        });
        const events = res.data.items;
        if (!events || events.length === 0) {
            return 'No upcoming events found.';
        }

        let output = 'Upcoming events:\n';
        events.map((event, i) => {
            const start = event.start.dateTime || event.start.date;
            output += `- ${start}: ${event.summary} (ID: ${event.id})\n`;
        });
        return output;
    } catch (err) {
        console.error('The API returned an error: ' + err);
        return `Failed to list events: ${err.message}`;
    }
}

/**
 * Creates a Google Calendar event
 */
async function createEvent(summary, description, location, startTime, endTime) {
    try {
        const event = {
            summary: summary,
            location: location,
            description: description,
            start: {
                dateTime: startTime, // Format: '2026-03-05T09:00:00-07:00'
                timeZone: 'Asia/Kolkata',
            },
            end: {
                dateTime: endTime,
                timeZone: 'Asia/Kolkata',
            },
        };

        const res = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
        });

        return `Event created successfully: ${res.data.htmlLink}`;
    } catch (err) {
        console.error('Error creating event: ', err);
        return `Failed to create event: ${err.message}`;
    }
}

/**
 * Updates an existing Google Calendar event
 */
async function updateEvent(eventId, summary, description, location, startTime, endTime) {
    try {
        const event = {};
        if (summary) event.summary = summary;
        if (description) event.description = description;
        if (location) event.location = location;
        if (startTime) event.start = { dateTime: startTime, timeZone: 'Asia/Kolkata' };
        if (endTime) event.end = { dateTime: endTime, timeZone: 'Asia/Kolkata' };

        const res = await calendar.events.patch({
            calendarId: 'primary',
            eventId: eventId,
            resource: event,
        });

        return `Event updated successfully: ${res.data.htmlLink}`;
    } catch (err) {
        return `Failed to update event: ${err.message}`;
    }
}

/**
 * Deletes a Google Calendar event
 */
async function deleteEvent(eventId) {
    try {
        await calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId,
        });
        return `Event deleted successfully.`;
    } catch (err) {
        return `Failed to delete event: ${err.message}`;
    }
}

module.exports = { listEvents, createEvent, updateEvent, deleteEvent };
