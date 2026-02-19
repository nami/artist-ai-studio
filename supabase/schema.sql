-- ============================================================
-- Artist AI Studio — Supabase Schema
-- Run this in the Supabase SQL Editor for a new project.
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. datasets
--    Stores custom LoRA training jobs (primary flow)
-- ─────────────────────────────────────────────
CREATE TABLE datasets (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          text        NOT NULL,
  name             text,
  subject_name     text        NOT NULL,
  subject_type     text,
  trigger_word     text,
  training_status  text        NOT NULL DEFAULT 'pending',
  training_id      text        UNIQUE,
  model_version    text,
  error_message    text,
  logs             text,
  completed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_datasets_user_id          ON datasets (user_id);
CREATE INDEX idx_datasets_training_id      ON datasets (training_id);
CREATE INDEX idx_datasets_training_status  ON datasets (training_status);

-- ─────────────────────────────────────────────
-- 2. training_images
--    Images uploaded for a dataset training run
-- ─────────────────────────────────────────────
CREATE TABLE training_images (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id  uuid        NOT NULL REFERENCES datasets (id) ON DELETE CASCADE,
  image_url   text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_images_dataset_id ON training_images (dataset_id);

-- ─────────────────────────────────────────────
-- 3. generations
--    Records every AI image generation attempt
-- ─────────────────────────────────────────────
CREATE TABLE generations (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        text        NOT NULL,
  dataset_id     uuid        REFERENCES datasets (id) ON DELETE SET NULL,
  prompt         text        NOT NULL,
  image_url      text        NOT NULL DEFAULT '',
  prediction_id  text        UNIQUE,
  status         text        NOT NULL DEFAULT 'generating',
  settings       jsonb       NOT NULL DEFAULT '{}',
  error_message  text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_generations_user_id       ON generations (user_id);
CREATE INDEX idx_generations_prediction_id ON generations (prediction_id);
CREATE INDEX idx_generations_status        ON generations (status);
CREATE INDEX idx_generations_dataset_id    ON generations (dataset_id);

-- ─────────────────────────────────────────────
-- 4. gallery
--    User's curated collection of saved generations
-- ─────────────────────────────────────────────
CREATE TABLE gallery (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        text        NOT NULL,
  generation_id  uuid        NOT NULL REFERENCES generations (id) ON DELETE CASCADE,
  title          text,
  tags           text[]      NOT NULL DEFAULT '{}',
  is_favorite    boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_gallery_user_generation UNIQUE (user_id, generation_id)
);

CREATE INDEX idx_gallery_user_id      ON gallery (user_id);
CREATE INDEX idx_gallery_generation_id ON gallery (generation_id);

-- ─────────────────────────────────────────────
-- 5. training_datasets
--    Alternative / legacy training flow
--    (used by app/api/train/status/[id]/route.ts)
-- ─────────────────────────────────────────────
CREATE TABLE training_datasets (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      text        NOT NULL,
  name         text        NOT NULL,
  subject_type text,
  image_count  integer     NOT NULL DEFAULT 0,
  status       text        NOT NULL DEFAULT 'preparing',
  replicate_id text,
  model_name   text,
  zip_url      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_datasets_user_id ON training_datasets (user_id);

-- ============================================================
-- Row Level Security
-- All DB writes go through the service-role admin client
-- (which bypasses RLS), but enabling RLS + policies ensures
-- the anon / user JWT client can never read other users' data.
-- ============================================================

ALTER TABLE datasets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_images   ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery           ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_datasets ENABLE ROW LEVEL SECURITY;

-- datasets
CREATE POLICY "Users can read own datasets"
  ON datasets FOR SELECT
  USING (auth.uid()::text = user_id);

-- training_images  (readable via parent dataset ownership)
CREATE POLICY "Users can read own training images"
  ON training_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM datasets
      WHERE datasets.id = training_images.dataset_id
        AND datasets.user_id = auth.uid()::text
    )
  );

-- generations
CREATE POLICY "Users can read own generations"
  ON generations FOR SELECT
  USING (auth.uid()::text = user_id);

-- gallery
CREATE POLICY "Users can read own gallery"
  ON gallery FOR SELECT
  USING (auth.uid()::text = user_id);

-- training_datasets
CREATE POLICY "Users can read own training datasets"
  ON training_datasets FOR SELECT
  USING (auth.uid()::text = user_id);
