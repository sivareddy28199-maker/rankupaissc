-- ============ helpers ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ roles ============
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ profiles ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  target_exam_code text NOT NULL DEFAULT 'SSC-CGL',
  target_year int NOT NULL DEFAULT 2026,
  target_date date,
  study_level text NOT NULL DEFAULT 'beginner',
  daily_question_goal int NOT NULL DEFAULT 30,
  daily_minutes_goal int NOT NULL DEFAULT 90,
  preferred_subjects text[] NOT NULL DEFAULT '{}',
  current_streak int NOT NULL DEFAULT 0,
  longest_streak int NOT NULL DEFAULT 0,
  last_active_date date,
  plan_tier text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
          NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ content ============
CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  marks_correct numeric NOT NULL DEFAULT 2,
  marks_wrong numeric NOT NULL DEFAULT -0.5,
  marks_skipped numeric NOT NULL DEFAULT 0,
  default_duration_minutes int NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, slug)
);
CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, slug)
);
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'mcq',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer text NOT NULL,
  explanation text,
  difficulty text NOT NULL DEFAULT 'medium',
  source text,
  year int,
  tags text[] NOT NULL DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_questions_topic ON public.questions(topic_id);
CREATE INDEX idx_questions_subject ON public.questions(subject_id);
CREATE INDEX idx_questions_difficulty ON public.questions(difficulty);
CREATE TRIGGER questions_updated BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  test_type text NOT NULL DEFAULT 'mock',
  duration_minutes int NOT NULL DEFAULT 60,
  total_questions int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  UNIQUE (test_id, question_id)
);

GRANT SELECT ON public.exams, public.subjects, public.topics, public.questions, public.tests, public.test_questions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.exams, public.subjects, public.topics, public.questions, public.tests, public.test_questions TO authenticated;
GRANT ALL ON public.exams, public.subjects, public.topics, public.questions, public.tests, public.test_questions TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read exams" ON public.exams FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write exams" ON public.exams FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "read subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write subjects" ON public.subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "read topics" ON public.topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write topics" ON public.topics FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "read questions" ON public.questions FOR SELECT TO authenticated USING (is_published OR public.has_role(auth.uid(),'admin') OR created_by = auth.uid());
CREATE POLICY "admin write questions" ON public.questions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "read tests" ON public.tests FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write tests" ON public.tests FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "read test_questions" ON public.test_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write test_questions" ON public.test_questions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ practice ============
CREATE TABLE public.practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id uuid REFERENCES public.exams(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  difficulty text,
  total_questions int NOT NULL DEFAULT 0,
  correct_count int NOT NULL DEFAULT 0,
  wrong_count int NOT NULL DEFAULT 0,
  skipped_count int NOT NULL DEFAULT 0,
  time_spent_seconds int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE TABLE public.practice_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_answer text,
  correct_answer text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  time_taken_seconds int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_practice_answers_user ON public.practice_answers(user_id, created_at DESC);

-- ============ tests attempts ============
CREATE TABLE public.test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress',
  score numeric NOT NULL DEFAULT 0,
  max_marks numeric NOT NULL DEFAULT 0,
  correct_count int NOT NULL DEFAULT 0,
  wrong_count int NOT NULL DEFAULT 0,
  skipped_count int NOT NULL DEFAULT 0,
  accuracy numeric NOT NULL DEFAULT 0,
  time_spent_seconds int NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz
);
CREATE INDEX idx_test_attempts_user ON public.test_attempts(user_id, started_at DESC);
CREATE TABLE public.test_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_answer text,
  is_correct boolean,
  marked_for_review boolean NOT NULL DEFAULT false,
  time_taken_seconds int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

-- ============ revision ============
CREATE TABLE public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);
CREATE TABLE public.revision_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'question',
  difficulty text NOT NULL DEFAULT 'medium',
  review_count int NOT NULL DEFAULT 0,
  interval_days int NOT NULL DEFAULT 1,
  last_reviewed_at timestamptz,
  next_review_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_revision_due ON public.revision_items(user_id, next_review_date);

CREATE TABLE public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity text NOT NULL,
  minutes int NOT NULL DEFAULT 0,
  occurred_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.daily_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_date date NOT NULL DEFAULT current_date,
  question_goal int NOT NULL DEFAULT 30,
  questions_done int NOT NULL DEFAULT 0,
  minutes_goal int NOT NULL DEFAULT 90,
  minutes_done int NOT NULL DEFAULT 0,
  UNIQUE (user_id, goal_date)
);

-- ============ AI ============
CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New chat',
  kind text NOT NULL DEFAULT 'doubt',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_messages_conv ON public.ai_messages(conversation_id, created_at);
CREATE TABLE public.ai_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  topic text,
  subject text,
  difficulty text NOT NULL DEFAULT 'medium',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER ai_notes_updated BEFORE UPDATE ON public.ai_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.ai_study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_code text NOT NULL DEFAULT 'SSC-CGL',
  target_date date,
  daily_minutes int NOT NULL DEFAULT 90,
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  capability text NOT NULL,
  provider text NOT NULL,
  model text,
  tokens_used int NOT NULL DEFAULT 0,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_generations_user_day ON public.ai_generations(user_id, created_at DESC);

-- user-owned RLS for all activity tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['practice_sessions','practice_answers','test_attempts','test_answers','bookmarks','revision_items','study_sessions','daily_goals','ai_conversations','ai_messages','ai_notes','ai_study_plans','ai_generations']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('CREATE POLICY "own rows" ON public.%I FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());', t);
    EXECUTE format('CREATE POLICY "admin read" ON public.%I FOR SELECT TO authenticated USING (public.has_role(auth.uid(),''admin''));', t);
  END LOOP;
END $$;

-- ============ SEED ============
INSERT INTO public.exams (code, name, description, marks_correct, marks_wrong, default_duration_minutes)
VALUES ('SSC-CGL','SSC CGL','Staff Selection Commission Combined Graduate Level',2,-0.5,60),
       ('CUET-PG','CUET PG','Common University Entrance Test (PG)',4,-1,120);

INSERT INTO public.subjects (exam_id, name, slug, sort_order)
SELECT e.id, s.name, s.slug, s.ord FROM public.exams e,
(VALUES ('Quantitative Aptitude','quant',1),('Reasoning','reasoning',2),('English','english',3),('General Awareness','ga',4)) AS s(name,slug,ord)
WHERE e.code='SSC-CGL';

INSERT INTO public.topics (subject_id, name, slug, sort_order)
SELECT sub.id, t.name, lower(regexp_replace(t.name,'[^a-zA-Z0-9]+','-','g')), t.ord
FROM public.subjects sub
JOIN public.exams e ON e.id=sub.exam_id AND e.code='SSC-CGL'
JOIN (VALUES
 ('quant','Number System',1),('quant','Percentage',2),('quant','Ratio & Proportion',3),('quant','Average',4),
 ('quant','Profit & Loss',5),('quant','Simple Interest',6),('quant','Compound Interest',7),('quant','Time & Work',8),
 ('quant','Time, Speed & Distance',9),('quant','Algebra',10),('quant','Geometry',11),('quant','Mensuration',12),
 ('quant','Trigonometry',13),('quant','Data Interpretation',14),
 ('reasoning','Analogy',1),('reasoning','Classification',2),('reasoning','Series',3),('reasoning','Coding-Decoding',4),
 ('reasoning','Blood Relations',5),('reasoning','Direction Sense',6),('reasoning','Ranking',7),('reasoning','Syllogism',8),
 ('reasoning','Venn Diagrams',9),('reasoning','Statement & Conclusion',10),('reasoning','Mathematical Operations',11),
 ('reasoning','Non-verbal Reasoning',12),
 ('english','Vocabulary',1),('english','Grammar',2),('english','Error Detection',3),('english','Sentence Improvement',4),
 ('english','Fill in the Blanks',5),('english','Synonyms',6),('english','Antonyms',7),('english','Idioms',8),
 ('english','One Word Substitution',9),('english','Reading Comprehension',10),
 ('ga','History',1),('ga','Geography',2),('ga','Polity',3),('ga','Economics',4),('ga','General Science',5),
 ('ga','Static GK',6),('ga','Current Affairs',7)
) AS t(subject_slug,name,ord) ON t.subject_slug = sub.slug;
