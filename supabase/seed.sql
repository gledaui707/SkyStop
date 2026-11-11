-- Explicit DEMO data. Names, terminals, budgets, access and durations are illustrative.
-- Airport identifiers/time zones provide context, not verified facility information.
begin;
insert into public.airports(id,name,timezone) values
 ('LIS','Lisbon Airport','Europe/Lisbon'), ('SIN','Singapore Changi Airport','Asia/Singapore')
on conflict(id) do nothing;
insert into public.activities(id,airport_id,name,description,category,access_zone,duration_minutes,budget_label) values
 ('10000000-0000-4000-8000-000000000001','LIS','Demo Portuguese snack break','Fictional food stop for the demonstration.','food','airside',40,'Illustrative: low'),
 ('10000000-0000-4000-8000-000000000002','LIS','Demo quiet rest','Fictional rest stop; availability not verified.','rest','airside',60,'Unknown'),
 ('10000000-0000-4000-8000-000000000003','LIS','Demo gift browse','Fictional shopping stop.','shopping','unknown',30,'Illustrative: medium'),
 ('10000000-0000-4000-8000-000000000004','LIS','Demo extended work break','Fictional work session.','work','airside',180,'Unknown'),
 ('20000000-0000-4000-8000-000000000001','SIN','Demo noodle break','Fictional food stop for the demonstration.','food','airside',50,'Illustrative: low'),
 ('20000000-0000-4000-8000-000000000002','SIN','Demo garden pause','Fictional garden activity; location not verified.','culture','landside',45,'Unknown'),
 ('20000000-0000-4000-8000-000000000003','SIN','Demo recharge break','Fictional rest activity.','rest','airside',75,'Unknown'),
 ('20000000-0000-4000-8000-000000000004','SIN','Demo work session','Fictional work activity.','work','unknown',120,'Unknown')
on conflict(id) do nothing;
insert into public.itinerary_templates(id,airport_id,name,description) values
 ('30000000-0000-4000-8000-000000000001','LIS','Demo snack and rest','Illustrative 100-minute plan.'),
 ('30000000-0000-4000-8000-000000000002','SIN','Demo meal and recharge','Illustrative 125-minute plan.')
on conflict(id) do nothing;
insert into public.template_items(template_id,airport_id,activity_id,position) values
 ('30000000-0000-4000-8000-000000000001','LIS','10000000-0000-4000-8000-000000000001',1),
 ('30000000-0000-4000-8000-000000000001','LIS','10000000-0000-4000-8000-000000000002',2),
 ('30000000-0000-4000-8000-000000000002','SIN','20000000-0000-4000-8000-000000000001',1),
 ('30000000-0000-4000-8000-000000000002','SIN','20000000-0000-4000-8000-000000000003',2)
on conflict do nothing;
commit;
