# POST Route API Documentation

## Overview
This document describes the comprehensive API endpoint for managing ProTradingRoom sessions, including:

- **Message Posting**: Post chat messages and alerts to session rooms
- **User Management**: Add and remove users from sessions with bulk processing support, get user statistics, and retrieve user lists
- **Badge Management**: Add/remove badges and manage trial status for users
- **Stream Control**: Start, stop, and manage streaming sessions
- **FCM Integration**: Automatic push notification subscription management
- **Session Authentication**: Secure API secret-based authentication. This secret can be set from the session admin panel.
- **Rate Limiting**: Protection against brute force attacks on API secrets with configurable limits
- **Archived Logs**: Retrieve archived chat and alert content
- **Deleted Logs**: Retrieve deleted message logs. When a mod deletes or edits a message/alert, these are stored here
- **Session Recordings**: Retrieve session recording files from the last 3 weeks with metadata

The route uses a dynamic path structure (`/:mainDest/:mainCmd/:subCmd`) to handle multiple command types through a single endpoint, providing a consistent and scalable API interface for session management operations.



## Base URL
```
https://chat.protradingroom.com/ptr_app/api/v2/
```

## Endpoints

### 1. Post to Chat
**URL:** `POST /session/postToRoom/chat`

**Full URL:** `https://chat.protradingroom.com/ptr_app/api/v2/session/postToRoom/chat`

**Description:** Posts a message to the chat area of a specific session.

### 2. Post to Alerts
**URL:** `POST /session/postToRoom/alerts`

**Full URL:** `https://chat.protradingroom.com/ptr_app/api/v2/session/postToRoom/alerts`

**Description:** Posts an alert message to a specific session.

### 3. Add Users to Session
**URL:** `POST /session/addUsers`

**Full URL:** `https://chat.protradingroom.com/ptr_app/api/v2/session/addUsers`

**Description:** Adds users to a session with bulk processing support.

### 4. Delete Users from Session
**URL:** `POST /session/delUsers`

**Full URL:** `https://chat.protradingroom.com/ptr_app/api/v2/session/delUsers`

**Description:** Removes users from a session and unsubscribes them from FCM notifications.

### 5. Badge Management
**URL:** `POST /session/badges/:subCmd`

**Full URL:** `https://chat.protradingroom.com/ptr_app/api/v2/session/badges/:subCmd`

**Description:** Manages badges and trial status for users in a session.

**Available subCmd values:**
- `add` - Add badges to users
- `remove` - Remove badges from users  
- `list` - List badges for a user
- `addTrial` - Add trial status to users
- `remTrial` - Remove trial status from users

### 6. User Statistics
**URL:** `POST /session/userstats`

**Full URL:** `https://chat.protradingroom.com/ptr_app/api/v2/session/userstats`

**Description:** Retrieves user statistics and session activity data.

### 7. User List
**URL:** `POST /session/users`

**Full URL:** `https://chat.protradingroom.com/ptr_app/api/v2/session/users`

**Description:** Retrieves the list of users in a session.

### 8. Chat Logs
**URL:** `POST /session/chatlogs`

**Full URL:** `https://chat.protradingroom.com/ptr_app/api/v2/session/chatlogs`

**Description:** Retrieves chat logs for a session with optional filtering.

### 9. Alert Logs
**URL:** `POST /session/alertlogs`

**Full URL:** `https://chat.protradingroom.com/ptr_app/api/v2/session/alertlogs`

**Description:** Retrieves alert logs for a session with optional filtering.

### 10. Deleted Logs
**URL:** `POST /session/deletedlogs`

**Full URL:** `https://chat.protradingroom.com/ptr_app/api/v2/session/deletedlogs`

**Description:** Retrieves deleted message logs for a session.

### 11. Archived Logs
**URL:** `POST /session/archivedlogs`

**Full URL:** `https://chat.protradingroom.com/ptr_app/api/v2/session/archivedlogs`

**Description:** Retrieves archived logs for a session with optional filtering.

### 12. Session Recordings
**URL:** `POST /session/recordings`

**Full URL:** `https://chat.protradingroom.com/ptr_app/api/v2/session/recordings`

**Description:** Retrieves session recording files from the last 3 weeks with processed metadata including video paths, durations, and file information.

## Request Parameters

### Path Parameters
- `mainDest` (string): Must be "session"
- `mainCmd` (string): Must be "postToRoom", "addUsers", "delUsers", "badges", "userstats", "users", "chatlogs", "alertlogs", "deletedlogs", "archivedlogs", or "recordings"
- `subCmd` (string): 
  - For postToRoom: Either "chat" or "alerts"
  - For badges: "add", "remove", "list", "addTrial", or "remTrial"
  - For other commands: Not used (command is specified in mainCmd)

### Request Body (JSON)
```json
{
  "sessionID": "xxxxyyyyzzzz",
  "secret": "xxxxyyyyzzzz",
  "user": "Name To Post As",
  "email": "email_to_post_as",
  "text": "Text of the alert/chat goes here"
}
```

### Required Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `sessionID` | string | The session identifier | `"5fdf1fef9c2a2d5a4f3622b1"` |
| `secret` | string | API secret for authentication | `"698A1E4D-8070-4948-82F0-C051CAC226FD"` |
| `user` | string | Display name for the message | `"Efren"` |
| `email` | string | Email address of the poster | `"efren@example.com"` |
| `text` | string | The message content | `"Hello from API!"` |

### Optional Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `badgeID` | string | Badge identifier to display | `"badge_123"` |
| `fontColor` | string | Custom font color | `"#FF0000"` |
| `bkgColor` | string | Custom background color | `"#0000FF"` |
| `channel` | string | Channel name (chat only) | `"general"` |

### Add Users Request Body
```json
{
  "sessionID": "xxxxyyyyzzzz",
  "secret": "xxxxyyyyzzzz",
  "users": [
    {
      "email": "user1@example.com",
      "name": "User One"
    },
    {
      "email": "user2@example.com", 
      "name": "User Two"
    }
  ]
}
```

### Delete Users Request Body
```json
{
  "sessionID": "xxxxyyyyzzzz",
  "secret": "xxxxyyyyzzzz",
  "delUsers": ["user1@example.com", "user2@example.com"]
}
```

### Badge Management Request Bodies

#### Add Badges (Single User)
```json
{
  "sessionID": "xxxxyyyyzzzz",
  "secret": "xxxxyyyyzzzz",
  "badgeID": "badge_123",
  "email": "user@example.com"
}
```

#### Add Badges (Multiple Users)
```json
{
  "sessionID": "xxxxyyyyzzzz",
  "secret": "xxxxyyyyzzzz",
  "badgeID": "badge_123",
  "users": [
    {
      "email": "user1@example.com"
    },
    {
      "email": "user2@example.com"
    }
  ]
}
```

#### Remove Badges (Single User)
```json
{
  "sessionID": "xxxxyyyyzzzz",
  "secret": "xxxxyyyyzzzz",
  "badgeID": "badge_123",
  "email": "user@example.com"
}
```

#### Remove Badges (Multiple Users)
```json
{
  "sessionID": "xxxxyyyyzzzz",
  "secret": "xxxxyyyyzzzz",
  "badgeID": "badge_123",
  "users": [
    {
      "email": "user1@example.com"
    },
    {
      "email": "user2@example.com"
    }
  ]
}
```

#### List User Badges
```json
{
  "sessionID": "xxxxyyyyzzzz",
  "secret": "xxxxyyyyzzzz",
  "email": "user@example.com"
}
```

#### Add Trial Status (Single User)
```json
{
  "sessionID": "xxxxyyyyzzzz",
  "secret": "xxxxyyyyzzzz",
  "email": "user@example.com",
  "name": "User Name"
}
```

#### Add Trial Status (Multiple Users)
```json
{
  "sessionID": "xxxxyyyyzzzz",
  "secret": "xxxxyyyyzzzz",
  "users": [
    {
      "email": "user1@example.com",
      "name": "User One"
    },
    {
      "email": "user2@example.com",
      "name": "User Two"
    }
  ]
}
```

#### Remove Trial Status (Single User)
```json
{
  "sessionID": "xxxxyyyyzzzz",
  "secret": "xxxxyyyyzzzz",
  "email": "user@example.com"
}
```

#### Remove Trial Status (Multiple Users)
```json
{
  "sessionID": "xxxxyyyyzzzz",
  "secret": "xxxxyyyyzzzz",
  "users": [
    {
      "email": "user1@example.com"
    },
    {
      "email": "user2@example.com"
    }
  ]
}
```

### User Statistics Request Body
```json
{
  "sessionID": "xxxxyyyyzzzz",
  "secret": "xxxxyyyyzzzz",
  "fromDate": "2024-01-01T00:00:00.000Z",
  "toDate": "2024-01-31T23:59:59.999Z",
  "isMobile": true
}
```

### User List Request Body
```json
{
  "sessionID": "xxxxyyyyzzzz",
  "secret": "xxxxyyyyzzzz"
}
```

### Chat Logs Request Body
```json
{
  "sessionID": "xxxxyyyyzzzz",
  "secret": "xxxxyyyyzzzz",
  "channel": "main",
  "fromDate": "2024-01-01T00:00:00.000Z",
  "toDate": "2024-01-31T23:59:59.999Z"
}
```

### Alert Logs Request Body
```json
{
  "sessionID": "xxxxyyyyzzzz",
  "secret": "xxxxyyyyzzzz",
  "fromDate": "2024-01-01T00:00:00.000Z",
  "toDate": "2024-01-31T23:59:59.999Z"
}
```

### Deleted Logs Request Body
```json
{
  "sessionID": "xxxxyyyyzzzz",
  "secret": "xxxxyyyyzzzz",
  "logType": "chat",
  "eventType": "D",
  "fromDate": "2024-01-01T00:00:00.000Z",
  "toDate": "2024-01-31T23:59:59.999Z"
}
```

### Archived Logs Request Body
```json
{
  "sessionID": "xxxxyyyyzzzz",
  "secret": "xxxxyyyyzzzz",
  "logType": "chat",
  "channel": "main",
  "fromDate": "2024-01-01T00:00:00.000Z",
  "toDate": "2024-01-31T23:59:59.999Z"
}
```

### Session Recordings Request Body
```json
{
  "sessionID": "xxxxyyyyzzzz",
  "secret": "xxxxyyyyzzzz"
}
```

## Authentication
The API uses session-based authentication:
1. The `sessionID` must correspond to an existing session
2. The `secret` must match the session's `apiSecret` field
3. If authentication fails, a 403 status is returned

## Response

### Success Response
**Status Code:** 200 OK

**Response Body:** JSON object containing the posted message
```json
{
  "user": "Efren",
  "email": "efren@example.com",
  "text": "Hello from API!",
  "b": ["badge_123"],
  "fontColor": "#FF0000",
  "bkgColor": "#0000FF",
  "channel": "general"
}
```

### Session Recordings Response
**Status Code:** 200 OK

**Response Body:** JSON array containing recording files with metadata
```json
[
  {
    "_id": "607f1f77bcf86cd799439011",
    "name": "recording_001.mp4",
    "namemkv": "recording_001.mkv",
    "sessionID": "xxxxyyyyzzzz",
    "session_uuid": "abc-123-def",
    "fpath": "/recordings/session_123",
    "media_server": "media.protradingroom.com",
    "ms": "media.protradingroom.com",
    "vidPath": "https://media.protradingroom.com/recordings/session_123/recording_001.mp4",
    "length": 1800000,
    "duration": 30,
    "contentType": "mp4",
    "isUpload": false,
    "isPublic": false,
    "created": "2024-01-15T10:30:00.000Z",
    "modified": "2024-01-15T11:00:00.000Z"
  }
]
```

**Empty Response:** If no recordings found
```json
[]
```

### Error Responses

#### 403 Forbidden
- Invalid session ID
- Incorrect API secret
- Unknown command

#### 503 Service Unavailable
- Internal server error
- Database connection issues

## Examples

### Example 1: Post Chat Message
```bash
curl -X POST https://chat.protradingroom.com/ptr_app/api/v2/session/postToRoom/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionID": "xxxxyyyyzzzz",
    "secret": "xxxxyyyyzzzz",
    "user": "Efren",
    "email": "efren@example.com",
    "text": "Hello from the API!",
    "channel": "general"
  }'
```

### Example 2: Post Alert Message
```bash
curl -X POST https://chat.protradingroom.com/ptr_app/api/v2/session/postToRoom/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "sessionID": "xxxxyyyyzzzz",
    "secret": "xxxxyyyyzzzz",
    "user": "Efren",
    "email": "efren@example.com",
    "text": "Important alert message!",
    "badgeID": "alert_badge",
    "fontColor": "#FF0000"
  }'
```

### Example 3: Add Users to Session
```bash
curl -X POST https://chat.protradingroom.com/ptr_app/api/v2/session/addUsers \
  -H "Content-Type: application/json" \
  -d '{
    "sessionID": "xxxxyyyyzzzz",
    "secret": "xxxxyyyyzzzz",
    "users": [
      {
        "email": "john@example.com",
        "name": "John Doe"
      },
      {
        "email": "jane@example.com",
        "name": "Jane Smith"
      }
    ]
  }'
```

### Example 4: Delete Users from Session
```bash
curl -X POST https://chat.protradingroom.com/ptr_app/api/v2/session/delUsers \
  -H "Content-Type: application/json" \
  -d '{
    "sessionID": "xxxxyyyyzzzz",
    "secret": "xxxxyyyyzzzz",
    "delUsers": ["john@example.com", "jane@example.com"]
  }'
```

### Example 5: Add Badges to Users
```bash
curl -X POST https://chat.protradingroom.com/ptr_app/api/v2/session/badges/add \
  -H "Content-Type: application/json" \
  -d '{
    "sessionID": "xxxxyyyyzzzz",
    "secret": "xxxxyyyyzzzz",
    "badgeID": "premium_badge",
    "users": [
      {
        "email": "john@example.com"
      },
      {
        "email": "jane@example.com"
      }
    ]
  }'
```

### Example 6: Remove Badges from Users
```bash
curl -X POST https://chat.protradingroom.com/ptr_app/api/v2/session/badges/remove \
  -H "Content-Type: application/json" \
  -d '{
    "sessionID": "xxxxyyyyzzzz",
    "secret": "xxxxyyyyzzzz",
    "badgeID": "premium_badge",
    "email": "john@example.com"
  }'
```

### Example 7: List User Badges
```bash
curl -X POST https://chat.protradingroom.com/ptr_app/api/v2/session/badges/list \
  -H "Content-Type: application/json" \
  -d '{
    "sessionID": "xxxxyyyyzzzz",
    "secret": "xxxxyyyyzzzz",
    "email": "john@example.com"
  }'
```

### Example 8: Add Trial Status to Users
```bash
curl -X POST https://chat.protradingroom.com/ptr_app/api/v2/session/badges/addTrial \
  -H "Content-Type: application/json" \
  -d '{
    "sessionID": "xxxxyyyyzzzz",
    "secret": "xxxxyyyyzzzz",
    "users": [
      {
        "email": "newuser@example.com",
        "name": "New User"
      }
    ]
  }'
```

### Example 9: Get User Statistics
```bash
curl -X POST https://chat.protradingroom.com/ptr_app/api/v2/session/userstats \
  -H "Content-Type: application/json" \
  -d '{
    "sessionID": "xxxxyyyyzzzz",
    "secret": "xxxxyyyyzzzz",
    "fromDate": "2024-01-01T00:00:00.000Z",
    "toDate": "2024-01-31T23:59:59.999Z",
    "isMobile": true
  }'
```

### Example 10: Get User List
```bash
curl -X POST https://chat.protradingroom.com/ptr_app/api/v2/session/users \
  -H "Content-Type: application/json" \
  -d '{
    "sessionID": "xxxxyyyyzzzz",
    "secret": "xxxxyyyyzzzz"
  }'
```

### Example 11: Get Chat Logs
```bash
curl -X POST https://chat.protradingroom.com/ptr_app/api/v2/session/chatlogs \
  -H "Content-Type: application/json" \
  -d '{
    "sessionID": "xxxxyyyyzzzz",
    "secret": "xxxxyyyyzzzz",
    "channel": "main",
    "fromDate": "2024-01-01T00:00:00.000Z",
    "toDate": "2024-01-31T23:59:59.999Z"
  }'
```

### Example 12: Get Alert Logs
```bash
curl -X POST https://chat.protradingroom.com/ptr_app/api/v2/session/alertlogs \
  -H "Content-Type: application/json" \
  -d '{
    "sessionID": "xxxxyyyyzzzz",
    "secret": "xxxxyyyyzzzz",
    "fromDate": "2024-01-01T00:00:00.000Z",
    "toDate": "2024-01-31T23:59:59.999Z"
  }'
```

### Example 13: Get Session Recordings
```bash
curl -X POST https://chat.protradingroom.com/ptr_app/api/v2/session/recordings \
  -H "Content-Type: application/json" \
  -d '{
    "sessionID": "xxxxyyyyzzzz",
    "secret": "xxxxyyyyzzzz"
  }'
```

## Implementation Details

### Route Handler Location
- **File:** `api/api.js`
- **Line:** 347
- **Method:** POST

### Key Features
1. **Input Sanitization:** All inputs are sanitized using the `sanitize()` function
2. **Email Hashing:** Email addresses are hashed using `emailHash()` function
3. **IPC Communication:** Messages are sent via IPC client to the session handler
4. **Error Handling:** Comprehensive error handling with appropriate HTTP status codes

### Message Processing
- **Chat Messages:** Sent via `ipcClient.postChatToSession()`
- **Alert Messages:** Sent via `ipcClient.postAlertToSession()`
- **Channel Support:** Chat messages can specify a channel
- **Styling:** Support for custom font and background colors
- **Badges:** Optional badge display for messages

### User Management
- **Add Users:** Bulk processing with upsert logic (add new users, update existing ones)
- **Delete Users:** Removes users and unsubscribes from FCM notifications
- **FCM Integration:** Proper handling of push notification subscriptions
- **QA Mode Support:** FCM operations can be skipped in QA environment

### Badge Management
- **Add/Remove Badges:** Support for single user and bulk operations
- **Trial Status Management:** Add/remove trial status with automatic user creation
- **Badge Listing:** Retrieve user badges and trial status
- **Input Validation:** Comprehensive validation for all badge operations

### Logging & Analytics
- **User Statistics:** Session activity data with date range filtering
- **User Lists:** Complete user information with roles and FCM status
- **Chat Logs:** Message history with channel and date filtering
- **Alert Logs:** Alert history with date range filtering
- **Deleted Logs:** Deleted message tracking with event type filtering
- **Archived Logs:** Archived content retrieval with type and date filtering
- **Session Recordings:** Recording file retrieval with metadata processing and 3-week time filtering

## Security Considerations
1. **Input Validation:** All inputs are sanitized to prevent injection attacks
2. **Authentication:** API secret validation for each request
3. **Session Verification:** Session existence is verified before processing
4. **Rate Limiting:** Failed API secret attempts are rate limited to prevent brute force attacks
5. **Error Logging:** Failed authentication attempts are logged
6. **Email Notifications:** Rate limit violations trigger email alerts to administrators

## Rate Limiting
The API implements rate limiting protection against brute force attacks on API secrets:

### Configuration
- **Window Size:** Configurable via `rate_limit_window_ms` (default: 15 minutes)
- **Max Attempts:** Configurable via `rate_limit_max_attempts` (default: 15 attempts)
- **Key Generation:** Uses IP address + sessionID combination

### Behavior
- Failed API secret attempts are tracked per IP + sessionID combination
- When limit is exceeded, requests are blocked for the remainder of the time window
- Successful authentication resets the rate limit counter for that IP + sessionID
- Rate limit violations trigger email notifications to administrators

### Error Response
When rate limit is exceeded:
```json
{
  "success": false,
  "msg": "Too many attempts. Try again later."
}
```

## Dependencies
- `models.Session` - Session model for database operations
- `models.SessionUserXref` - User session cross-reference model
- `models.SessionTokenXref` - Token management model
- `models.SessionUserStats` - User statistics model
- `models.ChatLogs` - Chat logs model
- `models.AlertLogs` - Alert logs model
- `models.SessionDeletedMessages` - Deleted messages model
- `models.SessionLogs` - Archived logs model
- `models.Recording` - Recording model for session recordings
- `getIpcClient()` - IPC client for inter-process communication
- `FCMHandler` - Firebase Cloud Messaging handler
- `FCMCommandData` - FCM command data structure
- `sanitize()` - Input sanitization function
- `emailHash()` - Email hashing function
- `winston` - Logging library

## Notes
- The route supports both chat and alert posting through the same endpoint structure
- Channel specification is only available for chat messages
- Badge display is supported for both chat and alert messages
- Custom styling (font/background colors) is available for both message types
- User management operations use bulk processing for better performance
- FCM unsubscription is handled automatically when users are deleted
- QA mode support allows testing without affecting FCM subscriptions
- Email addresses are automatically converted to lowercase for consistency
- Badge management supports both single user and bulk operations
- Trial status operations automatically create users if they don't exist
- All badge operations include comprehensive error handling and validation
- Logging operations support date range filtering with 24-hour defaults
- User statistics include mobile device filtering capabilities
- All log queries use lean() for better performance
- Deleted logs support event type filtering (E=edited, D=deleted)
- Archived logs support both chat and alert content types
- Session recordings are automatically filtered to show only files from the last 3 weeks
- Recording metadata includes video paths, durations calculated from file length, and media server information
- Upload recordings are handled differently and always show duration as 0
- Recording queries use lean() for better performance and include proper error handling
