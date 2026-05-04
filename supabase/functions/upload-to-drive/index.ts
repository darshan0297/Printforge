// ================================================================
// upload-to-drive — Supabase Edge Function
// Receives an STL file from the browser and uploads it to the
// PrintForge Google Drive folder using a service account.
// Deploy: supabase functions deploy upload-to-drive
// Secrets: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY,
//          GOOGLE_DRIVE_FOLDER_ID
// ================================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function toBase64Url(input: string | Uint8Array): string {
  const bytes =
    typeof input === 'string' ? new TextEncoder().encode(input) : input;
  // Build base64 from raw bytes
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function getAccessToken(): Promise<string> {
  const email  = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')!;
  const rawKey = Deno.env.get('GOOGLE_PRIVATE_KEY')!.replace(/\\n/g, '\n');

  const keyBody = rawKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const keyBytes = Uint8Array.from(atob(keyBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const now     = Math.floor(Date.now() / 1000);
  const header  = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = toBase64Url(JSON.stringify({
    iss:   email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  }));

  const sigInput = new TextEncoder().encode(`${header}.${payload}`);
  const sigBytes = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, sigInput),
  );
  const jwt = `${header}.${payload}.${toBase64Url(sigBytes)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const json = await res.json();
  if (!json.access_token) throw new Error(json.error_description ?? 'Auth failed');
  return json.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const folderId = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID')!;
    const token    = await getAccessToken();

    const boundary = 'pf_' + crypto.randomUUID().replace(/-/g, '');
    const meta     = JSON.stringify({ name: file.name, parents: [folderId] });
    const mime     = file.type || 'application/octet-stream';
    const enc      = new TextEncoder();

    const head = enc.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
      `--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,
    );
    const tail      = enc.encode(`\r\n--${boundary}--`);
    const fileBytes = new Uint8Array(await file.arrayBuffer());

    const body = new Uint8Array(head.length + fileBytes.length + tail.length);
    body.set(head);
    body.set(fileBytes, head.length);
    body.set(tail, head.length + fileBytes.length);

    const upload = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
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

    return new Response(
      JSON.stringify({
        fileId:   driveFile.id,
        fileName: driveFile.name,
        viewLink: driveFile.webViewLink,
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
