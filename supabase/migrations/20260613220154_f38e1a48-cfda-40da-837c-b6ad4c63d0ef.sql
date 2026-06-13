
-- avatars
CREATE POLICY "Avatars are viewable by authenticated" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Users upload their avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update their avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete their avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- vehicle-photos
CREATE POLICY "Vehicle photos viewable by authenticated" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'vehicle-photos');
CREATE POLICY "Users upload their vehicle photo" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update their vehicle photo" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete their vehicle photo" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- documents (privados)
CREATE POLICY "Owner/admin view documents" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'documents' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(),'admin')
  )
);
CREATE POLICY "Owner uploads documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owner updates documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owner deletes documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
