-- 1. SSC CGL only
DELETE FROM public.exams WHERE code <> 'SSC-CGL';
UPDATE public.profiles SET target_exam_code = 'SSC-CGL' WHERE target_exam_code <> 'SSC-CGL';

-- 2. Official SSC CGL subject names
UPDATE public.subjects SET name = 'General Intelligence & Reasoning' WHERE name = 'Reasoning';
UPDATE public.subjects SET name = 'English Language & Comprehension' WHERE name = 'English';

-- 3. Official topic list
DO $$
DECLARE
  v RECORD;
  sid uuid;
  next_order int;
BEGIN
  FOR v IN
    SELECT * FROM (VALUES
      ('Quantitative Aptitude','Number Systems'),
      ('Quantitative Aptitude','Fundamental Arithmetical Operations'),
      ('Quantitative Aptitude','Discount'),
      ('Quantitative Aptitude','Partnership'),
      ('Quantitative Aptitude','Mixture & Alligation'),
      ('General Intelligence & Reasoning','Logical Reasoning'),
      ('General Intelligence & Reasoning','Mirror & Water Images'),
      ('General Intelligence & Reasoning','Paper Folding & Cutting'),
      ('General Intelligence & Reasoning','Embedded Figures'),
      ('General Intelligence & Reasoning','Missing Figures'),
      ('General Intelligence & Reasoning','Distance & Direction'),
      ('English Language & Comprehension','Spelling'),
      ('English Language & Comprehension','Active & Passive Voice'),
      ('English Language & Comprehension','Direct & Indirect Speech'),
      ('English Language & Comprehension','Cloze Test'),
      ('English Language & Comprehension','Para Jumbles'),
      ('English Language & Comprehension','Error Spotting'),
      ('General Awareness','Indian Polity'),
      ('General Awareness','Indian Economy'),
      ('General Awareness','Physics'),
      ('General Awareness','Chemistry'),
      ('General Awareness','Biology'),
      ('General Awareness','Art & Culture'),
      ('General Awareness','Government Schemes'),
      ('General Awareness','Awards & Honours'),
      ('General Awareness','Books & Authors'),
      ('General Awareness','Sports'),
      ('General Awareness','Important Days'),
      ('General Awareness','Countries, Capitals & Currencies'),
      ('General Awareness','Organizations & Headquarters')
    ) AS t(subject_name, topic_name)
  LOOP
    SELECT id INTO sid FROM public.subjects WHERE name = v.subject_name LIMIT 1;
    CONTINUE WHEN sid IS NULL;
    IF EXISTS (SELECT 1 FROM public.topics WHERE subject_id = sid AND lower(name) = lower(v.topic_name)) THEN
      CONTINUE;
    END IF;
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO next_order FROM public.topics WHERE subject_id = sid;
    INSERT INTO public.topics (subject_id, name, slug, sort_order)
    VALUES (
      sid,
      v.topic_name,
      regexp_replace(lower(trim(v.topic_name)), '[^a-z0-9]+', '-', 'g'),
      next_order
    );
  END LOOP;
END $$;