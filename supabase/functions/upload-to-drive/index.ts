// ================================================================
// upload-to-drive — Supabase Edge Function
// Creates a customer subfolder inside the correct service folder,
// uploads all files + a requirements.txt to that subfolder.
//
// Secrets required:
//   GOOGLE_OAUTH_CLIENT_ID
//   GOOGLE_OAUTH_CLIENT_SECRET
//   GOOGLE_OAUTH_REFRESH_TOKEN
//   GOOGLE_DRIVE_3D_FOLDER_ID    — parent folder for 3D print jobs
//   GOOGLE_DRIVE_LASER_FOLDER_ID — parent folder for laser cut jobs
// ================================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!,
      refresh_token: Deno.env.get('GOOGLE_OAUTH_REFRESH_TOKEN')!,
      grant_type:    'refresh_token',
    }).toString(),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error('OAuth refresh failed: ' + JSON.stringify(json));
  return json.access_token;
}

async function createFolder(token: string, name: string, parentId: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  const json = await res.json();
  if (!json.id) throw new Error('Folder creation failed: ' + JSON.stringify(json));
  return json.id;
}

async function uploadFileToDrive(
  token: string,
  name: string,
  mime: string,
  bytes: Uint8Array,
  folderId: string,
): Promise<{ id: string; webViewLink: string }> {
  const boundary = 'pf_' + crypto.randomUUID().replace(/-/g, '');
  const meta     = JSON.stringify({ name, parents: [folderId] });
  const enc      = new TextEncoder();

  const head = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
    `--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,
  );
  const tail = enc.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(head.length + bytes.length + tail.length);
  body.set(head);
  body.set(bytes, head.length);
  body.set(tail, head.length + bytes.length);

  const upload = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  const driveFile = await upload.json();
  if (driveFile.error) throw new Error(driveFile.error.message);
  return { id: driveFile.id, webViewLink: driveFile.webViewLink };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const formData    = await req.formData();
    const serviceType  = (formData.get('serviceType')  as string || '3dprint').trim();
    const customerName = (formData.get('customerName') as string || 'Unknown').trim();
    const requirements = (formData.get('requirements') as string || '').trim();
    const email        = (formData.get('email')        as string || '').trim();
    const phone        = (formData.get('phone')        as string || '').trim();
    const material     = (formData.get('material')     as string || '').trim();
    const operation    = (formData.get('operation')    as string || '').trim();
    const files        = formData.getAll('file') as File[];

    const parentFolderId = serviceType === 'laser'
      ? Deno.env.get('GOOGLE_DRIVE_LASER_FOLDER_ID')!
      : Deno.env.get('GOOGLE_DRIVE_3D_FOLDER_ID')!;

    const token = await getAccessToken();

    // Create subfolder: "CustomerName — YYYY-MM-DD HH:MM"
    const now     = new Date();
    const dateStr = now.toISOString().slice(0, 16).replace('T', ' ');
    const folderName  = `${customerName} — ${dateStr}`;
    const subFolderId = await createFolder(token, folderName, parentFolderId);

    // Build and upload requirements.txt
    const validFiles = files.filter(f => f && f.size > 0);
    const txtContent = [
      `Service   : ${serviceType === 'laser' ? 'Laser Cutting' : '3D Printing'}`,
      `Customer  : ${customerName}`,
      `Email     : ${email || '—'}`,
      `Phone     : ${phone || '—'}`,
      `Submitted : ${now.toUTCString()}`,
      material  ? `Material  : ${material}`  : null,
      operation ? `Operation : ${operation}` : null,
      '',
      'Requirements / Notes:',
      requirements || '(none provided)',
      '',
      'Files uploaded:',
      ...validFiles.map(f => `  - ${f.name} (${(f.size / 1024).toFixed(1)} KB)`),
    ].filter(l => l !== null).join('\n');

    await uploadFileToDrive(
      token, 'requirements.txt', 'text/plain',
      new TextEncoder().encode(txtContent),
      subFolderId,
    );

    // Upload each file
    const uploaded: { name: string; id: string; webViewLink: string }[] = [];
    for (const file of validFiles) {
      const bytes  = new Uint8Array(await file.arrayBuffer());
      const result = await uploadFileToDrive(
        token, file.name, file.type || 'application/octet-stream', bytes, subFolderId,
      );
      uploaded.push({ name: file.name, ...result });
    }

    return new Response(JSON.stringify({
      success: true,
      folderName,
      folderId: subFolderId,
      files: uploaded,
    }), { headers: { ...CORS, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
