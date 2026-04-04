
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-files', 'audio-files', true);

CREATE POLICY "Anyone can read audio files"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-files');

CREATE POLICY "Anyone can upload audio files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audio-files');

CREATE POLICY "Anyone can update audio files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'audio-files');
