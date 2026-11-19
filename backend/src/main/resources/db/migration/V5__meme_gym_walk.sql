-- Separate groups for gym/dance and walks, so gym lines don't show on a walk.
UPDATE fit_memes SET moment = 'gym' WHERE moment = 'start' AND (text LIKE '%gym%' OR text LIKE 'Gymmaxxing%');
