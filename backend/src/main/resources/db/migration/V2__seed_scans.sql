-- Body scans from June–October 2026
INSERT INTO fit_scans (day, time_of_day, weight, fat, pbf, smm, vfa, waist) VALUES
  ('2026-06-09', 'evening', 89.9, NULL, 38.1, 31.1, NULL,  NULL),
  ('2026-07-06', 'evening', 91.1, 34.3, 37.6, 31.8, 180,   112.2),
  ('2026-07-09', 'evening', 90.5, NULL, 36.8, 32.0, NULL,  NULL),
  ('2026-07-16', 'evening', 88.5, 31.9, 36.0, 31.7, 162,   109.3),
  ('2026-07-23', 'evening', 90.2, 31.7, 35.2, 32.7, 153,   109.2),
  ('2026-08-08', 'evening', 88.7, NULL, 35.4, 32.1, NULL,  NULL),
  ('2026-08-31', 'evening', 88.2, 31.2, 35.4, 31.9, 155,   108.6),
  ('2026-10-12', 'morning', 88.8, NULL, 37.2, 31.2, NULL,  NULL),
  ('2026-10-21', 'evening', 90.2, 29.3, 32.5, 34.1, 126,   106.2)
ON CONFLICT (day) DO NOTHING;
