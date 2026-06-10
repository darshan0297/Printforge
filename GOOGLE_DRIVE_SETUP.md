# Google Drive Upload Setup — PrintForge

Follow these steps to enable customer file uploads to Google Drive
from the 3D Printing and Laser Cutting quote forms.

---

## Step 1 — Create a Google Cloud Project

1. Go to https://console.cloud.google.com
2. Click the project dropdown at the top → New Project
3. Name it `PrintForge` → Create

---

## Step 2 — Enable the Google Drive API

1. In the left menu go to APIs & Services → Library
2. Search for "Google Drive API" → click it → Enable

---

## Step 3 — Create a Service Account

1. Go to APIs & Services → Credentials
2. Click Create Credentials → Service Account
3. Name it `printforge-drive` → Create and Continue → Done
4. Click the service account you just created
5. Go to the Keys tab → Add Key → Create new key → JSON
6. A .json file will download — keep this safe

The JSON file will contain:
  - "client_email": "printforge-drive@yourproject.iam.gserviceaccount.com"
  - "private_key": "-----BEGIN PRIVATE KEY-----\nXXXXX\n-----END PRIVATE KEY-----\n"

---

## Step 4 — Create the Two Folders in Google Drive

1. Go to https://drive.google.com
2. Create a folder called:  3D Printing Orders
3. Create another folder called:  Laser Cutting Orders
4. For EACH folder:
   - Right-click → Share
   - Paste the client_email from the JSON file
   - Set permission to Editor
   - Uncheck "Notify people" → Share

---

## Step 5 — Get the Folder IDs

Open each folder in Drive. The URL looks like:
  https://drive.google.com/drive/folders/1ABCxyz123456789

The part after /folders/ is the folder ID.
Copy both folder IDs — you will need them in the next step.

---

## Step 6 — Add Secrets to Supabase

Go to your Supabase dashboard:
  https://supabase.com/dashboard/project/ixjudnzouhybeyabjbhn/functions

Click upload-to-drive → Secrets → Add the following 4 secrets:

  GOOGLE_SERVICE_ACCOUNT_EMAIL  →  client_email from the JSON file
  GOOGLE_PRIVATE_KEY            →  private_key from the JSON file
                                    (include the full -----BEGIN PRIVATE KEY----- header and footer)
  GOOGLE_DRIVE_3D_FOLDER_ID     →  folder ID of "3D Printing Orders"
  GOOGLE_DRIVE_LASER_FOLDER_ID  →  folder ID of "Laser Cutting Orders"

---

## Step 7 — Deploy the Edge Function

Open a terminal in the Printforge project folder and run:

  supabase login
  supabase link --project-ref ixjudnzouhybeyabjbhn
  supabase functions deploy upload-to-drive

If you already have Supabase CLI linked, just run:

  supabase functions deploy upload-to-drive

---

## How It Works After Setup

Every time a customer submits a quote:

  - A subfolder is created automatically inside the correct parent folder
  - Subfolder name format:  CustomerName — YYYY-MM-DD HH:MM
  - The subfolder contains:
      requirements.txt  — customer name, email, phone, material,
                          operation, notes, and list of files
      [uploaded files]  — all files the customer attached

3D print quotes go into:   3D Printing Orders/
Laser cut quotes go into:  Laser Cutting Orders/

---

## Troubleshooting

- If uploads fail silently, check the edge function logs in Supabase dashboard
- Make sure the service account email has Editor access on both Drive folders
- The GOOGLE_PRIVATE_KEY must include the -----BEGIN/END PRIVATE KEY----- lines
- Private key newlines should be stored as \n (Supabase handles this automatically)
