-- Create smm_channels and smm_posts tables in Supabase
CREATE TABLE smm_channels (
    id SERIAL PRIMARY KEY,
    channel_name VARCHAR(255) NOT NULL,
    channel_type VARCHAR(255) NOT NULL
);

CREATE TABLE smm_posts (
    id SERIAL PRIMARY KEY,
    post_text TEXT NOT NULL,
    post_date DATE NOT NULL,
    channel_id INTEGER NOT NULL,
    FOREIGN KEY (channel_id) REFERENCES smm_channels(id)
);