-- A copy of each day's plan (times, titles, protein, gym sets), synced from the app.
-- Lets the home-screen widget work out NOW / NEXT / rings without the app running.
CREATE TABLE fit_dayplan (
    day        DATE PRIMARY KEY,
    items      JSONB       NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
