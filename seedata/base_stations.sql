-- Base Stations Seed Data
-- Istanbul Locations with realistic coordinates and configurations

INSERT INTO base_stations (id, code, name, latitude, longitude, region, type, capacity, status) VALUES
-- Marmara Region - Istanbul
(gen_random_uuid(), 'BSC-001', 'Levent-K1', 41.0732, 29.0199, 'Marmara', 'NR_5G', 1000, 'ACTIVE'),
(gen_random_uuid(), 'BSC-002', 'Kadıköy-M3', 40.9887, 29.0277, 'Marmara', 'LTE', 800, 'ACTIVE'),
(gen_random_uuid(), 'BSC-003', 'Taksim-A2', 41.0373, 29.0252, 'Marmara', 'NR_5G', 1200, 'ACTIVE'),
(gen_random_uuid(), 'BSC-004', 'Besiktaş-B1', 41.0516, 29.0112, 'Marmara', 'LTE', 950, 'ACTIVE'),
(gen_random_uuid(), 'BSC-005', 'Fatih-F2', 41.0096, 28.9624, 'Marmara', 'NR_5G', 1100, 'ACTIVE'),
(gen_random_uuid(), 'BSC-006', 'Eminönü-E1', 41.0094, 28.9784, 'Marmara', 'LTE', 850, 'ACTIVE'),
(gen_random_uuid(), 'BSC-007', 'Beyoğlu-BY1', 41.0257, 28.9828, 'Marmara', 'NR_5G', 1050, 'ACTIVE'),
(gen_random_uuid(), 'BSC-008', 'Şişli-S3', 41.0489, 29.0133, 'Marmara', 'LTE', 920, 'ACTIVE'),
(gen_random_uuid(), 'BSC-009', 'Bahçelievler-BA2', 41.0072, 28.8821, 'Marmara', 'NR_5G', 880, 'ACTIVE'),
(gen_random_uuid(), 'BSC-010', 'Bakırköy-BAK1', 40.9756, 28.8899, 'Marmara', 'LTE', 780, 'ACTIVE'),
(gen_random_uuid(), 'BSC-011', 'Maltepe-MAL1', 40.9619, 29.1342, 'Marmara', 'NR_5G', 920, 'ACTIVE'),
(gen_random_uuid(), 'BSC-012', 'Pendik-PEN1', 40.8897, 29.2410, 'Marmara', 'LTE', 850, 'ACTIVE'),
(gen_random_uuid(), 'BSC-013', 'Bağcılı-BAG1', 41.2268, 29.2046, 'Marmara', 'NR_5G', 1150, 'ACTIVE'),
(gen_random_uuid(), 'BSC-014', 'Eyüpsultan-EYU1', 41.0667, 28.9133, 'Marmara', 'LTE', 750, 'ACTIVE'),
(gen_random_uuid(), 'BSC-015', 'Avcilar-AVC1', 41.0085, 28.7454, 'Marmara', 'NR_5G', 1000, 'ACTIVE'),

-- Ege Region
(gen_random_uuid(), 'BSC-016', 'İzmir-Alsancak-IZ1', 38.4215, 27.1467, 'Ege', 'NR_5G', 1100, 'ACTIVE'),
(gen_random_uuid(), 'BSC-017', 'İzmir-Konak-IZ2', 38.4192, 27.1441, 'Ege', 'LTE', 900, 'ACTIVE'),
(gen_random_uuid(), 'BSC-018', 'Aydın-AYD1', 37.8442, 27.8454, 'Ege', 'LTE', 650, 'ACTIVE'),

-- Iç Anadolu Region
(gen_random_uuid(), 'BSC-019', 'Ankara-Çankaya-ANK1', 39.8817, 32.7940, 'İç Anadolu', 'NR_5G', 1050, 'ACTIVE'),
(gen_random_uuid(), 'BSC-020', 'Ankara-Keçiören-ANK2', 39.9500, 32.8500, 'İç Anadolu', 'LTE', 800, 'ACTIVE'),

-- Threshold Configurations for Metrics
INSERT INTO threshold_configs (metric_name, warning_threshold, critical_threshold, direction, is_active) VALUES
('cpu_usage', 75.0, 90.0, 'ABOVE', TRUE),
('memory_usage', 80.0, 95.0, 'ABOVE', TRUE),
('packet_loss', 5.0, 10.0, 'ABOVE', TRUE),
('latency', 50.0, 100.0, 'ABOVE', TRUE),
('rssi', -80.0, -90.0, 'BELOW', TRUE),
('connected_users_high', 800, 950, 'ABOVE', TRUE),
('connected_users_low', 10, 0, 'BELOW', TRUE);
