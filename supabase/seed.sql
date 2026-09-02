-- supabase/seed.sql - dummy data for dev (3 paslon + 20 voters)
insert into candidates (nomor_urut, nama_ketua, nama_wakil, foto_url, visi, misi) values
  (1, 'Ahmad Fauzi', 'Siti Rahma', null, 'Mewujudkan OSIS yang kreatif dan inovatif', '1. Program literasi digital; 2. Ekstrakurikuler unggulan'),
  (2, 'Budi Santoso', 'Dewi Lestari', null, 'OSIS berprestasi dan berkarakter', '1. Lomba antar kelas; 2. Bakti sosial rutin'),
  (3, 'Citra Kirana', 'Rizky Pratama', null, 'OSIS transparan dan kolaboratif', '1. Forum aspirasi siswa; 2. Festival seni tahunan')
on conflict (nomor_urut) do nothing;

-- 20 voters dummy (token plain for dev, prod use hash)
insert into voters (nis, nama, kelas, token_hash) values
  ('10001','Adi Wijaya','XII-1','111111'),
  ('10002','Bella Putri','XII-1','222222'),
  ('10003','Candra Dewa','XII-2','333333'),
  ('10004','Dian Sari','XII-2','444444'),
  ('10005','Eko Prasetyo','XI-1','555555'),
  ('10006','Fitri Handayani','XI-1','666666'),
  ('10007','Gilang Ramadhan','XI-2','777777'),
  ('10008','Hani Permata','XI-2','888888'),
  ('10009','Irfan Maulana','X-1','999999'),
  ('10010','Jihan Aulia','X-1','101010'),
  ('10011','Kurniawan','X-2','121212'),
  ('10012','Lina Marlina','X-2','131313'),
  ('10013','Mira Safitri','XII-1','141414'),
  ('10014','Naufal Hakim','XII-1','151515'),
  ('10015','Oktavia','XII-2','161616'),
  ('10016','Prasetyo','XI-1','171717'),
  ('10017','Qori','XI-2','181818'),
  ('10018','Rina Amelia','X-1','191919'),
  ('10019','Sigit Prabowo','X-2','202020'),
  ('10020','Tari Wulandari','XII-1','212121')
on conflict (nis) do nothing;
