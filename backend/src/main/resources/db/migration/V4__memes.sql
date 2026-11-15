-- Meme lines used in reminder notifications. "moment" picks when a line can show:
--   late  = task not ticked 30 min after its start
--   start = a workout, walk or other task begins
--   wake  = wake-up alarm
--   meal  = a meal or meal-prep task begins
--   study = an upskilling block begins
--   sleep = lights-out reminder
CREATE TABLE fit_memes (
    id         BIGSERIAL PRIMARY KEY,
    text       TEXT        NOT NULL,
    moment     TEXT        NOT NULL DEFAULT 'late',
    active     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO fit_memes (text, moment) VALUES
  ('“By all means, move at a glacial pace. You know how that thrills me.”', 'late'),
  ('The audacity of skipping this. Yuck.', 'late'),
  ('Aura −500. Tick it before it hits −1000.', 'late'),
  ('Who’s gonna tell him the workout doesn’t do itself?', 'late'),
  ('Emotional damage: you skipped it.', 'late'),
  ('Jethalal voice: “Ae pagal aurat… Nonsense!” Task abhi tak pending hai?', 'late'),
  ('“Goli beta, masti nahi!” Task pe focus karo.', 'late'),
  ('That munching is a red flag and you know it.', 'meal'),
  ('Ye bik gayi hai gormint. Aur tu bik gaya munching ke liye.', 'meal'),
  ('Chat, is this real? Is he actually going to the gym? Let him cook.', 'start'),
  ('Gymmaxxing hour. Looksmaxxing starts with showing up.', 'start'),
  ('“Tapu ke papa, utho!” Alarm baj gaya.', 'wake'),
  ('Brain rot can wait. Sleep is the real aura farming.', 'sleep');
