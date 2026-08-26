REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- starter questions
INSERT INTO public.questions (exam_id, subject_id, topic_id, question_text, question_type, options, correct_answer, explanation, difficulty, source, year, tags)
SELECT e.id, s.id, t.id, q.qt, 'mcq', q.opts::jsonb, q.ans, q.exp, q.diff, 'RankUp Seed', 2024, ARRAY[t.slug]
FROM public.exams e
JOIN public.subjects s ON s.exam_id = e.id
JOIN public.topics t ON t.subject_id = s.id
JOIN (VALUES
('percentage','If 40% of a number is 120, what is the number?','["200","300","280","320"]','300','40% of x = 120 → x = 120 × 100/40 = 300.','easy'),
('percentage','A price rises 20% then falls 20%. Net change is:','["0%","-4%","+4%","-2%"]','-4%','Net = +20 -20 - (20×20)/100 = -4%.','medium'),
('percentage','What percent of 250 is 65?','["24%","26%","28%","30%"]','26%','65/250 × 100 = 26%.','easy'),
('profit-loss','An item bought for 400 is sold for 460. Profit percent is:','["12%","15%","18%","20%"]','15%','Profit = 60; 60/400 × 100 = 15%.','easy'),
('profit-loss','Selling at 20% loss gives 640. Cost price is:','["760","800","820","860"]','800','CP = 640/0.8 = 800.','medium'),
('average','Average of first 10 natural numbers is:','["5","5.5","6","6.5"]','5.5','(1+..+10)/10 = 55/10 = 5.5.','easy'),
('time-work','A does a job in 12 days, B in 24 days. Together they take:','["6 days","8 days","9 days","10 days"]','8 days','1/12 + 1/24 = 3/24 = 1/8 → 8 days.','medium'),
('time-speed-distance','A train 150 m long crosses a pole in 15 s. Its speed is:','["36 km/h","40 km/h","45 km/h","54 km/h"]','36 km/h','10 m/s = 36 km/h.','medium'),
('simple-interest','SI on 5000 at 8% for 3 years is:','["1000","1100","1200","1250"]','1200','5000×8×3/100 = 1200.','easy'),
('number-system','The smallest prime number greater than 90 is:','["91","93","97","99"]','97','97 is prime; 91=7×13, 93=3×31, 99=9×11.','easy'),
('series','Find the next term: 2, 6, 12, 20, 30, ?','["40","42","44","46"]','42','Differences 4,6,8,10,12 → 30+12 = 42.','easy'),
('coding-decoding','If CAT is coded as DBU, then DOG is coded as:','["EPH","EPG","FPH","DPH"]','EPH','Each letter shifts +1.','easy'),
('blood-relations','Pointing to a man, Rita said, "He is my mother''s only son." The man is Rita''s:','["Father","Brother","Uncle","Cousin"]','Brother','Mother''s only son is her brother.','easy'),
('direction-sense','Walking 5 km north then 5 km east, your direction from start is:','["North-East","South-East","North-West","South-West"]','North-East','Net displacement is towards north-east.','easy'),
('syllogism','All roses are flowers. Some flowers fade quickly. Conclusion: All roses fade quickly.','["True","False","Cannot be determined","Partially true"]','Cannot be determined','Some flowers fading does not cover all roses.','medium'),
('analogy','Doctor : Hospital :: Teacher : ?','["Student","School","Book","Lesson"]','School','Workplace relation.','easy'),
('synonyms','Choose the synonym of ABUNDANT:','["Scarce","Plentiful","Tiny","Weak"]','Plentiful','Abundant means existing in large quantities.','easy'),
('antonyms','Choose the antonym of BENEVOLENT:','["Kind","Generous","Malevolent","Gentle"]','Malevolent','Malevolent means wishing harm.','easy'),
('error-detection','Find the error: "He do not like coffee."','["He","do not","like","coffee"]','do not','Should be "does not" for third person singular.','easy'),
('one-word-substitution','One who cannot read or write:','["Ignorant","Illiterate","Innocent","Illegible"]','Illiterate','Illiterate = unable to read or write.','easy'),
('idioms','"To let the cat out of the bag" means:','["To free an animal","To reveal a secret","To cause trouble","To waste time"]','To reveal a secret','Common idiom.','easy'),
('grammar','Choose the correct sentence:','["She have gone home","She has went home","She has gone home","She had went home"]','She has gone home','Correct present perfect form.','easy'),
('polity','How many fundamental rights are guaranteed by the Indian Constitution?','["5","6","7","8"]','6','Six fundamental rights currently.','easy'),
('history','The Quit India Movement was launched in:','["1930","1935","1942","1947"]','1942','Launched on 8 August 1942.','easy'),
('geography','The longest river in India is:','["Yamuna","Godavari","Ganga","Brahmaputra"]','Ganga','Ganga is the longest river within India.','easy'),
('general-science','The chemical symbol of Sodium is:','["S","So","Na","Sn"]','Na','From Latin natrium.','easy'),
('economics','Repo rate in India is decided by:','["SEBI","RBI","Finance Ministry","NITI Aayog"]','RBI','Set by the RBI Monetary Policy Committee.','easy'),
('static-gk','The headquarters of UNESCO is located in:','["Geneva","Paris","New York","Vienna"]','Paris','UNESCO is headquartered in Paris.','easy'),
('geometry','The sum of interior angles of a triangle is:','["90°","180°","270°","360°"]','180°','Standard triangle property.','easy'),
('mensuration','Area of a circle of radius 7 cm (π = 22/7) is:','["144 cm²","154 cm²","164 cm²","174 cm²"]','154 cm²','πr² = 22/7 × 49 = 154.','easy')
) AS q(topic_slug, qt, opts, ans, exp, diff) ON q.topic_slug = t.slug
WHERE e.code = 'SSC-CGL';

INSERT INTO public.tests (exam_id, title, description, test_type, duration_minutes, total_questions)
SELECT id, 'SSC CGL Starter Mock Test', 'A 20-question mixed mock covering all four sections.', 'full_mock', 20, 20 FROM public.exams WHERE code='SSC-CGL';

INSERT INTO public.test_questions (test_id, question_id, position)
SELECT t.id, q.id, row_number() OVER (ORDER BY random())
FROM public.tests t
JOIN public.questions q ON q.exam_id = t.exam_id
WHERE t.title = 'SSC CGL Starter Mock Test'
LIMIT 20;
