1. Functional:

* \[ ] Rooms
  * \[ ] Permissions
  * \[ ] Higher default room version
  * \[ ] Managing roms
    * \[ ] Joining rooms that you are invited to
    * \[ ] Leaving rooms that you are in
    * \[ ] Creating rooms
    * \[ ] Deleting rooms that you created
    * \[ ] Previewing rooms you're about to join
    * \[ ] Viewing rooms from direct links
  * \[ ] Managing members
    * \[ ] Adding members to rooms that you created
    * \[ ] Removing members from rooms that you created
    * \[ ] Viewing members of rooms that you are in
  * \[ ] Voice calls

* \[ ] Account
  * \[ ] Running app from account creation
    * \[ ] Manage signing keys on account creation (probably some info for user as to what happens if you loose your keys)
  * \[ ] Device/Session managment
  * \[ ] Profile management
    * \[ ] Changing display name
    * \[ ] Changing avatar
    * \[ ] Extra metadata from that one extension spec, such as description, status bubble and background image via attachment upload. ex:

```json
{
  "avatar_url": "mxc://example.com/SEsfnsuifSDFSSEFsf",
  "displayname": "Pockets",
  "io.fsky.nyx.pronouns": [
    {
      "language": "en",
      "summary": "he"
    }
  ],
  "m.status": {
    "emoji": "😴",
    "text": "tired"
  },
  "org.msc.4426.status": {
    "emoji": "😴",
    "text": "tired"
  },
  "pt.aguiarvieira.whoami": [
    {
      "language": "en",
      "summary": "Not Pockets!"
    }
  ],
  "us.cloke.msc4175.tz": "Europe/Lisbon"
}
```

* \[ ] Notifications
  * \[ ] Managing
  * \[ ] Push
  * \[ ] Viewing

* \[ ] Messages
  * \[x] Sending
    * \[x] Mentions
  * \[x] Rendering
    * \[x] Formatting (Markdown)
    * \[ ] Auto-link detection
  * \[x] Editing
    * \[x] Show that message was edited ~~and its edit history~~
  * \[x] Deleting
  * \[x] Reactions
  * \[x] Read receipts
  * \[ ] Threading
  * \[x] Mentions
  * \[x] Typing indicator
  * \[x] Replies/Quotes
  * \[x] Unread messages
  * \[x] Jump to/load to unread
  * \[ ] Live location messages
  * \[ ] Attachments
    * \[x] Images
    * \[x] Files
    * \[ ] Links
      * \[ ] Link previews
  * \[ ] Permissions \[can the user type, delete, edit or not]

* \[ ] Ensure single tab mode

* \[x] Service worker image cache and handling
  * \[x] If its a full 200 request hash the file, abort hash if stream is aborted

* \[ ] Consider running matrix client in service worker \[endgame feature]
  * \[ ] Problems with calling, as service worker doesnt have WebRTC, which means calls somehow would need to be exposed in client without the rest of the client loading\\
    * \[ ] The IDB crypto storage supports custom prefixes, so maybe 2 clients could be ran at once, one in the service worker with sync, and one in main thread without sync, just calls
  * \[ ] Could potentially wake up the client with a push notification, which would sync in background
  * \[ ] Proper background sync

* \[ ] Hover preloads via sveltekit, needs proper handling in +layout.ts and +page.ts

* \[ ] CSP/CORP

2. UI:

* \[ ] Yes.

- \[ ] Hide based on contentvisibilityautostatechange

* \[ ] During first load have a pick for users, quick picks like: "I want discord style" or "I want element style" and manual picks like "I want to pick each component style manually"

* \[ ] Component styles
  * \[ ] Message style picking
  * \[ ] User profile style picking
  * \[ ] Sidebar style picking \[???]
