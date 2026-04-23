-- ================================================================
-- PrintForge — SUPABASE_SCHEMA_V5.sql
-- Blog system: posts, tags, images
-- ================================================================

create table if not exists blog_posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  excerpt      text,
  cover_image  text,                    -- URL
  content      jsonb not null default '[]',  -- array of block objects
  tags         text[] default '{}',
  status       text not null default 'draft',  -- draft | published | scheduled
  published_at timestamptz,
  scheduled_at timestamptz,
  seo_title    text,
  seo_desc     text,
  author_name  text default 'Darshan',
  author_avatar text,
  views        integer default 0,
  read_time    integer default 1,       -- minutes, calculated on save
  featured     boolean default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table if not exists blog_tags (
  id    uuid primary key default gen_random_uuid(),
  name  text unique not null,
  slug  text unique not null,
  color text default 'accent'
);

-- updated_at trigger
drop trigger if exists set_blog_posts_updated_at on blog_posts;
create trigger set_blog_posts_updated_at
  before update on blog_posts
  for each row execute function set_updated_at();

-- RLS
alter table blog_posts enable row level security;
alter table blog_tags  enable row level security;

create policy "Public read published posts"
  on blog_posts for select
  using (status = 'published' or auth.role() = 'authenticated');

create policy "Admin manage posts"
  on blog_posts for all
  using (auth.role() = 'authenticated');

create policy "Public read tags"
  on blog_tags for select using (true);

create policy "Admin manage tags"
  on blog_tags for all using (auth.role() = 'authenticated');

-- View counter function (called from post page, no auth needed)
create or replace function increment_post_views(post_slug text)
returns void language plpgsql security definer as $$
begin
  update blog_posts set views = views + 1 where slug = post_slug and status = 'published';
end;
$$;

-- Storage bucket for blog images
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

create policy "Public read blog images"
  on storage.objects for select
  using (bucket_id = 'blog-images');

create policy "Admin upload blog images"
  on storage.objects for insert
  with check (bucket_id = 'blog-images' and auth.role() = 'authenticated');

create policy "Admin delete blog images"
  on storage.objects for delete
  using (bucket_id = 'blog-images' and auth.role() = 'authenticated');

-- Seed a sample post
insert into blog_posts (slug, title, excerpt, status, published_at, tags, read_time, featured, content) values
(
  'war-machine-mk4-build',
  'Building a War Machine Mk4 Chest Piece — Full Build Log',
  'How I split a 400mm prop into 9 printable sections, aligned them with custom pins, and finished it with automotive primer and chrome paint.',
  'published',
  now() - interval '3 days',
  ARRAY['Cosplay', '3D Printing', 'Iron Man'],
  8,
  true,
  '[
    {"type":"heading","data":{"level":2,"text":"The Brief"}},
    {"type":"text","data":{"html":"<p>A customer commissioned a full War Machine Mk4 chest piece for Sri Lanka Comic Con. The reference was the MCU Mark IV — heavy mechanical panels, exposed repulsor housing, and that distinctive gunmetal finish. The catch: my Elegoo Centauri Carbon has a 256mm bed. The chest plate is nearly 400mm across.</p>"}},
    {"type":"callout","data":{"icon":"💡","text":"The solution was to write a NumPy script that splits the STL along custom planes, adds alignment pin sockets automatically, and numbers each section so assembly is foolproof."}},
    {"type":"heading","data":{"level":2,"text":"Slicing the Model"}},
    {"type":"text","data":{"html":"<p>I split the chest into 9 sections. The key constraint was keeping each section under 240mm to leave margin for brim. I wrote the split script in Python using the <code>trimesh</code> library — it takes a cut plane normal vector and offset, slices the mesh, and caps both halves cleanly.</p>"}},
    {"type":"code","data":{"language":"python","code":"import trimesh\nimport numpy as np\n\ndef split_mesh(mesh, plane_normal, plane_origin):\n    above, below = trimesh.intersections.slice_mesh_plane(\n        mesh, plane_normal, plane_origin, cap=True\n    )\n    return above, below"}},
    {"type":"heading","data":{"level":2,"text":"Print Settings"}},
    {"type":"text","data":{"html":"<ul><li>Material: PLA+ (Polymaker)</li><li>Layer height: 0.15mm for outer shells, 0.2mm for infill layers</li><li>Infill: 15% gyroid</li><li>Walls: 4 perimeters</li><li>Print time per section: 6–11 hours</li></ul>"}},
    {"type":"heading","data":{"level":2,"text":"Finishing"}},
    {"type":"text","data":{"html":"<p>Post-processing was the most time-intensive phase. Each section got 3 rounds of filler primer, wet sanding to 800 grit, then a final metallic base coat before chrome powder application.</p>"}},
    {"type":"divider","data":{}},
    {"type":"text","data":{"html":"<p>Total build time: 11 days. The customer wore it at Comic Con and it survived a full day on the floor. Mission accomplished.</p>"}}
  ]'
)
on conflict do nothing;
