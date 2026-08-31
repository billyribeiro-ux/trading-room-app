/**
 * The Sessions API reference, extracted verbatim from `evidence-dumps/login-page/api-docs` —
 * the served DOM of the reference's own documentation page.
 *
 * Kept as the captured markup rather than retyped as prose: it is a reference
 * document, and paraphrasing one is how endpoint names and parameters drift out
 * of step with the API they describe. It is rendered through the same allowlist
 * sanitiser the landing-page editor uses, so this file being edited by hand
 * cannot introduce script into the page.
 *
 * Regenerate: `node scripts/extract-api-docs.mjs` — **which is not in this repository and never has
 * been.** `git log --all` finds no commit that ever added it under any path, and `scripts/` here is
 * fully tracked (0 untracked, 0 tracked-but-absent), so it is not an eviction like
 * `apps/room/scripts/`. Measured 2026-08-31 rather than assumed. The generated HTML below is the
 * artifact; regenerating it needs the generator restored or rewritten, and until then this line is a
 * record of provenance and not an instruction anybody can follow.
 */
export const API_DOCS_HTML = `<h1>Sessions API Documentation</h1>
<h2>Overview</h2>
<p>The Sessions API provides endpoints for managing trading room sessions, including user management, statistics, and logs retrieval. All endpoints require API key authentication and are rate-limited to 1 request per second per command.</p>
<p><strong>Base URL:</strong> <code>https://ptrv3.protradingroom.com/stats/v1</code></p>
<h2>Authentication</h2>
<p>All API requests require the following query parameters:</p>
<ul>
<li><code>apiKey</code>: Your API key identifier</li>
<li><code>apiSecret</code>: Your API secret for authentication</li>
</ul>
<h2>Rate Limiting</h2>
<ul>
<li><strong>Limit:</strong> 1 request per second per command</li>
<li><strong>Response:</strong> 429 status code with error message if exceeded</li>
</ul>
<h2>Endpoints</h2>
<h3>1. Delete Users from Session</h3>
<p><strong>POST</strong> <code>/sessions/delUsers</code></p>
<p>Removes users from a session and unsubscribes them from FCM alerts.</p>
<h4>Request Parameters</h4>
<p><strong>Query Parameters:</strong></p>
<ul>
<li><code>apiKey</code> (required): Your API key</li>
<li><code>apiSecret</code> (required): Your API secret  </li>
<li><code>sessionID</code> (required): The session ID to remove users from</li>
</ul>
<p><strong>Request Body:</strong></p>
<pre><code class="language-json">{
  "delUsers": ["user1@example.com", "user2@example.com"]
}
</code></pre>
<h4>Example Request</h4>
<pre><code class="language-bash">curl --location 'https://ptrv3.protradingroom.com/stats/v1/sessions/delUsers?apiKey=xxxxyyyyzzzz&amp;apiSecret=xxxxyyyyzzzz&amp;sessionID=111222333444' \\
--header 'Content-Type: application/json' \\
--data-raw '{"delUsers": ["user1@example.com","user2@example.com"]}'
</code></pre>
<h4>Response</h4>
<pre><code class="language-json">{
  "success": true,
  "deletedUsers": ["user1@example.com", "user2@example.com"]
}
</code></pre>
<h4>Error Responses</h4>
<ul>
<li><code>403</code>: Invalid API credentials or disabled API</li>
<li><code>429</code>: Rate limit exceeded</li>
<li><code>400</code>: No users provided for deletion</li>
<li><code>400</code>: Invalid session</li>
</ul>
<hr>
<h3>2. Add Users to Session</h3>
<p><strong>POST</strong> <code>/sessions/addUsers</code></p>
<p>Adds new users to a session or updates existing users' activity timestamps.</p>
<h4>Request Parameters</h4>
<p><strong>Query Parameters:</strong></p>
<ul>
<li><code>apiKey</code> (required): Your API key</li>
<li><code>apiSecret</code> (required): Your API secret</li>
<li><code>sessionID</code> (required): The session ID to add users to</li>
</ul>
<p><strong>Request Body:</strong></p>
<pre><code class="language-json">{
  "users": [
    {
      "email": "user3@example.com",
      "name": "User One"
    },
    {
      "email": "user4@example.com",
      "name": "User Two"
    }
  ]
}
</code></pre>
<h4>Example Request</h4>
<pre><code class="language-bash">curl --location 'https://ptrv3.protradingroom.com/stats/v1/sessions/addUsers?apiKey=xxxxyyyyzzzz&amp;apiSecret=xxxxyyyyzzzz&amp;sessionID=111222333444' \\
--header 'Content-Type: application/json' \\
--data-raw '{"users": [{"email": "user3@example.com", "name": "User One"}]}'
</code></pre>
<h4>Response</h4>
<pre><code class="language-json">{
  "success": true,
  "added": 1,
  "freshen": 0
}
</code></pre>
<h4>Error Responses</h4>
<ul>
<li><code>403</code>: Invalid API credentials or disabled API</li>
<li><code>429</code>: Rate limit exceeded</li>
<li><code>400</code>: Invalid session</li>
</ul>
<hr>
<h3>3. List Sessions</h3>
<p><strong>GET</strong> <code>/sessions/list</code></p>
<p>Retrieves a list of all sessions owned by the API user.</p>
<h4>Request Parameters</h4>
<p><strong>Query Parameters:</strong></p>
<ul>
<li><code>apiKey</code> (required): Your API key</li>
<li><code>apiSecret</code> (required): Your API secret</li>
</ul>
<h4>Example Request</h4>
<pre><code class="language-bash">curl --location 'https://ptrv3.protradingroom.com/stats/v1/sessions/list?apiKey=xxxxyyyyzzzz&amp;apiSecret=xxxxyyyyzzzz'
</code></pre>
<h4>Response</h4>
<pre><code class="language-json">{
  "success": true,
  "sessions": [
    {
      "_id": "111222333444",
      "uuid": "session-uuid",
      "name": "Trading Room 1",
      "currentState": "active",
      "current_capacity": 25,
      "current_max": 100,
      "modCount": 3,
      "recordedMaxCapacity": 150,
      "created": "2023-01-01T00:00:00.000Z",
      "updated": "2023-01-01T12:00:00.000Z",
      "s3Bucket": "bucket-name",
      "s3BucketFolderPath": "/path/to/folder",
      "isMainRoom": true,
      "recPreviewLocation": "/preview/location",
      "media": [
        {
          "mediaType": "video",
          "mediaValue": "stream-url"
        }
      ],
      "recording": false
    }
  ]
}
</code></pre>
<hr>
<h3>4. Get User Statistics</h3>
<p><strong>GET</strong> <code>/sessions/userstats</code></p>
<p>Retrieves user statistics for a specific session within a date range.</p>
<h4>Request Parameters</h4>
<p><strong>Query Parameters:</strong></p>
<ul>
<li><code>apiKey</code> (required): Your API key</li>
<li><code>apiSecret</code> (required): Your API secret</li>
<li><code>sessionID</code> (required): The session ID</li>
<li><code>fromDate</code> (optional): Start date for filtering (ISO format)</li>
<li><code>toDate</code> (optional): End date for filtering (ISO format)</li>
<li><code>isMobile</code> (optional): Filter for mobile users only</li>
</ul>
<h4>Example Request</h4>
<pre><code class="language-bash">curl --location 'https://ptrv3.protradingroom.com/stats/v1/sessions/userstats?apiKey=xxxxyyyyzzzz&amp;apiSecret=xxxxyyyyzzzz&amp;sessionID=111222333444&amp;fromDate=2023-01-01&amp;toDate=2023-01-31'
</code></pre>
<h4>Response</h4>
<pre><code class="language-json">{
  "success": true,
  "userstats": [
    {
      "email": "user@example.com",
      "userName": "username",
      "uuid": "user-uuid",
      "ip": "192.168.1.1",
      "inTime": "2023-01-01T10:00:00.000Z",
      "outTime": "2023-01-01T12:00:00.000Z",
      "duration": 7200000,
      "isMobile": false
    }
  ]
}
</code></pre>
<hr>
<h3>5. Get Session Users</h3>
<p><strong>GET</strong> <code>/sessions/users</code></p>
<p>Retrieves all users for a specific session with their activity status.</p>
<h4>Request Parameters</h4>
<p><strong>Query Parameters:</strong></p>
<ul>
<li><code>apiKey</code> (required): Your API key</li>
<li><code>apiSecret</code> (required): Your API secret</li>
<li><code>sessionID</code> (required): The session ID</li>
</ul>
<h4>Example Request</h4>
<pre><code class="language-bash">curl --location 'https://ptrv3.protradingroom.com/stats/v1/sessions/users?apiKey=xxxxyyyyzzzz&amp;apiSecret=xxxxyyyyzzzz&amp;sessionID=111222333444'
</code></pre>
<h4>Response</h4>
<pre><code class="language-json">{
  "success": true,
  "users": [
    {
      "_id": "user-id",
      "email": "user@example.com",
      "userName": "username",
      "role": 2,
      "lastLogin": "2023-01-01T10:00:00.000Z",
      "name": "User Name",
      "created": "2023-01-01T00:00:00.000Z",
      "updated": "2023-01-01T12:00:00.000Z",
      "alerterAppFCMUserOff": false,
      "alerterAppTokens": ["fcm-token-1", "fcm-token-2"],
      "activeDateAPI": "2023-01-01T12:00:00.000Z",
      "active": true
    }
  ]
}
</code></pre>
<hr>
<h3>6. Get Chat Logs</h3>
<p><strong>GET</strong> <code>/sessions/chatlogs</code></p>
<p>Retrieves chat logs for a specific session and channel.</p>
<h4>Request Parameters</h4>
<p><strong>Query Parameters:</strong></p>
<ul>
<li><code>apiKey</code> (required): Your API key</li>
<li><code>apiSecret</code> (required): Your API secret</li>
<li><code>sessionID</code> (required): The session ID</li>
<li><code>channel</code> (optional): Chat channel name (default: "main")</li>
<li><code>fromDate</code> (optional): Start date for filtering (ISO format)</li>
<li><code>toDate</code> (optional): End date for filtering (ISO format)</li>
</ul>
<h4>Example Request</h4>
<pre><code class="language-bash">curl --location 'https://ptrv3.protradingroom.com/stats/v1/sessions/chatlogs?apiKey=xxxxyyyyzzzz&amp;apiSecret=xxxxyyyyzzzz&amp;sessionID=111222333444&amp;channel=main&amp;fromDate=2023-01-01&amp;toDate=2023-01-31'
</code></pre>
<h4>Response</h4>
<pre><code class="language-json">{
  "success": true,
  "chatlogs": [
    {
      "sessionID": "111222333444",
      "c": "main",
      "t": "2023-01-01T10:00:00.000Z",
      "u": "user@example.com",
      "m": "Hello world!"
    }
  ]
}
</code></pre>
<hr>
<h3>7. Get Alert Logs</h3>
<p><strong>GET</strong> <code>/sessions/alertlogs</code></p>
<p>Retrieves alert logs for a specific session.</p>
<h4>Request Parameters</h4>
<p><strong>Query Parameters:</strong></p>
<ul>
<li><code>apiKey</code> (required): Your API key</li>
<li><code>apiSecret</code> (required): Your API secret</li>
<li><code>sessionID</code> (required): The session ID</li>
<li><code>fromDate</code> (optional): Start date for filtering (ISO format)</li>
<li><code>toDate</code> (optional): End date for filtering (ISO format)</li>
</ul>
<h4>Example Request</h4>
<pre><code class="language-bash">curl --location 'https://ptrv3.protradingroom.com/stats/v1/sessions/alertlogs?apiKey=xxxxyyyyzzzz&amp;apiSecret=xxxxyyyyzzzz&amp;sessionID=111222333444&amp;fromDate=2023-01-01&amp;toDate=2023-01-31'
</code></pre>
<h4>Response</h4>
<pre><code class="language-json">{
  "success": true,
  "chatlogs": [
    {
      "sessionID": "111222333444",
      "t": "2023-01-01T10:00:00.000Z",
      "alertType": "price",
      "message": "Price alert triggered"
    }
  ]
}
</code></pre>
<hr>
<h3>8. Get Deleted Logs</h3>
<p><strong>GET</strong> <code>/sessions/deletedlogs</code></p>
<p>Retrieves deleted message logs for a specific session.</p>
<h4>Request Parameters</h4>
<p><strong>Query Parameters:</strong></p>
<ul>
<li><code>apiKey</code> (required): Your API key</li>
<li><code>apiSecret</code> (required): Your API secret</li>
<li><code>sessionID</code> (required): The session ID</li>
<li><code>logType</code> (optional): Type of log ("alerts" or "chat")</li>
<li><code>eventType</code> (optional): Event type ("E" for edit, "D" for delete)</li>
<li><code>fromDate</code> (optional): Start date for filtering (ISO format)</li>
<li><code>toDate</code> (optional): End date for filtering (ISO format)</li>
</ul>
<h4>Example Request</h4>
<pre><code class="language-bash">curl --location 'https://ptrv3.protradingroom.com/stats/v1/sessions/deletedlogs?apiKey=xxxxyyyyzzzz&amp;apiSecret=xxxxyyyyzzzz&amp;sessionID=111222333444&amp;logType=chat&amp;eventType=D'
</code></pre>
<h4>Response</h4>
<pre><code class="language-json">{
  "success": true,
  "deletedlogs": [
    {
      "sessionID": "111222333444",
      "logType": "chat",
      "eventType": "D",
      "time": "2023-01-01T10:00:00.000Z",
      "originalMessage": "Deleted message content"
    }
  ]
}
</code></pre>
<hr>
<h3>9. Get Archived Logs</h3>
<p><strong>GET</strong> <code>/sessions/archivedlogs</code></p>
<p>Retrieves archived logs for a specific session.</p>
<h4>Request Parameters</h4>
<p><strong>Query Parameters:</strong></p>
<ul>
<li><code>apiKey</code> (required): Your API key</li>
<li><code>apiSecret</code> (required): Your API secret</li>
<li><code>sessionID</code> (required): The session ID</li>
<li><code>logType</code> (optional): Type of log ("alerts" or "chat", default: "chat")</li>
<li><code>channel</code> (optional): Chat channel name (default: "main")</li>
<li><code>fromDate</code> (optional): Start date for filtering (ISO format)</li>
<li><code>toDate</code> (optional): End date for filtering (ISO format)</li>
</ul>
<h4>Example Request</h4>
<pre><code class="language-bash">curl --location 'https://ptrv3.protradingroom.com/stats/v1/sessions/archivedlogs?apiKey=xxxxyyyyzzzz&amp;apiSecret=xxxxyyyyzzzz&amp;sessionID=111222333444&amp;logType=chat&amp;channel=main'
</code></pre>
<h4>Response</h4>
<pre><code class="language-json">{
  "success": true,
  "archivedlogs": [
    {
      "sessionID": "111222333444",
      "logType": "chat",
      "channel": "main",
      "updated": "2023-01-01T10:00:00.000Z",
      "content": "Archived message content"
    }
  ]
}
</code></pre>
<hr>
<h3>10. Get Session Recordings</h3>
<p><strong>GET</strong> <code>/sessions/recordings</code></p>
<p>Retrieves recording files for a specific session from the last 3 weeks.</p>
<h4>Request Parameters</h4>
<p><strong>Query Parameters:</strong></p>
<ul>
<li><code>apiKey</code> (required): Your API key</li>
<li><code>apiSecret</code> (required): Your API secret</li>
<li><code>sessionID</code> (required): The session ID</li>
</ul>
<h4>Example Request</h4>
<pre><code class="language-bash">curl --location 'https://ptrv3.protradingroom.com/stats/v1/sessions/recordings?apiKey=xxxxyyyyzzzz&amp;apiSecret=xxxxyyyyzzzz&amp;sessionID=111222333444'
</code></pre>
<h4>Response</h4>
<pre><code class="language-json">{
  "success": true,
  "recordings": [
    {
      "_id": "recording-id",
      "sessionID": "111222333444",
      "name": "recording-name.mp4",
      "namemkv": "recording-name.mkv",
      "contentType": "mp4",
      "created": "2023-01-01T10:00:00.000Z",
      "duration": 120,
      "length": 7200000,
      "fpath": "/path/to/recording",
      "media_server": "media.server.com",
      "vidPath": "https://media.server.com/path/to/recording",
      "ms": "media.server.com",
      "isUpload": false
    }
  ]
}
</code></pre>
<h4>Response Fields</h4>
<ul>
<li><code>recordings</code>: Array of recording objects<ul>
<li><code>_id</code>: Unique recording identifier</li>
<li><code>sessionID</code>: The session ID this recording belongs to</li>
<li><code>name</code>: Recording filename with extension</li>
<li><code>namemkv</code>: Original MKV filename (for MP4 recordings)</li>
<li><code>contentType</code>: File format (mp4, webm, etc.)</li>
<li><code>created</code>: Recording creation timestamp</li>
<li><code>duration</code>: Duration in minutes</li>
<li><code>length</code>: Duration in milliseconds</li>
<li><code>fpath</code>: File path on media server</li>
<li><code>media_server</code>: Media server hostname</li>
<li><code>vidPath</code>: Full HTTPS URL to the recording</li>
<li><code>ms</code>: Media server identifier</li>
<li><code>isUpload</code>: Boolean indicating if this is an uploaded file</li>
</ul>
</li>
</ul>
<h4>Notes</h4>
<ul>
<li>Only returns recordings from the last 3 weeks</li>
<li>Results are sorted by creation date (newest first)</li>
<li>Returns empty array if no recordings found</li>
<li>Upload files have duration set to 0</li>
<li>Video files include both original MKV and processed format names</li>
</ul>
<h4>Error Responses</h4>
<ul>
<li><code>403</code>: Invalid API credentials or disabled API</li>
<li><code>429</code>: Rate limit exceeded</li>
<li><code>400</code>: Invalid session</li>
</ul>
<hr>
<h3>11. Clone Session</h3>
<p><strong>GET</strong> <code>/sessions/cloneSession</code></p>
<p>Creates a copy of an existing session. The clone inherits all settings from the source session, is assigned a new unique UUID, and has all presenter-role user cross-references duplicated. The API key must own the source session.</p>
<h4>Request Parameters</h4>
<p><strong>Query Parameters:</strong></p>
<ul>
<li><code>apiKey</code> (required): Your API key</li>
<li><code>apiSecret</code> (required): Your API secret</li>
<li><code>sessionID</code> (required): The ID of the session to clone</li>
<li><code>name</code> (required): The name to assign to the new cloned session</li>
</ul>
<h4>Example Request</h4>
<pre><code class="language-bash">curl --location 'https://protradingroom.com/stats/v1/sessions/cloneSession?apiKey=xxxxyyyyzzzz&amp;apiSecret=xxxxyyyyzzzz&amp;sessionID=111222333444&amp;name=My+Cloned+Room'
</code></pre>
<h4>Response</h4>
<pre><code class="language-json">{
  "success": true,
  "session": {
    "_id": "555666777888",
    "uuid": 42,
    "name": "My Cloned Room",
    "isClonedRoom": true,
    "clonedFrom": "111222333444",
    "ownerdID": "owner-user-id",
    "currentState": "inactive",
    "created": "2023-06-01T10:00:00.000Z",
    "updated": "2023-06-01T10:00:00.000Z"
  }
}
</code></pre>
<h4>Response Fields</h4>
<ul>
<li><code>session</code>: The newly created session object<ul>
<li><code>_id</code>: Unique identifier for the new session</li>
<li><code>uuid</code>: Auto-incremented numeric room identifier</li>
<li><code>name</code>: The name provided in the request</li>
<li><code>isClonedRoom</code>: Always <code>true</code> for cloned sessions</li>
<li><code>clonedFrom</code>: The <code>_id</code> of the source session</li>
<li>All other fields are inherited from the source session</li>
</ul>
</li>
</ul>
<h4>Error Responses</h4>
<ul>
<li><code>403</code>: Invalid API credentials, disabled API, or session not allowed for this API key</li>
<li><code>429</code>: Rate limit exceeded</li>
<li><code>400</code>: Invalid session (not found or not owned by this API key)</li>
</ul>
<h2>Error Codes</h2>
<table>
<thead>
<tr>
<th>Status Code</th>
<th>Description</th>
</tr>
</thead>
<tbody><tr>
<td>200</td>
<td>Success</td>
</tr>
<tr>
<td>400</td>
<td>Bad Request - Invalid parameters or session</td>
</tr>
<tr>
<td>403</td>
<td>Forbidden - Invalid API credentials or disabled API</td>
</tr>
<tr>
<td>429</td>
<td>Too Many Requests - Rate limit exceeded</td>
</tr>
<tr>
<td>500</td>
<td>Internal Server Error</td>
</tr>
</tbody></table>
<h2>Notes</h2>
<ul>
<li>All email addresses are automatically converted to lowercase</li>
<li>Date parameters should be in ISO format (YYYY-MM-DD or full ISO timestamp)</li>
<li>The <code>active</code> field in user responses indicates if the user was active in the last 24 hours</li>
<li>FCM (Firebase Cloud Messaging) tokens are automatically managed for push notifications</li>
<li>Bulk operations are used for adding users to improve performance</li>
<li>Session validation ensures users can only access their own sessions</li>
</ul>
`;
