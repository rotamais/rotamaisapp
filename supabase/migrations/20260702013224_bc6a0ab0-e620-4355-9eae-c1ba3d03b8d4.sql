
DROP POLICY IF EXISTS "Avatars are viewable by authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Vehicle photos viewable by authenticated" ON storage.objects;

CREATE POLICY "Owner views own avatar"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "Owner or admin views vehicle photo"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'vehicle-photos'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);
