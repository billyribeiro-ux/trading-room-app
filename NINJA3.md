# NINJA 3 — Create the room's `.env` file

**Time: 2 minutes.** All on your Mac. Nothing to install.

---

## The problem in one line

`apps/room/.env` **does not exist**, and the one secret both apps need is in **neither** of them.
Because of that, the room and the controller cannot talk to each other on your machine.

---

## Step 1 — Generate one secret

Open Terminal on your Mac and run:

```bash
openssl rand -hex 32
```

✅ **You should see:** a 64-character line of hex.

> 🔴 **Never paste the real value into this file, or any file in the repository.** A secret was
> pasted here on 2026-08-14, committed, and pushed to a **public** repo. It had to be rotated. This
> file is tracked by git; the `.env` files are not, which is the whole point of them.

**📋 Copy that line.** You are about to paste the **same** value into two different files.

> ⚠️ **It must be identical in both files, character for character.** If they differ by even one
> character, every "Launch" link is rejected and nobody can enter a room.

---

## Step 2 — Create the room's file

In Terminal:

```bash
cd ~/Desktop/trading-room-app/apps/room
```

Then create the file. **Replace `PASTE_YOUR_SECRET` with the line from Step 1**, then paste this
whole block:

```bash
cat > .env <<'EOF'
CONTROL_BASE_URL=http://127.0.0.1:5173
ROOM_JWT_SECRET=PASTE_YOUR_SECRET
EOF
```

Check it saved:

```bash
cat .env
```

✅ **You should see:** your two lines, with the real secret visible.

---

## Step 3 — Add the same secret to the controller

```bash
cd ~/Desktop/trading-room-app/apps/controller
```

Check whether the controller already has a `.env`:

```bash
ls -la .env
```

**If it exists**, add the line to it (again replacing `PASTE_YOUR_SECRET` with the **same** value):

```bash
echo 'ROOM_JWT_SECRET=PASTE_YOUR_SECRET' >> .env
```

**If it does not exist**, create it:

```bash
cat > .env <<'EOF'
ROOM_JWT_SECRET=PASTE_YOUR_SECRET
EOF
```

---

## Step 4 — Prove both files have the SAME secret

Run this. It compares the two without printing the secret:

```bash
cd ~/Desktop/trading-room-app
a=$(grep '^ROOM_JWT_SECRET=' apps/room/.env | cut -d= -f2)
b=$(grep '^ROOM_JWT_SECRET=' apps/controller/.env | cut -d= -f2)
if [ -n "$a" ] && [ "$a" = "$b" ]; then echo "MATCH — both files agree"; else echo "MISMATCH — fix before continuing"; fi
```

✅ **You should see:** `MATCH — both files agree`
❌ **If you see `MISMATCH`:** redo Steps 2 and 3 with the same value in both.

---

## The port trap — read this even if everything worked

The line `CONTROL_BASE_URL=http://127.0.0.1:5173` uses port **5173**.

An older version of our test script defaulted to **5180**. On your machine, **port 5180 is a
completely different project** — `Desktop/trick-trades`. The first time that script ran, it
happily connected to the wrong application and got a 404, which looked like our code was broken.

The real ports are:

| app | port |
| --- | --- |
| controller | **5173** |
| room | **5174** |

---

## About security

These `.env` files are **already excluded from git** — they will not be committed or pushed. They
stay on your machine only. That is intentional and correct.

---

## What this unblocks

There is a test script, `apps/room/scripts/room-config-seam-e2e.mjs`, that has **never been run**
because of this missing file. It flips two settings on the Manage page and checks the room's actual
web page reacts:

- `hideChatAlerts` — does the alert column disappear?
- `isChatOnlyRoom` — does the presentation area disappear?

Both settings already have 13 passing tests behind them, with four negative controls each. What's
missing is the last mile: a real browser watching a column leave the page when you tick a box.

---

## When it's done

Tell me **"ninja 3 done"** and paste the `MATCH` line from Step 4. I'll run the seam test and report
what it finds.

> I did not create these files for you, deliberately. Making up a shared secret so a test goes green
> is exactly the kind of shortcut that hides a real problem.




Last login: Fri Aug 14 22:01:47 on ttys003
You have new mail.
billyribeiro@Billys-Mac-Studio ~ % openssl rand -hex 32
cf0987703ee48a7796bcc038451aa4d4a60c07008e62eb42df2aa1974fea667b
billyribeiro@Billys-Mac-Studio ~ % cd ~/Desktop/trading-room-app/apps/room
billyribeiro@Billys-Mac-Studio room % cat > .env <<'EOF'
CONTROL_BASE_URL=http://127.0.0.1:5173
ROOM_JWT_SECRET=cf0987703ee48a7796bcc038451aa4d4a60c07008e62eb42df2aa1974fea667b
EOF
billyribeiro@Billys-Mac-Studio room % cat .env
CONTROL_BASE_URL=http://127.0.0.1:5173
ROOM_JWT_SECRET=cf0987703ee48a7796bcc038451aa4d4a60c07008e62eb42df2aa1974fea667b
billyribeiro@Billys-Mac-Studio room % cd ~/Desktop/trading-room-app/apps/controller
billyribeiro@Billys-Mac-Studio controller % ls -la .env 
-rw-r--r--@ 1 billyribeiro  staff  1413 Aug 12 16:45 .env
billyribeiro@Billys-Mac-Studio controller % cat > .env <<'EOF'
ROOM_JWT_SECRET=cf0987703ee48a7796bcc038451aa4d4a60c07008e62eb42df2aa1974fea667b
EOF
billyribeiro@Billys-Mac-Studio controller % cd ~/Desktop/trading-room-app
a=$(grep '^ROOM_JWT_SECRET=' apps/room/.env | cut -d= -f2)
b=$(grep '^ROOM_JWT_SECRET=' apps/controller/.env | cut -d= -f2)
if [ -n "$a" ] && [ "$a" = "$b" ]; then echo "MATCH — both files agree"; else echo "MISMATCH — fix before continuing"; fi
MATCH — both files agree
billyribeiro@Billys-Mac-Studio trading-room-app %
