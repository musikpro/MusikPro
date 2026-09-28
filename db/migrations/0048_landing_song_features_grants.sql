-- Custom SQL migration file, put your code below! --
GRANT SELECT ON TABLE "landing_song_features" TO musikpro_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "landing_song_features" TO musikpro_service;
