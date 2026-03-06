# 🟢 Phase 1: MongoDB Permanent Memory (Today's Plan)

Our goal today is to give the Agent **Permanent Memory**. Right now, if the server restarts, the Agent forgets everything. By connecting MongoDB, the Agent will remember previous conversations, tools used, and user context forever.

## Step-by-Step To-Do List:

### [ ] 1. Get MongoDB Connection String
- Create a free cluster on MongoDB Atlas (or use an existing one).
- Get the Connection String (URI).
- Add `MONGODB_URI="your_connection_string_here"` to the `.env` file.

### [ ] 2. Install Mongoose
- We need to install the Javascript driver for MongoDB.
- Run: `npm install mongoose`

### [ ] 3. Create the Database Connection
- We already have a file for this: `src/database/connection.js`.
- We will write the code to safely connect to MongoDB when the server boots up.

### [ ] 4. Create the Memory Schema (Database Model)
- We will create a new folder: `src/database/models/`
- We will create `ChatSession.js` inside it.
- This schema will define how we store conversations: `User ID` -> `Array of Messages (History)`.

### [ ] 5. Upgrade the Agent's Brain (`gemini.js`)
- We will replace the temporary `activeChats` variable with real database calls.
- When the Agent receives a message, it will pull the user's history from MongoDB.
- When the Agent replies or uses a tool, it will save the new history back to MongoDB.

---
**Goal:** By the end of this phase, you can talk to the bot, restart the server, and the bot will still remember what you were talking about!
