--
-- PostgreSQL database dump
--

\restrict UhoZpE9t14Raz9UUs9KVxPmtP4s7N9WKqJyILCdvNKsqH4pAgS5Vp0fwDhBWfmh

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    user_id bigint,
    action text NOT NULL,
    detail jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: exam_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_questions (
    session_id bigint NOT NULL,
    question_id bigint NOT NULL,
    "position" integer NOT NULL,
    options jsonb,
    answer_key text
);


--
-- Name: exam_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_sessions (
    id bigint NOT NULL,
    exam_id bigint NOT NULL,
    student_id bigint NOT NULL,
    status text DEFAULT 'not_started'::text NOT NULL,
    violation_count integer DEFAULT 0 NOT NULL,
    score numeric(7,2),
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    max_score numeric(7,2),
    last_ping_at timestamp with time zone,
    final_score numeric(5,2),
    CONSTRAINT exam_sessions_status_check CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text, 'locked'::text])))
);


--
-- Name: exam_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exam_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exam_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exam_sessions_id_seq OWNED BY public.exam_sessions.id;


--
-- Name: exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exams (
    id bigint NOT NULL,
    title text NOT NULL,
    bank_id bigint NOT NULL,
    class_name text NOT NULL,
    mc_count integer NOT NULL,
    essay_count integer NOT NULL,
    duration_minutes integer NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    entry_pin_hash text,
    entry_pin_updated_at timestamp with time zone,
    entry_pin_expires_at timestamp with time zone,
    entry_pin_issued_by bigint,
    CONSTRAINT exams_duration_minutes_check CHECK ((duration_minutes > 0)),
    CONSTRAINT exams_essay_count_check CHECK ((essay_count >= 0)),
    CONSTRAINT exams_mc_count_check CHECK ((mc_count >= 0)),
    CONSTRAINT exams_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'active'::text, 'completed'::text])))
);


--
-- Name: exams_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exams_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exams_id_seq OWNED BY public.exams.id;


--
-- Name: question_banks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_banks (
    id bigint NOT NULL,
    subject_id bigint NOT NULL,
    grade text NOT NULL,
    topic text NOT NULL,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: question_banks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.question_banks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: question_banks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.question_banks_id_seq OWNED BY public.question_banks.id;


--
-- Name: question_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_media (
    id bigint NOT NULL,
    question_id bigint NOT NULL,
    file_key text NOT NULL,
    mime_type text NOT NULL,
    file_size integer NOT NULL,
    alt_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT question_media_file_size_check CHECK (((file_size >= 1) AND (file_size <= 3145728))),
    CONSTRAINT question_media_mime_type_check CHECK ((mime_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text])))
);


--
-- Name: question_media_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.question_media_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: question_media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.question_media_id_seq OWNED BY public.question_media.id;


--
-- Name: question_stimuli; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_stimuli (
    id bigint NOT NULL,
    bank_id bigint NOT NULL,
    title text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    media_key text,
    media_alt_text text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: question_stimuli_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.question_stimuli_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: question_stimuli_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.question_stimuli_id_seq OWNED BY public.question_stimuli.id;


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id bigint NOT NULL,
    bank_id bigint NOT NULL,
    type text NOT NULL,
    prompt text NOT NULL,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    answer_key text DEFAULT ''::text NOT NULL,
    points numeric(7,2) DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    stimulus_id bigint,
    CONSTRAINT questions_type_check CHECK ((type = ANY (ARRAY['mc'::text, 'essay'::text, 'complex_mc'::text])))
);


--
-- Name: questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.questions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.questions_id_seq OWNED BY public.questions.id;


--
-- Name: responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.responses (
    session_id bigint NOT NULL,
    question_id bigint NOT NULL,
    answer text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    points_awarded numeric(7,2),
    graded_by bigint,
    graded_at timestamp with time zone,
    essay_score numeric(5,2)
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version integer NOT NULL,
    name text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: school_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_settings (
    id smallint DEFAULT 1 NOT NULL,
    school_name text DEFAULT 'IMBS Islamic School'::text NOT NULL,
    academic_year text DEFAULT '2026/2027'::text NOT NULL,
    semester text DEFAULT 'Ganjil'::text NOT NULL,
    classes jsonb DEFAULT '["VII A", "VII B", "VIII A", "VIII B", "IX A", "IX B"]'::jsonb NOT NULL,
    grades jsonb DEFAULT '["VII", "VIII", "IX"]'::jsonb NOT NULL,
    default_exam_duration_minutes integer DEFAULT 90 NOT NULL,
    violation_threshold integer DEFAULT 2 NOT NULL,
    updated_by bigint,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    mc_weight_percentage integer DEFAULT 50 NOT NULL,
    essay_weight_percentage integer DEFAULT 50 NOT NULL,
    CONSTRAINT school_settings_default_exam_duration_minutes_check CHECK (((default_exam_duration_minutes >= 1) AND (default_exam_duration_minutes <= 480))),
    CONSTRAINT school_settings_id_check CHECK ((id = 1)),
    CONSTRAINT school_settings_semester_check CHECK ((semester = ANY (ARRAY['Ganjil'::text, 'Genap'::text]))),
    CONSTRAINT school_settings_violation_threshold_check CHECK (((violation_threshold >= 1) AND (violation_threshold <= 10)))
);


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects (
    id bigint NOT NULL,
    name text NOT NULL,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    language_code text DEFAULT 'id'::text NOT NULL,
    text_direction text DEFAULT 'auto'::text NOT NULL
);


--
-- Name: subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subjects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subjects_id_seq OWNED BY public.subjects.id;


--
-- Name: teacher_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_access (
    teacher_id bigint NOT NULL,
    subject_id bigint NOT NULL,
    class_name text NOT NULL
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    username text NOT NULL,
    full_name text NOT NULL,
    role text NOT NULL,
    password_hash text NOT NULL,
    class_name text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'teacher'::text, 'pengawas'::text, 'student'::text, 'platform_owner'::text])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: violation_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.violation_events (
    id bigint NOT NULL,
    session_id bigint NOT NULL,
    code text NOT NULL,
    detail text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    review_status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by bigint,
    review_reason text,
    reviewed_at timestamp with time zone
);


--
-- Name: violation_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.violation_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: violation_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.violation_events_id_seq OWNED BY public.violation_events.id;


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: exam_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_sessions ALTER COLUMN id SET DEFAULT nextval('public.exam_sessions_id_seq'::regclass);


--
-- Name: exams id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams ALTER COLUMN id SET DEFAULT nextval('public.exams_id_seq'::regclass);


--
-- Name: question_banks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_banks ALTER COLUMN id SET DEFAULT nextval('public.question_banks_id_seq'::regclass);


--
-- Name: question_media id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_media ALTER COLUMN id SET DEFAULT nextval('public.question_media_id_seq'::regclass);


--
-- Name: question_stimuli id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_stimuli ALTER COLUMN id SET DEFAULT nextval('public.question_stimuli_id_seq'::regclass);


--
-- Name: questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions ALTER COLUMN id SET DEFAULT nextval('public.questions_id_seq'::regclass);


--
-- Name: subjects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects ALTER COLUMN id SET DEFAULT nextval('public.subjects_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: violation_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.violation_events ALTER COLUMN id SET DEFAULT nextval('public.violation_events_id_seq'::regclass);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, user_id, action, detail, created_at) FROM stdin;
1	1	login	{}	2026-09-29 06:53:36.616797+00
2	1	login	{}	2026-09-29 06:54:40.452849+00
3	1	bank.create	{"bankId": "3", "questionCount": 0}	2026-09-29 06:58:24.171268+00
4	1	exam.create	{"examId": "1", "participants": 2}	2026-09-29 06:59:32.788745+00
6	1	login	{}	2026-09-29 07:01:28.937732+00
7	1	login	{}	2026-09-29 07:09:31.256596+00
8	1	exam.create	{"examId": "2", "participants": 2}	2026-09-29 07:09:31.373644+00
9	1	exam.monitor_status	{"examId": "2", "status": "in_progress", "sessionId": "3"}	2026-09-29 07:09:31.424392+00
10	1	exam.monitor_status	{"examId": "2", "status": "completed", "sessionId": "4"}	2026-09-29 07:09:31.440283+00
11	1	exam.violation	{"count": 1, "examId": "2", "reason": "uji indikator warna", "sessionId": "4"}	2026-09-29 07:09:31.457013+00
12	1	login	{}	2026-09-29 07:11:35.827493+00
13	1	login	{}	2026-09-29 07:47:23.040937+00
14	1	login	{}	2026-09-29 07:47:37.512701+00
15	1	login	{}	2026-09-29 07:48:18.669571+00
1017	1	login	{}	2026-10-06 08:23:59.304861+00
1018	1	student.create	{"studentId": "573"}	2026-10-06 08:23:59.478249+00
1019	1	student.create	{"studentId": "574"}	2026-10-06 08:23:59.570555+00
1020	1	student.create	{"studentId": "575"}	2026-10-06 08:23:59.662986+00
1021	1	student.create	{"studentId": "576"}	2026-10-06 08:23:59.7702+00
1022	1	student.create	{"studentId": "577"}	2026-10-06 08:23:59.891637+00
25	1	login	{}	2026-09-29 07:51:01.103754+00
26	1	login	{}	2026-10-03 05:44:26.953907+00
28	1	login	{}	2026-10-03 05:45:32.986604+00
29	1	exam.create	{"examId": "4", "participants": 2}	2026-10-03 05:45:50.089486+00
31	1	login	{}	2026-10-03 05:46:13.509651+00
32	1	exam.pin_issue	{"examId": 4}	2026-10-03 05:46:20.312749+00
36	1	login	{}	2026-10-03 05:48:15.948791+00
42	1	login	{}	2026-10-03 05:51:54.353535+00
43	1	login	{}	2026-10-03 05:51:57.880542+00
44	1	essay.grade	{"examId": 4, "points": 1, "studentId": 3, "questionId": 5}	2026-10-03 05:52:31.537774+00
45	1	essay.grade	{"examId": 4, "points": 1, "studentId": 3, "questionId": 3}	2026-10-03 05:52:32.784179+00
46	1	essay.grade	{"examId": 4, "points": 1, "studentId": 4, "questionId": 5}	2026-10-03 05:52:41.227522+00
47	1	essay.grade	{"examId": 4, "points": 1, "studentId": 4, "questionId": 3}	2026-10-03 05:52:42.040546+00
49	1	login	{}	2026-10-03 05:52:59.254152+00
50	1	login	{}	2026-10-03 06:29:54.920928+00
51	1	exam.final_score	{"score": 60, "examId": 4, "studentId": 3}	2026-10-03 06:39:12.777372+00
52	1	exam.final_score	{"score": 75, "examId": 4, "studentId": 4}	2026-10-03 06:39:14.280606+00
53	1	login	{}	2026-10-05 02:40:46.519662+00
54	1	login	{}	2026-10-05 02:51:35.212312+00
55	1	login	{}	2026-10-05 03:03:12.821975+00
56	1	student.import	{"count": 0}	2026-10-05 03:03:34.565147+00
57	1	student.import	{"count": 0}	2026-10-05 03:03:55.533043+00
58	1	student.import	{"count": 2}	2026-10-05 03:04:44.151933+00
59	1	exam.final_score	{"score": 60, "examId": 4, "studentId": 3}	2026-10-05 03:06:02.697924+00
60	1	exam.final_score	{"score": 75, "examId": 4, "studentId": 4}	2026-10-05 03:06:03.736776+00
61	1	exam.final_score	{"score": 75, "examId": 4, "studentId": 4}	2026-10-05 03:06:04.28432+00
62	1	login	{}	2026-10-05 06:03:07.994733+00
1023	1	student.create	{"studentId": "578"}	2026-10-06 08:23:59.99005+00
1024	1	student.create	{"studentId": "579"}	2026-10-06 08:24:00.089894+00
1025	1	student.create	{"studentId": "580"}	2026-10-06 08:24:00.185159+00
1026	1	student.create	{"studentId": "581"}	2026-10-06 08:24:00.282831+00
1027	1	student.create	{"studentId": "582"}	2026-10-06 08:24:00.385031+00
1028	1	student.create	{"studentId": "583"}	2026-10-06 08:24:00.480213+00
1029	1	student.create	{"studentId": "584"}	2026-10-06 08:24:00.576874+00
71	1	login	{}	2026-10-05 06:04:39.995219+00
1030	1	student.create	{"studentId": "585"}	2026-10-06 08:24:00.690359+00
1031	1	student.create	{"studentId": "586"}	2026-10-06 08:24:00.816168+00
1032	1	student.create	{"studentId": "587"}	2026-10-06 08:24:00.926043+00
1033	1	student.create	{"studentId": "588"}	2026-10-06 08:24:01.025923+00
1034	1	student.create	{"studentId": "589"}	2026-10-06 08:24:01.122984+00
1035	1	student.create	{"studentId": "590"}	2026-10-06 08:24:01.212991+00
1036	1	student.create	{"studentId": "591"}	2026-10-06 08:24:01.305934+00
1037	1	student.create	{"studentId": "592"}	2026-10-06 08:24:01.567594+00
1038	1	student.create	{"studentId": "593"}	2026-10-06 08:24:01.687918+00
1039	1	student.create	{"studentId": "594"}	2026-10-06 08:24:01.809706+00
5	\N	login	{}	2026-09-29 07:01:03.106042+00
1040	1	student.create	{"studentId": "595"}	2026-10-06 08:24:01.931146+00
1118	1	login	{}	2026-10-06 08:24:51.318626+00
80	1	login	{}	2026-10-05 07:21:09.983278+00
81	1	login	{}	2026-10-06 03:43:33.832398+00
82	1	login	{}	2026-10-06 03:43:54.871903+00
83	1	student.create	{"studentId": "101"}	2026-10-06 03:45:34.705782+00
84	1	student.create	{"studentId": "102"}	2026-10-06 03:45:34.803563+00
85	1	student.create	{"studentId": "103"}	2026-10-06 03:45:34.904261+00
86	1	exam.create	{"examId": "7", "participants": 3}	2026-10-06 03:45:34.94701+00
87	1	exam.pin_issue	{"examId": 7}	2026-10-06 03:46:19.217002+00
88	1	exam.pin_issue	{"examId": 7, "rotated": true, "issuedAt": "2026-10-06T03:47:33.310Z", "expiresAt": "2026-10-06T03:48:33.310Z", "validityMinutes": 1}	2026-10-06 03:47:33.307575+00
90	1	login	{}	2026-10-06 03:49:40.498659+00
91	1	exam.pin_issue	{"examId": 7, "rotated": true, "issuedAt": "2026-10-06T03:49:59.092Z", "expiresAt": "2026-10-06T03:54:59.092Z", "validityMinutes": 5}	2026-10-06 03:49:59.088649+00
92	1	student.create	{"studentId": "111"}	2026-10-06 03:52:56.498361+00
93	1	student.create	{"studentId": "112"}	2026-10-06 03:52:56.591779+00
94	1	student.create	{"studentId": "113"}	2026-10-06 03:52:56.686901+00
95	1	exam.create	{"examId": "8", "participants": 3}	2026-10-06 03:52:56.732882+00
96	1	exam.pin_issue	{"examId": 8, "rotated": false, "issuedAt": "2026-10-06T03:53:50.408Z", "expiresAt": "2026-10-06T04:08:50.408Z", "validityMinutes": 15}	2026-10-06 03:53:50.404529+00
98	1	login	{}	2026-10-06 03:55:57.527042+00
99	1	exam.pin_issue	{"examId": 8, "rotated": true, "issuedAt": "2026-10-06T03:56:23.677Z", "expiresAt": "2026-10-06T03:57:23.677Z", "validityMinutes": 1}	2026-10-06 03:56:23.674846+00
100	1	login	{}	2026-10-06 04:01:40.112523+00
101	1	login	{}	2026-10-06 04:01:48.46362+00
107	1	student.create	{"studentId": "124"}	2026-10-06 04:03:43.141254+00
108	1	student.create	{"studentId": "125"}	2026-10-06 04:03:43.248481+00
109	1	student.create	{"studentId": "126"}	2026-10-06 04:03:43.376285+00
110	1	exam.create	{"examId": "11", "participants": 3}	2026-10-06 04:03:43.423898+00
111	1	exam.create	{"examId": "12", "participants": 3}	2026-10-06 04:03:43.508517+00
112	1	exam.pin_issue	{"examId": 11, "rotated": false, "issuedAt": "2026-10-06T04:03:43.680Z", "expiresAt": "2026-10-06T04:33:43.680Z", "validityMinutes": 30}	2026-10-06 04:03:43.677586+00
113	1	exam.pin_issue	{"examId": 11, "rotated": true, "issuedAt": "2026-10-06T04:03:43.782Z", "expiresAt": "2026-10-06T04:33:43.782Z", "validityMinutes": 30}	2026-10-06 04:03:43.781039+00
117	1	exam.violation_review	{"count": 0, "examId": 11, "reason": "Synthetic test: benign focus change", "status": "in_progress", "eventId": 15, "decision": "dismiss", "sessionId": 25}	2026-10-06 04:03:45.953494+00
119	1	exam.violation_review	{"count": 1, "examId": 11, "reason": "Synthetic test: confirmed review 1", "status": "in_progress", "eventId": 16, "decision": "confirm", "sessionId": 25}	2026-10-06 04:03:46.030795+00
124	1	exam.violation_review	{"count": 2, "examId": 11, "reason": "Synthetic test: confirmed review 2", "status": "in_progress", "eventId": 17, "decision": "confirm", "sessionId": 25}	2026-10-06 04:04:57.58388+00
125	1	exam.violation_review	{"count": 3, "examId": 11, "reason": "Synthetic test: confirmed review 3", "status": "locked", "eventId": 18, "decision": "confirm", "sessionId": 25}	2026-10-06 04:04:57.62492+00
126	1	exam.session_reset	{"examId": 11, "reason": "Synthetic test: eligible recovery after confirmed review", "sessionId": 25}	2026-10-06 04:04:57.642983+00
127	1	exam.pin_issue	{"examId": 12, "rotated": false, "issuedAt": "2026-10-06T04:04:57.808Z", "expiresAt": "2026-10-06T04:05:57.808Z", "validityMinutes": 1}	2026-10-06 04:04:57.806836+00
130	1	login	{}	2026-10-06 04:06:06.440253+00
131	1	exam.pin_issue	{"examId": 11, "rotated": true, "issuedAt": "2026-10-06T04:06:06.569Z", "expiresAt": "2026-10-06T04:16:06.569Z", "validityMinutes": 10}	2026-10-06 04:06:06.56547+00
134	1	exam.violation_review	{"count": 0, "examId": 11, "reason": "Edge synthetic false positive", "status": "in_progress", "eventId": 20, "decision": "dismiss", "sessionId": 26}	2026-10-06 04:06:07.698257+00
136	1	login	{}	2026-10-06 04:07:29.987301+00
137	1	login	{}	2026-10-06 04:07:56.184+00
138	1	login	{}	2026-10-06 04:08:09.992199+00
141	1	login	{}	2026-10-06 04:09:04.835588+00
142	1	login	{}	2026-10-06 04:10:07.769745+00
143	1	exam.violation_review	{"count": 0, "examId": 11, "reason": "Synthetic UI dismissal reason", "status": "in_progress", "eventId": 21, "decision": "dismiss", "sessionId": 25}	2026-10-06 04:10:44.20757+00
145	1	exam.pin_issue	{"examId": 11, "rotated": true, "issuedAt": "2026-10-06T04:25:10.315Z", "expiresAt": "2026-10-06T04:35:10.315Z", "validityMinutes": 10}	2026-10-06 04:25:10.313927+00
1041	1	student.create	{"studentId": "596"}	2026-10-06 08:24:02.060565+00
1042	1	student.create	{"studentId": "597"}	2026-10-06 08:24:02.186221+00
1043	1	student.create	{"studentId": "598"}	2026-10-06 08:24:02.30867+00
1044	1	student.create	{"studentId": "599"}	2026-10-06 08:24:02.434182+00
1045	1	student.create	{"studentId": "600"}	2026-10-06 08:24:02.553397+00
152	1	login	{}	2026-10-06 04:37:02.811827+00
1046	1	student.create	{"studentId": "601"}	2026-10-06 08:24:02.672189+00
1047	1	student.create	{"studentId": "602"}	2026-10-06 08:24:02.793054+00
1048	1	student.create	{"studentId": "603"}	2026-10-06 08:24:02.920468+00
1049	1	student.create	{"studentId": "604"}	2026-10-06 08:24:03.042036+00
1050	1	student.create	{"studentId": "605"}	2026-10-06 08:24:03.168754+00
1051	1	student.create	{"studentId": "606"}	2026-10-06 08:24:03.297876+00
159	1	login	{}	2026-10-06 04:37:26.896366+00
1052	1	student.create	{"studentId": "607"}	2026-10-06 08:24:03.419405+00
1053	1	student.create	{"studentId": "608"}	2026-10-06 08:24:03.540129+00
1054	1	student.create	{"studentId": "609"}	2026-10-06 08:24:03.660677+00
1055	1	student.create	{"studentId": "610"}	2026-10-06 08:24:03.781731+00
1056	1	student.create	{"studentId": "611"}	2026-10-06 08:24:03.905547+00
1057	1	student.create	{"studentId": "612"}	2026-10-06 08:24:04.046178+00
1058	1	student.create	{"studentId": "613"}	2026-10-06 08:24:04.167064+00
167	1	login	{}	2026-10-06 04:40:17.005915+00
1059	1	student.create	{"studentId": "614"}	2026-10-06 08:24:04.303045+00
1060	1	student.create	{"studentId": "615"}	2026-10-06 08:24:04.571706+00
1061	1	student.create	{"studentId": "616"}	2026-10-06 08:24:04.821134+00
1062	1	student.create	{"studentId": "617"}	2026-10-06 08:24:04.975286+00
1063	1	student.create	{"studentId": "618"}	2026-10-06 08:24:05.097143+00
1064	1	student.create	{"studentId": "619"}	2026-10-06 08:24:05.220464+00
1065	1	student.create	{"studentId": "620"}	2026-10-06 08:24:05.343122+00
1066	1	student.create	{"studentId": "621"}	2026-10-06 08:24:05.477517+00
1067	1	student.create	{"studentId": "622"}	2026-10-06 08:24:05.609355+00
1068	1	student.create	{"studentId": "623"}	2026-10-06 08:24:05.74178+00
1069	1	student.create	{"studentId": "624"}	2026-10-06 08:24:05.881757+00
1070	1	student.create	{"studentId": "625"}	2026-10-06 08:24:05.999473+00
1071	1	student.create	{"studentId": "626"}	2026-10-06 08:24:06.112407+00
1072	1	student.create	{"studentId": "627"}	2026-10-06 08:24:06.224312+00
1073	1	student.create	{"studentId": "628"}	2026-10-06 08:24:06.349113+00
1074	1	student.create	{"studentId": "629"}	2026-10-06 08:24:06.468296+00
1075	1	student.create	{"studentId": "630"}	2026-10-06 08:24:06.583303+00
1076	1	student.create	{"studentId": "631"}	2026-10-06 08:24:06.704658+00
1077	1	student.create	{"studentId": "632"}	2026-10-06 08:24:06.824504+00
1078	1	student.create	{"studentId": "633"}	2026-10-06 08:24:06.942053+00
1079	1	student.create	{"studentId": "634"}	2026-10-06 08:24:07.058853+00
1080	1	student.create	{"studentId": "635"}	2026-10-06 08:24:07.171554+00
1081	1	student.create	{"studentId": "636"}	2026-10-06 08:24:07.284591+00
1082	1	student.create	{"studentId": "637"}	2026-10-06 08:24:07.403818+00
1083	1	student.create	{"studentId": "638"}	2026-10-06 08:24:07.517417+00
1084	1	student.create	{"studentId": "639"}	2026-10-06 08:24:07.631277+00
1085	1	student.create	{"studentId": "640"}	2026-10-06 08:24:07.742516+00
1086	1	student.create	{"studentId": "641"}	2026-10-06 08:24:07.860846+00
1087	1	student.create	{"studentId": "642"}	2026-10-06 08:24:07.976507+00
1088	1	student.create	{"studentId": "643"}	2026-10-06 08:24:08.088571+00
1089	1	student.create	{"studentId": "644"}	2026-10-06 08:24:08.211941+00
1090	1	student.create	{"studentId": "645"}	2026-10-06 08:24:08.340729+00
1091	1	student.create	{"studentId": "646"}	2026-10-06 08:24:08.461556+00
1092	1	student.create	{"studentId": "647"}	2026-10-06 08:24:08.581134+00
1093	1	student.create	{"studentId": "648"}	2026-10-06 08:24:08.692633+00
1094	1	student.create	{"studentId": "649"}	2026-10-06 08:24:08.807433+00
1095	1	student.create	{"studentId": "650"}	2026-10-06 08:24:08.937117+00
1096	1	student.create	{"studentId": "651"}	2026-10-06 08:24:09.095631+00
1097	1	student.create	{"studentId": "652"}	2026-10-06 08:24:09.241705+00
1098	1	student.create	{"studentId": "653"}	2026-10-06 08:24:09.372571+00
1099	1	student.create	{"studentId": "654"}	2026-10-06 08:24:09.50321+00
1100	1	student.create	{"studentId": "655"}	2026-10-06 08:24:09.637769+00
1101	1	student.create	{"studentId": "656"}	2026-10-06 08:24:09.763109+00
1102	1	student.create	{"studentId": "657"}	2026-10-06 08:24:09.905154+00
1103	1	student.create	{"studentId": "658"}	2026-10-06 08:24:10.065914+00
1104	1	student.create	{"studentId": "659"}	2026-10-06 08:24:10.198003+00
1105	1	student.create	{"studentId": "660"}	2026-10-06 08:24:10.320057+00
1106	1	student.create	{"studentId": "661"}	2026-10-06 08:24:10.437695+00
1107	1	student.create	{"studentId": "662"}	2026-10-06 08:24:10.531934+00
1108	1	student.create	{"studentId": "663"}	2026-10-06 08:24:10.623056+00
1109	1	student.create	{"studentId": "664"}	2026-10-06 08:24:10.717294+00
1110	1	student.create	{"studentId": "665"}	2026-10-06 08:24:10.817565+00
1111	1	student.create	{"studentId": "666"}	2026-10-06 08:24:11.009015+00
1112	1	student.create	{"studentId": "667"}	2026-10-06 08:24:11.165337+00
1113	1	student.create	{"studentId": "668"}	2026-10-06 08:24:11.325296+00
1114	1	student.create	{"studentId": "669"}	2026-10-06 08:24:11.451705+00
1115	1	student.create	{"studentId": "670"}	2026-10-06 08:24:11.565102+00
1116	1	student.create	{"studentId": "671"}	2026-10-06 08:24:11.704743+00
1117	1	student.create	{"studentId": "672"}	2026-10-06 08:24:11.87867+00
1119	1	student.create	{"studentId": "673"}	2026-10-06 08:24:51.472385+00
1120	1	student.create	{"studentId": "674"}	2026-10-06 08:24:51.580462+00
1121	1	student.create	{"studentId": "675"}	2026-10-06 08:24:51.688759+00
1122	1	student.create	{"studentId": "676"}	2026-10-06 08:24:51.795385+00
1123	1	student.create	{"studentId": "677"}	2026-10-06 08:24:51.887417+00
1124	1	student.create	{"studentId": "678"}	2026-10-06 08:24:51.983037+00
1125	1	student.create	{"studentId": "679"}	2026-10-06 08:24:52.088903+00
1126	1	student.create	{"studentId": "680"}	2026-10-06 08:24:52.184219+00
1127	1	student.create	{"studentId": "681"}	2026-10-06 08:24:52.278223+00
1128	1	student.create	{"studentId": "682"}	2026-10-06 08:24:52.370856+00
1129	1	student.create	{"studentId": "683"}	2026-10-06 08:24:52.462647+00
1130	1	student.create	{"studentId": "684"}	2026-10-06 08:24:52.558893+00
1131	1	student.create	{"studentId": "685"}	2026-10-06 08:24:52.649739+00
1132	1	student.create	{"studentId": "686"}	2026-10-06 08:24:52.742133+00
1133	1	student.create	{"studentId": "687"}	2026-10-06 08:24:52.838014+00
1134	1	student.create	{"studentId": "688"}	2026-10-06 08:24:52.928679+00
1135	1	student.create	{"studentId": "689"}	2026-10-06 08:24:53.01959+00
1136	1	student.create	{"studentId": "690"}	2026-10-06 08:24:53.111018+00
1137	1	student.create	{"studentId": "691"}	2026-10-06 08:24:53.203167+00
1138	1	student.create	{"studentId": "692"}	2026-10-06 08:24:53.296248+00
1139	1	student.create	{"studentId": "693"}	2026-10-06 08:24:53.386746+00
1140	1	student.create	{"studentId": "694"}	2026-10-06 08:24:53.482976+00
1141	1	student.create	{"studentId": "695"}	2026-10-06 08:24:53.578648+00
1142	1	student.create	{"studentId": "696"}	2026-10-06 08:24:53.67336+00
1143	1	student.create	{"studentId": "697"}	2026-10-06 08:24:53.766695+00
1144	1	student.create	{"studentId": "698"}	2026-10-06 08:24:53.858152+00
1145	1	student.create	{"studentId": "699"}	2026-10-06 08:24:53.949969+00
1146	1	student.create	{"studentId": "700"}	2026-10-06 08:24:54.04155+00
1147	1	student.create	{"studentId": "701"}	2026-10-06 08:24:54.13445+00
1148	1	student.create	{"studentId": "702"}	2026-10-06 08:24:54.229245+00
1149	1	student.create	{"studentId": "703"}	2026-10-06 08:24:54.323551+00
1150	1	student.create	{"studentId": "704"}	2026-10-06 08:24:54.418406+00
1151	1	student.create	{"studentId": "705"}	2026-10-06 08:24:54.512316+00
1152	1	student.create	{"studentId": "706"}	2026-10-06 08:24:54.621329+00
1153	1	student.create	{"studentId": "707"}	2026-10-06 08:24:54.723363+00
1154	1	student.create	{"studentId": "708"}	2026-10-06 08:24:54.814474+00
1155	1	student.create	{"studentId": "709"}	2026-10-06 08:24:54.904329+00
1156	1	student.create	{"studentId": "710"}	2026-10-06 08:24:54.996917+00
1157	1	student.create	{"studentId": "711"}	2026-10-06 08:24:55.087785+00
1158	1	student.create	{"studentId": "712"}	2026-10-06 08:24:55.18014+00
1159	1	student.create	{"studentId": "713"}	2026-10-06 08:24:55.269393+00
1160	1	student.create	{"studentId": "714"}	2026-10-06 08:24:55.364202+00
1161	1	student.create	{"studentId": "715"}	2026-10-06 08:24:55.457184+00
1162	1	student.create	{"studentId": "716"}	2026-10-06 08:24:55.550001+00
1163	1	student.create	{"studentId": "717"}	2026-10-06 08:24:55.654583+00
1164	1	student.create	{"studentId": "718"}	2026-10-06 08:24:55.755316+00
1165	1	student.create	{"studentId": "719"}	2026-10-06 08:24:55.845462+00
1166	1	student.create	{"studentId": "720"}	2026-10-06 08:24:55.940072+00
1167	1	student.create	{"studentId": "721"}	2026-10-06 08:24:56.032093+00
1168	1	student.create	{"studentId": "722"}	2026-10-06 08:24:56.128668+00
1169	1	student.create	{"studentId": "723"}	2026-10-06 08:24:56.21892+00
1170	1	student.create	{"studentId": "724"}	2026-10-06 08:24:56.312793+00
1171	1	student.create	{"studentId": "725"}	2026-10-06 08:24:56.409111+00
1172	1	student.create	{"studentId": "726"}	2026-10-06 08:24:56.500876+00
1173	1	student.create	{"studentId": "727"}	2026-10-06 08:24:56.620805+00
1174	1	student.create	{"studentId": "728"}	2026-10-06 08:24:56.714513+00
1175	1	student.create	{"studentId": "729"}	2026-10-06 08:24:56.825221+00
1176	1	student.create	{"studentId": "730"}	2026-10-06 08:24:56.916895+00
1177	1	student.create	{"studentId": "731"}	2026-10-06 08:24:57.009298+00
1178	1	student.create	{"studentId": "732"}	2026-10-06 08:24:57.103082+00
1179	1	student.create	{"studentId": "733"}	2026-10-06 08:24:57.193555+00
1180	1	student.create	{"studentId": "734"}	2026-10-06 08:24:57.282354+00
1181	1	student.create	{"studentId": "735"}	2026-10-06 08:24:57.382815+00
1182	1	student.create	{"studentId": "736"}	2026-10-06 08:24:57.474152+00
1183	1	student.create	{"studentId": "737"}	2026-10-06 08:24:57.566395+00
1184	1	student.create	{"studentId": "738"}	2026-10-06 08:24:57.657737+00
1185	1	student.create	{"studentId": "739"}	2026-10-06 08:24:57.752877+00
1186	1	student.create	{"studentId": "740"}	2026-10-06 08:24:57.847061+00
1187	1	student.create	{"studentId": "741"}	2026-10-06 08:24:57.940495+00
1188	1	student.create	{"studentId": "742"}	2026-10-06 08:24:58.033543+00
1189	1	student.create	{"studentId": "743"}	2026-10-06 08:24:58.123535+00
1190	1	student.create	{"studentId": "744"}	2026-10-06 08:24:58.212822+00
1191	1	student.create	{"studentId": "745"}	2026-10-06 08:24:58.304808+00
1192	1	student.create	{"studentId": "746"}	2026-10-06 08:24:58.396151+00
1193	1	student.create	{"studentId": "747"}	2026-10-06 08:24:58.48992+00
1194	1	student.create	{"studentId": "748"}	2026-10-06 08:24:58.582921+00
1195	1	student.create	{"studentId": "749"}	2026-10-06 08:24:58.672231+00
1196	1	student.create	{"studentId": "750"}	2026-10-06 08:24:58.764029+00
1197	1	student.create	{"studentId": "751"}	2026-10-06 08:24:58.901195+00
1198	1	student.create	{"studentId": "752"}	2026-10-06 08:24:59.142881+00
1199	1	student.create	{"studentId": "753"}	2026-10-06 08:24:59.270135+00
1200	1	student.create	{"studentId": "754"}	2026-10-06 08:24:59.363462+00
1201	1	student.create	{"studentId": "755"}	2026-10-06 08:24:59.455331+00
1202	1	student.create	{"studentId": "756"}	2026-10-06 08:24:59.55199+00
1203	1	student.create	{"studentId": "757"}	2026-10-06 08:24:59.659379+00
1204	1	student.create	{"studentId": "758"}	2026-10-06 08:24:59.766826+00
1205	1	student.create	{"studentId": "759"}	2026-10-06 08:24:59.902506+00
1206	1	student.create	{"studentId": "760"}	2026-10-06 08:25:00.15556+00
1207	1	student.create	{"studentId": "761"}	2026-10-06 08:25:00.283929+00
1208	1	student.create	{"studentId": "762"}	2026-10-06 08:25:00.374125+00
1209	1	student.create	{"studentId": "763"}	2026-10-06 08:25:00.464435+00
1210	1	student.create	{"studentId": "764"}	2026-10-06 08:25:00.558879+00
1211	1	student.create	{"studentId": "765"}	2026-10-06 08:25:00.651964+00
1212	1	student.create	{"studentId": "766"}	2026-10-06 08:25:00.779302+00
1213	1	student.create	{"studentId": "767"}	2026-10-06 08:25:00.875378+00
1214	1	student.create	{"studentId": "768"}	2026-10-06 08:25:00.965337+00
1215	1	student.create	{"studentId": "769"}	2026-10-06 08:25:01.061448+00
1216	1	student.create	{"studentId": "770"}	2026-10-06 08:25:01.162085+00
1217	1	student.create	{"studentId": "771"}	2026-10-06 08:25:01.253336+00
1218	1	student.create	{"studentId": "772"}	2026-10-06 08:25:01.348509+00
1219	1	login	{}	2026-10-06 08:25:34.632839+00
1220	1	student.create	{"studentId": "773"}	2026-10-06 08:25:34.817895+00
1221	1	student.create	{"studentId": "774"}	2026-10-06 08:25:34.909393+00
1222	1	student.create	{"studentId": "775"}	2026-10-06 08:25:35.002793+00
1223	1	student.create	{"studentId": "776"}	2026-10-06 08:25:35.107137+00
1224	1	student.create	{"studentId": "777"}	2026-10-06 08:25:35.231554+00
1225	1	student.create	{"studentId": "778"}	2026-10-06 08:25:35.325824+00
1226	1	student.create	{"studentId": "779"}	2026-10-06 08:25:35.418679+00
1227	1	student.create	{"studentId": "780"}	2026-10-06 08:25:35.512021+00
1228	1	student.create	{"studentId": "781"}	2026-10-06 08:25:35.608174+00
1229	1	student.create	{"studentId": "782"}	2026-10-06 08:25:35.70016+00
1230	1	student.create	{"studentId": "783"}	2026-10-06 08:25:35.796838+00
1231	1	student.create	{"studentId": "784"}	2026-10-06 08:25:35.892193+00
1232	1	student.create	{"studentId": "785"}	2026-10-06 08:25:35.98507+00
1233	1	student.create	{"studentId": "786"}	2026-10-06 08:25:36.080269+00
1234	1	student.create	{"studentId": "787"}	2026-10-06 08:25:36.170272+00
1235	1	student.create	{"studentId": "788"}	2026-10-06 08:25:36.263392+00
1236	1	student.create	{"studentId": "789"}	2026-10-06 08:25:36.378956+00
1237	1	student.create	{"studentId": "790"}	2026-10-06 08:25:36.486297+00
1238	1	student.create	{"studentId": "791"}	2026-10-06 08:25:36.578589+00
1239	1	student.create	{"studentId": "792"}	2026-10-06 08:25:36.671608+00
1240	1	student.create	{"studentId": "793"}	2026-10-06 08:25:36.764395+00
1241	1	student.create	{"studentId": "794"}	2026-10-06 08:25:36.858575+00
1242	1	student.create	{"studentId": "795"}	2026-10-06 08:25:36.950584+00
1243	1	student.create	{"studentId": "796"}	2026-10-06 08:25:37.04371+00
1244	1	student.create	{"studentId": "797"}	2026-10-06 08:25:37.144062+00
1245	1	student.create	{"studentId": "798"}	2026-10-06 08:25:37.25704+00
1246	1	student.create	{"studentId": "799"}	2026-10-06 08:25:37.367231+00
1247	1	student.create	{"studentId": "800"}	2026-10-06 08:25:37.465084+00
1248	1	student.create	{"studentId": "801"}	2026-10-06 08:25:37.561163+00
1249	1	student.create	{"studentId": "802"}	2026-10-06 08:25:37.649731+00
1250	1	student.create	{"studentId": "803"}	2026-10-06 08:25:37.744977+00
1251	1	student.create	{"studentId": "804"}	2026-10-06 08:25:37.83409+00
1252	1	student.create	{"studentId": "805"}	2026-10-06 08:25:37.927743+00
1253	1	student.create	{"studentId": "806"}	2026-10-06 08:25:38.026369+00
1254	1	student.create	{"studentId": "807"}	2026-10-06 08:25:38.120846+00
1255	1	student.create	{"studentId": "808"}	2026-10-06 08:25:38.211745+00
1256	1	student.create	{"studentId": "809"}	2026-10-06 08:25:38.30172+00
1257	1	student.create	{"studentId": "810"}	2026-10-06 08:25:38.392711+00
1258	1	student.create	{"studentId": "811"}	2026-10-06 08:25:38.487811+00
1259	1	student.create	{"studentId": "812"}	2026-10-06 08:25:38.585797+00
1260	1	student.create	{"studentId": "813"}	2026-10-06 08:25:38.677248+00
1261	1	student.create	{"studentId": "814"}	2026-10-06 08:25:38.775739+00
1262	1	student.create	{"studentId": "815"}	2026-10-06 08:25:38.870245+00
1263	1	student.create	{"studentId": "816"}	2026-10-06 08:25:38.964077+00
1264	1	student.create	{"studentId": "817"}	2026-10-06 08:25:39.055098+00
1265	1	student.create	{"studentId": "818"}	2026-10-06 08:25:39.147776+00
1266	1	student.create	{"studentId": "819"}	2026-10-06 08:25:39.243487+00
1267	1	student.create	{"studentId": "820"}	2026-10-06 08:25:39.334109+00
1268	1	student.create	{"studentId": "821"}	2026-10-06 08:25:39.426028+00
1269	1	student.create	{"studentId": "822"}	2026-10-06 08:25:39.51849+00
1270	1	student.create	{"studentId": "823"}	2026-10-06 08:25:39.608505+00
1271	1	student.create	{"studentId": "824"}	2026-10-06 08:25:39.701102+00
1272	1	student.create	{"studentId": "825"}	2026-10-06 08:25:39.792833+00
1273	1	student.create	{"studentId": "826"}	2026-10-06 08:25:39.882664+00
1274	1	student.create	{"studentId": "827"}	2026-10-06 08:25:39.972903+00
1275	1	student.create	{"studentId": "828"}	2026-10-06 08:25:40.060727+00
1276	1	student.create	{"studentId": "829"}	2026-10-06 08:25:40.153116+00
1277	1	student.create	{"studentId": "830"}	2026-10-06 08:25:40.263011+00
1278	1	student.create	{"studentId": "831"}	2026-10-06 08:25:40.359282+00
1279	1	student.create	{"studentId": "832"}	2026-10-06 08:25:40.463368+00
1280	1	student.create	{"studentId": "833"}	2026-10-06 08:25:40.562342+00
1281	1	student.create	{"studentId": "834"}	2026-10-06 08:25:40.652964+00
1282	1	student.create	{"studentId": "835"}	2026-10-06 08:25:40.74786+00
1283	1	student.create	{"studentId": "836"}	2026-10-06 08:25:40.841454+00
1284	1	student.create	{"studentId": "837"}	2026-10-06 08:25:40.930344+00
1285	1	student.create	{"studentId": "838"}	2026-10-06 08:25:41.023237+00
1286	1	student.create	{"studentId": "839"}	2026-10-06 08:25:41.120228+00
1287	1	student.create	{"studentId": "840"}	2026-10-06 08:25:41.216071+00
1288	1	student.create	{"studentId": "841"}	2026-10-06 08:25:41.308737+00
1289	1	student.create	{"studentId": "842"}	2026-10-06 08:25:41.407317+00
1290	1	student.create	{"studentId": "843"}	2026-10-06 08:25:41.513116+00
1291	1	student.create	{"studentId": "844"}	2026-10-06 08:25:41.603271+00
1292	1	student.create	{"studentId": "845"}	2026-10-06 08:25:41.694736+00
1293	1	student.create	{"studentId": "846"}	2026-10-06 08:25:41.790829+00
1294	1	student.create	{"studentId": "847"}	2026-10-06 08:25:41.888017+00
1295	1	student.create	{"studentId": "848"}	2026-10-06 08:25:41.983202+00
1296	1	student.create	{"studentId": "849"}	2026-10-06 08:25:42.077893+00
1297	1	student.create	{"studentId": "850"}	2026-10-06 08:25:42.170203+00
1298	1	student.create	{"studentId": "851"}	2026-10-06 08:25:42.284718+00
1299	1	student.create	{"studentId": "852"}	2026-10-06 08:25:42.388291+00
1300	1	student.create	{"studentId": "853"}	2026-10-06 08:25:42.491147+00
1301	1	student.create	{"studentId": "854"}	2026-10-06 08:25:42.582584+00
1302	1	student.create	{"studentId": "855"}	2026-10-06 08:25:42.672748+00
1303	1	student.create	{"studentId": "856"}	2026-10-06 08:25:42.765261+00
1304	1	student.create	{"studentId": "857"}	2026-10-06 08:25:42.854821+00
1305	1	student.create	{"studentId": "858"}	2026-10-06 08:25:42.943771+00
1306	1	student.create	{"studentId": "859"}	2026-10-06 08:25:43.038498+00
1307	1	student.create	{"studentId": "860"}	2026-10-06 08:25:43.129839+00
1308	1	student.create	{"studentId": "861"}	2026-10-06 08:25:43.220287+00
1309	1	student.create	{"studentId": "862"}	2026-10-06 08:25:43.312309+00
1310	1	student.create	{"studentId": "863"}	2026-10-06 08:25:43.407463+00
1311	1	student.create	{"studentId": "864"}	2026-10-06 08:25:43.49847+00
1312	1	student.create	{"studentId": "865"}	2026-10-06 08:25:43.587779+00
1313	1	student.create	{"studentId": "866"}	2026-10-06 08:25:43.681782+00
1314	1	student.create	{"studentId": "867"}	2026-10-06 08:25:43.774438+00
1315	1	student.create	{"studentId": "868"}	2026-10-06 08:25:43.86489+00
1316	1	student.create	{"studentId": "869"}	2026-10-06 08:25:43.958708+00
1317	1	student.create	{"studentId": "870"}	2026-10-06 08:25:44.048547+00
1318	1	student.create	{"studentId": "871"}	2026-10-06 08:25:44.139824+00
1319	1	student.create	{"studentId": "872"}	2026-10-06 08:25:44.231464+00
1320	1	exam.create	{"examId": "20", "participants": 100}	2026-10-06 08:25:44.50012+00
1321	1	exam.pin_issue	{"examId": 20, "rotated": false, "issuedAt": "2026-10-06T08:25:44.606Z", "expiresAt": "2026-10-06T08:35:44.606Z", "validityMinutes": 10}	2026-10-06 08:25:44.602936+00
1348	1	login	{}	2026-10-06 08:28:29.004469+00
1349	1	exam.create	{"examId": "21", "participants": 0}	2026-10-06 08:28:29.094494+00
1350	1	exam.pin_issue	{"examId": 21, "rotated": false, "issuedAt": "2026-10-06T08:28:29.202Z", "expiresAt": "2026-10-06T08:38:29.202Z", "validityMinutes": 10}	2026-10-06 08:28:29.19976+00
1351	1	student.create	{"studentId": "880"}	2026-10-06 08:28:29.300103+00
1352	1	student.create	{"studentId": "881"}	2026-10-06 08:28:29.39647+00
1353	1	student.create	{"studentId": "882"}	2026-10-06 08:28:29.497963+00
1354	1	student.create	{"studentId": "883"}	2026-10-06 08:28:29.592407+00
1355	1	student.create	{"studentId": "884"}	2026-10-06 08:28:29.714702+00
1356	1	student.create	{"studentId": "885"}	2026-10-06 08:28:29.836544+00
1357	1	student.create	{"studentId": "886"}	2026-10-06 08:28:30.073039+00
1358	1	student.create	{"studentId": "887"}	2026-10-06 08:28:30.245897+00
1359	1	student.create	{"studentId": "888"}	2026-10-06 08:28:30.336603+00
1360	1	student.create	{"studentId": "889"}	2026-10-06 08:28:30.431723+00
1361	1	student.create	{"studentId": "890"}	2026-10-06 08:28:30.524896+00
1362	1	student.create	{"studentId": "891"}	2026-10-06 08:28:30.617757+00
1363	1	student.create	{"studentId": "892"}	2026-10-06 08:28:30.711503+00
1364	1	student.create	{"studentId": "893"}	2026-10-06 08:28:30.80548+00
1365	1	student.create	{"studentId": "894"}	2026-10-06 08:28:30.901394+00
1366	1	student.create	{"studentId": "895"}	2026-10-06 08:28:30.996771+00
1367	1	student.create	{"studentId": "896"}	2026-10-06 08:28:31.094691+00
1368	1	student.create	{"studentId": "897"}	2026-10-06 08:28:31.189714+00
1369	1	student.create	{"studentId": "898"}	2026-10-06 08:28:31.285834+00
1370	1	student.create	{"studentId": "899"}	2026-10-06 08:28:31.378268+00
1371	1	student.create	{"studentId": "900"}	2026-10-06 08:28:31.470884+00
1372	1	student.create	{"studentId": "901"}	2026-10-06 08:28:31.560956+00
1373	1	student.create	{"studentId": "902"}	2026-10-06 08:28:31.657158+00
1374	1	student.create	{"studentId": "903"}	2026-10-06 08:28:31.750683+00
1375	1	student.create	{"studentId": "904"}	2026-10-06 08:28:31.844894+00
1376	1	student.create	{"studentId": "905"}	2026-10-06 08:28:31.939558+00
1377	1	student.create	{"studentId": "906"}	2026-10-06 08:28:32.034869+00
1378	1	student.create	{"studentId": "907"}	2026-10-06 08:28:32.12838+00
1379	1	student.create	{"studentId": "908"}	2026-10-06 08:28:32.22215+00
1380	1	student.create	{"studentId": "909"}	2026-10-06 08:28:32.315467+00
1381	1	student.create	{"studentId": "910"}	2026-10-06 08:28:32.409424+00
1382	1	student.create	{"studentId": "911"}	2026-10-06 08:28:32.500976+00
1383	1	student.create	{"studentId": "912"}	2026-10-06 08:28:32.604398+00
1384	1	student.create	{"studentId": "913"}	2026-10-06 08:28:32.704901+00
1385	1	student.create	{"studentId": "914"}	2026-10-06 08:28:32.796469+00
1386	1	student.create	{"studentId": "915"}	2026-10-06 08:28:32.895805+00
1387	1	student.create	{"studentId": "916"}	2026-10-06 08:28:32.993724+00
1388	1	student.create	{"studentId": "917"}	2026-10-06 08:28:33.091338+00
1389	1	student.create	{"studentId": "918"}	2026-10-06 08:28:33.187567+00
1390	1	student.create	{"studentId": "919"}	2026-10-06 08:28:33.284059+00
1391	1	student.create	{"studentId": "920"}	2026-10-06 08:28:33.378214+00
1392	1	student.create	{"studentId": "921"}	2026-10-06 08:28:33.474262+00
1393	1	student.create	{"studentId": "922"}	2026-10-06 08:28:33.567403+00
1394	1	student.create	{"studentId": "923"}	2026-10-06 08:28:33.661286+00
1395	1	student.create	{"studentId": "924"}	2026-10-06 08:28:33.756193+00
1396	1	student.create	{"studentId": "925"}	2026-10-06 08:28:33.850732+00
1397	1	student.create	{"studentId": "926"}	2026-10-06 08:28:33.958007+00
1398	1	student.create	{"studentId": "927"}	2026-10-06 08:28:34.074032+00
1399	1	student.create	{"studentId": "928"}	2026-10-06 08:28:34.16815+00
1400	1	student.create	{"studentId": "929"}	2026-10-06 08:28:34.2633+00
1401	1	student.create	{"studentId": "930"}	2026-10-06 08:28:34.355776+00
1402	1	student.create	{"studentId": "931"}	2026-10-06 08:28:34.453664+00
1403	1	student.create	{"studentId": "932"}	2026-10-06 08:28:34.55166+00
1404	1	student.create	{"studentId": "933"}	2026-10-06 08:28:34.645512+00
1405	1	student.create	{"studentId": "934"}	2026-10-06 08:28:34.751955+00
1406	1	student.create	{"studentId": "935"}	2026-10-06 08:28:34.879932+00
1407	1	student.create	{"studentId": "936"}	2026-10-06 08:28:34.972602+00
1408	1	student.create	{"studentId": "937"}	2026-10-06 08:28:35.066439+00
1409	1	student.create	{"studentId": "938"}	2026-10-06 08:28:35.157912+00
1410	1	student.create	{"studentId": "939"}	2026-10-06 08:28:35.250918+00
1411	1	student.create	{"studentId": "940"}	2026-10-06 08:28:35.343265+00
1412	1	student.create	{"studentId": "941"}	2026-10-06 08:28:35.434885+00
1413	1	student.create	{"studentId": "942"}	2026-10-06 08:28:35.528061+00
1414	1	student.create	{"studentId": "943"}	2026-10-06 08:28:35.62179+00
1415	1	student.create	{"studentId": "944"}	2026-10-06 08:28:35.718323+00
1416	1	student.create	{"studentId": "945"}	2026-10-06 08:28:35.810377+00
1417	1	student.create	{"studentId": "946"}	2026-10-06 08:28:35.904608+00
1418	1	student.create	{"studentId": "947"}	2026-10-06 08:28:35.996929+00
1419	1	student.create	{"studentId": "948"}	2026-10-06 08:28:36.09007+00
1420	1	student.create	{"studentId": "949"}	2026-10-06 08:28:36.184342+00
1421	1	student.create	{"studentId": "950"}	2026-10-06 08:28:36.27551+00
1422	1	student.create	{"studentId": "951"}	2026-10-06 08:28:36.367509+00
1423	1	student.create	{"studentId": "952"}	2026-10-06 08:28:36.468676+00
1424	1	student.create	{"studentId": "953"}	2026-10-06 08:28:36.557896+00
1425	1	student.create	{"studentId": "954"}	2026-10-06 08:28:36.652127+00
1426	1	student.create	{"studentId": "955"}	2026-10-06 08:28:36.74662+00
1427	1	student.create	{"studentId": "956"}	2026-10-06 08:28:36.844178+00
1428	1	student.create	{"studentId": "957"}	2026-10-06 08:28:36.934805+00
1429	1	student.create	{"studentId": "958"}	2026-10-06 08:28:37.035137+00
1430	1	student.create	{"studentId": "959"}	2026-10-06 08:28:37.128882+00
1431	1	student.create	{"studentId": "960"}	2026-10-06 08:28:37.223177+00
1432	1	student.create	{"studentId": "961"}	2026-10-06 08:28:37.315045+00
1433	1	student.create	{"studentId": "962"}	2026-10-06 08:28:37.408059+00
1434	1	student.create	{"studentId": "963"}	2026-10-06 08:28:37.502955+00
1435	1	student.create	{"studentId": "964"}	2026-10-06 08:28:37.59545+00
1436	1	student.create	{"studentId": "965"}	2026-10-06 08:28:37.715076+00
1437	1	student.create	{"studentId": "966"}	2026-10-06 08:28:37.815003+00
1438	1	student.create	{"studentId": "967"}	2026-10-06 08:28:37.908425+00
1439	1	student.create	{"studentId": "968"}	2026-10-06 08:28:37.997604+00
1440	1	student.create	{"studentId": "969"}	2026-10-06 08:28:38.088152+00
1441	1	student.create	{"studentId": "970"}	2026-10-06 08:28:38.179638+00
1442	1	student.create	{"studentId": "971"}	2026-10-06 08:28:38.273198+00
1443	1	student.create	{"studentId": "972"}	2026-10-06 08:28:38.369924+00
1444	1	student.create	{"studentId": "973"}	2026-10-06 08:28:38.462087+00
1445	1	student.create	{"studentId": "974"}	2026-10-06 08:28:38.555535+00
1446	1	student.create	{"studentId": "975"}	2026-10-06 08:28:38.657296+00
1447	1	student.create	{"studentId": "976"}	2026-10-06 08:28:38.753517+00
1448	1	student.create	{"studentId": "977"}	2026-10-06 08:28:38.845055+00
1449	1	student.create	{"studentId": "978"}	2026-10-06 08:28:38.938329+00
1450	1	student.create	{"studentId": "979"}	2026-10-06 08:28:39.048323+00
1463	1	login	{}	2026-10-06 08:36:16.240314+00
1464	1	exam.create	{"examId": "22", "participants": 100}	2026-10-06 08:36:16.650734+00
1465	1	exam.pin_issue	{"examId": 22, "rotated": false, "issuedAt": "2026-10-06T08:36:16.791Z", "expiresAt": "2026-10-06T08:46:16.791Z", "validityMinutes": 10}	2026-10-06 08:36:16.788546+00
1466	1	student.create	{"studentId": "987"}	2026-10-06 08:36:16.885666+00
1467	1	student.create	{"studentId": "988"}	2026-10-06 08:36:16.98125+00
1468	1	student.create	{"studentId": "989"}	2026-10-06 08:36:17.071102+00
1469	1	student.create	{"studentId": "990"}	2026-10-06 08:36:17.164466+00
1470	1	student.create	{"studentId": "991"}	2026-10-06 08:36:17.253737+00
1471	1	student.create	{"studentId": "992"}	2026-10-06 08:36:17.339029+00
1472	1	student.create	{"studentId": "993"}	2026-10-06 08:36:17.424849+00
1473	1	student.create	{"studentId": "994"}	2026-10-06 08:36:17.507688+00
1474	1	student.create	{"studentId": "995"}	2026-10-06 08:36:17.590546+00
1475	1	student.create	{"studentId": "996"}	2026-10-06 08:36:17.673329+00
1476	1	student.create	{"studentId": "997"}	2026-10-06 08:36:17.754952+00
1477	1	student.create	{"studentId": "998"}	2026-10-06 08:36:17.8385+00
1478	1	student.create	{"studentId": "999"}	2026-10-06 08:36:17.920024+00
1479	1	student.create	{"studentId": "1000"}	2026-10-06 08:36:18.005632+00
1480	1	student.create	{"studentId": "1001"}	2026-10-06 08:36:18.093449+00
1481	1	student.create	{"studentId": "1002"}	2026-10-06 08:36:18.177264+00
1482	1	student.create	{"studentId": "1003"}	2026-10-06 08:36:18.26211+00
1483	1	student.create	{"studentId": "1004"}	2026-10-06 08:36:18.345929+00
1484	1	student.create	{"studentId": "1005"}	2026-10-06 08:36:18.42751+00
1485	1	student.create	{"studentId": "1006"}	2026-10-06 08:36:18.515973+00
1486	1	student.create	{"studentId": "1007"}	2026-10-06 08:36:18.604891+00
1487	1	student.create	{"studentId": "1008"}	2026-10-06 08:36:18.690839+00
1488	1	student.create	{"studentId": "1009"}	2026-10-06 08:36:18.780131+00
1489	1	student.create	{"studentId": "1010"}	2026-10-06 08:36:18.862474+00
1490	1	student.create	{"studentId": "1011"}	2026-10-06 08:36:18.943167+00
1491	1	student.create	{"studentId": "1012"}	2026-10-06 08:36:19.024676+00
1492	1	student.create	{"studentId": "1013"}	2026-10-06 08:36:19.109214+00
1493	1	student.create	{"studentId": "1014"}	2026-10-06 08:36:19.192674+00
1494	1	student.create	{"studentId": "1015"}	2026-10-06 08:36:19.278565+00
1495	1	student.create	{"studentId": "1016"}	2026-10-06 08:36:19.360828+00
1496	1	student.create	{"studentId": "1017"}	2026-10-06 08:36:19.444155+00
1497	1	student.create	{"studentId": "1018"}	2026-10-06 08:36:19.527829+00
1498	1	student.create	{"studentId": "1019"}	2026-10-06 08:36:19.6119+00
1499	1	student.create	{"studentId": "1020"}	2026-10-06 08:36:19.698414+00
1500	1	student.create	{"studentId": "1021"}	2026-10-06 08:36:19.784756+00
1501	1	student.create	{"studentId": "1022"}	2026-10-06 08:36:19.874401+00
1502	1	student.create	{"studentId": "1023"}	2026-10-06 08:36:19.95972+00
1503	1	student.create	{"studentId": "1024"}	2026-10-06 08:36:20.043843+00
1504	1	student.create	{"studentId": "1025"}	2026-10-06 08:36:20.12782+00
1505	1	student.create	{"studentId": "1026"}	2026-10-06 08:36:20.369995+00
1506	1	student.create	{"studentId": "1027"}	2026-10-06 08:36:20.452934+00
1507	1	student.create	{"studentId": "1028"}	2026-10-06 08:36:20.534133+00
1508	1	student.create	{"studentId": "1029"}	2026-10-06 08:36:20.616872+00
1509	1	student.create	{"studentId": "1030"}	2026-10-06 08:36:20.697702+00
1510	1	student.create	{"studentId": "1031"}	2026-10-06 08:36:20.790381+00
1511	1	student.create	{"studentId": "1032"}	2026-10-06 08:36:20.873679+00
1512	1	student.create	{"studentId": "1033"}	2026-10-06 08:36:21.038386+00
1513	1	student.create	{"studentId": "1034"}	2026-10-06 08:36:21.171029+00
1514	1	student.create	{"studentId": "1035"}	2026-10-06 08:36:21.255453+00
1515	1	student.create	{"studentId": "1036"}	2026-10-06 08:36:21.344896+00
1516	1	student.create	{"studentId": "1037"}	2026-10-06 08:36:21.435965+00
1517	1	student.create	{"studentId": "1038"}	2026-10-06 08:36:21.523292+00
1518	1	student.create	{"studentId": "1039"}	2026-10-06 08:36:21.611433+00
1519	1	student.create	{"studentId": "1040"}	2026-10-06 08:36:21.69848+00
1520	1	student.create	{"studentId": "1041"}	2026-10-06 08:36:21.824795+00
1521	1	student.create	{"studentId": "1042"}	2026-10-06 08:36:21.912212+00
1522	1	student.create	{"studentId": "1043"}	2026-10-06 08:36:21.992316+00
1523	1	student.create	{"studentId": "1044"}	2026-10-06 08:36:22.081337+00
1524	1	student.create	{"studentId": "1045"}	2026-10-06 08:36:22.162409+00
1525	1	student.create	{"studentId": "1046"}	2026-10-06 08:36:22.244306+00
1526	1	student.create	{"studentId": "1047"}	2026-10-06 08:36:22.326467+00
1527	1	student.create	{"studentId": "1048"}	2026-10-06 08:36:22.408023+00
1528	1	student.create	{"studentId": "1049"}	2026-10-06 08:36:22.492272+00
1529	1	student.create	{"studentId": "1050"}	2026-10-06 08:36:22.573436+00
1530	1	student.create	{"studentId": "1051"}	2026-10-06 08:36:22.654897+00
1531	1	student.create	{"studentId": "1052"}	2026-10-06 08:36:22.73848+00
1532	1	student.create	{"studentId": "1053"}	2026-10-06 08:36:22.819527+00
1533	1	student.create	{"studentId": "1054"}	2026-10-06 08:36:22.900794+00
1534	1	student.create	{"studentId": "1055"}	2026-10-06 08:36:22.981175+00
1535	1	student.create	{"studentId": "1056"}	2026-10-06 08:36:23.062168+00
1536	1	student.create	{"studentId": "1057"}	2026-10-06 08:36:23.144037+00
1537	1	student.create	{"studentId": "1058"}	2026-10-06 08:36:23.2242+00
1538	1	student.create	{"studentId": "1059"}	2026-10-06 08:36:23.312801+00
1539	1	student.create	{"studentId": "1060"}	2026-10-06 08:36:23.394405+00
1540	1	student.create	{"studentId": "1061"}	2026-10-06 08:36:23.475218+00
1541	1	student.create	{"studentId": "1062"}	2026-10-06 08:36:23.560337+00
1542	1	student.create	{"studentId": "1063"}	2026-10-06 08:36:23.649038+00
1543	1	student.create	{"studentId": "1064"}	2026-10-06 08:36:23.734332+00
1544	1	student.create	{"studentId": "1065"}	2026-10-06 08:36:23.815914+00
1545	1	student.create	{"studentId": "1066"}	2026-10-06 08:36:23.896965+00
1546	1	student.create	{"studentId": "1067"}	2026-10-06 08:36:23.979195+00
1547	1	student.create	{"studentId": "1068"}	2026-10-06 08:36:24.060917+00
1548	1	student.create	{"studentId": "1069"}	2026-10-06 08:36:24.14942+00
1549	1	student.create	{"studentId": "1070"}	2026-10-06 08:36:24.232536+00
1550	1	student.create	{"studentId": "1071"}	2026-10-06 08:36:24.315355+00
1551	1	student.create	{"studentId": "1072"}	2026-10-06 08:36:24.396716+00
1552	1	student.create	{"studentId": "1073"}	2026-10-06 08:36:24.478367+00
1553	1	student.create	{"studentId": "1074"}	2026-10-06 08:36:24.558209+00
1554	1	student.create	{"studentId": "1075"}	2026-10-06 08:36:24.63862+00
1555	1	student.create	{"studentId": "1076"}	2026-10-06 08:36:24.721015+00
1556	1	student.create	{"studentId": "1077"}	2026-10-06 08:36:24.80261+00
1557	1	student.create	{"studentId": "1078"}	2026-10-06 08:36:24.883582+00
1558	1	student.create	{"studentId": "1079"}	2026-10-06 08:36:24.964379+00
1559	1	student.create	{"studentId": "1080"}	2026-10-06 08:36:25.046297+00
1560	1	student.create	{"studentId": "1081"}	2026-10-06 08:36:25.127246+00
1561	1	student.create	{"studentId": "1082"}	2026-10-06 08:36:25.208872+00
1562	1	student.create	{"studentId": "1083"}	2026-10-06 08:36:25.307492+00
1563	1	student.create	{"studentId": "1084"}	2026-10-06 08:36:25.42502+00
1564	1	student.create	{"studentId": "1085"}	2026-10-06 08:36:25.516684+00
1565	1	student.create	{"studentId": "1086"}	2026-10-06 08:36:25.61121+00
2523	1	login	{}	2026-10-06 09:49:14.390877+00
2524	1	login	{}	2026-10-08 09:26:00.035631+00
2541	1	exam.violation_review	{"count": 6, "examId": 32, "reason": "iya", "status": "locked", "eventId": 28, "decision": "confirm", "sessionId": 2157}	2026-10-08 10:41:22.894429+00
2550	1	login	{}	2026-10-08 12:27:07.637482+00
2583	1	login	{}	2026-10-09 02:47:02.011436+00
2585	1	login	{}	2026-10-09 08:25:26.558322+00
2595	1	login	{}	2026-10-10 05:53:09.647731+00
2599	1	login	{}	2026-10-12 01:08:18.271627+00
2605	1	login	{}	2026-10-12 04:42:05.624594+00
2591	\N	login	{}	2026-10-09 09:40:46.413914+00
2611	1	login	{}	2026-10-12 08:55:19.929678+00
2615	1944	platform.owner.bootstrap	{"localBootstrap": true}	2026-10-12 11:11:19.168859+00
2617	1	login	{}	2026-10-13 00:42:30.214601+00
2627	1	bank.create	{"bankId": "139", "mcCount": 30, "essayCount": 15, "questionCount": 45}	2026-10-13 05:38:58.657872+00
2638	1	student.create	{"studentId": "1951"}	2026-10-13 05:47:38.506854+00
2648	1	exam.violation_threshold_decision	{"count": 0, "examId": 37, "reason": "jadaa", "status": "in_progress", "decision": "false_positive", "sessionId": 2161}	2026-10-13 05:53:42.539071+00
2653	1	login	{}	2026-10-15 07:49:23.508134+00
2654	1	login	{}	2026-10-15 08:48:30.131369+00
2530	\N	login	{}	2026-10-08 09:38:22.01812+00
2661	1	student.delete	{"name": "ahmad", "sessions": 0, "username": "IMBS-3017D", "className": "VII A", "responses": 0, "studentId": 1950, "violations": 0}	2026-10-15 08:50:04.042443+00
2671	1	school.settings.update	{"next": {"grades": ["VII", "VIII", "1", "2", "3", "4", "5", "6"], "classes": ["VII A", "KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:55:37.851Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["VII", "VIII", "1", "2", "3", "4", "5", "6"], "classes": ["VII A"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:54:13.133Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}}	2026-10-15 08:55:37.851841+00
2672	1	school.settings.update	{"next": {"grades": ["VII", "VIII", "1", "2", "3", "4", "5", "6"], "classes": ["VII A", "KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:55:39.077Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["VII", "VIII", "1", "2", "3", "4", "5", "6"], "classes": ["VII A", "KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:55:37.851Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}}	2026-10-15 08:55:39.077298+00
2673	1	bank.delete	{"grade": "VIII", "topic": "bab 2", "bankId": "136", "examCount": 0, "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-15 08:55:55.067109+00
2681	1	login	{}	2026-10-16 00:52:19.473072+00
2685	1	bank.create	{"bankId": "140", "mcCount": 0, "essayCount": 14, "questionCount": 14}	2026-10-17 08:18:27.180342+00
2691	1	essay.grade	{"score": 0, "examId": 38, "studentId": 1952, "questionId": 73}	2026-10-17 08:26:28.711258+00
2695	1	essay.grade	{"score": 0, "examId": 38, "studentId": 1952, "questionId": 65}	2026-10-17 08:26:32.921014+00
2697	1	essay.grade	{"score": 0, "examId": 38, "studentId": 1952, "questionId": 69}	2026-10-17 08:26:35.792349+00
2698	1	essay.grade	{"score": 0, "examId": 38, "studentId": 1952, "questionId": 72}	2026-10-17 08:26:38.618664+00
2699	1	essay.grade	{"score": 25, "examId": 38, "studentId": 1952, "questionId": 67}	2026-10-17 08:26:39.825763+00
2701	1	essay.grade	{"score": 10, "examId": 38, "studentId": 1952, "questionId": 70}	2026-10-17 08:26:42.257442+00
2702	1	essay.grade	{"score": 0, "examId": 38, "studentId": 1952, "questionId": 76}	2026-10-17 08:26:43.449684+00
2703	1	essay.grade	{"score": 30, "examId": 38, "studentId": 1952, "questionId": 77}	2026-10-17 08:26:44.665907+00
2704	1	essay.grade	{"score": 60, "examId": 38, "studentId": 1952, "questionId": 71}	2026-10-17 08:26:45.817198+00
2705	1	exam.final_score	{"score": 50, "examId": 38, "studentId": 1952}	2026-10-17 08:27:05.226526+00
2706	1	exam.final_score	{"score": 50, "examId": 38, "studentId": 1952}	2026-10-17 08:27:27.437762+00
2707	1	exam.final_score	{"score": 50, "examId": 38, "studentId": 1952}	2026-10-17 08:28:20.715812+00
2708	1	student.delete	{"name": "sahal", "sessions": 1, "username": "IMBS-366AD", "className": "KELAS 6 RUANG 1", "responses": 14, "studentId": 1952, "violations": 0}	2026-10-17 08:29:06.772899+00
2709	1	exam.delete	{"title": "Mahwu", "examId": "38", "status": "completed", "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-17 08:29:15.157339+00
2710	1	bank.delete	{"grade": "6", "topic": "Bab 1", "bankId": "140", "examCount": 0, "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-17 08:29:28.49498+00
1578	1	login	{}	2026-10-06 08:39:58.465672+00
1579	1	exam.create	{"examId": "23", "participants": 200}	2026-10-06 08:39:59.092769+00
1580	1	exam.pin_issue	{"examId": 23, "rotated": false, "issuedAt": "2026-10-06T08:39:59.193Z", "expiresAt": "2026-10-06T08:49:59.193Z", "validityMinutes": 10}	2026-10-06 08:39:59.191649+00
1581	1	student.create	{"studentId": "1094"}	2026-10-06 08:39:59.282079+00
1582	1	student.create	{"studentId": "1095"}	2026-10-06 08:39:59.370714+00
1583	1	student.create	{"studentId": "1096"}	2026-10-06 08:39:59.584481+00
1584	1	student.create	{"studentId": "1097"}	2026-10-06 08:39:59.762432+00
1585	1	student.create	{"studentId": "1098"}	2026-10-06 08:39:59.845875+00
1586	1	student.create	{"studentId": "1099"}	2026-10-06 08:39:59.929815+00
1587	1	student.create	{"studentId": "1100"}	2026-10-06 08:40:00.015701+00
1588	1	student.create	{"studentId": "1101"}	2026-10-06 08:40:00.097472+00
1589	1	student.create	{"studentId": "1102"}	2026-10-06 08:40:00.178968+00
1590	1	student.create	{"studentId": "1103"}	2026-10-06 08:40:00.262645+00
1591	1	student.create	{"studentId": "1104"}	2026-10-06 08:40:00.346988+00
1592	1	student.create	{"studentId": "1105"}	2026-10-06 08:40:00.434429+00
1593	1	student.create	{"studentId": "1106"}	2026-10-06 08:40:00.521841+00
1594	1	student.create	{"studentId": "1107"}	2026-10-06 08:40:00.612027+00
1595	1	student.create	{"studentId": "1108"}	2026-10-06 08:40:00.715509+00
1596	1	student.create	{"studentId": "1109"}	2026-10-06 08:40:00.807367+00
1597	1	student.create	{"studentId": "1110"}	2026-10-06 08:40:00.898809+00
1598	1	student.create	{"studentId": "1111"}	2026-10-06 08:40:01.002686+00
1599	1	student.create	{"studentId": "1112"}	2026-10-06 08:40:01.102387+00
1600	1	student.create	{"studentId": "1113"}	2026-10-06 08:40:01.196977+00
1601	1	student.create	{"studentId": "1114"}	2026-10-06 08:40:01.292581+00
1602	1	student.create	{"studentId": "1115"}	2026-10-06 08:40:01.416387+00
1603	1	student.create	{"studentId": "1116"}	2026-10-06 08:40:01.502107+00
1604	1	student.create	{"studentId": "1117"}	2026-10-06 08:40:01.589451+00
1605	1	student.create	{"studentId": "1118"}	2026-10-06 08:40:01.678827+00
1606	1	student.create	{"studentId": "1119"}	2026-10-06 08:40:01.770932+00
1607	1	student.create	{"studentId": "1120"}	2026-10-06 08:40:01.866501+00
1608	1	student.create	{"studentId": "1121"}	2026-10-06 08:40:01.957238+00
1609	1	student.create	{"studentId": "1122"}	2026-10-06 08:40:02.043122+00
1610	1	student.create	{"studentId": "1123"}	2026-10-06 08:40:02.12852+00
1611	1	student.create	{"studentId": "1124"}	2026-10-06 08:40:02.214787+00
1612	1	student.create	{"studentId": "1125"}	2026-10-06 08:40:02.301298+00
1613	1	student.create	{"studentId": "1126"}	2026-10-06 08:40:02.395929+00
1614	1	student.create	{"studentId": "1127"}	2026-10-06 08:40:02.496415+00
1615	1	student.create	{"studentId": "1128"}	2026-10-06 08:40:02.586169+00
1616	1	student.create	{"studentId": "1129"}	2026-10-06 08:40:02.671774+00
1617	1	student.create	{"studentId": "1130"}	2026-10-06 08:40:02.752703+00
1618	1	student.create	{"studentId": "1131"}	2026-10-06 08:40:02.855698+00
1619	1	student.create	{"studentId": "1132"}	2026-10-06 08:40:02.943425+00
1620	1	student.create	{"studentId": "1133"}	2026-10-06 08:40:03.034865+00
1621	1	student.create	{"studentId": "1134"}	2026-10-06 08:40:03.125176+00
1622	1	student.create	{"studentId": "1135"}	2026-10-06 08:40:03.221443+00
1623	1	student.create	{"studentId": "1136"}	2026-10-06 08:40:03.317114+00
1624	1	student.create	{"studentId": "1137"}	2026-10-06 08:40:03.416746+00
1625	1	student.create	{"studentId": "1138"}	2026-10-06 08:40:03.51124+00
1626	1	student.create	{"studentId": "1139"}	2026-10-06 08:40:03.599104+00
1627	1	student.create	{"studentId": "1140"}	2026-10-06 08:40:03.729375+00
1628	1	student.create	{"studentId": "1141"}	2026-10-06 08:40:03.87655+00
1629	1	student.create	{"studentId": "1142"}	2026-10-06 08:40:03.968646+00
1630	1	student.create	{"studentId": "1143"}	2026-10-06 08:40:04.071359+00
1631	1	student.create	{"studentId": "1144"}	2026-10-06 08:40:04.168361+00
1632	1	student.create	{"studentId": "1145"}	2026-10-06 08:40:04.260386+00
1633	1	student.create	{"studentId": "1146"}	2026-10-06 08:40:04.354288+00
1634	1	student.create	{"studentId": "1147"}	2026-10-06 08:40:04.462283+00
1635	1	student.create	{"studentId": "1148"}	2026-10-06 08:40:04.55557+00
1636	1	student.create	{"studentId": "1149"}	2026-10-06 08:40:04.647662+00
1637	1	student.create	{"studentId": "1150"}	2026-10-06 08:40:04.764113+00
1638	1	student.create	{"studentId": "1151"}	2026-10-06 08:40:04.850357+00
1639	1	student.create	{"studentId": "1152"}	2026-10-06 08:40:04.931456+00
1640	1	student.create	{"studentId": "1153"}	2026-10-06 08:40:05.012584+00
1641	1	student.create	{"studentId": "1154"}	2026-10-06 08:40:05.096466+00
1642	1	student.create	{"studentId": "1155"}	2026-10-06 08:40:05.18538+00
1643	1	student.create	{"studentId": "1156"}	2026-10-06 08:40:05.266885+00
1644	1	student.create	{"studentId": "1157"}	2026-10-06 08:40:05.350249+00
1645	1	student.create	{"studentId": "1158"}	2026-10-06 08:40:05.436926+00
1646	1	student.create	{"studentId": "1159"}	2026-10-06 08:40:05.571791+00
1647	1	student.create	{"studentId": "1160"}	2026-10-06 08:40:05.807361+00
1648	1	student.create	{"studentId": "1161"}	2026-10-06 08:40:06.042791+00
1649	1	student.create	{"studentId": "1162"}	2026-10-06 08:40:06.204337+00
1650	1	student.create	{"studentId": "1163"}	2026-10-06 08:40:06.389054+00
1651	1	student.create	{"studentId": "1164"}	2026-10-06 08:40:06.485373+00
1652	1	student.create	{"studentId": "1165"}	2026-10-06 08:40:06.587836+00
1653	1	student.create	{"studentId": "1166"}	2026-10-06 08:40:06.688937+00
1654	1	student.create	{"studentId": "1167"}	2026-10-06 08:40:06.786145+00
1655	1	student.create	{"studentId": "1168"}	2026-10-06 08:40:06.882047+00
1656	1	student.create	{"studentId": "1169"}	2026-10-06 08:40:06.977851+00
1657	1	student.create	{"studentId": "1170"}	2026-10-06 08:40:07.070174+00
1658	1	student.create	{"studentId": "1171"}	2026-10-06 08:40:07.161464+00
1659	1	student.create	{"studentId": "1172"}	2026-10-06 08:40:07.251307+00
1660	1	student.create	{"studentId": "1173"}	2026-10-06 08:40:07.34052+00
1661	1	student.create	{"studentId": "1174"}	2026-10-06 08:40:07.429195+00
1662	1	student.create	{"studentId": "1175"}	2026-10-06 08:40:07.51036+00
1663	1	student.create	{"studentId": "1176"}	2026-10-06 08:40:07.592763+00
1664	1	student.create	{"studentId": "1177"}	2026-10-06 08:40:07.673668+00
1665	1	student.create	{"studentId": "1178"}	2026-10-06 08:40:07.754915+00
1666	1	student.create	{"studentId": "1179"}	2026-10-06 08:40:07.83887+00
1667	1	student.create	{"studentId": "1180"}	2026-10-06 08:40:07.940271+00
1668	1	student.create	{"studentId": "1181"}	2026-10-06 08:40:08.025827+00
1669	1	student.create	{"studentId": "1182"}	2026-10-06 08:40:08.106162+00
1670	1	student.create	{"studentId": "1183"}	2026-10-06 08:40:08.18645+00
1671	1	student.create	{"studentId": "1184"}	2026-10-06 08:40:08.267896+00
1672	1	student.create	{"studentId": "1185"}	2026-10-06 08:40:08.349609+00
1673	1	student.create	{"studentId": "1186"}	2026-10-06 08:40:08.431411+00
1674	1	student.create	{"studentId": "1187"}	2026-10-06 08:40:08.511349+00
1675	1	student.create	{"studentId": "1188"}	2026-10-06 08:40:08.592323+00
1676	1	student.create	{"studentId": "1189"}	2026-10-06 08:40:08.672582+00
1677	1	student.create	{"studentId": "1190"}	2026-10-06 08:40:08.752876+00
1678	1	student.create	{"studentId": "1191"}	2026-10-06 08:40:08.834949+00
1679	1	student.create	{"studentId": "1192"}	2026-10-06 08:40:08.915485+00
1680	1	student.create	{"studentId": "1193"}	2026-10-06 08:40:08.995638+00
2525	1	login	{}	2026-10-08 09:27:27.327425+00
2531	1	exam.pin_issue	{"examId": 32, "rotated": false, "issuedAt": "2026-10-08T09:38:42.926Z", "expiresAt": "2026-10-08T09:53:42.926Z", "validityMinutes": 15}	2026-10-08 09:38:42.923048+00
2536	1	exam.violation	{"count": 1, "examId": 32, "reason": "Perlu ditinjau pengawas", "sessionId": 2157}	2026-10-08 09:40:13.18028+00
2542	1	bank.delete	{"grade": "VII", "topic": "Uji Coba", "bankId": "3", "examCount": 0, "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-08 10:55:25.778758+00
2584	1	login	{}	2026-10-09 03:02:44.698237+00
2586	1	login	{}	2026-10-09 08:35:59.035641+00
2592	1	login	{}	2026-10-09 09:41:03.819307+00
2596	1	login	{}	2026-10-10 05:57:01.925422+00
2600	1	login	{}	2026-10-12 02:00:50.587352+00
2606	1	school.settings.update	{"next": {"grades": ["VII", "VIII"], "classes": ["VII A", "VII B", "VIII A", "VIII B", "IX A", "IX B"], "semester": "Ganjil", "updatedAt": "2026-10-12T04:53:27.984Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 90}, "previous": {"grades": ["VII", "VIII", "IX"], "classes": ["VII A", "VII B", "VIII A", "VIII B", "IX A", "IX B"], "semester": "Ganjil", "updatedAt": "2026-10-09T09:12:08.204Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 90}}	2026-10-12 04:53:27.984474+00
2612	1	login	{}	2026-10-12 09:49:17.2329+00
2616	1944	login	{}	2026-10-12 11:27:15.757831+00
2618	1	login	{}	2026-10-13 05:33:24.011431+00
2620	1	student.delete	{"name": "riqo", "sessions": 0, "username": "IMBS-5F9BE", "className": "VII A", "responses": 0, "studentId": 1948, "violations": 0}	2026-10-13 05:34:10.263004+00
2622	1	exam.delete	{"title": "tes #4", "examId": "34", "status": "completed", "sessionCount": 1, "responseCount": 0, "violationCount": 0}	2026-10-13 05:34:17.710546+00
2628	1	student.create	{"studentId": "1950"}	2026-10-13 05:39:29.266151+00
2641	1	exam.create	{"examId": "37", "participants": 2}	2026-10-13 05:49:17.814628+00
2655	1	exam.delete	{"title": "PAS 1", "examId": "36", "status": "completed", "sessionCount": 1, "responseCount": 0, "violationCount": 4}	2026-10-15 08:48:45.872984+00
2639	\N	login	{}	2026-10-13 05:48:21.597183+00
2649	\N	student.violation_signal	{"code": "window_blur", "detail": "Jendela ujian kehilangan fokus.", "sessionId": 2161, "reviewStatus": "pending"}	2026-10-13 05:54:08.091896+00
2532	\N	student.violation_signal	{"code": "window_blur", "detail": "Jendela ujian kehilangan fokus.", "sessionId": 2157, "reviewStatus": "pending"}	2026-10-08 09:39:16.415956+00
2533	\N	student.violation_signal	{"code": "blocked_shortcut", "detail": "Pintasan F12 dicegah oleh halaman.", "sessionId": 2157, "reviewStatus": "pending"}	2026-10-08 09:39:19.937996+00
2534	\N	student.violation_signal	{"code": "window_blur", "detail": "Jendela ujian kehilangan fokus.", "sessionId": 2157, "reviewStatus": "pending"}	2026-10-08 09:39:55.729749+00
2535	\N	student.violation_signal	{"code": "window_blur", "detail": "Jendela ujian kehilangan fokus.", "sessionId": 2157, "reviewStatus": "pending"}	2026-10-08 09:39:57.105628+00
2663	1	school.settings.update	{"next": {"grades": ["VII", "VIII"], "classes": ["VII A", "VII B"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:50:47.404Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["VII", "VIII"], "classes": ["VII A", "VII B", "VIII A", "VIII B"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:50:28.662Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}}	2026-10-15 08:50:47.404537+00
2674	1	bank.delete	{"grade": "VII", "topic": "bab 1", "bankId": "139", "examCount": 0, "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-15 08:55:56.973741+00
2686	1	student.create	{"studentId": "1952"}	2026-10-17 08:18:53.955852+00
2692	1	essay.grade	{"score": 0, "examId": 38, "studentId": 1952, "questionId": 78}	2026-10-17 08:26:29.657028+00
1694	1	login	{}	2026-10-06 08:41:48.00535+00
1695	1	exam.create	{"examId": "24", "participants": 300}	2026-10-06 08:41:48.966325+00
1696	1	exam.pin_issue	{"examId": 24, "rotated": false, "issuedAt": "2026-10-06T08:41:49.086Z", "expiresAt": "2026-10-06T08:51:49.086Z", "validityMinutes": 10}	2026-10-06 08:41:49.083854+00
1697	1	student.create	{"studentId": "1201"}	2026-10-06 08:41:49.186633+00
1698	1	student.create	{"studentId": "1202"}	2026-10-06 08:41:49.27285+00
1699	1	student.create	{"studentId": "1203"}	2026-10-06 08:41:49.362761+00
1700	1	student.create	{"studentId": "1204"}	2026-10-06 08:41:49.454016+00
1701	1	student.create	{"studentId": "1205"}	2026-10-06 08:41:49.539935+00
1702	1	student.create	{"studentId": "1206"}	2026-10-06 08:41:49.623532+00
1703	1	student.create	{"studentId": "1207"}	2026-10-06 08:41:49.713592+00
1704	1	student.create	{"studentId": "1208"}	2026-10-06 08:41:49.795837+00
1705	1	student.create	{"studentId": "1209"}	2026-10-06 08:41:49.877684+00
1706	1	student.create	{"studentId": "1210"}	2026-10-06 08:41:49.961914+00
1707	1	student.create	{"studentId": "1211"}	2026-10-06 08:41:50.04507+00
1708	1	student.create	{"studentId": "1212"}	2026-10-06 08:41:50.128755+00
1709	1	student.create	{"studentId": "1213"}	2026-10-06 08:41:50.215125+00
1710	1	student.create	{"studentId": "1214"}	2026-10-06 08:41:50.300663+00
1711	1	student.create	{"studentId": "1215"}	2026-10-06 08:41:50.384937+00
1712	1	student.create	{"studentId": "1216"}	2026-10-06 08:41:50.470062+00
1713	1	student.create	{"studentId": "1217"}	2026-10-06 08:41:50.553806+00
1714	1	student.create	{"studentId": "1218"}	2026-10-06 08:41:50.6354+00
1715	1	student.create	{"studentId": "1219"}	2026-10-06 08:41:50.719825+00
1716	1	student.create	{"studentId": "1220"}	2026-10-06 08:41:50.807138+00
1717	1	student.create	{"studentId": "1221"}	2026-10-06 08:41:50.889921+00
1718	1	student.create	{"studentId": "1222"}	2026-10-06 08:41:50.972408+00
1719	1	student.create	{"studentId": "1223"}	2026-10-06 08:41:51.058448+00
1720	1	student.create	{"studentId": "1224"}	2026-10-06 08:41:51.145622+00
1721	1	student.create	{"studentId": "1225"}	2026-10-06 08:41:51.22753+00
1722	1	student.create	{"studentId": "1226"}	2026-10-06 08:41:51.309512+00
1723	1	student.create	{"studentId": "1227"}	2026-10-06 08:41:51.391135+00
1724	1	student.create	{"studentId": "1228"}	2026-10-06 08:41:51.474971+00
1725	1	student.create	{"studentId": "1229"}	2026-10-06 08:41:51.5888+00
1726	1	student.create	{"studentId": "1230"}	2026-10-06 08:41:51.681961+00
1727	1	student.create	{"studentId": "1231"}	2026-10-06 08:41:51.768814+00
1728	1	student.create	{"studentId": "1232"}	2026-10-06 08:41:51.852913+00
1729	1	student.create	{"studentId": "1233"}	2026-10-06 08:41:51.935458+00
1730	1	student.create	{"studentId": "1234"}	2026-10-06 08:41:52.021633+00
1731	1	student.create	{"studentId": "1235"}	2026-10-06 08:41:52.105376+00
1732	1	student.create	{"studentId": "1236"}	2026-10-06 08:41:52.189166+00
1733	1	student.create	{"studentId": "1237"}	2026-10-06 08:41:52.276534+00
1734	1	student.create	{"studentId": "1238"}	2026-10-06 08:41:52.36468+00
1735	1	student.create	{"studentId": "1239"}	2026-10-06 08:41:52.447589+00
1736	1	student.create	{"studentId": "1240"}	2026-10-06 08:41:52.529951+00
1737	1	student.create	{"studentId": "1241"}	2026-10-06 08:41:52.611385+00
1738	1	student.create	{"studentId": "1242"}	2026-10-06 08:41:52.694658+00
1739	1	student.create	{"studentId": "1243"}	2026-10-06 08:41:52.776002+00
1740	1	student.create	{"studentId": "1244"}	2026-10-06 08:41:52.858901+00
1741	1	student.create	{"studentId": "1245"}	2026-10-06 08:41:52.940995+00
1742	1	student.create	{"studentId": "1246"}	2026-10-06 08:41:53.022705+00
1743	1	student.create	{"studentId": "1247"}	2026-10-06 08:41:53.10336+00
1744	1	student.create	{"studentId": "1248"}	2026-10-06 08:41:53.185452+00
1745	1	student.create	{"studentId": "1249"}	2026-10-06 08:41:53.266628+00
1746	1	student.create	{"studentId": "1250"}	2026-10-06 08:41:53.347166+00
1747	1	student.create	{"studentId": "1251"}	2026-10-06 08:41:53.45405+00
1748	1	student.create	{"studentId": "1252"}	2026-10-06 08:41:53.624327+00
1749	1	student.create	{"studentId": "1253"}	2026-10-06 08:41:53.710635+00
1750	1	student.create	{"studentId": "1254"}	2026-10-06 08:41:53.792119+00
1751	1	student.create	{"studentId": "1255"}	2026-10-06 08:41:53.872277+00
1752	1	student.create	{"studentId": "1256"}	2026-10-06 08:41:53.953817+00
1753	1	student.create	{"studentId": "1257"}	2026-10-06 08:41:54.034499+00
1754	1	student.create	{"studentId": "1258"}	2026-10-06 08:41:54.119182+00
1755	1	student.create	{"studentId": "1259"}	2026-10-06 08:41:54.208006+00
1756	1	student.create	{"studentId": "1260"}	2026-10-06 08:41:54.288786+00
1757	1	student.create	{"studentId": "1261"}	2026-10-06 08:41:54.370688+00
1758	1	student.create	{"studentId": "1262"}	2026-10-06 08:41:54.451154+00
1759	1	student.create	{"studentId": "1263"}	2026-10-06 08:41:54.531477+00
1760	1	student.create	{"studentId": "1264"}	2026-10-06 08:41:54.612601+00
1761	1	student.create	{"studentId": "1265"}	2026-10-06 08:41:54.696619+00
1762	1	student.create	{"studentId": "1266"}	2026-10-06 08:41:54.779529+00
1763	1	student.create	{"studentId": "1267"}	2026-10-06 08:41:54.862151+00
1764	1	student.create	{"studentId": "1268"}	2026-10-06 08:41:54.946243+00
1765	1	student.create	{"studentId": "1269"}	2026-10-06 08:41:55.028651+00
1766	1	student.create	{"studentId": "1270"}	2026-10-06 08:41:55.109196+00
1767	1	student.create	{"studentId": "1271"}	2026-10-06 08:41:55.191359+00
1768	1	student.create	{"studentId": "1272"}	2026-10-06 08:41:55.272463+00
1769	1	student.create	{"studentId": "1273"}	2026-10-06 08:41:55.354103+00
1770	1	student.create	{"studentId": "1274"}	2026-10-06 08:41:55.440202+00
1771	1	student.create	{"studentId": "1275"}	2026-10-06 08:41:55.522634+00
1772	1	student.create	{"studentId": "1276"}	2026-10-06 08:41:55.604411+00
1773	1	student.create	{"studentId": "1277"}	2026-10-06 08:41:55.686312+00
1774	1	student.create	{"studentId": "1278"}	2026-10-06 08:41:55.768218+00
1775	1	student.create	{"studentId": "1279"}	2026-10-06 08:41:55.849513+00
1776	1	student.create	{"studentId": "1280"}	2026-10-06 08:41:55.930367+00
1777	1	student.create	{"studentId": "1281"}	2026-10-06 08:41:56.011825+00
1778	1	student.create	{"studentId": "1282"}	2026-10-06 08:41:56.093191+00
1779	1	student.create	{"studentId": "1283"}	2026-10-06 08:41:56.173633+00
1780	1	student.create	{"studentId": "1284"}	2026-10-06 08:41:56.253633+00
1781	1	student.create	{"studentId": "1285"}	2026-10-06 08:41:56.334303+00
1782	1	student.create	{"studentId": "1286"}	2026-10-06 08:41:56.4166+00
1783	1	student.create	{"studentId": "1287"}	2026-10-06 08:41:56.498365+00
1784	1	student.create	{"studentId": "1288"}	2026-10-06 08:41:56.5953+00
1785	1	student.create	{"studentId": "1289"}	2026-10-06 08:41:56.70732+00
1786	1	student.create	{"studentId": "1290"}	2026-10-06 08:41:56.793511+00
1787	1	student.create	{"studentId": "1291"}	2026-10-06 08:41:56.879622+00
1788	1	student.create	{"studentId": "1292"}	2026-10-06 08:41:56.968475+00
1789	1	student.create	{"studentId": "1293"}	2026-10-06 08:41:57.061692+00
1790	1	student.create	{"studentId": "1294"}	2026-10-06 08:41:57.148369+00
1791	1	student.create	{"studentId": "1295"}	2026-10-06 08:41:57.238419+00
1792	1	student.create	{"studentId": "1296"}	2026-10-06 08:41:57.343373+00
1793	1	student.create	{"studentId": "1297"}	2026-10-06 08:41:57.43914+00
1794	1	student.create	{"studentId": "1298"}	2026-10-06 08:41:57.526957+00
1795	1	student.create	{"studentId": "1299"}	2026-10-06 08:41:57.608065+00
1796	1	student.create	{"studentId": "1300"}	2026-10-06 08:41:57.69143+00
2526	1	exam.create	{"examId": "30", "participants": 0}	2026-10-08 09:28:02.201791+00
2537	1	exam.violation	{"count": 2, "examId": 32, "reason": "Perlu ditinjau pengawas", "sessionId": 2157}	2026-10-08 09:40:17.7928+00
2543	1	exam.delete	{"title": "tes 2 08/20/2026", "examId": "31", "status": "draft", "sessionCount": 1, "responseCount": 0, "violationCount": 0}	2026-10-08 10:55:33.732033+00
2545	1	exam.delete	{"title": "jondai", "examId": "26", "status": "completed", "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-08 10:55:40.394745+00
2547	1	exam.delete	{"title": "tes 08/20/2026", "examId": "30", "status": "completed", "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-08 10:55:44.520425+00
2587	1	bank.create	{"bankId": "89", "mcCount": 1, "essayCount": 0, "questionCount": 1}	2026-10-09 08:51:05.026391+00
2593	1	teacher.access.update	{"next": {"classNames": ["VII A"], "subjectIds": [1]}, "previous": [], "teacherId": 2}	2026-10-09 09:41:33.182163+00
2597	1	teacher.create	{"username": "alif", "teacherId": "1874", "classNames": ["VIII A"], "subjectIds": [1]}	2026-10-10 06:19:30.513468+00
2598	1874	login	{}	2026-10-10 06:19:57.044603+00
2601	1	exam.delete	{"title": "tes 3 08/20/2026", "examId": "32", "status": "completed", "sessionCount": 2, "responseCount": 4, "violationCount": 6}	2026-10-12 02:12:55.124338+00
2607	1	school.settings.update	{"next": {"grades": ["VII", "VIII"], "classes": ["VII A", "VII B", "VIII A", "VIII B"], "semester": "Ganjil", "updatedAt": "2026-10-12T04:53:41.673Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 90}, "previous": {"grades": ["VII", "VIII"], "classes": ["VII A", "VII B", "VIII A", "VIII B", "IX A", "IX B"], "semester": "Ganjil", "updatedAt": "2026-10-12T04:53:27.984Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 90}}	2026-10-12 04:53:41.673925+00
2295	1	login	{}	2026-10-06 09:36:15.443486+00
2613	1	login	{}	2026-10-12 09:58:18.07657+00
2619	1	login	{}	2026-10-13 05:34:05.113934+00
2624	1	bank.delete	{"grade": "VII", "topic": "الفصل الدراسي الأول", "bankId": "1", "examCount": 0, "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-13 05:34:26.829123+00
2629	1	exam.create	{"examId": "36", "participants": 1}	2026-10-13 05:41:43.197345+00
2640	1	exam.pin_issue	{"examId": 36, "rotated": true, "issuedAt": "2026-10-13T05:48:45.534Z", "expiresAt": "2026-10-13T06:03:45.534Z", "validityMinutes": 15}	2026-10-13 05:48:45.531485+00
2651	1	login	{}	2026-10-13 06:14:47.99731+00
2656	1	exam.violation_threshold_decision	{"count": 2, "examId": 37, "reason": "ok", "status": "locked", "decision": "block", "sessionId": 2161}	2026-10-15 08:49:08.044353+00
2660	1	student.delete	{"name": "farhan08/10", "sessions": 0, "username": "IMBS-33C11", "className": "VII B", "responses": 0, "studentId": 1693, "violations": 0}	2026-10-15 08:50:00.7509+00
2664	1	school.settings.update	{"next": {"grades": ["VII", "VIII"], "classes": ["VII A"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:50:50.717Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["VII", "VIII"], "classes": ["VII A", "VII B"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:50:47.404Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}}	2026-10-15 08:50:50.71702+00
2675	1	teacher.access.update	{"next": {"classNames": ["KELAS 1 RUANG 1"], "subjectIds": [1]}, "previous": [{"className": "VII A", "subjectId": "1"}], "teacherId": 1874}	2026-10-15 08:56:07.745611+00
2687	1	exam.create	{"examId": "38", "participants": 1}	2026-10-17 08:19:46.562284+00
2711	1	login	{}	2026-10-17 08:30:12.272137+00
1895	1	login	{}	2026-10-06 08:48:43.291229+00
2527	1	student.create	{"studentId": "1693"}	2026-10-08 09:29:35.890621+00
2538	1	exam.violation_review	{"count": 3, "examId": 32, "reason": "ya", "status": "locked", "eventId": 27, "decision": "confirm", "sessionId": 2157}	2026-10-08 09:40:30.795162+00
2544	1	exam.delete	{"title": "TES UJIAN", "examId": "1", "status": "completed", "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-08 10:55:38.249231+00
2594	1	bank.delete	{"grade": "VII", "topic": "tes cocok", "bankId": "89", "examCount": 0, "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-09 12:02:02.49481+00
2588	\N	login	{}	2026-10-09 08:51:33.665914+00
2602	\N	login	{}	2026-10-12 02:24:27.418028+00
2608	1	teacher.delete	{"name": "Guru Bahasa Arab", "username": "guru", "teacherId": 2}	2026-10-12 04:54:13.780817+00
2614	1	login	{}	2026-10-12 10:03:35.72221+00
2621	1	exam.delete	{"title": "tes #3", "examId": "33", "status": "completed", "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-13 05:34:16.492511+00
2625	1	student.create	{"studentId": "1949"}	2026-10-13 05:34:39.922748+00
2642	1	exam.pin_issue	{"examId": 37, "rotated": false, "issuedAt": "2026-10-13T05:49:31.608Z", "expiresAt": "2026-10-13T06:04:31.608Z", "validityMinutes": 15}	2026-10-13 05:49:31.605031+00
2652	1	login	{}	2026-10-13 06:18:49.707483+00
2657	1	exam.delete	{"title": "PAS 2", "examId": "37", "status": "completed", "sessionCount": 2, "responseCount": 20, "violationCount": 6}	2026-10-15 08:49:20.511603+00
2643	\N	student.violation_signal	{"code": "window_blur", "detail": "Jendela ujian kehilangan fokus.", "sessionId": 2161, "reviewStatus": "pending"}	2026-10-13 05:52:46.465641+00
2644	\N	student.violation_signal	{"code": "fullscreen_exit", "detail": "Mode layar penuh berakhir.", "sessionId": 2161, "reviewStatus": "pending"}	2026-10-13 05:52:46.502765+00
2630	\N	login	{}	2026-10-13 05:43:55.618012+00
2665	1	school.settings.update	{"next": {"grades": ["VII", "VIII"], "classes": ["VII A"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:50:51.676Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["VII", "VIII"], "classes": ["VII A"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:50:50.717Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}}	2026-10-15 08:50:51.676131+00
2666	1	school.settings.update	{"next": {"grades": ["VII", "VIII"], "classes": ["VII A"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:50:52.092Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["VII", "VIII"], "classes": ["VII A"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:50:51.676Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}}	2026-10-15 08:50:52.092608+00
2667	1	school.settings.update	{"next": {"grades": ["VII", "VIII"], "classes": ["VII A"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:50:52.444Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["VII", "VIII"], "classes": ["VII A"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:50:52.092Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}}	2026-10-15 08:50:52.444756+00
2668	1	school.settings.update	{"next": {"grades": ["VII", "VIII"], "classes": ["VII A"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:50:52.725Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["VII", "VIII"], "classes": ["VII A"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:50:52.444Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}}	2026-10-15 08:50:52.725586+00
2676	1	school.settings.update	{"next": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:56:16.556Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["VII", "VIII", "1", "2", "3", "4", "5", "6"], "classes": ["VII A", "KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:55:39.077Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}}	2026-10-15 08:56:16.556355+00
2682	1	teacher.access.update	{"next": {"classNames": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 4 RUANG 1", "KELAS 6 RUANG 1", "KELAS 5 RUANG 1"], "subjectIds": [1]}, "previous": [{"className": "KELAS 1 RUANG 1", "subjectId": "1"}], "teacherId": 1874}	2026-10-16 01:27:46.850654+00
2689	1	exam.pin_issue	{"examId": 38, "rotated": false, "issuedAt": "2026-10-17T08:21:10.226Z", "expiresAt": "2026-10-17T08:36:10.226Z", "validityMinutes": 15}	2026-10-17 08:21:10.223992+00
2693	1	essay.grade	{"score": 0, "examId": 38, "studentId": 1952, "questionId": 75}	2026-10-17 08:26:30.480795+00
2700	1	essay.grade	{"score": 30, "examId": 38, "studentId": 1952, "questionId": 68}	2026-10-17 08:26:40.912875+00
2688	\N	login	{}	2026-10-17 08:21:03.066807+00
2528	1	exam.create	{"examId": "31", "participants": 1}	2026-10-08 09:30:36.707267+00
2539	1	exam.violation_review	{"count": 4, "examId": 32, "reason": "ok", "status": "locked", "eventId": 30, "decision": "confirm", "sessionId": 2157}	2026-10-08 09:40:44.396583+00
2546	1	exam.delete	{"title": "tes 1", "examId": "4", "status": "completed", "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-08 10:55:42.272431+00
2589	1	login	{}	2026-10-09 09:11:41.526482+00
2603	1	login	{}	2026-10-12 02:24:48.317634+00
2609	1	teacher.access.update	{"next": {"classNames": ["VII A"], "subjectIds": [1]}, "previous": [{"className": "VII A", "subjectId": "1"}, {"className": "VIII A", "subjectId": "1"}], "teacherId": 1874}	2026-10-12 04:54:35.916225+00
2623	1	exam.delete	{"title": "tes #5", "examId": "35", "status": "completed", "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-13 05:34:19.199618+00
2631	1	exam.pin_issue	{"examId": 36, "rotated": false, "issuedAt": "2026-10-13T05:44:21.747Z", "expiresAt": "2026-10-13T05:59:21.747Z", "validityMinutes": 15}	2026-10-13 05:44:21.744678+00
2634	1	exam.violation_threshold_decision	{"count": 0, "examId": 36, "reason": "teledor", "status": "in_progress", "decision": "false_positive", "sessionId": 2159}	2026-10-13 05:46:27.984519+00
2645	1	exam.violation_threshold_decision	{"count": 0, "examId": 37, "reason": "ssfsf", "status": "in_progress", "decision": "false_positive", "sessionId": 2161}	2026-10-13 05:53:19.529641+00
2658	1	teacher.delete	{"name": "Guru Bahasa Arab", "username": "guru", "teacherId": 1936}	2026-10-15 08:49:38.536443+00
2650	\N	student.violation_signal	{"code": "fullscreen_exit", "detail": "Mode layar penuh berakhir.", "sessionId": 2161, "reviewStatus": "pending"}	2026-10-13 05:54:08.106387+00
2632	\N	student.violation_signal	{"code": "window_blur", "detail": "Jendela ujian kehilangan fokus.", "sessionId": 2159, "reviewStatus": "pending"}	2026-10-13 05:45:35.019539+00
2633	\N	student.violation_signal	{"code": "window_blur", "detail": "Jendela ujian kehilangan fokus.", "sessionId": 2159, "reviewStatus": "pending"}	2026-10-13 05:45:46.364927+00
2669	1	school.settings.update	{"next": {"grades": ["VII", "VIII", "1", "2", "3", "4", "5", "6"], "classes": ["VII A"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:54:11.807Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["VII", "VIII"], "classes": ["VII A"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:50:52.725Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}}	2026-10-15 08:54:11.807047+00
2670	1	school.settings.update	{"next": {"grades": ["VII", "VIII", "1", "2", "3", "4", "5", "6"], "classes": ["VII A"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:54:13.133Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["VII", "VIII", "1", "2", "3", "4", "5", "6"], "classes": ["VII A"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:54:11.807Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}}	2026-10-15 08:54:13.133691+00
2677	1	school.settings.update	{"next": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:56:17.715Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:56:16.556Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}}	2026-10-15 08:56:17.715757+00
2678	1	school.settings.update	{"next": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:56:17.955Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:56:17.715Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}}	2026-10-15 08:56:17.955417+00
2679	1	account.profile.update	{"name": "Admin IMBS MITFAHUL ULUM", "previousName": "Admin IMBS", "passwordChanged": false}	2026-10-15 08:56:45.054664+00
2683	1	login	{}	2026-10-17 08:06:12.150806+00
2694	1	essay.grade	{"score": 0, "examId": 38, "studentId": 1952, "questionId": 66}	2026-10-17 08:26:31.752932+00
2696	1	essay.grade	{"score": 0, "examId": 38, "studentId": 1952, "questionId": 74}	2026-10-17 08:26:34.047982+00
2690	\N	student.exam_submit	{"sessionId": "2162", "finalScorePending": true}	2026-10-17 08:24:27.427242+00
2716	1	login	{}	2026-10-17 08:47:15.802715+00
2721	1	student.create	{"studentId": "1956"}	2026-10-17 08:59:22.134085+00
2724	1	student.create	{"studentId": "1957"}	2026-10-17 09:21:38.60825+00
2726	1	exam.delete	{"title": "ruang 1", "examId": "62", "status": "draft", "sessionCount": 2, "responseCount": 0, "violationCount": 0}	2026-10-17 09:21:57.489419+00
2755	1	login	{}	2026-10-19 06:30:12.855816+00
2735	\N	login	{}	2026-10-17 10:22:00.180549+00
2737	\N	login	{}	2026-10-17 10:22:43.246796+00
2811	1	login	{}	2026-10-20 06:11:56.638666+00
2522	1	login	{}	2026-10-06 09:36:41.969701+00
2529	1	exam.create	{"examId": "32", "participants": 2}	2026-10-08 09:31:27.723098+00
2540	1	exam.violation_review	{"count": 5, "examId": 32, "reason": "ok", "status": "locked", "eventId": 29, "decision": "confirm", "sessionId": 2157}	2026-10-08 10:41:17.397964+00
2548	1	school.settings.update	{"next": {"grades": ["VII", "VIII", "IX"], "classes": ["VII A", "VII B", "VIII A", "VIII B", "IX A", "IX B"], "semester": "Ganjil", "updatedAt": "2026-10-08T11:11:45.172Z", "schoolName": "IMBS Miftahul Ulum Pekajangan", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 90}, "previous": {"grades": ["VII", "VIII", "IX"], "classes": ["VII A", "VII B", "VIII A", "VIII B", "IX A", "IX B"], "semester": "Ganjil", "updatedAt": "2026-10-08T11:10:58.784Z", "schoolName": "IMBS Islamic School", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 90}}	2026-10-08 11:11:45.172095+00
2549	1	school.settings.update	{"next": {"grades": ["VII", "VIII", "IX"], "classes": ["VII A", "VII B", "VIII A", "VIII B", "IX A", "IX B"], "semester": "Ganjil", "updatedAt": "2026-10-08T11:11:48.120Z", "schoolName": "IMBS Miftahul Ulum Pekajangan", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 90}, "previous": {"grades": ["VII", "VIII", "IX"], "classes": ["VII A", "VII B", "VIII A", "VIII B", "IX A", "IX B"], "semester": "Ganjil", "updatedAt": "2026-10-08T11:11:45.172Z", "schoolName": "IMBS Miftahul Ulum Pekajangan", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 90}}	2026-10-08 11:11:48.120772+00
2590	1	school.settings.update	{"next": {"grades": ["VII", "VIII", "IX"], "classes": ["VII A", "VII B", "VIII A", "VIII B", "IX A", "IX B"], "semester": "Ganjil", "updatedAt": "2026-10-09T09:12:08.204Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 90}, "previous": {"grades": ["VII", "VIII", "IX"], "classes": ["VII A", "VII B", "VIII A", "VIII B", "IX A", "IX B"], "semester": "Ganjil", "updatedAt": "2026-10-08T11:11:48.120Z", "schoolName": "IMBS Miftahul Ulum Pekajangan", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 90}}	2026-10-09 09:12:08.204081+00
2604	1	teacher.access.update	{"next": {"classNames": ["VII A", "VIII A"], "subjectIds": [1]}, "previous": [{"className": "VIII A", "subjectId": "1"}], "teacherId": 1874}	2026-10-12 02:44:53.335599+00
2610	1	login	{}	2026-10-12 07:10:31.363109+00
2626	1	student.delete	{"name": "rio", "sessions": 0, "username": "IMBS-96985", "className": "VII A", "responses": 0, "studentId": 1949, "violations": 0}	2026-10-13 05:34:48.551842+00
2637	1	exam.violation_threshold_decision	{"count": 2, "examId": 36, "reason": "dablewg", "status": "locked", "decision": "block", "sessionId": 2159}	2026-10-13 05:46:53.414459+00
2646	\N	student.violation_signal	{"code": "window_blur", "detail": "Jendela ujian kehilangan fokus.", "sessionId": 2161, "reviewStatus": "pending"}	2026-10-13 05:53:32.090566+00
2647	\N	student.violation_signal	{"code": "fullscreen_exit", "detail": "Mode layar penuh berakhir.", "sessionId": 2161, "reviewStatus": "pending"}	2026-10-13 05:53:32.108152+00
2659	1	student.delete	{"name": "heru", "sessions": 0, "username": "IMBS-AFB02", "className": "VII A", "responses": 0, "studentId": 1951, "violations": 0}	2026-10-15 08:49:58.722131+00
2635	\N	student.violation_signal	{"code": "window_blur", "detail": "Jendela ujian kehilangan fokus.", "sessionId": 2159, "reviewStatus": "pending"}	2026-10-13 05:46:38.031943+00
2636	\N	student.violation_signal	{"code": "window_blur", "detail": "Jendela ujian kehilangan fokus.", "sessionId": 2159, "reviewStatus": "pending"}	2026-10-13 05:46:41.451403+00
2662	1	school.settings.update	{"next": {"grades": ["VII", "VIII"], "classes": ["VII A", "VII B", "VIII A", "VIII B"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:50:28.662Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["VII", "VIII"], "classes": ["VII A", "VII B", "VIII A", "VIII B"], "semester": "Ganjil", "updatedAt": "2026-10-12T04:53:41.673Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "violationThreshold": 2, "defaultExamDurationMinutes": 90}}	2026-10-15 08:50:28.662305+00
2680	1	account.profile.update	{"name": "Admin IMBS Miftahul Ulum", "previousName": "Admin IMBS MITFAHUL ULUM", "passwordChanged": false}	2026-10-15 08:57:01.566191+00
2684	1	login	{}	2026-10-17 08:14:50.245419+00
2720	1	student.create	{"studentId": "1955"}	2026-10-17 08:59:05.775494+00
2722	1	login	{}	2026-10-17 09:06:09.057174+00
2725	1	student.create	{"studentId": "1958"}	2026-10-17 09:21:49.447722+00
2741	1	subject.delete	{"name": "TES", "subjectId": 13}	2026-10-17 11:45:01.029905+00
2742	1	login	{}	2026-10-19 03:49:20.586414+00
2756	1	login	{}	2026-10-19 06:33:05.139252+00
2796	1	login	{}	2026-10-20 03:11:45.930181+00
2809	1	login	{}	2026-10-20 06:05:30.690883+00
2813	1	login	{}	2026-10-20 06:18:44.467792+00
2902	1	subject.delete	{"name": "Bahasa Indonesia", "subjectId": 4}	2026-10-20 07:51:03.60456+00
2903	1	subject.delete	{"name": "Bahasa Arab", "subjectId": 1}	2026-10-20 07:51:06.968925+00
2904	1	subject.delete	{"name": "IPA", "subjectId": 5}	2026-10-20 07:51:11.778646+00
2905	1	subject.delete	{"name": "IPS", "subjectId": 6}	2026-10-20 07:51:15.47906+00
2057	1	login	{}	2026-10-06 08:56:45.928926+00
2059	1	exam.final_score	{"score": 0.01, "examId": 20, "studentId": 773}	2026-10-06 08:57:53.832943+00
2060	1	exam.final_score	{"score": 0.01, "examId": 20, "studentId": 773}	2026-10-06 08:57:55.452817+00
2061	1	exam.final_score	{"score": 20, "examId": 20, "studentId": 773}	2026-10-06 08:58:03.163389+00
2066	1	login	{}	2026-10-06 09:01:12.377833+00
2067	1	student.create	{"studentId": "1436"}	2026-10-06 09:01:22.837649+00
2069	1	login	{}	2026-10-06 09:02:11.934486+00
2071	1	login	{}	2026-10-06 09:02:51.206178+00
2073	1	login	{}	2026-10-06 09:04:17.786448+00
2076	1	exam.create	{"examId": "26", "participants": 1}	2026-10-06 09:05:32.270107+00
2077	1	login	{}	2026-10-06 09:09:32.338253+00
2078	1	exam.create	{"examId": "27", "participants": 400}	2026-10-06 09:09:33.830894+00
2079	1	login	{}	2026-10-06 09:26:05.124641+00
2712	1	bank.create	{"bankId": "141", "mcCount": 30, "essayCount": 15, "questionCount": 45}	2026-10-17 08:35:47.017586+00
2713	1	student.create	{"studentId": "1953"}	2026-10-17 08:36:46.58264+00
2714	1	student.create	{"studentId": "1954"}	2026-10-17 08:37:28.167063+00
2715	1	bank.create	{"bankId": "142", "mcCount": 30, "essayCount": 15, "questionCount": 45}	2026-10-17 08:37:59.233133+00
2717	1	teacher.access.update	{"next": {"classNames": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 4 RUANG 1", "KELAS 5 RUANG 1", "KELAS 6 RUANG 1"], "subjectIds": [1, 480]}, "previous": [{"className": "KELAS 1 RUANG 1", "subjectId": "1"}, {"className": "KELAS 2 RUANG 1", "subjectId": "1"}, {"className": "KELAS 3 RUANG 1", "subjectId": "1"}, {"className": "KELAS 4 RUANG 1", "subjectId": "1"}, {"className": "KELAS 6 RUANG 1", "subjectId": "1"}, {"className": "KELAS 5 RUANG 1", "subjectId": "1"}], "teacherId": 1874}	2026-10-17 08:52:58.798537+00
2718	1	student.delete	{"name": "AHMAD", "sessions": 0, "username": "IMBS-2DF43", "className": "KELAS 6 RUANG 1", "responses": 0, "studentId": 1953, "violations": 0}	2026-10-17 08:58:27.21327+00
2719	1	student.delete	{"name": "FADHIL", "sessions": 0, "username": "IMBS-7F5BE", "className": "KELAS 5 RUANG 1", "responses": 0, "studentId": 1954, "violations": 0}	2026-10-17 08:58:29.261571+00
2723	1	exam.create	{"banks": 2, "examId": "62", "classes": 2, "participants": 2}	2026-10-17 09:21:14.583218+00
2727	1	exam.create	{"banks": 2, "examId": "63", "classes": 2, "participants": 3}	2026-10-17 09:22:07.083989+00
2729	1	exam.pin_issue	{"examId": 63, "rotated": false, "issuedAt": "2026-10-17T09:23:03.822Z", "expiresAt": "2026-10-17T09:38:03.822Z", "validityMinutes": 15}	2026-10-17 09:23:03.820478+00
2732	1	exam.violation_threshold_decision	{"count": 2, "examId": 63, "reason": "ok", "status": "locked", "decision": "block", "sessionId": 2191}	2026-10-17 09:24:29.996322+00
2733	1	exam.delete	{"title": "ruang 1", "examId": "63", "status": "completed", "sessionCount": 3, "responseCount": 1, "violationCount": 2}	2026-10-17 09:26:13.186545+00
2734	1	exam.create	{"banks": 2, "examId": "64", "classes": 2, "participants": 3}	2026-10-17 10:21:11.082239+00
2730	\N	student.violation_signal	{"code": "window_blur", "detail": "Jendela ujian kehilangan fokus.", "sessionId": 2191, "reviewStatus": "pending"}	2026-10-17 09:24:02.081293+00
2731	\N	student.violation_signal	{"code": "window_blur", "detail": "Jendela ujian kehilangan fokus.", "sessionId": 2191, "reviewStatus": "pending"}	2026-10-17 09:24:12.8868+00
2736	1	exam.pin_issue	{"examId": 64, "rotated": false, "issuedAt": "2026-10-17T10:22:03.752Z", "expiresAt": "2026-10-17T10:37:03.752Z", "validityMinutes": 15}	2026-10-17 10:22:03.750655+00
2739	1	essay.grade	{"score": 30, "examId": 64, "studentId": 1958, "questionId": 109}	2026-10-17 10:23:44.878323+00
2740	1	exam.create	{"banks": 2, "examId": "65", "classes": 2, "participants": 3}	2026-10-17 10:57:25.732043+00
2743	1	bank.create	{"bankId": "143", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-19 04:22:57.94391+00
2744	1	bank.create	{"bankId": "144", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-19 04:34:25.794499+00
2745	1	bank.delete	{"grade": "6", "topic": "Bab 1", "bankId": "141", "examCount": 2, "sessionCount": 6, "responseCount": 2, "violationCount": 0}	2026-10-19 04:35:12.435599+00
2746	1	bank.delete	{"grade": "5", "topic": "Bab 1", "bankId": "142", "examCount": 0, "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-19 04:35:19.277896+00
2747	1	question.update	{"type": "essay", "bankId": "143", "questionId": 186}	2026-10-19 04:37:53.84624+00
2748	1	question.update	{"type": "essay", "bankId": "143", "questionId": 187}	2026-10-19 04:38:26.742449+00
2749	1	question.update	{"type": "essay", "bankId": "143", "questionId": 188}	2026-10-19 04:39:12.528761+00
2750	1	question.update	{"type": "essay", "bankId": "143", "questionId": 187}	2026-10-19 04:40:39.841352+00
2751	1	bank.create	{"bankId": "145", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-19 04:53:23.641164+00
2752	1	bank.create	{"bankId": "146", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-19 05:00:56.097236+00
2753	1	bank.create	{"bankId": "147", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-19 05:06:06.672214+00
2754	1	login	{}	2026-10-19 06:22:17.179673+00
2757	1	bank.create	{"bankId": "148", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-19 07:05:30.295411+00
2758	1	bank.create	{"bankId": "149", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-19 07:24:39.910798+00
2759	1	question.media.create	{"mediaId": "3", "fileSize": 59718, "mimeType": "image/png", "questionId": "289"}	2026-10-19 07:24:40.127192+00
2760	1	question.media.create	{"mediaId": "4", "fileSize": 59718, "mimeType": "image/png", "questionId": "290"}	2026-10-19 07:24:40.229658+00
2761	1	question.media.create	{"mediaId": "5", "fileSize": 59718, "mimeType": "image/png", "questionId": "291"}	2026-10-19 07:24:40.342852+00
2762	1	question.media.create	{"mediaId": "6", "fileSize": 59718, "mimeType": "image/png", "questionId": "292"}	2026-10-19 07:24:40.46368+00
2763	1	question.media.create	{"mediaId": "7", "fileSize": 59718, "mimeType": "image/png", "questionId": "293"}	2026-10-19 07:24:40.608258+00
2764	1	question.media.create	{"mediaId": "8", "fileSize": 37744, "mimeType": "image/png", "questionId": "294"}	2026-10-19 07:24:40.854368+00
2765	1	question.media.create	{"mediaId": "9", "fileSize": 37744, "mimeType": "image/png", "questionId": "295"}	2026-10-19 07:24:40.940107+00
2766	1	question.media.create	{"mediaId": "10", "fileSize": 37744, "mimeType": "image/png", "questionId": "296"}	2026-10-19 07:24:41.020907+00
2767	1	question.media.create	{"mediaId": "11", "fileSize": 37744, "mimeType": "image/png", "questionId": "297"}	2026-10-19 07:24:41.085274+00
2768	1	question.media.create	{"mediaId": "12", "fileSize": 37744, "mimeType": "image/png", "questionId": "298"}	2026-10-19 07:24:41.15103+00
2769	1	question.media.create	{"mediaId": "13", "fileSize": 45632, "mimeType": "image/png", "questionId": "299"}	2026-10-19 07:24:41.262896+00
2770	1	question.media.create	{"mediaId": "14", "fileSize": 45632, "mimeType": "image/png", "questionId": "300"}	2026-10-19 07:24:41.326968+00
2771	1	question.media.create	{"mediaId": "15", "fileSize": 45632, "mimeType": "image/png", "questionId": "301"}	2026-10-19 07:24:41.424713+00
2772	1	question.media.create	{"mediaId": "16", "fileSize": 45632, "mimeType": "image/png", "questionId": "302"}	2026-10-19 07:24:41.490806+00
2773	1	question.media.create	{"mediaId": "17", "fileSize": 45632, "mimeType": "image/png", "questionId": "303"}	2026-10-19 07:24:41.589383+00
2774	1	bank.create	{"bankId": "150", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-19 07:28:33.230461+00
2775	1	bank.create	{"bankId": "151", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-19 08:04:29.104112+00
2776	1	question.media.create	{"mediaId": "18", "fileSize": 16806, "mimeType": "image/jpeg", "questionId": "329"}	2026-10-19 08:04:29.163067+00
2777	1	question.media.create	{"mediaId": "19", "fileSize": 21658, "mimeType": "image/png", "questionId": "330"}	2026-10-19 08:04:29.281869+00
2778	1	question.media.create	{"mediaId": "20", "fileSize": 21658, "mimeType": "image/png", "questionId": "331"}	2026-10-19 08:04:29.347086+00
2779	1	question.media.create	{"mediaId": "21", "fileSize": 21658, "mimeType": "image/png", "questionId": "332"}	2026-10-19 08:04:29.445139+00
2780	1	question.media.create	{"mediaId": "22", "fileSize": 21658, "mimeType": "image/png", "questionId": "333"}	2026-10-19 08:04:29.502336+00
2781	1	question.media.create	{"mediaId": "23", "fileSize": 30565, "mimeType": "image/png", "questionId": "334"}	2026-10-19 08:04:29.607374+00
2782	1	question.media.create	{"mediaId": "24", "fileSize": 30565, "mimeType": "image/png", "questionId": "335"}	2026-10-19 08:04:29.653889+00
2783	1	question.media.create	{"mediaId": "25", "fileSize": 30565, "mimeType": "image/png", "questionId": "336"}	2026-10-19 08:04:29.714362+00
2784	1	question.media.create	{"mediaId": "26", "fileSize": 30565, "mimeType": "image/png", "questionId": "337"}	2026-10-19 08:04:29.791595+00
2785	1	question.media.create	{"mediaId": "27", "fileSize": 30565, "mimeType": "image/png", "questionId": "338"}	2026-10-19 08:04:29.850963+00
2786	1	question.media.create	{"mediaId": "28", "fileSize": 17138, "mimeType": "image/png", "questionId": "339"}	2026-10-19 08:04:29.90292+00
2787	1	question.media.create	{"mediaId": "29", "fileSize": 17138, "mimeType": "image/png", "questionId": "340"}	2026-10-19 08:04:30.011494+00
2728	\N	login	{}	2026-10-17 09:22:56.388074+00
2788	1	question.media.create	{"mediaId": "30", "fileSize": 17138, "mimeType": "image/png", "questionId": "341"}	2026-10-19 08:04:30.103364+00
2789	1	question.media.create	{"mediaId": "31", "fileSize": 17138, "mimeType": "image/png", "questionId": "342"}	2026-10-19 08:04:30.20046+00
2790	1	question.media.create	{"mediaId": "32", "fileSize": 17138, "mimeType": "image/png", "questionId": "343"}	2026-10-19 08:04:30.261491+00
2791	1	question.media.create	{"mediaId": "33", "fileSize": 27470, "mimeType": "image/png", "questionId": "344"}	2026-10-19 08:04:30.3918+00
2792	1	question.media.create	{"mediaId": "34", "fileSize": 27470, "mimeType": "image/png", "questionId": "345"}	2026-10-19 08:04:30.458064+00
2793	1	question.media.create	{"mediaId": "35", "fileSize": 27470, "mimeType": "image/png", "questionId": "346"}	2026-10-19 08:04:30.52584+00
2794	1	question.media.create	{"mediaId": "36", "fileSize": 27470, "mimeType": "image/png", "questionId": "347"}	2026-10-19 08:04:30.567334+00
2795	1	question.media.create	{"mediaId": "37", "fileSize": 27470, "mimeType": "image/png", "questionId": "348"}	2026-10-19 08:04:30.643608+00
2797	1	student.delete	{"name": "ahmad", "sessions": 0, "username": "IMBS-5AA19", "className": "KELAS 5 RUANG 1", "responses": 0, "studentId": 1955, "violations": 0}	2026-10-20 03:12:17.652937+00
2798	1	student.delete	{"name": "fagil jaini", "sessions": 0, "username": "IMBS-A6C0B", "className": "KELAS 6 RUANG 1", "responses": 0, "studentId": 1956, "violations": 0}	2026-10-20 03:12:19.433616+00
2799	1	student.delete	{"name": "jojo", "sessions": 0, "username": "IMBS-60591", "className": "KELAS 5 RUANG 2", "responses": 0, "studentId": 1957, "violations": 0}	2026-10-20 03:12:20.976753+00
2801	1	login	{}	2026-10-20 04:05:11.014246+00
2738	\N	student.exam_submit	{"sessionId": "2194", "finalScore": null, "finalScorePending": true}	2026-10-17 10:23:14.071446+00
2800	1	student.delete	{"name": "paijo", "sessions": 0, "username": "IMBS-19804", "className": "KELAS 6 RUANG 1", "responses": 0, "studentId": 1958, "violations": 0}	2026-10-20 03:12:22.682763+00
2802	1	school.settings.update	{"next": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-20T04:07:02.154Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 50, "violationThreshold": 2, "essayWeightPercentage": 50, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2"], "semester": "Ganjil", "updatedAt": "2026-10-15T08:56:17.955Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 50, "violationThreshold": 2, "essayWeightPercentage": 50, "defaultExamDurationMinutes": 40}}	2026-10-20 04:07:02.154934+00
2803	1	school.settings.update	{"next": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-20T04:07:04.754Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 50, "violationThreshold": 2, "essayWeightPercentage": 50, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-20T04:07:02.154Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 50, "violationThreshold": 2, "essayWeightPercentage": 50, "defaultExamDurationMinutes": 40}}	2026-10-20 04:07:04.754232+00
2804	1	school.settings.update	{"next": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-20T04:07:26.353Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 50, "violationThreshold": 2, "essayWeightPercentage": 50, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-20T04:07:04.754Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 50, "violationThreshold": 2, "essayWeightPercentage": 50, "defaultExamDurationMinutes": 40}}	2026-10-20 04:07:26.353395+00
2805	1	school.settings.update	{"next": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-20T04:07:27.251Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 50, "violationThreshold": 2, "essayWeightPercentage": 50, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-20T04:07:26.353Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 50, "violationThreshold": 2, "essayWeightPercentage": 50, "defaultExamDurationMinutes": 40}}	2026-10-20 04:07:27.251432+00
2810	1	login	{}	2026-10-20 06:10:24.150993+00
2818	1	login	{}	2026-10-20 06:49:14.194733+00
2850	1	question.media.create	{"mediaId": "65", "fileSize": 34040, "mimeType": "image/png", "questionId": "383"}	2026-10-20 07:17:17.726136+00
2851	1	bank.create	{"bankId": "154", "mcCount": 16, "essayCount": 5, "questionCount": 21}	2026-10-20 07:20:46.247372+00
2852	1	bank.create	{"bankId": "155", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-20 07:22:07.328576+00
2897	1	question.media.create	{"mediaId": "104", "fileSize": 40685, "mimeType": "image/png", "questionId": "528"}	2026-10-20 07:38:27.393327+00
2898	1	question.media.create	{"mediaId": "105", "fileSize": 46644, "mimeType": "image/png", "questionId": "529"}	2026-10-20 07:38:27.427042+00
2909	1	login	{}	2026-10-21 01:08:09.286577+00
2806	1	school.settings.update	{"next": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-20T04:07:28.018Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 50, "violationThreshold": 2, "essayWeightPercentage": 50, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-20T04:07:27.251Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 50, "violationThreshold": 2, "essayWeightPercentage": 50, "defaultExamDurationMinutes": 40}}	2026-10-20 04:07:28.018893+00
2807	1	school.settings.update	{"next": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-20T04:07:33.283Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 50, "violationThreshold": 2, "essayWeightPercentage": 50, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-20T04:07:28.018Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 50, "violationThreshold": 2, "essayWeightPercentage": 50, "defaultExamDurationMinutes": 40}}	2026-10-20 04:07:33.28382+00
2808	1	exam.create	{"banks": 2, "examId": "66", "classes": 2, "participants": 0}	2026-10-20 05:55:39.632153+00
2812	1	exam.create	{"banks": 2, "examId": "67", "classes": 2, "participants": 0}	2026-10-20 06:16:09.519177+00
2814	1	exam.delete	{"title": "RUANG 1", "examId": "66", "status": "draft", "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-20 06:19:10.740065+00
2815	1	exam.delete	{"title": "RUANG 2", "examId": "67", "status": "completed", "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-20 06:19:12.650099+00
2816	1	school.settings.update	{"next": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-20T06:26:17.864Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 50, "violationThreshold": 2, "essayWeightPercentage": 50, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-20T04:07:33.283Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 50, "violationThreshold": 2, "essayWeightPercentage": 50, "defaultExamDurationMinutes": 40}}	2026-10-20 06:26:17.864461+00
2817	1	school.settings.update	{"next": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-20T06:26:28.540Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 50, "violationThreshold": 2, "essayWeightPercentage": 50, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-20T06:26:17.864Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 50, "violationThreshold": 2, "essayWeightPercentage": 50, "defaultExamDurationMinutes": 40}}	2026-10-20 06:26:28.540069+00
2848	1	question.media.create	{"mediaId": "63", "fileSize": 34040, "mimeType": "image/png", "questionId": "381"}	2026-10-20 07:17:17.573876+00
2849	1	question.media.create	{"mediaId": "64", "fileSize": 34040, "mimeType": "image/png", "questionId": "382"}	2026-10-20 07:17:17.66012+00
2910	1	login	{}	2026-10-22 00:26:07.614266+00
2819	1	school.settings.update	{"next": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-20T06:50:21.599Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 40, "violationThreshold": 2, "essayWeightPercentage": 60, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-20T06:26:28.540Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 50, "violationThreshold": 2, "essayWeightPercentage": 50, "defaultExamDurationMinutes": 40}}	2026-10-20 06:50:21.599756+00
2820	1	school.settings.update	{"next": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-20T06:50:23.577Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 40, "violationThreshold": 2, "essayWeightPercentage": 60, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-20T06:50:21.599Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 40, "violationThreshold": 2, "essayWeightPercentage": 60, "defaultExamDurationMinutes": 40}}	2026-10-20 06:50:23.577718+00
2821	1	bank.create	{"bankId": "152", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-20 07:02:18.835401+00
2822	1	question.media.create	{"mediaId": "38", "fileSize": 37674, "mimeType": "image/png", "questionId": "349"}	2026-10-20 07:02:18.976397+00
2823	1	question.media.create	{"mediaId": "39", "fileSize": 37674, "mimeType": "image/png", "questionId": "350"}	2026-10-20 07:02:19.04927+00
2824	1	question.media.create	{"mediaId": "40", "fileSize": 37674, "mimeType": "image/png", "questionId": "351"}	2026-10-20 07:02:19.254005+00
2825	1	question.media.create	{"mediaId": "41", "fileSize": 37674, "mimeType": "image/png", "questionId": "352"}	2026-10-20 07:02:19.30126+00
2826	1	question.media.create	{"mediaId": "42", "fileSize": 55373, "mimeType": "image/png", "questionId": "353"}	2026-10-20 07:02:19.428488+00
2827	1	question.media.create	{"mediaId": "43", "fileSize": 55373, "mimeType": "image/png", "questionId": "354"}	2026-10-20 07:02:19.490002+00
2828	1	question.media.create	{"mediaId": "44", "fileSize": 55373, "mimeType": "image/png", "questionId": "355"}	2026-10-20 07:02:19.546699+00
2829	1	question.media.create	{"mediaId": "45", "fileSize": 72401, "mimeType": "image/png", "questionId": "356"}	2026-10-20 07:02:19.612935+00
2830	1	question.media.create	{"mediaId": "46", "fileSize": 72401, "mimeType": "image/png", "questionId": "357"}	2026-10-20 07:02:19.678394+00
2831	1	question.media.create	{"mediaId": "47", "fileSize": 72401, "mimeType": "image/png", "questionId": "358"}	2026-10-20 07:02:19.7373+00
2832	1	question.media.create	{"mediaId": "48", "fileSize": 42891, "mimeType": "image/png", "questionId": "361"}	2026-10-20 07:02:19.885965+00
2833	1	question.media.create	{"mediaId": "49", "fileSize": 42891, "mimeType": "image/png", "questionId": "362"}	2026-10-20 07:02:19.963802+00
2834	1	question.media.create	{"mediaId": "50", "fileSize": 42891, "mimeType": "image/png", "questionId": "363"}	2026-10-20 07:02:20.082951+00
2835	1	bank.create	{"bankId": "153", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-20 07:17:16.707983+00
2836	1	question.media.create	{"mediaId": "51", "fileSize": 40959, "mimeType": "image/png", "questionId": "369"}	2026-10-20 07:17:16.800326+00
2837	1	question.media.create	{"mediaId": "52", "fileSize": 40959, "mimeType": "image/png", "questionId": "370"}	2026-10-20 07:17:16.864427+00
2838	1	question.media.create	{"mediaId": "53", "fileSize": 40959, "mimeType": "image/png", "questionId": "371"}	2026-10-20 07:17:16.93799+00
2839	1	question.media.create	{"mediaId": "54", "fileSize": 40959, "mimeType": "image/png", "questionId": "372"}	2026-10-20 07:17:16.997307+00
2840	1	question.media.create	{"mediaId": "55", "fileSize": 40959, "mimeType": "image/png", "questionId": "373"}	2026-10-20 07:17:17.078649+00
2841	1	question.media.create	{"mediaId": "56", "fileSize": 35804, "mimeType": "image/png", "questionId": "374"}	2026-10-20 07:17:17.141006+00
2842	1	question.media.create	{"mediaId": "57", "fileSize": 35804, "mimeType": "image/png", "questionId": "375"}	2026-10-20 07:17:17.207124+00
2843	1	question.media.create	{"mediaId": "58", "fileSize": 35804, "mimeType": "image/png", "questionId": "376"}	2026-10-20 07:17:17.286025+00
2844	1	question.media.create	{"mediaId": "59", "fileSize": 35804, "mimeType": "image/png", "questionId": "377"}	2026-10-20 07:17:17.348419+00
2845	1	question.media.create	{"mediaId": "60", "fileSize": 35804, "mimeType": "image/png", "questionId": "378"}	2026-10-20 07:17:17.396311+00
2846	1	question.media.create	{"mediaId": "61", "fileSize": 34040, "mimeType": "image/png", "questionId": "379"}	2026-10-20 07:17:17.440354+00
2847	1	question.media.create	{"mediaId": "62", "fileSize": 34040, "mimeType": "image/png", "questionId": "380"}	2026-10-20 07:17:17.495846+00
2853	1	bank.delete	{"grade": "1", "topic": "أَيَّامُ الأُسْبُوْعِ   الشُّهُوْرُ الهِجْرِيَّةِ  الشُّهُوْرُ المِيْلَادِيَّةِ  اليَدُ  الرَّأْسُ  مَنَافِعُ أَعْضَاءِ الْجِسْمِ     الْكَلِمَاتُ وَأَضْدَادُهَا  الصِّفَاتُ وَأَضْدَادُهَا   الدِّيْكُ   القِطَارُ  مَلَابِسُ الْجِسْمِ", "bankId": "154", "examCount": 0, "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-20 07:24:06.415225+00
2854	1	bank.create	{"bankId": "156", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-20 07:25:55.541819+00
2855	1	bank.create	{"bankId": "157", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-20 07:27:56.622628+00
2856	1	bank.create	{"bankId": "158", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-20 07:29:32.281274+00
2857	1	question.media.create	{"mediaId": "66", "fileSize": 42480, "mimeType": "image/png", "questionId": "470"}	2026-10-20 07:29:32.429764+00
2858	1	question.media.create	{"mediaId": "67", "fileSize": 42480, "mimeType": "image/png", "questionId": "471"}	2026-10-20 07:29:32.480357+00
2859	1	question.media.create	{"mediaId": "68", "fileSize": 42480, "mimeType": "image/png", "questionId": "472"}	2026-10-20 07:29:32.526809+00
2860	1	question.media.create	{"mediaId": "69", "fileSize": 42480, "mimeType": "image/png", "questionId": "473"}	2026-10-20 07:29:32.582931+00
2861	1	question.media.create	{"mediaId": "70", "fileSize": 36358, "mimeType": "image/png", "questionId": "474"}	2026-10-20 07:29:32.656376+00
2862	1	question.media.create	{"mediaId": "71", "fileSize": 36358, "mimeType": "image/png", "questionId": "475"}	2026-10-20 07:29:32.692076+00
2863	1	question.media.create	{"mediaId": "72", "fileSize": 36358, "mimeType": "image/png", "questionId": "476"}	2026-10-20 07:29:32.769749+00
2864	1	question.media.create	{"mediaId": "73", "fileSize": 36358, "mimeType": "image/png", "questionId": "477"}	2026-10-20 07:29:32.855267+00
2865	1	question.media.create	{"mediaId": "74", "fileSize": 38092, "mimeType": "image/png", "questionId": "478"}	2026-10-20 07:29:32.899329+00
2866	1	question.media.create	{"mediaId": "75", "fileSize": 38092, "mimeType": "image/png", "questionId": "479"}	2026-10-20 07:29:32.952036+00
2867	1	question.media.create	{"mediaId": "76", "fileSize": 38092, "mimeType": "image/png", "questionId": "480"}	2026-10-20 07:29:33.054083+00
2868	1	question.media.create	{"mediaId": "77", "fileSize": 38092, "mimeType": "image/png", "questionId": "481"}	2026-10-20 07:29:33.092484+00
2869	1	question.media.create	{"mediaId": "78", "fileSize": 37558, "mimeType": "image/png", "questionId": "482"}	2026-10-20 07:29:33.22627+00
2870	1	question.media.create	{"mediaId": "79", "fileSize": 37558, "mimeType": "image/png", "questionId": "483"}	2026-10-20 07:29:33.358981+00
2871	1	question.media.create	{"mediaId": "80", "fileSize": 37558, "mimeType": "image/png", "questionId": "484"}	2026-10-20 07:29:33.401101+00
2872	1	question.media.create	{"mediaId": "81", "fileSize": 46971, "mimeType": "image/png", "questionId": "485"}	2026-10-20 07:29:33.476814+00
2873	1	question.media.create	{"mediaId": "82", "fileSize": 46971, "mimeType": "image/png", "questionId": "486"}	2026-10-20 07:29:33.587181+00
2874	1	question.media.create	{"mediaId": "83", "fileSize": 36675, "mimeType": "image/png", "questionId": "487"}	2026-10-20 07:29:33.669184+00
2875	1	question.media.create	{"mediaId": "84", "fileSize": 36675, "mimeType": "image/png", "questionId": "488"}	2026-10-20 07:29:33.726072+00
2876	1	question.media.create	{"mediaId": "85", "fileSize": 32905, "mimeType": "image/png", "questionId": "489"}	2026-10-20 07:29:33.764545+00
2877	1	bank.create	{"bankId": "159", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-20 07:31:21.154564+00
2878	1	bank.create	{"bankId": "160", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-20 07:38:26.621918+00
2879	1	question.media.create	{"mediaId": "86", "fileSize": 36004, "mimeType": "image/png", "questionId": "510"}	2026-10-20 07:38:26.663193+00
2880	1	question.media.create	{"mediaId": "87", "fileSize": 36004, "mimeType": "image/png", "questionId": "511"}	2026-10-20 07:38:26.697571+00
2881	1	question.media.create	{"mediaId": "88", "fileSize": 36004, "mimeType": "image/png", "questionId": "512"}	2026-10-20 07:38:26.732274+00
2882	1	question.media.create	{"mediaId": "89", "fileSize": 36004, "mimeType": "image/png", "questionId": "513"}	2026-10-20 07:38:26.764676+00
2883	1	question.media.create	{"mediaId": "90", "fileSize": 36004, "mimeType": "image/png", "questionId": "514"}	2026-10-20 07:38:26.804533+00
2884	1	question.media.create	{"mediaId": "91", "fileSize": 40685, "mimeType": "image/png", "questionId": "515"}	2026-10-20 07:38:26.843405+00
2885	1	question.media.create	{"mediaId": "92", "fileSize": 40685, "mimeType": "image/png", "questionId": "516"}	2026-10-20 07:38:26.87626+00
2886	1	question.media.create	{"mediaId": "93", "fileSize": 40685, "mimeType": "image/png", "questionId": "517"}	2026-10-20 07:38:26.907561+00
2887	1	question.media.create	{"mediaId": "94", "fileSize": 40685, "mimeType": "image/png", "questionId": "518"}	2026-10-20 07:38:26.955654+00
2888	1	question.media.create	{"mediaId": "95", "fileSize": 40685, "mimeType": "image/png", "questionId": "519"}	2026-10-20 07:38:26.987344+00
2889	1	question.media.create	{"mediaId": "96", "fileSize": 46644, "mimeType": "image/png", "questionId": "520"}	2026-10-20 07:38:27.026971+00
2890	1	question.media.create	{"mediaId": "97", "fileSize": 46644, "mimeType": "image/png", "questionId": "521"}	2026-10-20 07:38:27.081698+00
2891	1	question.media.create	{"mediaId": "98", "fileSize": 46644, "mimeType": "image/png", "questionId": "522"}	2026-10-20 07:38:27.145557+00
2892	1	question.media.create	{"mediaId": "99", "fileSize": 46644, "mimeType": "image/png", "questionId": "523"}	2026-10-20 07:38:27.189089+00
2893	1	question.media.create	{"mediaId": "100", "fileSize": 46644, "mimeType": "image/png", "questionId": "524"}	2026-10-20 07:38:27.229828+00
2894	1	question.media.create	{"mediaId": "101", "fileSize": 36004, "mimeType": "image/png", "questionId": "525"}	2026-10-20 07:38:27.268353+00
2895	1	question.media.create	{"mediaId": "102", "fileSize": 36004, "mimeType": "image/png", "questionId": "526"}	2026-10-20 07:38:27.309452+00
2896	1	question.media.create	{"mediaId": "103", "fileSize": 40685, "mimeType": "image/png", "questionId": "527"}	2026-10-20 07:38:27.35653+00
2911	1	login	{}	2026-10-22 01:55:55.843013+00
2899	1	bank.create	{"bankId": "161", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-20 07:40:17.610583+00
2900	1	bank.create	{"bankId": "162", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-20 07:42:10.9547+00
2901	1	bank.create	{"bankId": "163", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-20 07:46:43.948564+00
2906	1	subject.delete	{"name": "Matematika", "subjectId": 2}	2026-10-20 07:51:22.207031+00
2907	1	subject.delete	{"name": "Pendidikan Agama Islam", "subjectId": 3}	2026-10-20 07:51:52.725032+00
2908	1	bank.create	{"bankId": "164", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-20 07:53:26.111008+00
2912	1	bank.create	{"bankId": "165", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-22 02:07:21.355154+00
2913	1	bank.delete	{"grade": "4", "topic": "الجُمْلَةُ المُفِيدَةُ أَجْزَاءُ الجُمْلَةِ الفِعْلُ المَاضِي الفِعْلُ المُضَارِعُ فِعْلُ الأَمْرِ الفَاعِلُ المَفْعُولُ بِهِ المُبْتَدَأُ الخَبَرُ الجُمْلَةُ الفِعْلِيَّةُ الجُمْلَةُ الإِسْمِيَّةُ جَزْمُ الفِعْلِ المُضَارِعِ نَصْبُ الفِعْلِ المُضَارِعِ إِنَّ وَأَخَوَاتُهَا كَانَ وَأَخَوَاتُهَا", "bankId": "165", "examCount": 0, "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-22 02:08:33.494866+00
2914	1	bank.create	{"bankId": "166", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-22 02:09:37.975431+00
2915	1	login	{}	2026-10-22 08:44:39.520021+00
2916	1	login	{}	2026-10-23 00:21:35.823894+00
2917	1	login	{}	2026-10-23 03:05:16.743857+00
2918	1	school.settings.update	{"next": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-23T03:07:27.516Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 60, "violationThreshold": 2, "essayWeightPercentage": 40, "defaultExamDurationMinutes": 40}, "previous": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-20T06:50:23.577Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 40, "violationThreshold": 2, "essayWeightPercentage": 60, "defaultExamDurationMinutes": 40}}	2026-10-23 03:07:27.516387+00
2919	1	student.create	{"studentId": "1959"}	2026-10-23 03:08:03.915796+00
2921	1	exam.create	{"banks": 1, "examId": "68", "classes": 1, "participants": 1}	2026-10-23 03:14:38.618914+00
2922	1	exam.pin_issue	{"examId": 68, "rotated": false, "issuedAt": "2026-10-23T03:14:48.678Z", "expiresAt": "2026-10-23T03:29:48.678Z", "validityMinutes": 15}	2026-10-23 03:14:48.675351+00
2925	1	exam.violation_threshold_decision	{"count": 0, "examId": 68, "reason": "teledor", "status": "in_progress", "decision": "false_positive", "sessionId": 2198}	2026-10-23 03:24:33.637108+00
2927	1	essay.grade	{"score": 70, "examId": 68, "studentId": 1959, "questionId": 569}	2026-10-23 03:30:42.275078+00
2928	1	essay.grade	{"score": 100, "examId": 68, "studentId": 1959, "questionId": 568}	2026-10-23 03:30:45.933728+00
2929	1	essay.grade	{"score": 10, "examId": 68, "studentId": 1959, "questionId": 567}	2026-10-23 03:30:50.310602+00
2930	1	essay.grade	{"score": 70, "examId": 68, "studentId": 1959, "questionId": 566}	2026-10-23 03:30:53.25485+00
2931	1	essay.grade	{"score": 50, "examId": 68, "studentId": 1959, "questionId": 565}	2026-10-23 03:30:56.118081+00
2932	1	login	{}	2026-10-23 03:31:58.135675+00
2933	1	login	{}	2026-10-26 03:26:21.264533+00
2934	1	login	{}	2026-10-26 03:33:52.96033+00
2920	\N	login	{}	2026-10-23 03:14:24.548272+00
2923	\N	student.violation_signal	{"code": "window_blur", "detail": "Jendela ujian kehilangan fokus.", "sessionId": 2198, "reviewStatus": "pending"}	2026-10-23 03:23:38.268761+00
2924	\N	student.violation_signal	{"code": "tab_hidden", "detail": "Tab ujian tidak aktif.", "sessionId": 2198, "reviewStatus": "pending"}	2026-10-23 03:23:40.509141+00
2926	\N	student.exam_submit	{"sessionId": "2198", "finalScore": null, "finalScorePending": true}	2026-10-23 03:24:57.400116+00
2935	1	student.delete	{"name": "faiz abdillan", "sessions": 1, "username": "IMBS-50CE8", "className": "KELAS 3 RUANG 3", "responses": 15, "studentId": 1959, "violations": 2}	2026-10-26 03:34:24.075579+00
2936	1	subject.update	{"name": "Al-QURAN", "subjectId": 470}	2026-10-26 03:35:27.636951+00
2937	1	student.import	{"count": 11}	2026-10-26 03:55:45.805948+00
2938	1	exam.delete	{"title": "tes simulasi", "examId": "68", "status": "completed", "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-26 03:57:23.592587+00
2939	1	subject.create	{"name": "SIMULASI KELAS 1", "subjectId": "481"}	2026-10-26 04:20:07.362022+00
2940	1	subject.delete	{"name": "SIMULASI KELAS 1", "subjectId": 481}	2026-10-26 04:20:21.077825+00
2941	1	login	{}	2026-10-26 06:31:58.158534+00
2942	1	bank.create	{"bankId": "167", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 06:35:54.513707+00
2943	1	bank.create	{"bankId": "168", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 06:41:07.47581+00
2944	1	bank.create	{"bankId": "169", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 06:43:50.60535+00
2945	1	bank.delete	{"grade": "6", "topic": "المضاف والمضاف إليه الأسماء الخمسة علامات التأنيث النكرة والمعرفة", "bankId": "163", "examCount": 0, "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-26 06:44:06.708674+00
2946	1	subject.delete	{"name": "Nahwu", "subjectId": 480}	2026-10-26 06:44:59.96805+00
2947	1	bank.create	{"bankId": "170", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 06:45:36.096829+00
2948	1	login	{}	2026-10-26 06:49:19.110026+00
2949	1	bank.create	{"bankId": "171", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 06:49:52.48577+00
2950	1	bank.create	{"bankId": "172", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 06:50:14.84547+00
2951	1	bank.create	{"bankId": "173", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 06:51:33.373002+00
2952	1	bank.create	{"bankId": "174", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 06:52:21.263665+00
2953	1	bank.create	{"bankId": "175", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 06:53:22.818722+00
3006	\N	login	{}	2026-10-29 03:24:14.940971+00
2954	1	bank.create	{"bankId": "176", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 06:55:15.032466+00
2955	1	bank.create	{"bankId": "177", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 06:55:54.079064+00
2956	1	bank.create	{"bankId": "178", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 06:55:57.320851+00
2957	1	bank.create	{"bankId": "179", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 07:03:31.228808+00
2958	1	bank.create	{"bankId": "180", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 07:05:41.804024+00
2959	1	bank.create	{"bankId": "181", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 07:10:24.342658+00
2960	1	bank.create	{"bankId": "182", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 07:10:35.211418+00
2961	1	bank.create	{"bankId": "183", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 07:11:58.889918+00
2962	1	login	{}	2026-10-26 07:24:29.610234+00
2963	1	bank.create	{"bankId": "184", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 07:36:18.485577+00
2964	1	bank.create	{"bankId": "185", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 08:01:28.381499+00
2965	1	bank.create	{"bankId": "186", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 08:02:34.536546+00
2966	1	bank.create	{"bankId": "187", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 08:03:37.071909+00
2967	1	bank.create	{"bankId": "188", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 08:07:13.632338+00
2968	1	bank.create	{"bankId": "189", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 08:08:28.463656+00
2969	1	bank.create	{"bankId": "190", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 08:11:52.357534+00
2970	1	bank.create	{"bankId": "191", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 08:13:20.039633+00
2971	1	bank.create	{"bankId": "192", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 08:13:28.803946+00
2972	1	bank.create	{"bankId": "193", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 08:15:07.606229+00
2973	1	bank.create	{"bankId": "194", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 08:15:49.10445+00
2974	1	bank.create	{"bankId": "195", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 08:16:27.896084+00
2975	1	bank.delete	{"grade": "5", "topic": "LARANGAN BERZINA   TOLERANSI DAN ADAB DALAM MASYARAKAT  KEWAJIBAN BELAJAR DAN MENYEBARKANNYA", "bankId": "195", "examCount": 0, "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-26 08:17:50.691496+00
2976	1	bank.create	{"bankId": "196", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 08:19:23.231463+00
2977	1	bank.delete	{"grade": "4", "topic": "PENGERTIAN Al QURAN   KEASLIAN AL QURAN   TUGAS MANUSIA SEBAGAI HAMBA ALLAH DAN KHALIFAH", "bankId": "193", "examCount": 0, "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-26 08:20:32.276805+00
2978	1	bank.delete	{"grade": "5", "topic": "علم الكلام الْمُعْتَزِلَةِ", "bankId": "196", "examCount": 0, "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-26 08:21:40.108654+00
2979	1	bank.create	{"bankId": "197", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 08:22:18.985172+00
2980	1	bank.create	{"bankId": "198", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 08:24:03.645855+00
2981	1	bank.create	{"bankId": "199", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 08:27:07.369102+00
2982	1	bank.create	{"bankId": "200", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 08:30:34.586957+00
2983	1	bank.create	{"bankId": "201", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 08:31:55.259668+00
2984	1	bank.create	{"bankId": "202", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 08:32:28.960563+00
2985	1	bank.create	{"bankId": "203", "mcCount": 15, "essayCount": 5, "questionCount": 20}	2026-10-26 08:33:25.580462+00
2986	1	login	{}	2026-10-27 00:06:42.124058+00
2987	1	teacher.access.update	{"next": {"classNames": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 4 RUANG 1", "KELAS 5 RUANG 1"], "subjectIds": [473]}, "previous": [], "teacherId": 1874}	2026-10-27 00:07:35.274895+00
2988	1	login	{}	2026-10-27 02:42:55.103147+00
2989	1	question.update	{"type": "mc", "bankId": "203", "questionId": 1370}	2026-10-27 02:46:35.224259+00
2990	1	question.update	{"type": "mc", "bankId": "203", "questionId": 1371}	2026-10-27 02:47:50.935843+00
2991	1	login	{}	2026-10-28 03:02:58.755092+00
2992	1	login	{}	2026-10-28 05:22:20.224007+00
2993	1	login	{}	2026-10-28 05:27:06.9788+00
2994	1	subject.create	{"name": "SIMULASI", "subjectId": "482"}	2026-10-28 05:28:35.812843+00
2995	1	bank.create	{"bankId": "204", "mcCount": 20, "essayCount": 5, "stimuliCount": 3, "questionCount": 25}	2026-10-28 05:43:08.264185+00
2996	1	bank.delete	{"grade": "3", "topic": "TAHUN KELAHIRAN RASULULLAH DAN NUZULUL QURAN", "bankId": "204", "examCount": 0, "sessionCount": 0, "responseCount": 0, "violationCount": 0}	2026-10-28 05:43:42.989833+00
2997	1	bank.create	{"bankId": "205", "mcCount": 15, "essayCount": 5, "stimuliCount": 3, "questionCount": 20}	2026-10-28 05:45:18.241962+00
2998	1	login	{}	2026-10-28 06:44:26.144714+00
2999	1	login	{}	2026-10-29 02:27:12.227524+00
3000	1	exam.create	{"banks": 3, "examId": "69", "classes": 3, "participants": 11}	2026-10-29 02:32:34.310686+00
3001	1	login	{}	2026-10-29 02:57:30.450293+00
3002	1	login	{}	2026-10-29 03:19:27.840198+00
3003	1	login	{}	2026-10-29 03:22:37.32148+00
3004	\N	login	{}	2026-10-29 03:23:05.359608+00
3009	1	login	{}	2026-10-29 03:24:57.793407+00
3011	1	exam.create	{"banks": 3, "examId": "70", "classes": 3, "participants": 11}	2026-10-29 03:26:02.309364+00
3012	1	exam.pin_issue	{"examId": 70, "rotated": false, "issuedAt": "2026-10-29T03:26:16.143Z", "expiresAt": "2026-10-29T03:41:16.143Z", "validityMinutes": 15}	2026-10-29 03:26:16.141336+00
3014	1	exam.violation_review	{"count": 0, "examId": 70, "reason": "teledor", "status": "in_progress", "eventId": 47, "decision": "dismiss", "sessionId": 2212}	2026-10-29 03:31:07.026004+00
3017	1	exam.violation_review	{"count": 1, "examId": 70, "reason": "ngawuran", "status": "in_progress", "eventId": 48, "decision": "confirm", "sessionId": 2212}	2026-10-29 03:36:21.091141+00
3019	1	exam.violation_threshold_decision	{"count": 2, "examId": 70, "reason": "ngawuran", "status": "locked", "decision": "block", "sessionId": 2212}	2026-10-29 03:36:45.169523+00
3020	1	exam.session_reset	{"examId": 70, "reason": "tadi tes aja", "sessionId": 2212}	2026-10-29 03:36:58.092028+00
3027	1	essay.grade	{"score": 100, "examId": 70, "studentId": 1968, "questionId": 324}	2026-10-29 03:46:38.613686+00
3028	1	essay.grade	{"score": 80, "examId": 70, "studentId": 1968, "questionId": 325}	2026-10-29 03:46:42.176506+00
3029	1	essay.grade	{"score": 80, "examId": 70, "studentId": 1968, "questionId": 326}	2026-10-29 03:46:46.273049+00
3030	1	essay.grade	{"score": 80, "examId": 70, "studentId": 1968, "questionId": 327}	2026-10-29 03:46:49.786521+00
3031	1	essay.grade	{"score": 80, "examId": 70, "studentId": 1968, "questionId": 328}	2026-10-29 03:46:53.779784+00
3032	1	essay.grade	{"score": 80, "examId": 70, "studentId": 1963, "questionId": 1430}	2026-10-29 03:48:29.862953+00
3033	1	essay.grade	{"score": 70, "examId": 70, "studentId": 1963, "questionId": 1431}	2026-10-29 03:49:16.683648+00
3034	1	essay.grade	{"score": 75, "examId": 70, "studentId": 1963, "questionId": 1434}	2026-10-29 03:50:40.773655+00
3035	1	essay.grade	{"score": 90, "examId": 70, "studentId": 1963, "questionId": 1432}	2026-10-29 03:50:48.564951+00
3036	1	essay.grade	{"score": 88, "examId": 70, "studentId": 1963, "questionId": 1433}	2026-10-29 03:51:01.457153+00
3037	1	school.settings.update	{"next": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-29T03:55:43.084Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 60, "violationThreshold": 2, "essayWeightPercentage": 40, "defaultExamDurationMinutes": 20}, "previous": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-23T03:07:27.516Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 60, "violationThreshold": 2, "essayWeightPercentage": 40, "defaultExamDurationMinutes": 40}}	2026-10-29 03:55:43.084185+00
3008	\N	login	{}	2026-10-29 03:24:38.325432+00
3022	\N	student.exam_submit	{"sessionId": "2218", "finalScore": null, "finalScorePending": true}	2026-10-29 03:39:43.574084+00
3023	\N	student.exam_submit	{"sessionId": "2213", "finalScore": null, "finalScorePending": true}	2026-10-29 03:42:46.490122+00
3021	\N	student.exam_submit	{"sessionId": "2219", "finalScore": null, "finalScorePending": true}	2026-10-29 03:38:43.064231+00
3007	\N	login	{}	2026-10-29 03:24:28.949831+00
3024	\N	student.exam_submit	{"sessionId": "2216", "finalScore": null, "finalScorePending": true}	2026-10-29 03:45:09.667695+00
3010	\N	login	{}	2026-10-29 03:25:01.031848+00
3013	\N	student.violation_signal	{"code": "window_blur", "detail": "Jendela ujian kehilangan fokus.", "sessionId": 2212, "reviewStatus": "pending"}	2026-10-29 03:29:48.775817+00
3015	\N	student.violation_signal	{"code": "window_blur", "detail": "Jendela ujian kehilangan fokus.", "sessionId": 2212, "reviewStatus": "pending"}	2026-10-29 03:33:47.041519+00
3018	\N	student.violation_signal	{"code": "window_blur", "detail": "Jendela ujian kehilangan fokus.", "sessionId": 2212, "reviewStatus": "pending"}	2026-10-29 03:36:30.059131+00
3025	\N	student.violation_signal	{"code": "clipboard", "detail": "Percobaan salin atau tempel di halaman ujian.", "sessionId": 2212, "reviewStatus": "pending"}	2026-10-29 03:46:14.822702+00
3026	\N	student.violation_signal	{"code": "clipboard", "detail": "Percobaan salin atau tempel di halaman ujian.", "sessionId": 2212, "reviewStatus": "pending"}	2026-10-29 03:46:17.265194+00
3016	\N	student.exam_submit	{"sessionId": "2211", "finalScore": null, "finalScorePending": true}	2026-10-29 03:34:34.316559+00
3083	1973	student.violation_signal	{"code": "fullscreen_exit", "detail": "Mode layar penuh berakhir.", "sessionId": 2224, "reviewStatus": "pending"}	2026-10-29 06:30:01.216525+00
3084	1973	student.violation_signal	{"code": "window_blur", "detail": "Jendela ujian kehilangan fokus.", "sessionId": 2224, "reviewStatus": "pending"}	2026-10-29 06:30:05.424797+00
3085	1	exam.violation_threshold_decision	{"count": 0, "examId": 71, "reason": "teledor", "status": "in_progress", "decision": "false_positive", "sessionId": 2222}	2026-10-29 06:30:07.840175+00
3086	1	exam.violation_threshold_decision	{"count": 0, "examId": 71, "reason": "ga sengaja", "status": "in_progress", "decision": "false_positive", "sessionId": 2224}	2026-10-29 06:30:20.910051+00
3087	1982	student.exam_submit	{"sessionId": "2233", "finalScore": null, "finalScorePending": true}	2026-10-29 06:30:24.042361+00
3038	1	school.settings.update	{"next": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-29T03:58:59.085Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 60, "violationThreshold": 2, "essayWeightPercentage": 40, "defaultExamDurationMinutes": 20}, "previous": {"grades": ["1", "2", "3", "4", "5", "6"], "classes": ["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"], "semester": "Ganjil", "updatedAt": "2026-10-29T03:55:43.084Z", "schoolName": "IMBS Miftahul Ulum", "academicYear": "2026/2027", "mcWeightPercentage": 60, "violationThreshold": 2, "essayWeightPercentage": 40, "defaultExamDurationMinutes": 20}}	2026-10-29 03:58:59.085194+00
3039	1	exam.violation_threshold_decision	{"count": 2, "examId": 70, "reason": "o", "status": "locked", "decision": "block", "sessionId": 2212}	2026-10-29 04:06:06.207105+00
3040	1	question.update	{"type": "essay", "bankId": "205", "questionId": 1430}	2026-10-29 04:19:13.6403+00
3041	1	student.delete	{"name": "Aimanun", "sessions": 2, "username": "IMBS-2AE25", "className": "KELAS 1 RUANG 1", "responses": 0, "studentId": 1964, "violations": 0}	2026-10-29 04:41:12.553965+00
3042	1	student.delete	{"name": "Ariel", "sessions": 2, "username": "IMBS-131B3", "className": "KELAS 2 RUANG 1", "responses": 20, "studentId": 1968, "violations": 0}	2026-10-29 04:41:15.076221+00
3043	1	student.delete	{"name": "Enik", "sessions": 2, "username": "IMBS-D4140", "className": "KELAS 3 RUANG 1", "responses": 0, "studentId": 1960, "violations": 0}	2026-10-29 04:41:17.015905+00
3044	1	student.delete	{"name": "Faiz", "sessions": 2, "username": "IMBS-7520D", "className": "KELAS 3 RUANG 1", "responses": 20, "studentId": 1963, "violations": 0}	2026-10-29 04:41:19.221268+00
3005	\N	login	{}	2026-10-29 03:23:56.61577+00
3045	1	student.delete	{"name": "Fifi", "sessions": 2, "username": "IMBS-BEC93", "className": "KELAS 2 RUANG 1", "responses": 20, "studentId": 1969, "violations": 0}	2026-10-29 04:41:21.339924+00
3046	1	student.delete	{"name": "Maman", "sessions": 2, "username": "IMBS-87B16", "className": "KELAS 1 RUANG 1", "responses": 20, "studentId": 1966, "violations": 0}	2026-10-29 04:41:24.554255+00
3047	1	student.delete	{"name": "Sukron", "sessions": 2, "username": "IMBS-55AAF", "className": "KELAS 1 RUANG 1", "responses": 0, "studentId": 1965, "violations": 0}	2026-10-29 04:41:28.918452+00
3048	1	student.delete	{"name": "Nunung", "sessions": 2, "username": "IMBS-CAB76", "className": "KELAS 3 RUANG 1", "responses": 16, "studentId": 1962, "violations": 6}	2026-10-29 04:41:31.599392+00
3049	1	student.delete	{"name": "Novianto", "sessions": 2, "username": "IMBS-762CD", "className": "KELAS 3 RUANG 1", "responses": 12, "studentId": 1961, "violations": 0}	2026-10-29 04:41:35.680298+00
3050	1	student.delete	{"name": "Nata", "sessions": 2, "username": "IMBS-450C8", "className": "KELAS 1 RUANG 1", "responses": 0, "studentId": 1967, "violations": 0}	2026-10-29 04:41:37.809222+00
3051	1	student.import	{"count": 43}	2026-10-29 04:41:51.89038+00
3052	1	teacher.create	{"username": "pengawas", "teacherId": "2014", "classNames": ["KELAS 1 RUANG 1", "KELAS 3 RUANG 1", "KELAS 2 RUANG 1"], "subjectIds": [476, 477, 475, 473, 474, 470, 478, 472, 479, 482, 471]}	2026-10-29 04:45:07.992351+00
3053	2014	login	{}	2026-10-29 04:49:22.906526+00
3054	1	login	{}	2026-10-29 04:49:51.572737+00
3055	1	exam.create	{"banks": 3, "examId": "71", "classes": 3, "participants": 44}	2026-10-29 04:52:18.51767+00
3056	2014	login	{}	2026-10-29 05:36:05.689992+00
3057	1	login	{}	2026-10-29 05:36:53.028597+00
3058	1	exam.delete	{"title": "SIMULASI DIKJAR", "examId": "69", "status": "completed", "sessionCount": 1, "responseCount": 0, "violationCount": 0}	2026-10-29 05:43:12.600015+00
3059	1	exam.delete	{"title": "simulasi 1", "examId": "70", "status": "completed", "sessionCount": 1, "responseCount": 0, "violationCount": 0}	2026-10-29 05:43:14.920877+00
3060	2002	login	{}	2026-10-29 06:16:45.09331+00
3061	1990	login	{}	2026-10-29 06:17:34.091896+00
3062	2001	login	{}	2026-10-29 06:18:28.008321+00
3063	1982	login	{}	2026-10-29 06:18:32.80075+00
3064	1973	login	{}	2026-10-29 06:18:45.681885+00
3065	1977	login	{}	2026-10-29 06:19:17.206036+00
3066	2013	login	{}	2026-10-29 06:19:22.546966+00
3067	1996	login	{}	2026-10-29 06:19:30.608775+00
3068	2003	login	{}	2026-10-29 06:19:35.573273+00
3069	1992	login	{}	2026-10-29 06:19:43.304934+00
3070	1979	login	{}	2026-10-29 06:20:00.39211+00
3071	2000	login	{}	2026-10-29 06:20:27.83895+00
3072	1975	login	{}	2026-10-29 06:21:32.044637+00
3073	2011	login	{}	2026-10-29 06:21:56.931627+00
3074	1987	login	{}	2026-10-29 06:22:08.912886+00
3075	1978	login	{}	2026-10-29 06:22:24.637719+00
3076	2010	login	{}	2026-10-29 06:22:29.513474+00
3077	2012	login	{}	2026-10-29 06:22:43.413226+00
3078	1983	login	{}	2026-10-29 06:23:45.768146+00
3079	1	exam.pin_issue	{"examId": 71, "rotated": false, "issuedAt": "2026-10-29T06:26:25.633Z", "expiresAt": "2026-10-29T06:41:25.633Z", "validityMinutes": 15}	2026-10-29 06:26:25.631325+00
3080	1971	login	{}	2026-10-29 06:27:55.027195+00
3081	1971	student.violation_signal	{"code": "context_menu", "detail": "Menu konteks diblokir di halaman ujian.", "sessionId": 2222, "reviewStatus": "pending"}	2026-10-29 06:29:45.295368+00
3082	1971	student.violation_signal	{"code": "fullscreen_exit", "detail": "Mode layar penuh berakhir.", "sessionId": 2222, "reviewStatus": "pending"}	2026-10-29 06:29:49.821118+00
3088	1979	student.violation_signal	{"code": "clipboard", "detail": "Percobaan salin atau tempel di halaman ujian.", "sessionId": 2230, "reviewStatus": "pending"}	2026-10-29 06:30:30.931575+00
3089	1979	student.violation_signal	{"code": "clipboard", "detail": "Percobaan salin atau tempel di halaman ujian.", "sessionId": 2230, "reviewStatus": "pending"}	2026-10-29 06:30:37.39281+00
3090	1	exam.violation_threshold_decision	{"count": 0, "examId": 71, "reason": "kepencet", "status": "in_progress", "decision": "false_positive", "sessionId": 2230}	2026-10-29 06:30:53.35725+00
3091	2012	student.exam_submit	{"sessionId": "2263", "finalScore": null, "finalScorePending": true}	2026-10-29 06:30:58.588196+00
3092	1971	student.exam_submit	{"sessionId": "2222", "finalScore": null, "finalScorePending": true}	2026-10-29 06:32:36.552102+00
3093	1977	student.exam_submit	{"sessionId": "2228", "finalScore": null, "finalScorePending": true}	2026-10-29 06:33:40.830918+00
3094	1992	student.exam_submit	{"sessionId": "2243", "finalScore": null, "finalScorePending": true}	2026-10-29 06:34:09.656242+00
3095	1983	student.exam_submit	{"sessionId": "2234", "finalScore": null, "finalScorePending": true}	2026-10-29 06:34:39.577795+00
3096	1973	student.exam_submit	{"sessionId": "2224", "finalScore": null, "finalScorePending": true}	2026-10-29 06:35:04.396965+00
3097	1979	student.exam_submit	{"sessionId": "2230", "finalScore": null, "finalScorePending": true}	2026-10-29 06:35:09.242156+00
3098	1990	student.exam_submit	{"sessionId": "2241", "finalScore": null, "finalScorePending": true}	2026-10-29 06:35:09.400777+00
3099	1978	student.exam_submit	{"sessionId": "2229", "finalScore": null, "finalScorePending": true}	2026-10-29 06:35:20.026243+00
3100	2010	student.exam_submit	{"sessionId": "2261", "finalScore": null, "finalScorePending": true}	2026-10-29 06:36:26.978914+00
3101	2014	login	{}	2026-10-29 06:36:29.735187+00
3102	2000	student.exam_submit	{"sessionId": "2251", "finalScore": null, "finalScorePending": true}	2026-10-29 06:37:07.094164+00
3103	1975	student.violation_signal	{"code": "clipboard", "detail": "Percobaan salin atau tempel di halaman ujian.", "sessionId": 2226, "reviewStatus": "pending"}	2026-10-29 06:37:13.905282+00
3104	1975	student.violation_signal	{"code": "window_blur", "detail": "Jendela ujian kehilangan fokus.", "sessionId": 2226, "reviewStatus": "pending"}	2026-10-29 06:37:16.098958+00
3105	2002	student.exam_submit	{"sessionId": "2253", "finalScore": null, "finalScorePending": true}	2026-10-29 06:37:36.727296+00
3106	1996	student.exam_submit	{"sessionId": "2247", "finalScore": null, "finalScorePending": true}	2026-10-29 06:38:08.109776+00
3107	2014	exam.violation_threshold_decision	{"count": 2, "examId": 71, "reason": "SENGAJA", "status": "locked", "decision": "block", "sessionId": 2226}	2026-10-29 06:39:23.084241+00
3108	1987	student.exam_submit	{"sessionId": "2238", "finalScore": null, "finalScorePending": true}	2026-10-29 06:39:27.471918+00
3109	2001	student.exam_submit	{"sessionId": "2252", "finalScore": null, "finalScorePending": true}	2026-10-29 06:39:52.380173+00
3110	2003	student.exam_submit	{"sessionId": "2254", "finalScore": null, "finalScorePending": true}	2026-10-29 06:39:57.935838+00
3111	2011	student.exam_submit	{"sessionId": "2262", "finalScore": null, "finalScorePending": true}	2026-10-29 06:41:08.752056+00
3112	2014	essay.grade	{"score": 90, "examId": 71, "studentId": 1990, "questionId": 1205}	2026-10-29 06:43:57.535676+00
3113	2014	essay.grade	{"score": 50, "examId": 71, "studentId": 1990, "questionId": 1206}	2026-10-29 06:44:10.874515+00
3114	2014	essay.grade	{"score": 100, "examId": 71, "studentId": 1990, "questionId": 1207}	2026-10-29 06:44:19.118987+00
3115	2013	student.exam_submit	{"sessionId": "2264", "finalScore": null, "finalScorePending": true}	2026-10-29 06:46:51.110959+00
3116	1	login	{}	2026-10-29 06:55:30.073548+00
3117	1	student.create	{"studentId": "2015"}	2026-10-29 07:03:09.417051+00
3118	1	exam.create	{"banks": 2, "examId": "72", "classes": 1, "participants": 1}	2026-10-29 07:05:02.267979+00
3119	2015	login	{}	2026-10-29 07:05:28.515912+00
3120	1	exam.pin_issue	{"examId": 72, "rotated": false, "issuedAt": "2026-10-29T07:05:43.896Z", "expiresAt": "2026-10-29T07:20:43.896Z", "validityMinutes": 15}	2026-10-29 07:05:43.895184+00
3121	2015	student.violation_signal	{"code": "window_blur", "detail": "Jendela ujian kehilangan fokus.", "sessionId": 2265, "reviewStatus": "pending"}	2026-10-29 07:07:10.084115+00
3122	2015	student.violation_signal	{"code": "clipboard", "detail": "Percobaan salin atau tempel di halaman ujian.", "sessionId": 2265, "reviewStatus": "pending"}	2026-10-29 07:07:32.513881+00
3123	1	exam.violation_threshold_decision	{"count": 0, "examId": 72, "reason": "ok", "status": "in_progress", "decision": "false_positive", "sessionId": 2265}	2026-10-29 07:07:44.482345+00
3124	1	question.media.delete	{"bankId": "152", "mediaId": "38"}	2026-10-29 07:10:34.072225+00
3125	1	question.update	{"type": "mc", "bankId": "152", "questionId": 349}	2026-10-29 07:11:01.498298+00
3126	1	login	{}	2026-10-31 05:54:46.042812+00
3127	1	login	{}	2026-11-02 01:19:24.835113+00
3128	1	question.delete	{"type": "essay", "bankId": "205", "questionId": "1434"}	2026-11-02 02:51:10.32213+00
3129	1	staff.create	{"role": "pengawas", "staffId": "2016", "username": "pengawas_imbs", "classNames": [], "subjectIds": []}	2026-11-02 04:39:05.725468+00
3130	2016	login	{}	2026-11-02 04:39:19.220839+00
3131	1	login	{}	2026-11-02 04:39:34.241603+00
3132	1	exam.status	{"examId": 72, "status": "completed"}	2026-11-02 05:35:28.359949+00
3133	1	login	{}	2026-11-02 08:10:00.175243+00
\.


--
-- Data for Name: exam_questions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exam_questions (session_id, question_id, "position", options, answer_key) FROM stdin;
2221	1196	1	\N	\N
2221	1201	2	\N	\N
2221	1194	3	\N	\N
2221	1204	4	\N	\N
2221	1200	5	\N	\N
2221	1198	6	\N	\N
2221	1193	7	\N	\N
2221	1192	8	\N	\N
2221	1191	9	\N	\N
2221	1202	10	\N	\N
2221	1205	11	\N	\N
2221	1206	12	\N	\N
2221	1207	13	\N	\N
2222	264	11	\N	\N
2222	265	12	\N	\N
2222	266	13	\N	\N
2223	255	1	\N	\N
2223	254	2	\N	\N
2223	253	3	\N	\N
2223	258	4	\N	\N
2223	249	5	\N	\N
2223	251	6	\N	\N
2223	263	7	\N	\N
2223	260	8	\N	\N
2223	252	9	\N	\N
2223	250	10	\N	\N
2223	264	11	\N	\N
2223	265	12	\N	\N
2223	266	13	\N	\N
2224	264	11	\N	\N
2224	265	12	\N	\N
2224	266	13	\N	\N
2225	252	1	\N	\N
2225	262	2	\N	\N
2225	255	3	\N	\N
2225	250	4	\N	\N
2225	260	5	\N	\N
2225	253	6	\N	\N
2225	249	7	\N	\N
2225	256	8	\N	\N
2225	261	9	\N	\N
2225	251	10	\N	\N
2225	264	11	\N	\N
2225	265	12	\N	\N
2225	266	13	\N	\N
2226	264	11	\N	\N
2226	265	12	\N	\N
2226	266	13	\N	\N
2227	255	1	\N	\N
2227	256	2	\N	\N
2227	253	3	\N	\N
2227	254	4	\N	\N
2227	249	5	\N	\N
2227	250	6	\N	\N
2227	252	7	\N	\N
2227	262	8	\N	\N
2227	258	9	\N	\N
2227	260	10	\N	\N
2227	264	11	\N	\N
2227	265	12	\N	\N
2227	266	13	\N	\N
2228	264	11	\N	\N
2228	265	12	\N	\N
2228	266	13	\N	\N
2229	264	11	\N	\N
2229	265	12	\N	\N
2229	266	13	\N	\N
2230	264	11	\N	\N
2230	265	12	\N	\N
2230	266	13	\N	\N
2231	261	1	\N	\N
2231	252	2	\N	\N
2231	255	3	\N	\N
2231	259	4	\N	\N
2231	258	5	\N	\N
2231	263	6	\N	\N
2231	260	7	\N	\N
2231	254	8	\N	\N
2231	256	9	\N	\N
2231	253	10	\N	\N
2231	264	11	\N	\N
2231	265	12	\N	\N
2231	266	13	\N	\N
2232	251	1	\N	\N
2232	258	2	\N	\N
2232	262	3	\N	\N
2232	259	4	\N	\N
2232	249	5	\N	\N
2232	260	6	\N	\N
2232	253	7	\N	\N
2232	254	8	\N	\N
2232	250	9	\N	\N
2232	257	10	\N	\N
2232	264	11	\N	\N
2232	265	12	\N	\N
2232	266	13	\N	\N
2233	1204	1	["صِيَامُ كُلِّ يَوْمٍ", "صِيَامُ ثَلَاثَةِ أَيَّامٍ كُلَّ شَهْرٍ", "صِيَامُ يَوْمٍ وَإِفْطَارُ يَوْمٍ", "صِيَامُ يَوْمَيِ الِاثْنَيْنِ وَالْخَمِيسِ فَقَطْ"]	C
2230	256	10	["صِلَةٌ كُبْرَى", "مَدُّ فَرْقٍ", "صِلَةٌ صُغْرَى", "مَدُّ بَدَلٍ"]	A
2229	251	1	["حَرَكَتَانِ", "أَرْبَعُ حَرَكَاتٍ", "سِتُّ حَرَكَاتٍ", "خَمْسُ حَرَكَاتٍ"]	A
2229	252	3	["آمَنُوا", "لَهُ", "عَلَيْهِ", "فِيهِ"]	A
2229	256	6	["صِلَةٌ كُبْرَى", "صِلَةٌ صُغْرَى", "مَدُّ فَرْقٍ", "مَدُّ بَدَلٍ"]	A
2228	256	1	["مَدُّ بَدَلٍ", "مَدُّ فَرْقٍ", "صِلَةٌ كُبْرَى", "صِلَةٌ صُغْرَى"]	C
2228	249	2	["مَوْضِعَانِ", "أَرْبَعَةُ مَوَاضِعَ", "مَوْضِعٌ وَاحِدٌ", "ثَلَاثَةُ مَوَاضِعَ"]	A
2226	249	1	["ثَلَاثَةُ مَوَاضِعَ", "أَرْبَعَةُ مَوَاضِعَ", "مَوْضِعَانِ", "مَوْضِعٌ وَاحِدٌ"]	C
2226	258	2	["لِأَنَّهَا تُحِبُّ النَّاسَ", "لِأَنَّ الْمَلَائِكَةَ أَمَرُوهَا", "لِأَنَّ النَّاسَ أَمَرُوهَا", "لِأَنَّ رَبَّهَا أَوْحَى لَهَا"]	D
2222	263	1	["كَالْعِهْنِ الْمَنْفُوشِ", "كَالْحَجَرِ", "كَالذَّهَبِ", "كَالْحَدِيدِ"]	A
2222	253	2	["أَرْبَعُ حَرَكَاتٍ", "حَرَكَتَانِ", "سِتُّ حَرَكَاتٍ", "خَمْسُ حَرَكَاتٍ"]	B
2222	252	6	["فِيهِ", "عَلَيْهِ", "آمَنُوا", "لَهُ"]	C
2265	304	11	\N	\N
2265	305	12	\N	\N
2265	306	13	\N	\N
2233	1205	11	\N	\N
2233	1206	12	\N	\N
2233	1207	13	\N	\N
2234	1205	11	\N	\N
2234	1206	12	\N	\N
2234	1207	13	\N	\N
2235	1202	1	\N	\N
2235	1194	2	\N	\N
2235	1199	3	\N	\N
2235	1191	4	\N	\N
2235	1200	5	\N	\N
2235	1198	6	\N	\N
2235	1193	7	\N	\N
2235	1195	8	\N	\N
2235	1196	9	\N	\N
2235	1192	10	\N	\N
2235	1205	11	\N	\N
2235	1206	12	\N	\N
2235	1207	13	\N	\N
2236	1194	1	\N	\N
2236	1195	2	\N	\N
2236	1199	3	\N	\N
2236	1200	4	\N	\N
2236	1202	5	\N	\N
2236	1204	6	\N	\N
2236	1201	7	\N	\N
2236	1190	8	\N	\N
2236	1196	9	\N	\N
2236	1198	10	\N	\N
2236	1205	11	\N	\N
2236	1206	12	\N	\N
2236	1207	13	\N	\N
2237	1197	1	\N	\N
2237	1203	2	\N	\N
2237	1204	3	\N	\N
2237	1196	4	\N	\N
2237	1192	5	\N	\N
2237	1191	6	\N	\N
2237	1201	7	\N	\N
2237	1202	8	\N	\N
2237	1190	9	\N	\N
2237	1195	10	\N	\N
2237	1205	11	\N	\N
2237	1206	12	\N	\N
2237	1207	13	\N	\N
2238	1205	11	\N	\N
2238	1206	12	\N	\N
2238	1207	13	\N	\N
2239	1198	1	\N	\N
2239	1199	2	\N	\N
2239	1204	3	\N	\N
2239	1195	4	\N	\N
2239	1192	5	\N	\N
2239	1200	6	\N	\N
2239	1197	7	\N	\N
2239	1190	8	\N	\N
2239	1201	9	\N	\N
2239	1196	10	\N	\N
2239	1205	11	\N	\N
2239	1206	12	\N	\N
2239	1207	13	\N	\N
2240	1199	1	\N	\N
2240	1191	2	\N	\N
2240	1202	3	\N	\N
2240	1203	4	\N	\N
2240	1197	5	\N	\N
2240	1198	6	\N	\N
2240	1193	7	\N	\N
2240	1204	8	\N	\N
2240	1190	9	\N	\N
2240	1201	10	\N	\N
2240	1205	11	\N	\N
2240	1206	12	\N	\N
2240	1207	13	\N	\N
2241	1205	11	\N	\N
2241	1206	12	\N	\N
2241	1207	13	\N	\N
2242	1203	1	\N	\N
2242	1193	2	\N	\N
2242	1191	3	\N	\N
2242	1204	4	\N	\N
2242	1192	5	\N	\N
2242	1195	6	\N	\N
2242	1202	7	\N	\N
2242	1194	8	\N	\N
2242	1190	9	\N	\N
2242	1198	10	\N	\N
2242	1205	11	\N	\N
2242	1206	12	\N	\N
2242	1207	13	\N	\N
2243	1190	6	["دخول وقت الصلاة", "قراءة كل صفحة من القرآن", "حصول نعمة جديدة أو اندفاع نقمة", "نسيان التشهد"]	C
2243	1191	5	["سجود السهو", "سجود التلاوة", "سجود الشكر", "سجود الصلاة"]	C
2243	1194	8	["لأنها تريد زيادة عدد ركعات الصلاة", "لأنها حصلت على نعمة تسرها", "لأنها نسيت ركعة", "لأنها قرأت آية سجدة"]	B
2243	1196	4	["نسيان التشهد", "قراءة أو سماع آيةٍ من آيات السجدة", "الانتهاء من الصلاة", "سماع خبرٍ سارّ"]	B
2233	1190	2	["حصول نعمة جديدة أو اندفاع نقمة", "قراءة كل صفحة من القرآن", "نسيان التشهد", "دخول وقت الصلاة"]	A
2233	1195	9	["يسجد سجود التلاوة", "يركع مباشرةً", "يجلس للاستراحة", "يقطع القراءة ولا يفعل شيئًا"]	A
2241	1204	1	["صِيَامُ يَوْمَيِ الِاثْنَيْنِ وَالْخَمِيسِ فَقَطْ", "صِيَامُ ثَلَاثَةِ أَيَّامٍ كُلَّ شَهْرٍ", "صِيَامُ يَوْمٍ وَإِفْطَارُ يَوْمٍ", "صِيَامُ كُلِّ يَوْمٍ"]	C
2234	1194	1	["لأنها قرأت آية سجدة", "لأنها نسيت ركعة", "لأنها تريد زيادة عدد ركعات الصلاة", "لأنها حصلت على نعمة تسرها"]	D
2234	1197	2	["يخرج من المسجد", "يركع بدل السجود", "يسجد مع الإمام", "يبقى واقفًا"]	C
2234	1193	7	["نية سجود السهو", "نية سجود الشكر", "نية صلاة الجنازة", "نية سجود التلاوة"]	B
2238	1190	1	["قراءة كل صفحة من القرآن", "نسيان التشهد", "دخول وقت الصلاة", "حصول نعمة جديدة أو اندفاع نقمة"]	D
2238	1195	2	["يجلس للاستراحة", "يسجد سجود التلاوة", "يركع مباشرةً", "يقطع القراءة ولا يفعل شيئًا"]	B
2243	1205	11	\N	\N
2243	1206	12	\N	\N
2243	1207	13	\N	\N
2244	1199	1	\N	\N
2244	1193	2	\N	\N
2244	1204	3	\N	\N
2244	1190	4	\N	\N
2244	1196	5	\N	\N
2244	1195	6	\N	\N
2244	1202	7	\N	\N
2244	1203	8	\N	\N
2244	1192	9	\N	\N
2244	1191	10	\N	\N
2244	1205	11	\N	\N
2244	1206	12	\N	\N
2244	1207	13	\N	\N
2245	1197	1	\N	\N
2245	1194	2	\N	\N
2245	1198	3	\N	\N
2245	1192	4	\N	\N
2245	1190	5	\N	\N
2245	1203	6	\N	\N
2245	1201	7	\N	\N
2245	1202	8	\N	\N
2245	1193	9	\N	\N
2245	1196	10	\N	\N
2245	1205	11	\N	\N
2245	1206	12	\N	\N
2245	1207	13	\N	\N
2246	1198	1	\N	\N
2246	1204	2	\N	\N
2246	1202	3	\N	\N
2246	1197	4	\N	\N
2246	1193	5	\N	\N
2246	1190	6	\N	\N
2246	1196	7	\N	\N
2246	1194	8	\N	\N
2246	1200	9	\N	\N
2246	1195	10	\N	\N
2246	1205	11	\N	\N
2246	1206	12	\N	\N
2246	1207	13	\N	\N
2265	291	4	["دين الإسلام", "الحضارة الإسلامية", "تقدم المسلمين", "التاريخ الإسلامي"]	A
2265	292	1	["منشئ علم الضوء", "أعظم كيميائ", "أول من استعمال التخدير في الجراحة", "أعظم فيزيائ"]	B
2265	293	5	["الرياضيات", "الفيزياء", "علماء المسلمين", "الكيمياء"]	A
2247	1205	11	\N	\N
2247	1206	12	\N	\N
2247	1207	13	\N	\N
2248	1190	1	\N	\N
2248	1198	2	\N	\N
2248	1193	3	\N	\N
2248	1199	4	\N	\N
2248	1196	5	\N	\N
2248	1200	6	\N	\N
2248	1195	7	\N	\N
2248	1197	8	\N	\N
2248	1202	9	\N	\N
2248	1204	10	\N	\N
2248	1205	11	\N	\N
2248	1206	12	\N	\N
2248	1207	13	\N	\N
2249	1204	1	\N	\N
2249	1195	2	\N	\N
2249	1193	3	\N	\N
2249	1192	4	\N	\N
2249	1196	5	\N	\N
2249	1201	6	\N	\N
2249	1202	7	\N	\N
2249	1191	8	\N	\N
2249	1194	9	\N	\N
2249	1200	10	\N	\N
2249	1205	11	\N	\N
2249	1206	12	\N	\N
2249	1207	13	\N	\N
2250	1196	1	\N	\N
2250	1197	2	\N	\N
2250	1195	3	\N	\N
2250	1198	4	\N	\N
2250	1192	5	\N	\N
2250	1191	6	\N	\N
2250	1190	7	\N	\N
2250	1199	8	\N	\N
2250	1194	9	\N	\N
2250	1204	10	\N	\N
2250	1205	11	\N	\N
2250	1206	12	\N	\N
2250	1207	13	\N	\N
2251	1205	11	\N	\N
2251	1206	12	\N	\N
2251	1207	13	\N	\N
2252	1205	11	\N	\N
2252	1206	12	\N	\N
2252	1207	13	\N	\N
2253	1205	11	\N	\N
2253	1206	12	\N	\N
2253	1207	13	\N	\N
2254	284	11	\N	\N
2254	285	12	\N	\N
2254	286	13	\N	\N
2255	281	1	\N	\N
2255	275	2	\N	\N
2255	272	3	\N	\N
2255	269	4	\N	\N
2255	282	5	\N	\N
2255	276	6	\N	\N
2255	270	7	\N	\N
2255	271	8	\N	\N
2255	277	9	\N	\N
2243	1195	10	["يقطع القراءة ولا يفعل شيئًا", "يجلس للاستراحة", "يسجد سجود التلاوة", "يركع مباشرةً"]	C
2243	1202	9	["مَكْرُوهٌ", "وَاجِبٌ", "مُبَاحٌ فَقَطْ", "مَنْدُوبٌ فَقَطْ"]	B
2254	270	5	["أَنْتَ", "هَذِهِ", "هَذَا", "ذلك"]	B
2253	1191	8	["سجود السهو", "سجود الصلاة", "سجود الشكر", "سجود التلاوة"]	C
2253	1192	9	["كلاهما بسبب نسيان الصلاة", "سجود التلاوة بسبب آية السجدة، وسجود الشكر بسبب نعمة أو اندفاع نقمة", "سجود التلاوة يكون عند حدوث المصيبة فقط", "سجود الشكر لا علاقة له بالنعمة"]	B
2247	1190	8	["دخول وقت الصلاة", "نسيان التشهد", "قراءة كل صفحة من القرآن", "حصول نعمة جديدة أو اندفاع نقمة"]	D
2247	1191	5	["سجود التلاوة", "سجود السهو", "سجود الشكر", "سجود الصلاة"]	C
2251	1190	2	["قراءة كل صفحة من القرآن", "دخول وقت الصلاة", "نسيان التشهد", "حصول نعمة جديدة أو اندفاع نقمة"]	D
2251	1194	4	["لأنها تريد زيادة عدد ركعات الصلاة", "لأنها قرأت آية سجدة", "لأنها حصلت على نعمة تسرها", "لأنها نسيت ركعة"]	C
2255	274	10	\N	\N
2255	284	11	\N	\N
2265	294	8	["محدودة", "صعبة", "بعيدة", "سهلة"]	D
2265	295	3	["ظلام الغرب", "نشر العلم", "طلب العلم", "بداية الإسلام"]	C
2265	297	6	["الجبال", "الطرق", "الصحاري", "البحار"]	C
2255	285	12	\N	\N
2255	286	13	\N	\N
2256	271	1	\N	\N
2256	270	2	\N	\N
2256	282	3	\N	\N
2256	281	4	\N	\N
2256	269	5	\N	\N
2256	278	6	\N	\N
2256	272	7	\N	\N
2256	273	8	\N	\N
2256	280	9	\N	\N
2256	277	10	\N	\N
2256	284	11	\N	\N
2256	285	12	\N	\N
2256	286	13	\N	\N
2257	281	1	\N	\N
2257	273	2	\N	\N
2257	277	3	\N	\N
2257	271	4	\N	\N
2257	272	5	\N	\N
2257	278	6	\N	\N
2257	269	7	\N	\N
2257	276	8	\N	\N
2257	282	9	\N	\N
2257	270	10	\N	\N
2257	284	11	\N	\N
2257	285	12	\N	\N
2257	286	13	\N	\N
2258	278	1	\N	\N
2258	279	2	\N	\N
2258	283	3	\N	\N
2258	274	4	\N	\N
2258	277	5	\N	\N
2258	272	6	\N	\N
2258	276	7	\N	\N
2258	282	8	\N	\N
2258	275	9	\N	\N
2258	281	10	\N	\N
2258	284	11	\N	\N
2258	285	12	\N	\N
2258	286	13	\N	\N
2259	269	1	\N	\N
2259	282	2	\N	\N
2259	273	3	\N	\N
2259	272	4	\N	\N
2259	283	5	\N	\N
2259	278	6	\N	\N
2259	271	7	\N	\N
2259	270	8	\N	\N
2259	280	9	\N	\N
2259	274	10	\N	\N
2259	284	11	\N	\N
2259	285	12	\N	\N
2259	286	13	\N	\N
2260	269	1	\N	\N
2260	279	2	\N	\N
2260	272	3	\N	\N
2260	280	4	\N	\N
2260	275	5	\N	\N
2260	276	6	\N	\N
2260	273	7	\N	\N
2260	271	8	\N	\N
2260	277	9	\N	\N
2260	278	10	\N	\N
2260	284	11	\N	\N
2260	285	12	\N	\N
2260	286	13	\N	\N
2261	284	11	\N	\N
2261	285	12	\N	\N
2261	286	13	\N	\N
2262	284	11	\N	\N
2262	285	12	\N	\N
2262	286	13	\N	\N
2263	284	11	\N	\N
2263	285	12	\N	\N
2263	286	13	\N	\N
2264	284	11	\N	\N
2264	285	12	\N	\N
2264	286	13	\N	\N
2224	250	4	["حَرَكَتَانِ", "سِتُّ حَرَكَاتٍ", "ثَلَاثُ حَرَكَاتٍ", "أَرْبَعُ حَرَكَاتٍ"]	B
2224	252	5	["فِيهِ", "لَهُ", "آمَنُوا", "عَلَيْهِ"]	C
2224	253	3	["سِتُّ حَرَكَاتٍ", "أَرْبَعُ حَرَكَاتٍ", "حَرَكَتَانِ", "خَمْسُ حَرَكَاتٍ"]	C
2264	269	5	["هَذَا", "أَنْتَ", "هَذِهِ", "تِلْكَ"]	A
2264	271	4	["تِلْكَ", "هَذِهِ", "ذلك", "هَذَا"]	C
2264	272	3	["هَذِهِ", "هَذَا", "تِلْكَ", "ذلك"]	C
2264	273	1	["إِلَى", "فِي", "مِنْ", "عَلَى"]	B
2264	274	9	["لَكَ", "لَهُ", "لِِي", "لَهاَ"]	D
2264	275	6	["فَوْقَ", "َتحْتَ", "وَرَاءَ", "َبَيْنَ"]	C
2264	276	10	["ثَلَاثُ أَقْلَامٍ", "ثَلَاثَةُ أَقْلَامٍ", "ثَلَاثَةً أَقْلَامٍ", "ثَلَاثٌ أَقْلَامٍ"]	B
2264	279	7	["تِسْعُ كُتُبٍ - سِتَّةُ مَجَلَّاتٍ", "تِسْعَةُ كُتُبٍ - سِتَّةُ مَجَلَّاتٍ", "تِسْعَةُ كُتُبٍ - سِتُّ مَجَلَّاتٍ", "تِسْعُ كُتُبٍ - سِتُّ مَجَلَّاتٍ"]	C
2230	249	5	["أَرْبَعَةُ مَوَاضِعَ", "مَوْضِعٌ وَاحِدٌ", "ثَلَاثَةُ مَوَاضِعَ", "مَوْضِعَانِ"]	D
2230	251	7	["حَرَكَتَانِ", "خَمْسُ حَرَكَاتٍ", "أَرْبَعُ حَرَكَاتٍ", "سِتُّ حَرَكَاتٍ"]	A
2261	273	4	["مِنْ", "فِي", "عَلَى", "إِلَى"]	B
2262	269	2	["تِلْكَ", "هَذِهِ", "هَذَا", "أَنْتَ"]	C
2262	270	9	["أَنْتَ", "هَذَا", "ذلك", "هَذِهِ"]	D
2262	272	1	["تِلْكَ", "هَذِهِ", "هَذَا", "ذلك"]	A
2262	273	8	["إِلَى", "مِنْ", "عَلَى", "فِي"]	D
2263	271	2	["هَذَا", "ذلك", "تِلْكَ", "هَذِهِ"]	B
2263	272	3	["هَذِهِ", "ذلك", "تِلْكَ", "هَذَا"]	C
2263	273	5	["مِنْ", "فِي", "إِلَى", "عَلَى"]	B
2263	274	9	["لَهاَ", "لَهُ", "لَكَ", "لِِي"]	A
2224	255	9	["بَعْدَ هَاءِ الضَّمِيرِ هَمْزَةُ قَطْعٍ", "بَعْدَ هَاءِ الضَّمِيرِ سَاكِنٌ", "بَعْدَ هَاءِ الضَّمِيرِ حَرْفٌ مُتَحَرِّكٌ", "قَبْلَ هَاءِ الضَّمِيرِ هَمْزَةٌ"]	A
2224	256	7	["صِلَةٌ صُغْرَى", "مَدُّ بَدَلٍ", "صِلَةٌ كُبْرَى", "مَدُّ فَرْقٍ"]	C
2224	257	2	["ءَآللَّهُ", "أُوتُوا", "فِيهِ", "آمَنُوا"]	A
2224	259	1	["عَذَابًا", "مَالًا", "شُهْرَةً", "جَزَاءَهُ"]	D
2224	260	10	["أَنَّ الْخَيْرَ لِلْأَقْوِيَاءِ فَقَطْ", "أَنَّ كُلَّ عَمَلٍ مَحْسُوبٌ", "أَنَّ الْمَالَ أَهَمُّ مِنَ الْعَمَلِ", "أَنَّ الْعَمَلَ الْقَلِيلَ لَا قِيمَةَ لَهُ"]	B
2224	261	8	["الْحَيَاةُ", "الْقِيَامَةُ", "الْجَنَّةُ", "الدُّنْيَا"]	B
2224	262	6	["كَالنُّجُومِ", "كَالْبُحُورِ", "كَالْفَرَاشِ الْمَبْثُوثِ", "كَالْجِبَالِ"]	C
2252	1190	2	["نسيان التشهد", "دخول وقت الصلاة", "حصول نعمة جديدة أو اندفاع نقمة", "قراءة كل صفحة من القرآن"]	C
2252	1191	4	["سجود السهو", "سجود الشكر", "سجود الصلاة", "سجود التلاوة"]	B
2252	1192	3	["سجود التلاوة يكون عند حدوث المصيبة فقط", "سجود الشكر لا علاقة له بالنعمة", "سجود التلاوة بسبب آية السجدة، وسجود الشكر بسبب نعمة أو اندفاع نقمة", "كلاهما بسبب نسيان الصلاة"]	C
2252	1193	8	["نية سجود التلاوة", "نية سجود الشكر", "نية سجود السهو", "نية صلاة الجنازة"]	B
2252	1197	1	["يخرج من المسجد", "يسجد مع الإمام", "يبقى واقفًا", "يركع بدل السجود"]	B
2252	1198	7	["تقوم ثم تصلي ركعتين", "تصلي أربع ركعات", "تسجد سجدةً واحدةً بنية سجود التلاوة", "لا يجوز لها السجود إلا داخل الصلاة"]	C
2252	1200	9	["الصَّلَاةُ فِي الْمَسْجِدِ", "السَّفَرُ", "الْإِمْسَاكُ عَنِ الشَّيْءِ", "الْأَكْلُ وَالشُّرْبُ"]	C
2252	1201	10	["صِيَامُ عَاشُورَاءَ", "صِيَامُ يَوْمِ الْجُمُعَةِ", "صِيَامُ رَمَضَانَ", "صِيَامُ دَاوُدَ"]	C
2252	1202	5	["وَاجِبٌ", "مَكْرُوهٌ", "مُبَاحٌ فَقَطْ", "مَنْدُوبٌ فَقَطْ"]	A
2252	1204	6	["صِيَامُ ثَلَاثَةِ أَيَّامٍ كُلَّ شَهْرٍ", "صِيَامُ يَوْمَيِ الِاثْنَيْنِ وَالْخَمِيسِ فَقَطْ", "صِيَامُ كُلِّ يَوْمٍ", "صِيَامُ يَوْمٍ وَإِفْطَارُ يَوْمٍ"]	D
2243	1199	1	["هو سجود واحد عند آية السجدة", "هو سجود خاص بصلاة الجمعة", "هو أربع سجدات متتابعة", "هو سجود واجب بعد كل سورة"]	A
2243	1200	2	["الصَّلَاةُ فِي الْمَسْجِدِ", "الْإِمْسَاكُ عَنِ الشَّيْءِ", "الْأَكْلُ وَالشُّرْبُ", "السَّفَرُ"]	B
2243	1203	3	["التَّاسِعِ", "السَّابِعِ", "الثَّامِنِ", "الْعَاشِرِ"]	A
2243	1204	7	["صِيَامُ يَوْمٍ وَإِفْطَارُ يَوْمٍ", "صِيَامُ يَوْمَيِ الِاثْنَيْنِ وَالْخَمِيسِ فَقَطْ", "صِيَامُ كُلِّ يَوْمٍ", "صِيَامُ ثَلَاثَةِ أَيَّامٍ كُلَّ شَهْرٍ"]	A
2254	271	4	["تِلْكَ", "هَذَا", "هَذِهِ", "ذلك"]	D
2254	272	1	["هَذِهِ", "هَذَا", "ذلك", "تِلْكَ"]	D
2254	273	3	["فِي", "عَلَى", "إِلَى", "مِنْ"]	A
2254	274	2	["لِِي", "لَهُ", "لَكَ", "لَهاَ"]	D
2254	276	8	["ثَلَاثٌ أَقْلَامٍ", "ثَلَاثَةً أَقْلَامٍ", "ثَلَاثُ أَقْلَامٍ", "ثَلَاثَةُ أَقْلَامٍ"]	D
2254	278	10	["هَذَا - أَمَامَ", "تِلْكَ - عَلَى", "ذَلِكَ - بَيْنَ", "هَذِهِ - تَحْتَ"]	B
2254	279	9	["تِسْعَةُ كُتُبٍ - سِتَّةُ مَجَلَّاتٍ", "تِسْعُ كُتُبٍ - سِتُّ مَجَلَّاتٍ", "تِسْعُ كُتُبٍ - سِتَّةُ مَجَلَّاتٍ", "تِسْعَةُ كُتُبٍ - سِتُّ مَجَلَّاتٍ"]	D
2254	281	7	["أَيْنَ", "مَنْ", "مَا", "كَيْفَ"]	A
2254	283	6	["عَلَى", "فِي", "إِلَى", "جَانِبَ"]	D
2264	280	8	["إِلَى", "فِي", "عَلَى", "مِنْ"]	C
2264	282	2	["نَحْنُ", "هِيَ", "هُوَ", "أَنْتِ"]	C
2233	1196	3	["نسيان التشهد", "الانتهاء من الصلاة", "قراءة أو سماع آيةٍ من آيات السجدة", "سماع خبرٍ سارّ"]	C
2233	1198	6	["لا يجوز لها السجود إلا داخل الصلاة", "تقوم ثم تصلي ركعتين", "تصلي أربع ركعات", "تسجد سجدةً واحدةً بنية سجود التلاوة"]	D
2233	1199	4	["هو سجود واجب بعد كل سورة", "هو سجود خاص بصلاة الجمعة", "هو سجود واحد عند آية السجدة", "هو أربع سجدات متتابعة"]	C
2233	1200	7	["الْأَكْلُ وَالشُّرْبُ", "السَّفَرُ", "الصَّلَاةُ فِي الْمَسْجِدِ", "الْإِمْسَاكُ عَنِ الشَّيْءِ"]	D
2233	1201	8	["صِيَامُ دَاوُدَ", "صِيَامُ عَاشُورَاءَ", "صِيَامُ يَوْمِ الْجُمُعَةِ", "صِيَامُ رَمَضَانَ"]	D
2233	1202	5	["مَنْدُوبٌ فَقَطْ", "مَكْرُوهٌ", "مُبَاحٌ فَقَطْ", "وَاجِبٌ"]	D
2233	1203	10	["الثَّامِنِ", "الْعَاشِرِ", "السَّابِعِ", "التَّاسِعِ"]	D
2230	253	2	["خَمْسُ حَرَكَاتٍ", "أَرْبَعُ حَرَكَاتٍ", "حَرَكَتَانِ", "سِتُّ حَرَكَاتٍ"]	C
2230	254	4	["فِيهِ هُدًى", "إِنَّهُ أَنْزَلَهُ", "لَهُ أَجْرٌ", "مَالَهُ أَخْلَدَهُ"]	A
2230	255	1	["بَعْدَ هَاءِ الضَّمِيرِ سَاكِنٌ", "بَعْدَ هَاءِ الضَّمِيرِ هَمْزَةُ قَطْعٍ", "قَبْلَ هَاءِ الضَّمِيرِ هَمْزَةٌ", "بَعْدَ هَاءِ الضَّمِيرِ حَرْفٌ مُتَحَرِّكٌ"]	B
2230	258	9	["لِأَنَّ النَّاسَ أَمَرُوهَا", "لِأَنَّ الْمَلَائِكَةَ أَمَرُوهَا", "لِأَنَّ رَبَّهَا أَوْحَى لَهَا", "لِأَنَّهَا تُحِبُّ النَّاسَ"]	C
2230	259	3	["شُهْرَةً", "مَالًا", "عَذَابًا", "جَزَاءَهُ"]	D
2230	261	6	["الدُّنْيَا", "الْحَيَاةُ", "الْقِيَامَةُ", "الْجَنَّةُ"]	C
2230	262	8	["كَالْفَرَاشِ الْمَبْثُوثِ", "كَالنُّجُومِ", "كَالْجِبَالِ", "كَالْبُحُورِ"]	A
2253	1193	7	["نية سجود الشكر", "نية صلاة الجنازة", "نية سجود السهو", "نية سجود التلاوة"]	A
2253	1195	2	["يسجد سجود التلاوة", "يركع مباشرةً", "يقطع القراءة ولا يفعل شيئًا", "يجلس للاستراحة"]	A
2253	1197	1	["يركع بدل السجود", "يسجد مع الإمام", "يخرج من المسجد", "يبقى واقفًا"]	B
2253	1198	10	["تقوم ثم تصلي ركعتين", "تصلي أربع ركعات", "لا يجوز لها السجود إلا داخل الصلاة", "تسجد سجدةً واحدةً بنية سجود التلاوة"]	D
2253	1199	3	["هو سجود واحد عند آية السجدة", "هو سجود واجب بعد كل سورة", "هو أربع سجدات متتابعة", "هو سجود خاص بصلاة الجمعة"]	A
2253	1200	5	["الْأَكْلُ وَالشُّرْبُ", "الْإِمْسَاكُ عَنِ الشَّيْءِ", "الصَّلَاةُ فِي الْمَسْجِدِ", "السَّفَرُ"]	B
2253	1201	4	["صِيَامُ عَاشُورَاءَ", "صِيَامُ يَوْمِ الْجُمُعَةِ", "صِيَامُ دَاوُدَ", "صِيَامُ رَمَضَانَ"]	D
2253	1202	6	["مُبَاحٌ فَقَطْ", "مَكْرُوهٌ", "مَنْدُوبٌ فَقَطْ", "وَاجِبٌ"]	D
2261	269	8	["هَذَا", "أَنْتَ", "هَذِهِ", "تِلْكَ"]	A
2261	272	7	["هَذِهِ", "هَذَا", "ذلك", "تِلْكَ"]	D
2261	276	2	["ثَلَاثٌ أَقْلَامٍ", "ثَلَاثَةً أَقْلَامٍ", "ثَلَاثَةُ أَقْلَامٍ", "ثَلَاثُ أَقْلَامٍ"]	C
2261	277	6	["سَبْعَةُ", "سَبْعَةً", "سَبْعُونَ", "سَبْعُ"]	A
2261	278	10	["ذَلِكَ - بَيْنَ", "هَذِهِ - تَحْتَ", "تِلْكَ - عَلَى", "هَذَا - أَمَامَ"]	C
2261	279	3	["تِسْعُ كُتُبٍ - سِتَّةُ مَجَلَّاتٍ", "تِسْعَةُ كُتُبٍ - سِتَّةُ مَجَلَّاتٍ", "تِسْعُ كُتُبٍ - سِتُّ مَجَلَّاتٍ", "تِسْعَةُ كُتُبٍ - سِتُّ مَجَلَّاتٍ"]	D
2261	281	9	["مَنْ", "أَيْنَ", "مَا", "كَيْفَ"]	B
2261	282	5	["هِيَ", "هُوَ", "نَحْنُ", "أَنْتِ"]	B
2261	283	1	["عَلَى", "إِلَى", "فِي", "جَانِبَ"]	D
2262	277	6	["سَبْعَةً", "سَبْعَةُ", "سَبْعُونَ", "سَبْعُ"]	B
2262	278	7	["هَذِهِ - تَحْتَ", "تِلْكَ - عَلَى", "ذَلِكَ - بَيْنَ", "هَذَا - أَمَامَ"]	B
2262	279	5	["تِسْعَةُ كُتُبٍ - سِتَّةُ مَجَلَّاتٍ", "تِسْعُ كُتُبٍ - سِتُّ مَجَلَّاتٍ", "تِسْعَةُ كُتُبٍ - سِتُّ مَجَلَّاتٍ", "تِسْعُ كُتُبٍ - سِتَّةُ مَجَلَّاتٍ"]	C
2262	281	10	["مَا", "أَيْنَ", "مَنْ", "كَيْفَ"]	B
2262	282	3	["أَنْتِ", "نَحْنُ", "هِيَ", "هُوَ"]	D
2262	283	4	["عَلَى", "جَانِبَ", "فِي", "إِلَى"]	B
2247	1192	3	["كلاهما بسبب نسيان الصلاة", "سجود التلاوة بسبب آية السجدة، وسجود الشكر بسبب نعمة أو اندفاع نقمة", "سجود التلاوة يكون عند حدوث المصيبة فقط", "سجود الشكر لا علاقة له بالنعمة"]	B
2247	1195	1	["يركع مباشرةً", "يقطع القراءة ولا يفعل شيئًا", "يسجد سجود التلاوة", "يجلس للاستراحة"]	C
2247	1196	7	["سماع خبرٍ سارّ", "الانتهاء من الصلاة", "نسيان التشهد", "قراءة أو سماع آيةٍ من آيات السجدة"]	D
2247	1197	10	["يسجد مع الإمام", "يخرج من المسجد", "يركع بدل السجود", "يبقى واقفًا"]	A
2247	1198	2	["تسجد سجدةً واحدةً بنية سجود التلاوة", "تقوم ثم تصلي ركعتين", "لا يجوز لها السجود إلا داخل الصلاة", "تصلي أربع ركعات"]	A
2247	1200	4	["الصَّلَاةُ فِي الْمَسْجِدِ", "الْأَكْلُ وَالشُّرْبُ", "الْإِمْسَاكُ عَنِ الشَّيْءِ", "السَّفَرُ"]	C
2247	1201	9	["صِيَامُ عَاشُورَاءَ", "صِيَامُ يَوْمِ الْجُمُعَةِ", "صِيَامُ رَمَضَانَ", "صِيَامُ دَاوُدَ"]	C
2247	1203	6	["الْعَاشِرِ", "السَّابِعِ", "التَّاسِعِ", "الثَّامِنِ"]	C
2251	1195	6	["يجلس للاستراحة", "يقطع القراءة ولا يفعل شيئًا", "يسجد سجود التلاوة", "يركع مباشرةً"]	C
2251	1196	3	["نسيان التشهد", "قراءة أو سماع آيةٍ من آيات السجدة", "سماع خبرٍ سارّ", "الانتهاء من الصلاة"]	B
2251	1197	8	["يسجد مع الإمام", "يخرج من المسجد", "يبقى واقفًا", "يركع بدل السجود"]	A
2251	1198	10	["لا يجوز لها السجود إلا داخل الصلاة", "تقوم ثم تصلي ركعتين", "تصلي أربع ركعات", "تسجد سجدةً واحدةً بنية سجود التلاوة"]	D
2251	1199	1	["هو سجود خاص بصلاة الجمعة", "هو سجود واحد عند آية السجدة", "هو سجود واجب بعد كل سورة", "هو أربع سجدات متتابعة"]	B
2251	1201	7	["صِيَامُ دَاوُدَ", "صِيَامُ يَوْمِ الْجُمُعَةِ", "صِيَامُ رَمَضَانَ", "صِيَامُ عَاشُورَاءَ"]	C
2251	1203	9	["الْعَاشِرِ", "السَّابِعِ", "الثَّامِنِ", "التَّاسِعِ"]	D
2251	1204	5	["صِيَامُ كُلِّ يَوْمٍ", "صِيَامُ يَوْمٍ وَإِفْطَارُ يَوْمٍ", "صِيَامُ يَوْمَيِ الِاثْنَيْنِ وَالْخَمِيسِ فَقَطْ", "صِيَامُ ثَلَاثَةِ أَيَّامٍ كُلَّ شَهْرٍ"]	B
2229	253	7	["خَمْسُ حَرَكَاتٍ", "سِتُّ حَرَكَاتٍ", "أَرْبَعُ حَرَكَاتٍ", "حَرَكَتَانِ"]	D
2229	254	9	["مَالَهُ أَخْلَدَهُ", "إِنَّهُ أَنْزَلَهُ", "فِيهِ هُدًى", "لَهُ أَجْرٌ"]	C
2229	255	4	["بَعْدَ هَاءِ الضَّمِيرِ حَرْفٌ مُتَحَرِّكٌ", "بَعْدَ هَاءِ الضَّمِيرِ هَمْزَةُ قَطْعٍ", "قَبْلَ هَاءِ الضَّمِيرِ هَمْزَةٌ", "بَعْدَ هَاءِ الضَّمِيرِ سَاكِنٌ"]	B
2229	260	5	["أَنَّ الْمَالَ أَهَمُّ مِنَ الْعَمَلِ", "أَنَّ الْخَيْرَ لِلْأَقْوِيَاءِ فَقَطْ", "أَنَّ كُلَّ عَمَلٍ مَحْسُوبٌ", "أَنَّ الْعَمَلَ الْقَلِيلَ لَا قِيمَةَ لَهُ"]	C
2229	261	2	["الْقِيَامَةُ", "الْحَيَاةُ", "الْجَنَّةُ", "الدُّنْيَا"]	A
2229	262	10	["كَالْجِبَالِ", "كَالْبُحُورِ", "كَالْفَرَاشِ الْمَبْثُوثِ", "كَالنُّجُومِ"]	C
2229	263	8	["كَالذَّهَبِ", "كَالْحَجَرِ", "كَالْحَدِيدِ", "كَالْعِهْنِ الْمَنْفُوشِ"]	D
2263	276	4	["ثَلَاثَةُ أَقْلَامٍ", "ثَلَاثٌ أَقْلَامٍ", "ثَلَاثَةً أَقْلَامٍ", "ثَلَاثُ أَقْلَامٍ"]	A
2263	277	1	["سَبْعَةً", "سَبْعَةُ", "سَبْعُ", "سَبْعُونَ"]	B
2263	278	10	["هَذِهِ - تَحْتَ", "هَذَا - أَمَامَ", "تِلْكَ - عَلَى", "ذَلِكَ - بَيْنَ"]	C
2263	280	7	["عَلَى", "إِلَى", "مِنْ", "فِي"]	A
2263	281	6	["أَيْنَ", "مَا", "مَنْ", "كَيْفَ"]	A
2263	282	8	["هُوَ", "أَنْتِ", "هِيَ", "نَحْنُ"]	A
2241	1195	2	["يسجد سجود التلاوة", "يركع مباشرةً", "يجلس للاستراحة", "يقطع القراءة ولا يفعل شيئًا"]	A
2241	1202	3	["مُبَاحٌ فَقَطْ", "مَكْرُوهٌ", "مَنْدُوبٌ فَقَطْ", "وَاجِبٌ"]	D
2241	1199	4	["هو أربع سجدات متتابعة", "هو سجود خاص بصلاة الجمعة", "هو سجود واجب بعد كل سورة", "هو سجود واحد عند آية السجدة"]	D
2241	1194	5	["لأنها حصلت على نعمة تسرها", "لأنها قرأت آية سجدة", "لأنها تريد زيادة عدد ركعات الصلاة", "لأنها نسيت ركعة"]	A
2241	1201	6	["صِيَامُ رَمَضَانَ", "صِيَامُ يَوْمِ الْجُمُعَةِ", "صِيَامُ دَاوُدَ", "صِيَامُ عَاشُورَاءَ"]	A
2241	1193	7	["نية سجود السهو", "نية سجود الشكر", "نية سجود التلاوة", "نية صلاة الجنازة"]	B
2241	1203	8	["الْعَاشِرِ", "السَّابِعِ", "الثَّامِنِ", "التَّاسِعِ"]	D
2241	1198	9	["تصلي أربع ركعات", "تسجد سجدةً واحدةً بنية سجود التلاوة", "تقوم ثم تصلي ركعتين", "لا يجوز لها السجود إلا داخل الصلاة"]	B
2241	1197	10	["يخرج من المسجد", "يسجد مع الإمام", "يبقى واقفًا", "يركع بدل السجود"]	B
2228	263	3	["كَالْحَجَرِ", "كَالْحَدِيدِ", "كَالذَّهَبِ", "كَالْعِهْنِ الْمَنْفُوشِ"]	D
2228	262	4	["كَالنُّجُومِ", "كَالْجِبَالِ", "كَالْبُحُورِ", "كَالْفَرَاشِ الْمَبْثُوثِ"]	D
2228	253	5	["أَرْبَعُ حَرَكَاتٍ", "حَرَكَتَانِ", "سِتُّ حَرَكَاتٍ", "خَمْسُ حَرَكَاتٍ"]	B
2228	255	6	["بَعْدَ هَاءِ الضَّمِيرِ هَمْزَةُ قَطْعٍ", "بَعْدَ هَاءِ الضَّمِيرِ سَاكِنٌ", "قَبْلَ هَاءِ الضَّمِيرِ هَمْزَةٌ", "بَعْدَ هَاءِ الضَّمِيرِ حَرْفٌ مُتَحَرِّكٌ"]	A
2228	252	7	["لَهُ", "آمَنُوا", "عَلَيْهِ", "فِيهِ"]	B
2228	251	8	["سِتُّ حَرَكَاتٍ", "خَمْسُ حَرَكَاتٍ", "أَرْبَعُ حَرَكَاتٍ", "حَرَكَتَانِ"]	D
2228	254	9	["لَهُ أَجْرٌ", "فِيهِ هُدًى", "إِنَّهُ أَنْزَلَهُ", "مَالَهُ أَخْلَدَهُ"]	B
2228	258	10	["لِأَنَّ رَبَّهَا أَوْحَى لَهَا", "لِأَنَّهَا تُحِبُّ النَّاسَ", "لِأَنَّ الْمَلَائِكَةَ أَمَرُوهَا", "لِأَنَّ النَّاسَ أَمَرُوهَا"]	A
2234	1198	3	["لا يجوز لها السجود إلا داخل الصلاة", "تصلي أربع ركعات", "تقوم ثم تصلي ركعتين", "تسجد سجدةً واحدةً بنية سجود التلاوة"]	D
2265	298	10	["توسيع مدى الأسفار", "طلب العلم", "ترتبط الأقاليم الإسلامية", "لتحقق سند الحديث"]	A
2234	1192	4	["كلاهما بسبب نسيان الصلاة", "سجود الشكر لا علاقة له بالنعمة", "سجود التلاوة بسبب آية السجدة، وسجود الشكر بسبب نعمة أو اندفاع نقمة", "سجود التلاوة يكون عند حدوث المصيبة فقط"]	C
2234	1195	5	["يجلس للاستراحة", "يركع مباشرةً", "يقطع القراءة ولا يفعل شيئًا", "يسجد سجود التلاوة"]	D
2234	1199	6	["هو سجود واحد عند آية السجدة", "هو سجود واجب بعد كل سورة", "هو سجود خاص بصلاة الجمعة", "هو أربع سجدات متتابعة"]	A
2234	1191	8	["سجود السهو", "سجود التلاوة", "سجود الصلاة", "سجود الشكر"]	D
2234	1203	9	["السَّابِعِ", "الْعَاشِرِ", "الثَّامِنِ", "التَّاسِعِ"]	D
2234	1204	10	["صِيَامُ ثَلَاثَةِ أَيَّامٍ كُلَّ شَهْرٍ", "صِيَامُ يَوْمَيِ الِاثْنَيْنِ وَالْخَمِيسِ فَقَطْ", "صِيَامُ يَوْمٍ وَإِفْطَارُ يَوْمٍ", "صِيَامُ كُلِّ يَوْمٍ"]	C
2238	1196	3	["الانتهاء من الصلاة", "سماع خبرٍ سارّ", "نسيان التشهد", "قراءة أو سماع آيةٍ من آيات السجدة"]	D
2238	1199	4	["هو سجود واحد عند آية السجدة", "هو سجود خاص بصلاة الجمعة", "هو سجود واجب بعد كل سورة", "هو أربع سجدات متتابعة"]	A
2238	1202	5	["مُبَاحٌ فَقَطْ", "مَنْدُوبٌ فَقَطْ", "وَاجِبٌ", "مَكْرُوهٌ"]	C
2238	1192	6	["كلاهما بسبب نسيان الصلاة", "سجود التلاوة بسبب آية السجدة، وسجود الشكر بسبب نعمة أو اندفاع نقمة", "سجود الشكر لا علاقة له بالنعمة", "سجود التلاوة يكون عند حدوث المصيبة فقط"]	B
2238	1200	7	["السَّفَرُ", "الْإِمْسَاكُ عَنِ الشَّيْءِ", "الْأَكْلُ وَالشُّرْبُ", "الصَّلَاةُ فِي الْمَسْجِدِ"]	B
2238	1201	8	["صِيَامُ يَوْمِ الْجُمُعَةِ", "صِيَامُ رَمَضَانَ", "صِيَامُ عَاشُورَاءَ", "صِيَامُ دَاوُدَ"]	B
2238	1193	9	["نية سجود التلاوة", "نية سجود السهو", "نية سجود الشكر", "نية صلاة الجنازة"]	C
2238	1197	10	["يسجد مع الإمام", "يخرج من المسجد", "يركع بدل السجود", "يبقى واقفًا"]	A
2226	254	3	["إِنَّهُ أَنْزَلَهُ", "لَهُ أَجْرٌ", "مَالَهُ أَخْلَدَهُ", "فِيهِ هُدًى"]	D
2226	251	4	["أَرْبَعُ حَرَكَاتٍ", "سِتُّ حَرَكَاتٍ", "خَمْسُ حَرَكَاتٍ", "حَرَكَتَانِ"]	D
2226	262	5	["كَالْبُحُورِ", "كَالْفَرَاشِ الْمَبْثُوثِ", "كَالْجِبَالِ", "كَالنُّجُومِ"]	B
2226	259	6	["جَزَاءَهُ", "شُهْرَةً", "مَالًا", "عَذَابًا"]	A
2226	250	7	["سِتُّ حَرَكَاتٍ", "حَرَكَتَانِ", "ثَلَاثُ حَرَكَاتٍ", "أَرْبَعُ حَرَكَاتٍ"]	A
2226	263	8	["كَالذَّهَبِ", "كَالْعِهْنِ الْمَنْفُوشِ", "كَالْحَجَرِ", "كَالْحَدِيدِ"]	B
2226	252	9	["آمَنُوا", "فِيهِ", "عَلَيْهِ", "لَهُ"]	A
2226	253	10	["حَرَكَتَانِ", "أَرْبَعُ حَرَكَاتٍ", "خَمْسُ حَرَكَاتٍ", "سِتُّ حَرَكَاتٍ"]	A
2222	255	3	["بَعْدَ هَاءِ الضَّمِيرِ سَاكِنٌ", "بَعْدَ هَاءِ الضَّمِيرِ حَرْفٌ مُتَحَرِّكٌ", "قَبْلَ هَاءِ الضَّمِيرِ هَمْزَةٌ", "بَعْدَ هَاءِ الضَّمِيرِ هَمْزَةُ قَطْعٍ"]	D
2222	250	4	["أَرْبَعُ حَرَكَاتٍ", "سِتُّ حَرَكَاتٍ", "حَرَكَتَانِ", "ثَلَاثُ حَرَكَاتٍ"]	B
2222	260	5	["أَنَّ الْعَمَلَ الْقَلِيلَ لَا قِيمَةَ لَهُ", "أَنَّ الْمَالَ أَهَمُّ مِنَ الْعَمَلِ", "أَنَّ كُلَّ عَمَلٍ مَحْسُوبٌ", "أَنَّ الْخَيْرَ لِلْأَقْوِيَاءِ فَقَطْ"]	C
2222	256	7	["صِلَةٌ كُبْرَى", "صِلَةٌ صُغْرَى", "مَدُّ بَدَلٍ", "مَدُّ فَرْقٍ"]	A
2222	249	8	["أَرْبَعَةُ مَوَاضِعَ", "ثَلَاثَةُ مَوَاضِعَ", "مَوْضِعَانِ", "مَوْضِعٌ وَاحِدٌ"]	C
2222	259	9	["جَزَاءَهُ", "مَالًا", "شُهْرَةً", "عَذَابًا"]	A
2222	254	10	["إِنَّهُ أَنْزَلَهُ", "لَهُ أَجْرٌ", "فِيهِ هُدًى", "مَالَهُ أَخْلَدَهُ"]	C
2265	299	9	["المعاشرة الحرية", "المعاشرة المقتصرة", "المعاشرة المعرفة", "المعاشرة النافعة"]	A
2265	301	2	["النافعة", "الخالدة", "الجيدة", "السيئة"]	D
2265	303	7	["المدارس", "الأمكنة", "الإدارات", "البيوت"]	A
\.


--
-- Data for Name: exam_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exam_sessions (id, exam_id, student_id, status, violation_count, score, started_at, finished_at, max_score, last_ping_at, final_score) FROM stdin;
2226	71	1975	locked	2	\N	2026-10-29 06:28:21.016071+00	2026-10-29 06:39:23.084241+00	\N	2026-10-29 06:39:21.229766+00	\N
2222	71	1971	completed	0	\N	2026-10-29 06:28:28.555638+00	2026-10-29 06:32:36.544402+00	\N	2026-10-29 06:32:33.654498+00	\N
2251	71	2000	completed	0	\N	2026-10-29 06:27:47.362057+00	2026-10-29 06:37:07.088604+00	\N	2026-10-29 06:37:03.095513+00	\N
2261	71	2010	completed	0	\N	2026-10-29 06:27:40.534027+00	2026-10-29 06:36:26.972291+00	\N	2026-10-29 06:36:24.060679+00	\N
2243	71	1992	completed	0	\N	2026-10-29 06:27:09.560117+00	2026-10-29 06:34:09.64856+00	\N	2026-10-29 06:34:06.635371+00	\N
2238	71	1987	completed	0	\N	2026-10-29 06:28:18.89836+00	2026-10-29 06:39:27.465209+00	\N	2026-10-29 06:39:23.984244+00	\N
2265	72	2015	in_progress	0	\N	2026-10-29 07:06:04.281659+00	\N	\N	2026-10-29 07:13:14.431148+00	\N
2221	71	1970	not_started	0	\N	\N	\N	\N	\N	\N
2223	71	1972	not_started	0	\N	\N	\N	\N	\N	\N
2225	71	1974	not_started	0	\N	\N	\N	\N	\N	\N
2224	71	1973	completed	0	\N	2026-10-29 06:26:57.794452+00	2026-10-29 06:35:04.39068+00	\N	2026-10-29 06:35:02.87353+00	\N
2227	71	1976	not_started	0	\N	\N	\N	\N	\N	\N
2231	71	1980	not_started	0	\N	\N	\N	\N	\N	\N
2232	71	1981	not_started	0	\N	\N	\N	\N	\N	\N
2234	71	1983	completed	0	\N	2026-10-29 06:28:10.507166+00	2026-10-29 06:34:39.572169+00	\N	2026-10-29 06:34:35.597466+00	\N
2253	71	2002	completed	0	\N	2026-10-29 06:27:31.497071+00	2026-10-29 06:37:36.722078+00	\N	2026-10-29 06:37:36.592519+00	\N
2235	71	1984	not_started	0	\N	\N	\N	\N	\N	\N
2236	71	1985	not_started	0	\N	\N	\N	\N	\N	\N
2237	71	1986	not_started	0	\N	\N	\N	\N	\N	\N
2239	71	1988	not_started	0	\N	\N	\N	\N	\N	\N
2240	71	1989	not_started	0	\N	\N	\N	\N	\N	\N
2242	71	1991	not_started	0	\N	\N	\N	\N	\N	\N
2244	71	1993	not_started	0	\N	\N	\N	\N	\N	\N
2245	71	1994	not_started	0	\N	\N	\N	\N	\N	\N
2246	71	1995	not_started	0	\N	\N	\N	\N	\N	\N
2248	71	1997	not_started	0	\N	\N	\N	\N	\N	\N
2249	71	1998	not_started	0	\N	\N	\N	\N	\N	\N
2250	71	1999	not_started	0	\N	\N	\N	\N	\N	\N
2247	71	1996	completed	0	\N	2026-10-29 06:27:43.598796+00	2026-10-29 06:38:08.094198+00	\N	2026-10-29 06:38:07.832786+00	\N
2255	71	2004	not_started	0	\N	\N	\N	\N	\N	\N
2256	71	2005	not_started	0	\N	\N	\N	\N	\N	\N
2257	71	2006	not_started	0	\N	\N	\N	\N	\N	\N
2258	71	2007	not_started	0	\N	\N	\N	\N	\N	\N
2259	71	2008	not_started	0	\N	\N	\N	\N	\N	\N
2233	71	1982	completed	0	\N	2026-10-29 06:27:21.158226+00	2026-10-29 06:30:24.033949+00	\N	2026-10-29 06:30:21.238894+00	\N
2260	71	2009	not_started	0	\N	\N	\N	\N	\N	\N
2230	71	1979	completed	0	\N	2026-10-29 06:27:26.968006+00	2026-10-29 06:35:09.235922+00	\N	2026-10-29 06:35:09.02697+00	\N
2229	71	1978	completed	0	\N	2026-10-29 06:27:50.431537+00	2026-10-29 06:35:20.020011+00	\N	2026-10-29 06:35:16.537667+00	\N
2228	71	1977	completed	0	\N	2026-10-29 06:27:55.148436+00	2026-10-29 06:33:40.823823+00	\N	2026-10-29 06:33:36.422276+00	\N
2252	71	2001	completed	0	\N	2026-10-29 06:26:59.70013+00	2026-10-29 06:39:52.375028+00	\N	2026-10-29 06:39:50.250801+00	\N
2263	71	2012	completed	0	\N	2026-10-29 06:27:50.576223+00	2026-10-29 06:30:58.580457+00	\N	2026-10-29 06:30:57.443327+00	\N
2262	71	2011	completed	0	\N	2026-10-29 06:27:41.537057+00	2026-10-29 06:41:08.739063+00	\N	2026-10-29 06:41:06.062185+00	\N
2264	71	2013	completed	0	\N	2026-10-29 06:27:18.838918+00	2026-10-29 06:46:51.094522+00	\N	2026-10-29 06:46:49.180659+00	\N
2254	71	2003	completed	0	\N	2026-10-29 06:27:13.370821+00	2026-10-29 06:39:57.928445+00	\N	2026-10-29 06:39:53.44008+00	\N
2241	71	1990	completed	0	\N	2026-10-29 06:27:53.058964+00	2026-10-29 06:35:09.395445+00	\N	2026-10-29 06:35:08.144969+00	92.00
\.


--
-- Data for Name: exams; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exams (id, title, bank_id, class_name, mc_count, essay_count, duration_minutes, status, created_by, created_at, entry_pin_hash, entry_pin_updated_at, entry_pin_expires_at, entry_pin_issued_by) FROM stdin;
71	hari ke 2	147	KELAS 1 RUANG 1, KELAS 2 RUANG 1, KELAS 3 RUANG 1	10	3	20	completed	1	2026-10-29 04:52:18.088227+00	$2b$10$VShnwf.rLeQn.B9VcwiVpObzz6anNNP1CFNssACS8l2h7kzc80GZ2	2026-10-29 06:26:25.633166+00	2026-10-29 06:41:25.633166+00	1
72	uji gambar	149	KELAS 6 RUANG 1	10	3	20	completed	1	2026-10-29 07:05:02.243399+00	$2b$10$a0GFyAu9Rz01a0RrxBU2uOVv4bLbGaescFctTQNN7xrfNLdFcSX2i	2026-10-29 07:05:43.896909+00	2026-10-29 07:20:43.896909+00	1
\.


--
-- Data for Name: question_banks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.question_banks (id, subject_id, grade, topic, created_by, created_at) FROM stdin;
170	473	6	المضاف والمضاف إليه الأسماء الخمسة علامات التأنيث النكرة والمعرفة	1	2026-10-26 06:45:36.070193+00
171	475	6	خُطْبَةُ الرَّسُولِ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ (فِي طَرِيقِ السَّعَادَةِ)    من أحاديث الرسول صلى الله عليه وسلم (صفة المؤمن الكامل)    مِنْ أَشْعَارِ الأَخْوَةِ الأَدَوِيَّةِ	1	2026-10-26 06:49:52.457299+00
172	475	1	باب الجد والاجتهاد باب الحرص على انتهاز الوقت	1	2026-10-26 06:50:14.827075+00
173	476	6	الخلافة فى الإسلام     الجهاد    مصادالأحكام الإسلامية     الإجتهاد   الأحكام الشرعية هى تعريف من    الأمر و النهى   العام و الخاص	1	2026-10-26 06:51:33.346875+00
174	475	2	1\tالحث على التعلم 2\tالشرف بالأدب 3\tقال الإمام الشافعي رضي الله عنه 4\tأدب المجالسة	1	2026-10-26 06:52:21.240579+00
175	476	1	Bersuci  Sholat fardlu   Sholat sunah   Dzikir dan Doa	1	2026-10-26 06:53:22.791255+00
143	470	4	PENGERTIAN Al QURAN   KEASLIAN AL QURAN TUGAS MANUSIA SEBAGAI HAMBA ALLAH DAN KHALIFAH	1	2026-10-19 04:22:57.915398+00
144	470	5	LARANGAN BERZINA  TOLERANSI DAN ADAB DALAM MASYARAKAT  KEWAJIBAN BELAJAR DAN MENYEBARKANNYA	1	2026-10-19 04:34:25.759833+00
145	470	6	الامر برحم الضعفاء    الصبر على الاختبار والابتلاء     الحفاظ على استمررية الحياة	1	2026-10-19 04:53:23.616857+00
146	470	2	المد & سورة الشرح	1	2026-10-19 05:00:56.071431+00
147	470	3	مَدُّ الْفَرْقِ   مَدُّ الْبَدَلِ    مَدُّ الصِّلَةِ الصُّغْرَى   مَدُّ الصِّلَةِ الْكُبْرَى     سُورَةُ الزَّلْزَلَةِ      سُورَةُ الْقَارِعَةِ	1	2026-10-19 05:06:06.645887+00
148	471	1	BAB  1 BAB 2 BAB 3	1	2026-10-19 07:05:30.270851+00
149	471	6	باب الأول	1	2026-10-19 07:24:39.888011+00
150	471	2	BAB 1 BAB 2 BAB 3	1	2026-10-19 07:28:33.206429+00
151	471	5	امل المهارقين      النظافة في الإسلام      المحافظة علي الصحة	1	2026-10-19 08:04:29.077808+00
152	471	4	البيانات الشخصية,المرافق العامة في المدرسة,الحياة في الأسرة	1	2026-10-20 07:02:18.807679+00
153	471	3	رأس السنة الهجرية الحفل يمولد الرسول نزول القران والعيدان	1	2026-10-20 07:17:16.669944+00
155	472	2	الحريق    المطر    الاد و الفعر	1	2026-10-20 07:22:07.273965+00
156	472	1	أَيَّامُ الأُسْبُوْعِ   الشُّهُوْرُ الهِجْرِيَّةِ  الشُّهُوْرُ المِيْلَادِيَّةِ  اليَدُ  الرَّأْسُ  مَنَافِعُ أَعْضَاءِ الْجِسْمِ     الْكَلِمَاتُ وَأَضْدَادُهَا  الصِّفَاتُ وَأَضْدَادُهَا   الدِّيْكُ   القِطَارُ  مَلَابِسُ الْجِسْمِ	1	2026-10-20 07:25:55.287625+00
157	472	3	الحريق     المطر     الاد و الفعر	1	2026-10-20 07:27:56.591697+00
158	472	6	أجواد العرب في الإسلام  ملوك المصريين القدماء كذب المنجمون ولو صدقوا  الرياضة البدنية جزاء الخيانة  إسراف المصريين القدماء	1	2026-10-20 07:29:32.25262+00
159	472	4	Bab 1, Bab 2, Bab 3	1	2026-10-20 07:31:21.137099+00
160	472	5	مَسْجِدُ قَلْعَةِ الْقَاهِرَةِ     نَهْضَةُ اللُّغَةِ     كِسْرَى وَالْفَلَّاحُ الشَّيْخُ     التَّهَاوُنُ     الْجَامِعُ الْأَزْهَرُ    الرَّئِيسُ ابْنُ سِينَا	1	2026-10-20 07:38:26.590316+00
161	473	2	ISMUN FAAIL MUBTADA KHOBAR	1	2026-10-20 07:40:17.585081+00
162	473	3	نصب الفعل المضارع  جزم الفعل المضارع	1	2026-10-20 07:42:10.92841+00
164	473	5	Bab 1, Bab 2, bab 3	1	2026-10-20 07:53:26.036921+00
166	473	4	الجُمْلَةُ المُفِيدَةُ أَجْزَاءُ الجُمْلَةِ الفِعْلُ المَاضِي الفِعْلُ المُضَارِعُ فِعْلُ الأَمْرِ الفَاعِلُ المَفْعُولُ بِهِ المُبْتَدَأُ الخَبَرُ الجُمْلَةُ الفِعْلِيَّةُ الجُمْلَةُ الإِسْمِيَّةُ جَزْمُ الفِعْلِ المُضَارِعِ نَصْبُ الفِعْلِ المُضَارِعِ إِنَّ وَأَخَوَاتُهَا كَانَ وَأَخَوَاتُهَا	1	2026-10-22 02:09:37.948014+00
167	474	6	الفعل الثلاثي الفعل مزيد فعل الرباعي	1	2026-10-26 06:35:54.467454+00
168	474	2	Bab 1 Bab 2 Bab 3	1	2026-10-26 06:41:07.452329+00
169	474	3	الصَّرْفُ لُغَةً الصَّرْفُ اصْطِلَاحًا وَاضِعُهٌ مِنْ عِلْمِ الصَّرْفُ مَوْضُوْعُهُ  مِنْ عِلْمِ الصَّرْفُ الصِّيْغَةُ تَحْدِيدُ الْفِعْلِ، وَالْفَاعِلِ، وَالْمَفْعُولِ بِهِ، وَالأَسْمَاءِ الأُخْرَى. "الفِعْلُ" تَحْدِيدُ الْفِعْلِ، وَالْفَاعِلِ، وَالْمَفْعُولِ بِهِ، وَالأَسْمَاءِ الأُخْرَى.	1	2026-10-26 06:43:50.578932+00
176	477	2	Bab 1 Bab 2 Bab 3	1	2026-10-26 06:55:15.006358+00
177	477	6	اسماء وصفات  تشبه صفات المخلوقات صدق التوكل	1	2026-10-26 06:55:54.049897+00
178	477	3	Bab 1 Bab 2 Bab 3	1	2026-10-26 06:55:57.301298+00
179	478	6	السنة على مشروعية  الاسراف السراء نعمتان	1	2026-10-26 07:03:31.195207+00
180	479	6	الدولة الأموية الإسلامية في الأندلس      التجديد في الإسلان    إنتشار الإسلام في الأندلس	1	2026-10-26 07:05:41.777614+00
181	479	2	انهيار الدولة الاموية واسباب سقوطها     اهم خلفاء الدولة العباسية     التعريف بيت الحكمة   علماء الكتب الستة	1	2026-10-26 07:10:24.315277+00
182	478	2	الباب الأول : تعاونوا على البر والتقوى       الباب الثاني  : كافل اليتيم في الجنة        الباب الثالث : التحذير من الظلم والشح        الباب الرابع : كل معروف صدقة	1	2026-10-26 07:10:35.1937+00
183	479	3	دخل الاسلام في اندونيسيا          تاريخ المما لك الاسلا مية في جاوة و سومطرة و سولا ويسي          رجال دعوة في اندونيسيا	1	2026-10-26 07:11:58.871077+00
184	474	5	اسْمُ الْفَاعِلِ,فِعْلُ النَّهْيِ اسْمُ الْمَكَانِ/الزَّمَانِ	1	2026-10-26 07:36:18.446895+00
185	474	3	الصَّرْفُ لُغَةً  الصَّرْفُ اصْطِلَاحًا  الصِّيْغَةُ  تَحْدِيدُ الْفِعْلِ، وَالْفَاعِلِ، وَالْمَفْعُولِ بِهِ، وَالأَسْمَاءِ الأُخْرَى.  "الفِعْلُ"  التَّصْرِيفُ اللُّغَوِيُّ الفِعْلُ الْمَاضِي	1	2026-10-26 08:01:28.35676+00
186	475	4	لحَثُّ عَلَى التَّعَلُّمِ, أَدَبُ الْمُجَالَسَةِ	1	2026-10-26 08:02:34.513216+00
187	474	4	Ta'rif  shighoh  tashrif  tsulatsi mujarrad  ruba'i mujarrad	1	2026-10-26 08:03:37.047242+00
188	475	3	أوصى علي بن أبي طالب لابنه الحسن المتوفى سنة 40 ه  لاابي العتاهية المتوفى سنة 211 ه  لمحمود سامي باشا المتوفى سنة 1366 ه	1	2026-10-26 08:07:13.604031+00
189	475	5	من ديوان الشاعر محمود سامي البارودي المتوفى سنة 1332 ه من أمثال الجاهلية النظمية من شعر حفنى ناصف بك المتوفى سنة 1919 م	1	2026-10-26 08:08:28.431608+00
190	476	4	أحكام الجنائز الزكاه الاضحىة العقيقه	1	2026-10-26 08:11:52.328014+00
191	476	3	الذبح  العقيقة  الأضحية  البيع  الربا  البيع والقراض والربا  الرِّبَا  الْعَارِيَّةُ	1	2026-10-26 08:13:20.016219+00
192	476	5	hudud dan jinayah	1	2026-10-26 08:13:28.787718+00
194	476	2	سجود التلاوة سجود التلاوة والشكر الصيام	1	2026-10-26 08:15:49.081214+00
197	478	4	معنى الحديث، والسنة والخبر والآثر والحديث القدسي     الباب الثاني : عناصر الحديث      الباب الثالث: أنواع السنة	1	2026-10-26 08:22:18.96254+00
198	477	4	Bab 1,  Bab 2, Bab 3	1	2026-10-26 08:24:03.621863+00
199	477	5	تعريف علم الكلام   فائدة معرفة علم الكلام   موضوع علم الكلام  الخوارج   المرجئة  الشيعة   الجبرية والقدرية   المعتزلة	1	2026-10-26 08:27:07.343269+00
200	478	5	الباب الأول : بر الوالدين والأساتذ، واحترامهم        الباب الثاني  : المجاهدة وحسن الظن والأخوة       الباب الثالث : حطر الاختلاط والأفعال الفاحشة      الباب الرابع : التسامح والأخلاق في المعاملة	1	2026-10-26 08:30:34.56309+00
201	478	3	الباب الأول : الحفاظ على استدامة البيئة الطيبة   الباب الثانى : الأخوة الإسلامية وحقوق المسلم	1	2026-10-26 08:31:55.236044+00
202	479	5	الحضارة الإسلامية في الدولة الإسلامية          العصر الذهبي للدولة الأموية          سقوط الدولة الأموية	1	2026-10-26 08:32:28.929168+00
203	479	4	العرب قبل الاسلام   مولد الرسول الله صلي الله عليه وسلم   دعوة رسولالله في مكة	1	2026-10-26 08:33:25.557553+00
205	482	3	NUZULUL QUR'AN DAN TAHUN KELAHIRAN RASULULLAH	1	2026-10-28 05:45:18.206926+00
\.


--
-- Data for Name: question_media; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.question_media (id, question_id, file_key, mime_type, file_size, alt_text, created_at) FROM stdin;
3	289	3586edb0-41c7-410e-a250-623ce213e2ff.png	image/png	59718	1	2026-10-19 07:24:40.127192+00
4	290	658d9cbd-2da6-4b72-92e1-ae69e0fb7797.png	image/png	59718	2	2026-10-19 07:24:40.229658+00
5	291	dbc1d0c1-1a39-4c7b-bc2b-9c6f52a331f9.png	image/png	59718	3	2026-10-19 07:24:40.342852+00
6	292	62a647d2-cb67-4679-8145-18bc6bb481ab.png	image/png	59718	4	2026-10-19 07:24:40.46368+00
7	293	2ec87266-2058-4023-8d28-c24f27a12793.png	image/png	59718	5	2026-10-19 07:24:40.608258+00
8	294	6eef81e1-11ea-4504-9356-ef726cb7c5c3.png	image/png	37744	6	2026-10-19 07:24:40.854368+00
9	295	96a54145-c92f-42af-8340-dd754501dcda.png	image/png	37744	7	2026-10-19 07:24:40.940107+00
10	296	4df62263-1c2a-41c8-bd1a-d0eb8ae7f03c.png	image/png	37744	8	2026-10-19 07:24:41.020907+00
11	297	cd9aa471-4ebf-402f-af9e-067b484e3c36.png	image/png	37744	9	2026-10-19 07:24:41.085274+00
12	298	c78ce54e-d9e9-4212-b9b0-7266790bb997.png	image/png	37744	10	2026-10-19 07:24:41.15103+00
13	299	a7aecda7-2263-4652-b438-5e851544bb96.png	image/png	45632	11	2026-10-19 07:24:41.262896+00
14	300	c2f655b1-877c-4607-9847-b3fcbd76f448.png	image/png	45632	12	2026-10-19 07:24:41.326968+00
15	301	3d9b51d9-92e6-412d-9901-447fca3a55b6.png	image/png	45632	13	2026-10-19 07:24:41.424713+00
16	302	25d73140-812d-4cf0-819d-7bc52a1f8115.png	image/png	45632	14	2026-10-19 07:24:41.490806+00
17	303	0004585c-8d93-4632-8fe2-ea3218b4a74f.png	image/png	45632	15	2026-10-19 07:24:41.589383+00
18	329	496a673a-d574-4ca5-a55f-6d645e68573f.jpg	image/jpeg	16806	1	2026-10-19 08:04:29.163067+00
19	330	9724baa8-98af-4f33-a772-45270a9b0972.png	image/png	21658	2	2026-10-19 08:04:29.281869+00
20	331	bad46a84-49a5-430b-966e-c354d254e356.png	image/png	21658	3	2026-10-19 08:04:29.347086+00
21	332	6ec71390-7a70-493a-a33d-4c22780e3d89.png	image/png	21658	4	2026-10-19 08:04:29.445139+00
22	333	0f1087f4-4773-4d04-bdaa-27c9aa169b4d.png	image/png	21658	5	2026-10-19 08:04:29.502336+00
23	334	0b368daf-0dbd-43a9-9019-f05e8700d6ba.png	image/png	30565	6	2026-10-19 08:04:29.607374+00
24	335	5fc62215-15fa-4b5e-be0e-a9d9580fb9fb.png	image/png	30565	7	2026-10-19 08:04:29.653889+00
25	336	a9625930-4b47-4b49-be33-8318a5f100dd.png	image/png	30565	8	2026-10-19 08:04:29.714362+00
26	337	b7f545f6-3372-4489-af3e-5fe4144347ba.png	image/png	30565	9	2026-10-19 08:04:29.791595+00
27	338	a809840e-6482-4887-ae60-39359fc8ee80.png	image/png	30565	10	2026-10-19 08:04:29.850963+00
28	339	822c3c19-5c98-432f-b09f-950e5a492286.png	image/png	17138	11	2026-10-19 08:04:29.90292+00
29	340	4355c1c8-d69b-46d8-8a6e-3e374a285092.png	image/png	17138	12	2026-10-19 08:04:30.011494+00
30	341	db9e6299-9d68-4cfc-a2ed-26b9fa9ef499.png	image/png	17138	13	2026-10-19 08:04:30.103364+00
31	342	2bc4eafa-1b15-4733-a187-bbd38fc5f67c.png	image/png	17138	14	2026-10-19 08:04:30.20046+00
32	343	2ccc53c7-2eaa-404c-a9a5-ed615086df4c.png	image/png	17138	15	2026-10-19 08:04:30.261491+00
33	344	6ec740b3-44c6-4bef-902a-d4c1a446599b.png	image/png	27470	1	2026-10-19 08:04:30.3918+00
34	345	50ae0abd-0f5b-4f15-a87a-0579d08a1e84.png	image/png	27470	2	2026-10-19 08:04:30.458064+00
35	346	bc86d881-7f0b-4603-809f-85a532f34bbf.png	image/png	27470	3	2026-10-19 08:04:30.52584+00
36	347	ae157ec0-5a64-4aa4-9607-85bd3b9ca158.png	image/png	27470	4	2026-10-19 08:04:30.567334+00
37	348	485643c5-5a60-4c58-b213-09da3c422e98.png	image/png	27470	5	2026-10-19 08:04:30.643608+00
39	350	dbae3515-252c-4cbf-add1-683882f7478f.png	image/png	37674	2	2026-10-20 07:02:19.04927+00
40	351	92bca5e2-3f80-4168-841f-16720133d165.png	image/png	37674	3	2026-10-20 07:02:19.254005+00
41	352	1cdd6fca-c439-4f36-99b5-978084e511b6.png	image/png	37674	4	2026-10-20 07:02:19.30126+00
42	353	cd99755d-8416-493a-8416-cb245dc90436.png	image/png	55373	4	2026-10-20 07:02:19.428488+00
43	354	2a7ce6a2-810e-473b-b0c4-d266eafa1303.png	image/png	55373	6	2026-10-20 07:02:19.490002+00
44	355	ddf4d5e5-f155-4282-962e-c4b904d85c33.png	image/png	55373	7	2026-10-20 07:02:19.546699+00
45	356	a4b7392f-adb6-4090-9e51-eac8b6a83db8.png	image/png	72401	8	2026-10-20 07:02:19.612935+00
46	357	b6a076be-4d9c-4e46-a148-39f1f0f469cb.png	image/png	72401	9	2026-10-20 07:02:19.678394+00
47	358	86443259-1611-4926-8944-92cd56d5cff8.png	image/png	72401	10	2026-10-20 07:02:19.7373+00
48	361	faa32533-6ba8-4f84-9616-663082d63d85.png	image/png	42891	13	2026-10-20 07:02:19.885965+00
49	362	90f9d44a-e977-40de-aa7d-34264e2006a4.png	image/png	42891	14	2026-10-20 07:02:19.963802+00
50	363	a97bed69-b505-4813-bb5e-7d32543e371d.png	image/png	42891	15	2026-10-20 07:02:20.082951+00
51	369	16d3e3a4-896d-421a-a220-1b02f8c324b2.png	image/png	40959	1	2026-10-20 07:17:16.800326+00
52	370	422d6cd5-543e-43f6-afe2-2630806ec0df.png	image/png	40959	2	2026-10-20 07:17:16.864427+00
53	371	f231f236-e844-48b0-b7bb-7281afdb3c1d.png	image/png	40959	3	2026-10-20 07:17:16.93799+00
54	372	3fc7949c-6858-4b74-95a1-97662211843f.png	image/png	40959	4	2026-10-20 07:17:16.997307+00
55	373	a1dd25a0-c620-4845-a0f6-e445a8cfdf2d.png	image/png	40959	5	2026-10-20 07:17:17.078649+00
56	374	0f160d0d-eb9e-4d09-87a2-a70f72c066d5.png	image/png	35804	6	2026-10-20 07:17:17.141006+00
57	375	a69a5014-f783-470c-8f4c-1bd2debc6951.png	image/png	35804	7	2026-10-20 07:17:17.207124+00
58	376	ee522615-5b0c-4d77-9fd1-3276f1236538.png	image/png	35804	8	2026-10-20 07:17:17.286025+00
59	377	c23d07a5-3205-4612-96c9-273497d62f2f.png	image/png	35804	9	2026-10-20 07:17:17.348419+00
60	378	695bfba8-c8c2-451e-90c3-c73779d2bce0.png	image/png	35804	10	2026-10-20 07:17:17.396311+00
61	379	7e4adeb9-5ed9-4f7b-975a-5cf2d95efbd0.png	image/png	34040	11	2026-10-20 07:17:17.440354+00
62	380	af28340d-95dd-4f56-8c01-b470ac96de8b.png	image/png	34040	12	2026-10-20 07:17:17.495846+00
63	381	55fdcf8b-88dd-470e-b01b-1d63717a5e95.png	image/png	34040	13	2026-10-20 07:17:17.573876+00
64	382	85c17c3a-6d92-4c17-9480-41dc9f4ae4c7.png	image/png	34040	14	2026-10-20 07:17:17.66012+00
65	383	cef6a503-bad8-4840-b99d-05d61a77c9b8.png	image/png	34040	15	2026-10-20 07:17:17.726136+00
66	470	19590e74-6706-46b4-b284-95a6d49e4215.png	image/png	42480	1	2026-10-20 07:29:32.429764+00
67	471	b44a4a3d-996b-4e22-8f83-c0cbb74a795a.png	image/png	42480	2	2026-10-20 07:29:32.480357+00
68	472	8cffed2b-45b9-4190-a87a-7c71ff9e3fc0.png	image/png	42480	3	2026-10-20 07:29:32.526809+00
69	473	698171ed-322c-421d-b922-2b9e4e4fa1f3.png	image/png	42480	4	2026-10-20 07:29:32.582931+00
70	474	2a9b2ead-b2b3-4501-a9c1-5dcfe69f11af.png	image/png	36358	5	2026-10-20 07:29:32.656376+00
71	475	becf1465-b5e2-4db9-a4c8-96aaac057e09.png	image/png	36358	6	2026-10-20 07:29:32.692076+00
72	476	fe37b8b0-a259-496a-a183-d05f725ebaa3.png	image/png	36358	7	2026-10-20 07:29:32.769749+00
73	477	88e7fe93-7347-4905-b04b-3b6333bf6e3b.png	image/png	36358	8	2026-10-20 07:29:32.855267+00
74	478	13f59027-6afc-4316-8f8b-3b90cbb1fc7d.png	image/png	38092	9	2026-10-20 07:29:32.899329+00
75	479	90410219-9819-4744-bcaf-56f6632b5a67.png	image/png	38092	10	2026-10-20 07:29:32.952036+00
76	480	7012fd72-b13c-4cf3-9b0f-0545bab5aa66.png	image/png	38092	11	2026-10-20 07:29:33.054083+00
77	481	4bc922ce-d5be-4b9b-97ab-f3b0079267e5.png	image/png	38092	12	2026-10-20 07:29:33.092484+00
78	482	e500e33e-ea0b-4d86-bbe9-b6d8e549aeab.png	image/png	37558	13	2026-10-20 07:29:33.22627+00
79	483	5441627e-b340-46d7-b9bd-1483986fce54.png	image/png	37558	14	2026-10-20 07:29:33.358981+00
80	484	1ec45235-7fa5-44d3-8fb9-d267fb0000bc.png	image/png	37558	15	2026-10-20 07:29:33.401101+00
81	485	a7b00213-7349-4a20-8dea-df82928a560b.png	image/png	46971	1	2026-10-20 07:29:33.476814+00
82	486	e872bbb4-5722-4c90-bc8f-cf4fe29a7527.png	image/png	46971	2	2026-10-20 07:29:33.587181+00
83	487	e7c2fac4-346c-47e3-a52e-007faa8fba24.png	image/png	36675	3	2026-10-20 07:29:33.669184+00
84	488	898a0571-3056-46af-98d8-66e2d71ba638.png	image/png	36675	4	2026-10-20 07:29:33.726072+00
85	489	c71d743b-bebf-4c66-ac03-af88c552c077.png	image/png	32905	5	2026-10-20 07:29:33.764545+00
86	510	243acd81-5f08-4ea0-9e66-fea2fb590bb8.png	image/png	36004	1	2026-10-20 07:38:26.663193+00
87	511	1a3f7e84-09c6-45ab-91ea-bfa1afea0325.png	image/png	36004	2	2026-10-20 07:38:26.697571+00
88	512	80b3953b-0f9f-4b9a-add8-b2bdce29362a.png	image/png	36004	3	2026-10-20 07:38:26.732274+00
89	513	443e8742-6911-4223-ba79-797953898c8f.png	image/png	36004	4	2026-10-20 07:38:26.764676+00
90	514	a43b0158-7005-4d67-a6e2-a10a8fbf2153.png	image/png	36004	5	2026-10-20 07:38:26.804533+00
91	515	cbb8d734-45af-443e-a98d-897ddfd26186.png	image/png	40685	6	2026-10-20 07:38:26.843405+00
92	516	c447c943-1f96-4ad4-a70d-66f1cc59ac63.png	image/png	40685	7	2026-10-20 07:38:26.87626+00
93	517	04f7c8c7-e10b-45b5-bd08-43cb7e79fa7a.png	image/png	40685	8	2026-10-20 07:38:26.907561+00
94	518	9a3ca36f-85b5-418b-a636-aa5cf5bbd1fc.png	image/png	40685	9	2026-10-20 07:38:26.955654+00
95	519	22ed335e-65fc-449e-ac79-bf32e9ff1f5d.png	image/png	40685	10	2026-10-20 07:38:26.987344+00
96	520	a58ef5d9-55be-4574-8118-6f1ed90582d2.png	image/png	46644	11	2026-10-20 07:38:27.026971+00
97	521	a0d7c756-fafd-4417-b84b-d2b2b75a84d4.png	image/png	46644	12	2026-10-20 07:38:27.081698+00
98	522	fec443b7-2821-4f48-be7f-74aecddd813f.png	image/png	46644	13	2026-10-20 07:38:27.145557+00
99	523	2c886f76-71ca-4518-83b5-5981df6c8f9f.png	image/png	46644	14	2026-10-20 07:38:27.189089+00
100	524	27ae15fe-a435-4010-9de5-6009b3d5d5c2.png	image/png	46644	15	2026-10-20 07:38:27.229828+00
101	525	f79fddf3-33d7-4881-9fec-1462518655e0.png	image/png	36004	1	2026-10-20 07:38:27.268353+00
102	526	736b12de-d941-4807-b008-eafb5886c82d.png	image/png	36004	2	2026-10-20 07:38:27.309452+00
103	527	2e2bfa8e-8686-41f0-9170-89e214a8c5db.png	image/png	40685	3	2026-10-20 07:38:27.35653+00
104	528	f1f5f1d0-e98d-4f70-9a04-b90f55fdda59.png	image/png	40685	4	2026-10-20 07:38:27.393327+00
105	529	ca9ba894-03a9-43b4-a3f8-27d7ef8c0325.png	image/png	46644	5	2026-10-20 07:38:27.427042+00
\.


--
-- Data for Name: question_stimuli; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.question_stimuli (id, bank_id, title, content, media_key, media_alt_text, created_at) FROM stdin;
2	203	Tes	Tes stimulus	\N	\N	2026-10-27 02:44:44.882535+00
6	205	AWAL TAHUN HIJRIYAH SOAL CERITA INI UNTUK NO 1-7	"خليل : السلام عليكم.\r\nزكريا : وعليكم السلام ورحمة الله وبركاته.\r\nخليل : في أيّ شهرٍ نحن الآن، يا زكريا؟\r\nزكريا : نحن الآن في أول يومٍ من محرمٍ، دخلنا في عامٍ جديدٍ.\r\nخليل : الحمد لله، أهنئكم بحلول رأس السنة الهجرية الجديدة! كل عام وأنتم بخير!\r\nزكريا : وأنتم في صحة وعافية!\r\nخليل : نحتفل بذكرى هجرة الرسول صلى الله عليه وسلم، أليس كذلك؟\r\nزكريا : بلى، نحتفل اليوم بهذه الحادثة العظيمة.\r\nخليل : ماذا عرفت عن بداية رأس السنة الهجرية؟\r\nزكريا : بدأت السنة الهجرية عند المسلمين عندما هاجر الرسول صلى الله عليه وسلم من مكة إلى يثرب.\r\nخليل : صحيح، وسميت بعد ذلك بالمدينة المنورة وكان ذلك في عام ٦٢٢ الميلادي. (سنة ستمائة واثنين وعشرين)\r\nزكريا : وهل عرفت سبب هجرته؟\r\nخليل : نعم، هجرته بسبب ما كانوا يلاقونه من إيذاء من زعماء قريش.\r\nزكريا : صحيح، خاصة بعد وفاة أبي طالب.\r\nخليل : ولكن الله نجاه فاستمرت هجرة من يدخل في الإسلام إلى المدينة المنورة، حتى فتح مكة عام ٧ للهجرة.\r\nزكريا : شكرا لك يا خليل، أنت رجل ماهر!"	\N	\N	2026-10-28 05:45:18.206926+00
7	205	TAHUN KELAHIRAN NABI SOAL PERCAKAPAN UNTUK NO 8-13	"مدرس : السلام عليكم\r\nالطلاب : وعليكم السلام ورحمة الله وبركاته\r\nمدرس : ندرّس التاريخ، اليوم اثنا عشر من ربيع الأول، ماذا تذكرتم بهذا التاريخ؟\r\nإحسان : في هذا التاريخ ولد محمد رسول الله.\r\nمدرس : جميل جدا... من منكم يقول لي من هو محمد رسول الله؟\r\nسلمان : هو محمد بن عبد الله خاتم الرسول.\r\nمدرس : أحسنت... وكيف كان خلقه صلى الله عليه وسلم؟\r\nزياد : كان خلقه القرآن.\r\nمدرس : جيد... وكيف نحيي ذكرى مولد رسول الله صلى الله عليه وسلم؟.. تفضل أنت يا حسن..\r\nحسن : باتباع سنته\r\nمدرس : أحسنت.. من أيضا؟ تفضل أنت يا زمزم.\r\nزمزم : والمشي على هديه\r\nمدرس : أحسنتم يا أبنائي لقد درستـم صلى الله عليه وسلم بهديه\r\nوأخيرا : كيف تقول إذا ذكر اسم رسول الله؟\r\nالطلاب : صلى الله عليه وسلم"	\N	\N	2026-10-28 05:45:18.206926+00
8	205	NUZULUL QUR'AN	"معروف : السلام عليكم.\r\nزبير : وعليكم السلام ورحمة الله وبركاته.\r\nمعروف : هل قرأت القرآن اليوم؟\r\nزبير : نعم، قرأته اليوم.\r\nمعروف : الحمد لله، أنت طالب نشيط!\r\nزبير : شكرا لك يا معروف. في هذا الشهر المبارك ينبغي علينا أن نكثر من قراءة القرآن.\r\nمعروف : صحيح، لأن هذا الشهر شهر رمضان، نزل فيه القرآن.\r\nزبير : في أي تاريخ نزل القرآن؟\r\nمعروف : في السابع عشر من رمضان.\r\nزبير : هل نزل القرآن دفعة واحدة؟\r\nمعروف : لا، ولكنه نزل منجما.\r\nزبير : ما أول ما نزل من القرآن؟\r\nمعروف : الآيات الخمس الأولى من سورة العلق.\r\nزبير : وما مدة نزول القرآن؟\r\nمعروف : مدته ٢٣ سنة، منها ١٣ سنة في مكة المكرمة، و ١٠ سنوات في المدينة المنورة.\r\nزبير : بارك الله لك بعلمك يا معروف."	\N	\N	2026-10-28 05:45:18.206926+00
9	152	tes	tes 1	\N	\N	2026-10-29 07:10:47.843817+00
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.questions (id, bank_id, type, prompt, options, answer_key, points, created_at, stimulus_id) FROM stdin;
186	143	essay	اُذْكُرْ ثَلَاثًا مِنْ دَلَائِلِ أَصَالَةِ القُرْآنِ الكَرِيمِ وَإِعْجَازِهِ!	[]	ثَلَاثُ دَلَائِلَ عَلَى أَصَالَةِ القُرْآنِ: حِفْظُهُ المُنَقَّلُ بِالتَّوَاتُرِ قَطْعِيًّا نَصًّا وَنُطْقًا. سُهُولَةُ حِفْظِهِ فِي الصُّدُورِ فِي كُلِّ زَمَانٍ وَمَكَانٍ. عَدَمُ قُدْرَةِ الإِنْسِ وَالجِنِّ عَلَى المَجِيءِ بِمِثْلِهِ أَوْ بِسُورَةٍ مِنْ مِثْلِهِ (الإِعْجَازُ).	1.00	2026-10-19 04:22:57.915398+00	\N
209	145	mc	حفر الله لقارون الارض بسبب ....	["الثراء و الجمل", "عدم رحم الضعفاء", "الكبر", "صاحب فرعون"]	B	1.00	2026-10-19 04:53:23.616857+00	\N
210	145	mc	قال الله تعالى في سورة الاسراء: ٢٧ ان المبذرين كانوا اخوان الشياطين. ما معنى اخوان الشياطين؟.....	["في نفس العائلة", "في صفة واحدة", "يحتاج بعضهم الى بعض", "يتعاون بعضهم على بعض"]	B	1.00	2026-10-19 04:53:23.616857+00	\N
211	145	mc	اخراج المال فيما يحتاج اليه هو ......	["التبذير", "الانفاق", "البخيل", "التقتير"]	B	1.00	2026-10-19 04:53:23.616857+00	\N
212	145	mc	ولا تجعل يدك مغلولة الى عنقك. المقصود هو؟	["الكسلان", "البخيل", "الرحيم", "المنافق"]	B	1.00	2026-10-19 04:53:23.616857+00	\N
213	145	mc	من اشدّ الناس بلاء.....؟	["الانبياء", "العلماء", "المؤمن", "اهل الكتاب"]	A	1.00	2026-10-19 04:53:23.616857+00	\N
214	145	mc	علم الانسان ما لم يعلم. معنى هذه الاية...؟	["القرأة طريقة العلم", "العالم كالقمر", "منبع العلوم هو الانسان", "الله عليم والانسان لا يعلم"]	D	1.00	2026-10-19 04:53:23.616857+00	\N
215	145	mc	الذين يستقيمون بين قوة عقولهم ورفق قلوبهم هم....؟	["خلفاء", "أولو الارحام", "اولو العزم", "أولوا الالباب"]	D	1.00	2026-10-19 04:53:23.616857+00	\N
216	145	mc	وأنذر عشيرتك الاقربين. في هذه الاية أمر الله الرسول ب.....؟	["الانذار لجميع اهل المدينة", "الانذار لجميع اهل مكة", "الانذار لجميع اهل شام", "الانذار للأقربين"]	D	1.00	2026-10-19 04:53:23.616857+00	\N
217	145	mc	ادع الى سبيل ربّك. نستدلّ من هذه الاية على أن الدعوة ؟	["سنة", "مباحة", "واجبة", "محرمة"]	C	1.00	2026-10-19 04:53:23.616857+00	\N
218	145	mc	طريقة الدعوة على سبيل الخطابة على المنبر وهي الدعوة ب.....؟	["الجدال", "الحكمة والموعظة الحسنة", "اليد", "اللسان"]	B	1.00	2026-10-19 04:53:23.616857+00	\N
219	145	mc	المسافر البعيد الدار المنقطع عن اهله و ماله. هو....؟	["ابن السبيل", "سبيل الله", "المسافر", "الرسل"]	A	1.00	2026-10-19 04:53:23.616857+00	\N
220	145	mc	الذين هم يراءون. هذه الاية من سورة....؟	["الماعون: ٣", "الماعون: ٦", "الم ترى : ٣", "المائدة: ٩"]	B	1.00	2026-10-19 04:53:23.616857+00	\N
221	145	mc	انّا هديناه السبيل امّا شاكرا....؟ اكمل هذه الاية.	["وامّا كفورًا", "وامّا شكورًا", "وامّا شرورًا", "وامّا سرورًا"]	A	1.00	2026-10-19 04:53:23.616857+00	\N
222	145	mc	انّا هديناه السبيل ....واما كفورا).اكمل هذه الاية.	["امّا شكورًا", "وامّا كفورًا", "امّا شرورًا", "امّا سرورًا"]	A	1.00	2026-10-19 04:53:23.616857+00	\N
223	145	mc	الذين اذا أصابتهم مصيبة قالوا انّا لله وانّا اليه راجعون. هذه الاية من سورة....؟	["البقرة : ١٥٥", "البقرة :١٥٦", "البقرة: ١٦٥", "البقرة: ١٣٥"]	B	1.00	2026-10-19 04:53:23.616857+00	\N
224	145	essay	ما هي صفات الذين يكذبون بالدين؟	[]	من صفات الذين يكذبون بالدين : يدع اليتيم، عن صلاتهم ساهون، الرياء ، يمنعون الماعون.	1.00	2026-10-19 04:53:23.616857+00	\N
225	145	essay	اشرح قوله تعالى: ان المبذرين كانوا اخوان الشياطين وكان الشيطان لربه كفورا.	[]	حرمة التبذير فى الاموال و حقيقته انفاق المال في المعاصى والمحرمات وهي من الصفات المذمومة	1.00	2026-10-19 04:53:23.616857+00	\N
226	145	essay	اذكر ما ينتفع الناس من الزرع ؟	[]	الترغيب في الزرع ما ينتفع به الناس بعد الموت. ليجري أجره للانسان و تكتب له صدقته الى يوم القيامة.	1.00	2026-10-19 04:53:23.616857+00	\N
227	145	essay	اكمل هذه الاية: والذين اذا انفقوا لم يسرفوا ولم يقتروا ......(الفرقان: ٦٧)	[]	وكان بين ذالك قواما.	1.00	2026-10-19 04:53:23.616857+00	\N
228	145	essay	اذكر شرح الكلمات من " عن صلاتهم ساهون" (الماعون)	[]	" عن صلاتهم ساهون= يأخرونها عن أوقاتها" (الماعون)	1.00	2026-10-19 04:53:23.616857+00	\N
336	151	mc	مَاذَا يَأْمُرُنَا الإِسْلَامُ فِيمَا يَتَعَلَّقُ بِالْمَسَاكِنِ وَالْمَلَابِسِ وَالأَطْعِمَةِ، كَمَا قَالَ حُسَيْنٌ؟	["بِالتَّعَاوُنِ", "بِالْبَحْثِ", "بِالصِّدْقِ", "بِالنَّظَافَةِ"]	D	1.00	2026-10-19 08:04:29.077808+00	\N
337	151	mc	مَا هِيَ النَّصِيحَةُ الَّتِي قَدَّمَهَا حُسَيْنٌ لِعَبْدِ الرَّحْمَنِ لِكَيْ لَا يُصَابَ بِالْمَرَضِ مَرَّةً أُخْرَى؟	["أَنْ يَشْرَبَ الدَّوَاءَ كُلَّ يَوْمٍ", "أَنْ لَا يَخْرُجَ مِنَ الْبَيْتِ أَبَدًا", "أَنْ لَا يَأْكُلَ الطَّعَامَ إِلَّا نَظِيفًا", "أَنْ يُنَظِّفَ شَوَارِعَ الْقَرْيَةِ"]	C	1.00	2026-10-19 08:04:29.077808+00	\N
338	151	mc	مِمَّا يَتَكَوَّنُ التَّرْكِيبُ الصَّحِيحُ فِي قَوْلِ حُسَيْنٍ: "لِأَنَّ الإِسْلَامَ يَأْمُرُنَا بِالنَّظَافَةِ..."، كَيْفَ وَصَفَ حُسَيْنٌ أَهَمِّيَّةَ النَّظَافَةِ؟	["النَّظَافَةُ خَاصَّةٌ بِالْمَلَابِسِ فَقَطْ", "النَّظَافَةُ أَمْرٌ إِسْلَامِيٌّ يَشْمَلُ الْمَسَاكِنَ وَالْمَلَابِسَ وَالأَطْعِمَةِ", "النَّظَافَةُ وَاجِبَةٌ عِنْدَ الذَّهَابِ إِلَى الْمُسْتَشْفَى", "النَّظَافَةُ فِعْلٌ يُقَامُ بِهِ فِي السُّوقِ فَقَطْ"]	B	1.00	2026-10-19 08:04:29.077808+00	\N
229	146	mc	كم مقدار مد الصلة الصغرى؟	["حركتان", "أربع حركات", "ست حركات", "خمس حركات"]	A	1.00	2026-10-19 05:00:56.071431+00	\N
230	146	mc	متى يكون مد العوض؟	["عند الوصل دائما", "عند الإدغام", "بعد الهمزة", "عند الوقف عوضا عن تنوين الفتح"]	D	1.00	2026-10-19 05:00:56.071431+00	\N
231	146	mc	ما تعريف مد البدل؟	["حرف مد بعده سكون لازم", "همزة تسبق حرف المد في كلمة واحدة", "حرف مد في كلمة والهمزة في أخرى", "مد عند الوقف فقط"]	B	1.00	2026-10-19 05:00:56.071431+00	\N
232	146	mc	لماذا سمي المد فرعيا؟	["لأنه لا يحتوي حرف مد", "لأنه يمد حركة واحدة", "لأنه يقع عند الوقف فقط", "لتفرعه عن المد الأصلي"]	D	1.00	2026-10-19 05:00:56.071431+00	\N
233	146	mc	ما سببا المد الفرعي؟	["الفتحة والكسرة", "الضمة والفتحة", "الهمز والسكون", "التنوين والشدة"]	C	1.00	2026-10-19 05:00:56.071431+00	\N
234	146	mc	أي مما يأتي من أنواع المد الفرعي؟	["الإظهار الحلقي", "المد الواجب المتصل", "الإقلاب", "الإخفاء الحقيقي"]	B	1.00	2026-10-19 05:00:56.071431+00	\N
235	146	mc	متى يكون المد واجبا متصلا؟	["إذا جاءت الهمزة بعد حرف المد في كلمة واحدة", "إذا جاءت الهمزة في كلمة أخرى", "إذا جاء سكون بعد حرف المد", "إذا وجد تنوين فتح"]	A	1.00	2026-10-19 05:00:56.071431+00	\N
236	146	mc	كم مقدار المد الواجب المتصل غالبا؟	["حركتان", "حركة واحدة", "ثماني حركات", "أربع أو خمس حركات"]	D	1.00	2026-10-19 05:00:56.071431+00	\N
237	146	mc	متى يكون المد جائزا منفصلا؟	["إذا كانا في كلمة واحدة", "إذا جاء سكون لازم", "إذا كان حرف المد والهمزة في كلمتين", "إذا وجد تنوين فتح"]	C	1.00	2026-10-19 05:00:56.071431+00	\N
238	146	mc	ما مقدار المد الجائز المنفصل حسب المادة؟	["حركة واحدة فقط", "حركتان أو أربع أو خمس", "ست حركات فقط", "ثماني حركات"]	B	1.00	2026-10-19 05:00:56.071431+00	\N
239	146	mc	ما نوع سورة قريش؟	["مدنية", "مدنية في الأصل", "مكية", "ليست من القرآن"]	C	1.00	2026-10-19 05:00:56.071431+00	\N
240	146	mc	لماذا سميت سورة قريش بهذا الاسم؟	["لذكر المدينة", "لأن الله ذكر فيها قريشا", "لذكر البحر", "لذكر الأنبياء"]	B	1.00	2026-10-19 05:00:56.071431+00	\N
241	146	mc	إلى أين كانت رحلة قريش في الشتاء؟	["إلى الشام", "إلى المدينة", "إلى العراق", "إلى اليمن"]	D	1.00	2026-10-19 05:00:56.071431+00	\N
242	146	mc	إلى أين كانت رحلة قريش في الصيف؟	["إلى اليمن", "إلى مصر", "إلى الشام", "إلى الحبشة"]	C	1.00	2026-10-19 05:00:56.071431+00	\N
243	146	mc	ما المقصود بنعمة الأمن؟	["كثرة الأموال فقط", "كثرة السفر", "الأمان من الخوف والاعتداء", "القوة العسكرية"]	C	1.00	2026-10-19 05:00:56.071431+00	\N
244	146	essay	اذكر حروف المد الثلاثة، وبيّن حركة الحرف الذي يسبق كلَّ حرفٍ منها، مع مثال لكل واحد.	[]	حروف المد ثلاثة: الألف الساكنة المفتوح ما قبلها، مثل: قَالَ؛ والواو الساكنة المضموم ما قبلها، مثل: يَقُولُ؛ والياء الساكنة المكسور ما قبلها، مثل: قِيلَ.	1.00	2026-10-19 05:00:56.071431+00	\N
245	146	essay	ما تعريف المد الطبيعي؟ وكم مقدار مده؟ اذكر مثالين.	[]	هو المد الذي لا يأتي بعد حرف المد فيه همز ولا سكون، ومقداره حركتان. مثل: قَالَ، فِيهِ.	1.00	2026-10-19 05:00:56.071431+00	\N
246	146	essay	اذكر ثلاثًا من نعم الله على النبي محمد ﷺ الواردة في سورة الشرح.	[]	شرح صدره، ووضع عنه وزره، ورفع ذكره، وبشّره باليسر مع العسر.	1.00	2026-10-19 05:00:56.071431+00	\N
247	146	essay	أكمل قوله تعالى: فَإِذَا فَرَغْتَ فَانْصَبْ وَإِلَىٰ رَبِّكَ ________، ثم اشرح ما ترشد إليه الآيتان.	[]	فَارْغَبْ. أي إذا انتهيت من عمل فاجتهد في العبادة، واجعل رجاءك وتوجهك إلى الله وحده.	1.00	2026-10-19 05:00:56.071431+00	\N
248	146	essay	ما العلاقة بين الكعبة والأمر بعبادة الله في سورة قريش؟	[]	الله رب الكعبة، ولذلك يجب أن نعبده وحده.	1.00	2026-10-19 05:00:56.071431+00	\N
339	151	mc	فِي أَيِّ سَاعَةٍ يَسْتَيْقِظُ عَلِيٌّ مِنَ النَّوْمِ؟	["فِي السَّاعَةِ الثَّالِثَةِ", "فِي السَّاعَةِ الرَّابِعَةِ", "فِي السَّاعَةِ الْخَامِسَةِ", "فِي السَّاعَةِ السَّادِسَةِ"]	B	1.00	2026-10-19 08:04:29.077808+00	\N
340	151	mc	مَاذَا يَلْعَبُ عَلِيٌّ مَعَ أَصْدِقَائِهِ فِي وَقْتِ الِاسْتِرَاحَةِ؟	["كُرَةَ السَّلَّةِ وَكُرَةَ الطَّائِرَةِ", "السِّبَاحَةَ وَالْجَرْيَ", "كُرَةَ الْقَدَمِ وَكُرَةَ الْيَدِ", "الشَّطْرَنْجَ وَالرِّشَةَ"]	C	1.00	2026-10-19 08:04:29.077808+00	\N
341	151	mc	كَيْفَ يُعَامِلُ عَلِيٌّ أَصْدِقَاءَهُ فِي الْمَدْرَسَةِ؟	["مُعَامَلَةً حَسَنَةً", "مُعَامَلَةً سَيِّئَةً", "بِقَسْوَةٍ وَغَضَبٍ", "بِالْإِهْمَالِ"]	A	1.00	2026-10-19 08:04:29.077808+00	\N
342	151	mc	مَا الْهَدَفُ الرَّئِيسِيُّ مِنْ أَعْمَالِ عَلِيٍّ الْيَوْمِيَّةِ كَمَا ذُكِرَ فِي خَاتِمَةِ النَّصِّ؟	["لِيَحْصُلَ عَلَى الدَّرَجَاتِ الْعَالِيَةِ", "لِيَكُونَ أَقْوَى مِنْ أَصْدِقَائِهِ", "لِيُسْعِدَ وَالِدَيْهِ وَأَسَاتِذَتَهُ", "يُحِبُّ عَلِيٌّ مَقْرُوءًا"]	D	1.00	2026-10-19 08:04:29.077808+00	\N
343	151	mc	مَاذَا يَفْعَلُ عَلِيٌّ قَبْلَ أَنْ يَبْدَأَ دُرُوسَهُ فِي الْمَدْرَسَةِ؟	["يَدْعُو إِلَى اللَّهِ", "يَكْتُبُ الْوَاجِبَ", "يَتَكَلَّمُ مَعَ أُسْتَاذِهِ", "يَشْرَبُ الْمَاءَ"]	A	1.00	2026-10-19 08:04:29.077808+00	\N
344	151	essay	من يخطب على المنبار؟ وماذا قال؟	[]	1	1.00	2026-10-19 08:04:29.077808+00	\N
345	151	essay	. أذكر الحديث عن صِفَاتِ اللهِ تَعَالَى	[]	2	1.00	2026-10-19 08:04:29.077808+00	\N
249	147	mc	كَمْ مَوْضِعًا لِمَدِّ الْفَرْقِ؟	["مَوْضِعٌ وَاحِدٌ", "مَوْضِعَانِ", "ثَلَاثَةُ مَوَاضِعَ", "أَرْبَعَةُ مَوَاضِعَ"]	B	1.00	2026-10-19 05:06:06.645887+00	\N
250	147	mc	مَا مِقْدَارُ مَدِّ الْفَرْقِ؟	["حَرَكَتَانِ", "ثَلَاثُ حَرَكَاتٍ", "أَرْبَعُ حَرَكَاتٍ", "سِتُّ حَرَكَاتٍ"]	D	1.00	2026-10-19 05:06:06.645887+00	\N
251	147	mc	مَا مِقْدَارُ مَدِّ الْبَدَلِ؟	["حَرَكَتَانِ", "أَرْبَعُ حَرَكَاتٍ", "خَمْسُ حَرَكَاتٍ", "سِتُّ حَرَكَاتٍ"]	A	1.00	2026-10-19 05:06:06.645887+00	\N
252	147	mc	أَيُّ الْكَلِمَاتِ فِيهَا مَدُّ بَدَلٍ؟	["فِيهِ", "آمَنُوا", "لَهُ", "عَلَيْهِ"]	B	1.00	2026-10-19 05:06:06.645887+00	\N
253	147	mc	مَا مِقْدَارُ مَدِّ الصِّلَةِ الصُّغْرَى؟	["حَرَكَتَانِ", "أَرْبَعُ حَرَكَاتٍ", "خَمْسُ حَرَكَاتٍ", "سِتُّ حَرَكَاتٍ"]	A	1.00	2026-10-19 05:06:06.645887+00	\N
254	147	mc	أَيُّ الْعِبَارَاتِ فِيهَا مَدُّ الصِّلَةِ الصُّغْرَى؟	["لَهُ أَجْرٌ", "فِيهِ هُدًى", "إِنَّهُ أَنْزَلَهُ", "مَالَهُ أَخْلَدَهُ"]	B	1.00	2026-10-19 05:06:06.645887+00	\N
255	147	mc	مَتَى يَكُونُ مَدُّ الصِّلَةِ الْكُبْرَى؟	["بَعْدَ هَاءِ الضَّمِيرِ سَاكِنٌ", "بَعْدَ هَاءِ الضَّمِيرِ حَرْفٌ مُتَحَرِّكٌ", "قَبْلَ هَاءِ الضَّمِيرِ هَمْزَةٌ", "بَعْدَ هَاءِ الضَّمِيرِ هَمْزَةُ قَطْعٍ"]	D	1.00	2026-10-19 05:06:06.645887+00	\N
256	147	mc	مَا حُكْمُ هَاءِ الضَّمِيرِ فِي «مَالَهُ أَخْلَدَهُ»؟	["صِلَةٌ صُغْرَى", "مَدُّ بَدَلٍ", "صِلَةٌ كُبْرَى", "مَدُّ فَرْقٍ"]	C	1.00	2026-10-19 05:06:06.645887+00	\N
257	147	mc	أَيُّ الْكَلِمَاتِ فِيهَا مَدُّ الْفَرْقِ؟	["آمَنُوا", "ءَآللَّهُ", "فِيهِ", "أُوتُوا"]	B	1.00	2026-10-19 05:06:06.645887+00	\N
258	147	mc	لِمَاذَا تُحَدِّثُ الْأَرْضُ بِأَخْبَارِهَا؟	["لِأَنَّ النَّاسَ أَمَرُوهَا", "لِأَنَّ الْمَلَائِكَةَ أَمَرُوهَا", "لِأَنَّ رَبَّهَا أَوْحَى لَهَا", "لِأَنَّهَا تُحِبُّ النَّاسَ"]	C	1.00	2026-10-19 05:06:06.645887+00	\N
259	147	mc	مَاذَا يَجِدُ مَنْ يَعْمَلْ مِثْقَالَ ذَرَّةٍ مِنَ الْخَيْرِ؟	["عَذَابًا", "مَالًا", "شُهْرَةً", "جَزَاءَهُ"]	D	1.00	2026-10-19 05:06:06.645887+00	\N
260	147	mc	مَا الدَّرْسُ الْمُهِمُّ مِنْ قَوْلِهِ تَعَالَى: «فَمَنْ يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ»؟	["أَنَّ الْعَمَلَ الْقَلِيلَ لَا قِيمَةَ لَهُ", "أَنَّ كُلَّ عَمَلٍ مَحْسُوبٌ", "أَنَّ الْمَالَ أَهَمُّ مِنَ الْعَمَلِ", "أَنَّ الْخَيْرَ لِلْأَقْوِيَاءِ فَقَطْ"]	B	1.00	2026-10-19 05:06:06.645887+00	\N
261	147	mc	مَا مَعْنَى الْقَارِعَةِ؟	["الْقِيَامَةُ", "الْحَيَاةُ", "الْجَنَّةُ", "الدُّنْيَا"]	A	1.00	2026-10-19 05:06:06.645887+00	\N
262	147	mc	كَيْفَ يَكُونُ النَّاسُ يَوْمَ الْقِيَامَةِ؟	["كَالْجِبَالِ", "كَالْفَرَاشِ الْمَبْثُوثِ", "كَالنُّجُومِ", "كَالْبُحُورِ"]	B	1.00	2026-10-19 05:06:06.645887+00	\N
263	147	mc	كَيْفَ تَكُونُ الْجِبَالُ يَوْمَ الْقِيَامَةِ؟	["كَالْحَدِيدِ", "كَالذَّهَبِ", "كَالْعِهْنِ الْمَنْفُوشِ", "كَالْحَجَرِ"]	C	1.00	2026-10-19 05:06:06.645887+00	\N
264	147	essay	هَاتِ ثَلَاثَةَ أَمْثِلَةٍ عَلَى مَدِّ الْفَرْقِ!	[]	ءَآللَّهُ — Surah Yunus: 59, ءَآلذَّكَرَيْنِ — Surah Al-An‘am: 143, ءَآلْآنَ — Surah Yunus: 51	1.00	2026-10-19 05:06:06.645887+00	\N
265	147	essay	عَرِّفْ مَدَّ الصِّلَةِ الصُّغْرَى اِصْتِلَاحًا! وَهَاتِ مِثَالًا	[]	مَدُّ هَاءِ الضَّمِيرِ بِشَرْطِ أَنْ يَكُونَ قَبْلَهَا مُتَحَرِّكٌ وَبَعْدَهَا مُتَحَرِّكٌ، وَيُمَدُّ حَرَكَتَيْنِ. مِثْلَ: {إِنَّهُ هُوَ}، {لَا تَأْخُذُهُ سِنَةٌ}.	1.00	2026-10-19 05:06:06.645887+00	\N
191	144	mc	ما المقصود بالأفعال الفاحشة؟	["أ. أفعال مباحة", "ب. أفعال محرمة", "ج. أفعال مستحبة", "د. أفعال مبطلة"]	B	1.00	2026-10-19 04:34:25.759833+00	\N
266	147	essay	مَا أَسْمَاءُ يَوْمِ الْقِيَامَةِ الْأُخْرَى عِنْدَ تَفْسِيرِ ابْنِ كَثِيرٍ؟	[]	مِنْ أَسْمَاءِ يَوْمِ الْقِيَامَةِ: يَوْمُ الْبَعْثِ، وَيَوْمُ الدِّينِ، وَيَوْمُ الْفَصْلِ، وَيَوْمُ الْجَمْعِ، وَالسَّاعَةُ، وَالْحَاقَّةُ، وَالْقَارِعَةُ، وَالْغَاشِيَةُ،	1.00	2026-10-19 05:06:06.645887+00	\N
267	147	essay	اُكْتُبْ ثَلَاثَ آيَاتٍ مِنْ سُورَةِ الْقَارِعَةِ!	[]	الْقَارِعَةُ, مَا الْقَارِعَةُ, وَمَا أَدْرَاكَ مَا الْقَارِعَةُ	1.00	2026-10-19 05:06:06.645887+00	\N
268	147	essay	قُلْ ءَآلذَّكَرَيْنِ حَرَّمَ أَمِ الْأُنثَيَيْنِ أَمَّا اشْتَمَلَتْ عَلَيْهِ أَرْحَامُ الْأُنثَيَيْنِ ۖ نَبِّئُونِي بِعِلْمٍ إِن كُنتُمْ صَادِقِينَ, وَإِذَا حُيِّيتُم بِتَحِيَّةٍ فَحَيُّوا بِأَحْسَنَ مِنْهَا أَوْ رُدُّوهَا, الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ وَيُقِيمُونَ الصَّلَاةَ وَمِمَّا رَزَقْنَاهُمْ يُنْفِقُونَ, إِنَّهُ كَانَ تَوَّابًا, وَمَا أَدْرَاكَ مَا هِيَهْ. اُذْكُرْ أَحْكَامَ التَّجْوِيدِ الْمَوْجُودَةَ فِي الْآيَاتِ الْآتِيَةِ!	[]	مَدُّ الْفَرْقِ, مَدُّ التَّمْكِينِ, مَدُّ الْبَدَلِ, مَدُّ الصِّلَةِ الصُّغْرَى, مَدُّ الصِّلَةِ الْكُبْرَى	1.00	2026-10-19 05:06:06.645887+00	\N
346	151	essay	كَيْفَ اهْتَمَّ الإِسْلَامُ بِنَظَافَةِ الإِنْسَانِ بِنَاءً عَلَى مَا وَرَدَ فِي النَّصِّ؟	[]	3	1.00	2026-10-19 08:04:29.077808+00	\N
347	151	essay	كَمْ نَوْعًا لِلْمَجَازِ؟ أُذْكُرْهَا!	[]	4	1.00	2026-10-19 08:04:29.077808+00	\N
348	151	essay	كَمْ رُكْنًا لِلْمَجَازِ؟ وَاذْكُرْهَا!	[]	5	1.00	2026-10-19 08:04:29.077808+00	\N
269	148	mc	........ كِتَابٌ جَدِيْدٌ	["هَذِهِ", "هَذَا", "تِلْكَ", "أَنْتَ"]	B	1.00	2026-10-19 07:05:30.270851+00	\N
270	148	mc	........مِمْسَحَةٌ نَظِيْفَةٌ	["هَذِهِ", "هَذَا", "ذلك", "أَنْتَ"]	A	1.00	2026-10-19 07:05:30.270851+00	\N
271	148	mc	........مِصْبَاحٌ جَمِيْلٌ	["هَذِهِ", "هَذَا", "تِلْكَ", "ذلك"]	D	1.00	2026-10-19 07:05:30.270851+00	\N
272	148	mc	........خَرِيْطَةٌ عَلَى الجِدَارِ	["هَذِهِ", "هَذَا", "تِلْكَ", "ذلك"]	C	1.00	2026-10-19 07:05:30.270851+00	\N
273	148	mc	أَيْنَ الطَّبَاشِيْرُ؟ الطَّبَاشِيْرُ ... الصُّنْدُوْقِ	["عَلَى", "فِي", "إِلَى", "مِنْ"]	B	1.00	2026-10-19 07:05:30.270851+00	\N
274	148	mc	هَلْ هَذِهِ الحَقِيبَةُ لَكِ يَا فَاطِمَةُ؟" – "لاَ، لَيْسَتْ لِي، بَلْ هِيَ ....." الضَّمِيرُ المُنَاسِبُ لِلْمُتَكَلِّمِ هُوَ:	["لَكَ", "لِِي", "لَهُ", "لَهاَ"]	D	1.00	2026-10-19 07:05:30.270851+00	\N
275	148	mc	المَكْتَبُ أَمَامَ السَّبُّورَةِ، وَالْكُرْسِيُّ ..... المَكْتَبِ." ظَرْفُ المَكَانِ المُنَاسِبُ هُوَ:	["فَوْقَ", "َتحْتَ", "وَرَاءَ", "َبَيْنَ"]	C	1.00	2026-10-19 07:05:30.270851+00	\N
276	148	mc	فِي مَحْفَظَتِي ..... أَقْلَامٍ." (العَدَدُ 3)	["ثَلَاثُ أَقْلَامٍ", "ثَلَاثَةُ أَقْلَامٍ", "ثَلَاثٌ أَقْلَامٍ", "ثَلَاثَةً أَقْلَامٍ"]	B	1.00	2026-10-19 07:05:30.270851+00	\N
277	148	mc	رَأَيْتُ فِي الحَدِيقَةِ ..... طُيُورٍ." (العَدَدُ 7)	["سَبْعَةُ", "سَبْعُونَ", "سَبْعَةً", "سَبْعُ"]	A	1.00	2026-10-19 07:05:30.270851+00	\N
278	148	mc	أيْنَ سَاعَةُ الحَائِطِ؟" – "..... السَّاعَةُ الجَمِيلَةُ ..... الحَائِطِ."	["هَذِهِ - تَحْتَ", "تِلْكَ - عَلَى", "هَذَا - أَمَامَ", "ذَلِكَ - بَيْنَ"]	B	1.00	2026-10-19 07:05:30.270851+00	\N
279	148	mc	"يَا أُمِّي، عِنْدِي ..... كُتُبٍ وَ..... مَجَلَّاتٍ." (العَدَدُ 9 لِلْكُتُبِ وَ 6 لِلْمَجَلَّاتِ)	["تِسْعَةُ كُتُبٍ - سِتُّ مَجَلَّاتٍ", "تِسْعُ كُتُبٍ - سِتَّةُ مَجَلَّاتٍ", "تِسْعَةُ كُتُبٍ - سِتَّةُ مَجَلَّاتٍ", "تِسْعُ كُتُبٍ - سِتُّ مَجَلَّاتٍ"]	A	1.00	2026-10-19 07:05:30.270851+00	\N
280	148	mc	اَلسَّاعَةُ الجَمِيْلَةُ ... الجِدَارِ	["عَلَى", "فِي", "إِلَى", "مِنْ"]	A	1.00	2026-10-19 07:05:30.270851+00	\N
281	148	mc	............الطَّالِبُ؟ الطَّالِبُ فِي المَدْرَسَةِ	["مَا", "مَنْ", "أَيْنَ", "كَيْفَ"]	C	1.00	2026-10-19 07:05:30.270851+00	\N
282	148	mc	. ... أُسْتَاذٌ، وَأَنْتِ تِلْمِيْذَةٌ	["نَحْنُ", "أَنْتِ", "هُوَ", "هِيَ"]	C	1.00	2026-10-19 07:05:30.270851+00	\N
283	148	mc	اَلقَلَمُ ... المِقْلَمَةِ	["عَلَى", "فِي", "إِلَى", "جَانِبَ"]	D	1.00	2026-10-19 07:05:30.270851+00	\N
284	148	essay	.......... نَعَمْ، هِيَ مِكْنَسَةٌ	[]	أَ هذه مِكْنَسَةٌ؟ أَ تلك مِكْنَسَةٌ؟	1.00	2026-10-19 07:05:30.270851+00	\N
285	148	essay	......... لَا، بَلْ تِلْكَ خَرِيْطَةٌ	[]	أَ هذه مِنْضَدَةٌ؟	1.00	2026-10-19 07:05:30.270851+00	\N
286	148	essay	حَمِيْدٌ........،...........،.............	[]	حَمِيْدٌ تِلْمِيْذٌ لَهُ كُرَّاسَةٌ، كُرَّاسَتُهُ أَمَامَهُ	1.00	2026-10-19 07:05:30.270851+00	\N
287	148	essay	أَنْتِ........،...........،.............	[]	أَنْتِ تِلْمِيْذَةٌ لَكِ كُرَّاسَةٌ، كُرَّاسَتُكِ أَمَامَكِ	1.00	2026-10-19 07:05:30.270851+00	\N
288	148	essay	فِي الْمَطْبَخِ 9 أَكْوَابٍ	[]	في المطبخ تسعة أكواب	1.00	2026-10-19 07:05:30.270851+00	\N
350	152	mc	أَيْنَ يَسْكُنُ يُوْسُفُ؟	["فِي شَارِعِ أَحْمَد يَنِي رَقْم 14", "فِي شَارِعِ أَحْمَد يَنِي رَقْم 14", "فِي المَدْرَسَةِ المَتَوَسِّطَةِ", "فِي شُؤُوْنِ الطُّلَّابِ"]	A	1.00	2026-10-20 07:02:18.807679+00	\N
351	152	mc	إِلَى أَيْنَ يَذْهَبُ يُوْسُفُ؟	["إِلَى الفَصْلِ", "إِلَى المَكْتَبَةِ", "إِلَى شُؤُوْنِ الطُّلَّابِ", "إِلَى المَبْقَلِ / المَقْصَفِ"]	C	1.00	2026-10-20 07:02:18.807679+00	\N
352	152	mc	مَاذَا يُرِيْدُ يُوْسُفُ أنْ يَفْعَلَ فِي شُؤُوْنِ الطُّلَّابِ؟	["قِرَاءَةَ الكِتَابِ", "شِرَاءَ الطَّعَامِ", "إِجْرَاءَ بِطَاقَةِ الطَّالِبِ", "لِقَاءَ المُدَيْرِ"]	C	1.00	2026-10-20 07:02:18.807679+00	\N
353	152	mc	مَنْ هِيَ الطَّالِبَةُ الجَدِيْدَةُ فِي الحِوَارِ؟	["أماندا", "مريم", "عائشة", "فاطمة"]	B	1.00	2026-10-20 07:02:18.807679+00	\N
354	152	mc	أَيْنَ تَسْكُنُ مَرْيَمُ؟	[". فِي شَارِعِ أَحْمَد يَنِي رَقْم 14", "فِي شَارِعِ أَحْمَد يَنِي رَقْم 24", "فِي المَدْرَسَةِ المَتَوَسِّطَةِ", ". فِي شُؤُوْنِ الطَّالِبَاتِ"]	B	1.00	2026-10-20 07:02:18.807679+00	\N
355	152	mc	مَاذَا تُرِيْدُ مَرْيَمُ أَنْ تَفْعَلَ فِي شُؤُوْنِ الطَّالِبَاتِ؟	["قِرَاءَةَ الكِتَابِ", "شِرَاءَ الطَّعَامِ", "لِقَاءَ المُدَيْرِ", "إِجْرَاءَ بِطَاقَةِ الطَّالِبَةِ"]	D	1.00	2026-10-20 07:02:18.807679+00	\N
356	152	mc	ما مهنة الرجل الذي يتحدث مع يونس؟	["موظف", "بواب المدرسة", "مدرس", "طالب"]	B	1.00	2026-10-20 07:02:18.807679+00	\N
357	152	mc	عن من يبحث يونس؟	["عن ابنه", "عن البواب", "عن الأستاذ عبد الكريم", "عن الموظف"]	C	1.00	2026-10-20 07:02:18.807679+00	\N
358	152	mc	ما هي المرافق العامة المذكورة في النص؟	["الفصول الدراسية والمكتبة والمسجد والملعب", "المكتبة والمسجد والمطبخ والمقصف", "الفصول الدراسية والمستشفى والملعب", "ديوان هيئة التدريس والحديقة والمسجد"]	A	1.00	2026-10-20 07:02:18.807679+00	\N
359	152	mc	أنتِ لم .... الما من البحر	["تشربي", "تشربا", "تشربين", "تشربوا"]	A	1.00	2026-10-20 07:02:18.807679+00	\N
289	149	mc	ظهر اهتمام علماء المسلمين ب..... مثل الفيزياء والكمياء والطب	["العلوم التجريبية", "علم اللغة", "علم القراعة", "علم التحسين"]	A	1.00	2026-10-19 07:24:39.888011+00	\N
290	149	mc	ابن سينا أحد الأطباء الذي استعمل .... فى الجراحة	["الدواء", "التخدير", "الضوء", "السرير"]	A	1.00	2026-10-19 07:24:39.888011+00	\N
291	149	mc	يتحدث المدرس والطلاب عن .....	["تقدم المسلمين", "الحضارة الإسلامية", "دين الإسلام", "التاريخ الإسلامي"]	C	1.00	2026-10-19 07:24:39.888011+00	\N
292	149	mc	جابر بن حيان ....	["أعظم كيميائ", "أول من استعمال التخدير في الجراحة", "أعظم فيزيائ", "منشئ علم الضوء"]	A	1.00	2026-10-19 07:24:39.888011+00	\N
293	149	mc	يتحدث كتاب تاريخ الحضارة الإسلامية عن ....	["الفيزياء", "الرياضيات", "علماء المسلمين", "الكيمياء"]	B	1.00	2026-10-19 07:24:39.888011+00	\N
294	149	mc	ليست الرحلات في العصور الماضية ....	["صعبة", "سهلة", "بعيدة", "محدودة"]	B	1.00	2026-10-19 07:24:39.888011+00	\N
295	149	mc	إبتدأت هذه الرحلات العلمية منذ فجر الإسلام في...	["طلب العلم", "ظلام الغرب", "نشر العلم", "بداية الإسلام"]	A	1.00	2026-10-19 07:24:39.888011+00	\N
296	149	mc	عرفنا أن الإسلام أكبر الأديان .... بالعلم	["اهتماما", "الإهتمام", "اهتمامي", "اهتمام"]	A	1.00	2026-10-19 07:24:39.888011+00	\N
297	149	mc	من المحدثين من يقطع ..... لتحقق من صحة الحديث	["الجبال", "البحار", "الطرق", "الصحاري"]	D	1.00	2026-10-19 07:24:39.888011+00	\N
298	149	mc	ماالغرض من الرحلات الدينية ؟	["توسيع مدى الأسفار", "ترتبط الأقاليم الإسلامية", "لتحقق سند الحديث", "طلب العلم"]	A	1.00	2026-10-19 07:24:39.888011+00	\N
299	149	mc	هناك أساليب الحياة الغربية السيئة تتأثر في مجال حياتنا, مثل ... بين الرجل و المرأة	["المعاشرة المعرفة", "المعاشرة الحرية", "المعاشرة النافعة", "المعاشرة المقتصرة"]	B	1.00	2026-10-19 07:24:39.888011+00	\N
300	149	mc	لابد لنا أن نرجع إلى ....	["الشريعة الإسلامية", "الشريعة الغربية", "الشريعة القديمة", "الشريعة الجديدة"]	A	1.00	2026-10-19 07:24:39.888011+00	\N
301	149	mc	كثير من الشباب متأثرون بالثقافة الغربية	["النافعة", "الخالدة", "السيئة", "الجيدة"]	C	1.00	2026-10-19 07:24:39.888011+00	\N
302	149	mc	لابد لنا أن نجد .... لإنقاذ الشباب من تأثيرات الثقافة الغربية السيئة	["الطريقة", "الكيفيات", "الوسيلة", "المنهج"]	A	1.00	2026-10-19 07:24:39.888011+00	\N
303	149	mc	نتأكيد من المباحيث الإسلامية في ...	["البيوت", "الأمكنة", "الإدارات", "المدارس"]	D	1.00	2026-10-19 07:24:39.888011+00	\N
304	149	essay	عين هذاالحال " يتعلم الطالب المعهد مجتهدين "	[]	حال المفردة	1.00	2026-10-19 07:24:39.888011+00	\N
305	149	essay	رتب هذه الكلمات : المسلمون - القرآن - يقرأ - قاعدا	[]	يقرأ المسلمون القرآن قاعدا	1.00	2026-10-19 07:24:39.888011+00	\N
306	149	essay	ماهو التمييز؟	[]	هو الإسم المذكور بعد مبهم ليوضحه	1.00	2026-10-19 07:24:39.888011+00	\N
307	149	essay	كم ينقسم التمييز؟ أذكر!	[]	ينقسم التمييزالى قسمين. التمييز ملفوظ و ملحوظ	1.00	2026-10-19 07:24:39.888011+00	\N
308	149	essay	عين هذا التمييز " رونلدو أسرع اللاعبين جريا "	[]	التمييز ملحوظ	1.00	2026-10-19 07:24:39.888011+00	\N
360	152	mc	الكافرون لن .... الجنة	["يدخلون", "يدخوا", "يدخلان", "تدخلي"]	B	1.00	2026-10-20 07:02:18.807679+00	\N
361	152	mc	ما مهنة والد فرمان؟	["طبيب", "شرطي", "طالب", "مهندس"]	B	1.00	2026-10-20 07:02:18.807679+00	\N
362	152	mc	من هي والدة فرمان؟	["هي طالبة", "هي طبيبة", "هي مولدة", "هي معلمة"]	B	1.00	2026-10-20 07:02:18.807679+00	\N
363	152	mc	من بجانب أم فرمان؟	["خي الكبير وأختي الكبيرة", "والدي وعثمان", "جدي وجدتي", "أخي وطبيب"]	B	1.00	2026-10-20 07:02:18.807679+00	\N
364	152	essay	عين الأفعال الخمسة وعلامة إعرابها في الجملة الاتية! "المسلمون يصلون جماعة"	[]	الأفعال الخمسة= يصلون، علامة إعرابها= ون	1.00	2026-10-20 07:02:18.807679+00	\N
365	152	essay	عين الأفعال الخمسة وعلامة إعرابها في الجملة الاتية! "هما يأكلان الطعام"	[]	الأفعال الخمسة= يأكلان، علامة إعرابها= ان	1.00	2026-10-20 07:02:18.807679+00	\N
366	152	essay	عين الأفعال الخمسة وعلامة إعرابها في الجملة الاتية! "يا عائشة لا تسكتي"	[]	الأفعال الخمسة= تسكتي، علامة إعرابها= ي	1.00	2026-10-20 07:02:18.807679+00	\N
367	152	essay	أعرب ما تحته الخطّ من العبارة "تكلمن ليلي مع حميها"	[]	مضاف إليه مجرور بالياء لأن أسماء الخمسة	1.00	2026-10-20 07:02:18.807679+00	\N
368	152	essay	بما تزود المدرسة سكن الطلاب؟ اذكر!	[]	تزود المدرسة سكن الطلبة بالمرافق العامة المختلفة، منها: غرف النوم، والمسجد، والمطبخ، وغرفة الأكل، والمكتبة، والملعب، وقاعة الاجتماع، والحاسوب، والمقصف.	1.00	2026-10-20 07:02:18.807679+00	\N
370	153	mc	تحتفل بذكرى هجرة الرسول صلى الله عليه وسلم، أليس كذلك؟	["بلى، تحتفل اليوم بهذه الحادثة الصغيرة.", "بلى، تحتفل اليوم بهذه الحادثة العظيمة", "بلى، نحتفل اليوم بهذه الحادثة القصيرة.", "بلى، نحتفل اليوم بهذه الحادثة السريعة."]	B	1.00	2026-10-20 07:17:16.669944+00	\N
371	153	mc	استمرت هجرة من يدخل في الإسلام إلى المدينة المنورة حتى فتح مكة عام .....	["٦ هـ", "٧ هـ", "٨ هـ", "٩ هـ"]	B	1.00	2026-10-20 07:17:16.669944+00	\N
309	150	mc	أَيُّ جُمْلَةٍ تَحْتَوِي عَلَى فِعْلِ أَمْرٍ؟	["كَتَبَ الطَّالِبُ الدَّرْسَ", "يَكْتُبُ الطَّالِبُ الدَّرْسَ", "اُكْتُبِ الدَّرْسَ يَا طَالِبُ", "الْكِتَابَةُ مُفِيدَةٌ"]	C	1.00	2026-10-19 07:28:33.206429+00	\N
310	150	mc	أَيُّ تَرْتِيبٍ صَحِيحٌ لِتَصْرِيفِ الْفِعْلِ "ذَهَبَ" (مَاضٍ – مُضَارِعٌ – أَمْرٌ)؟	["ذَهَبَ – يَذْهَبُ – اِذْهَبْ", "ذَهَبَ – يَذْهَبُ – تَذْهَبْ", "ذَهَبَ – ذَاهِبٌ – اِذْهَبْ", "يَذْهَبُ – ذَهَبَ – اِذْهَبْ"]	A	1.00	2026-10-19 07:28:33.206429+00	\N
311	150	mc	أَيُّ جُمْلَةٍ فِيهَا فِعْلٌ مُضَارِعٌ مَرْفُوعٌ؟	["َلمْ يَكْتُبْ مُحَمَّدٌ رِسَالَةً", "يَكْتُبُ مُحَمَّدٌ رِسَالَةً", "لَنْ يَكْتُبَ مُحَمَّدٌ رِسَالَةً", "لِيَكْتُبْ مُحَمَّدٌ رِسَالَةً"]	B	1.00	2026-10-19 07:28:33.206429+00	\N
312	150	mc	فِعْلُ الْأَمْرِ مِنَ الْفِعْلِ "قَرَأَ" هُوَ …	["ِإقْرَأْ", "اِقْرَأِي", "اِقْرَأُوا", "اِقْرَأْنَ"]	A	1.00	2026-10-19 07:28:33.206429+00	\N
313	150	mc	قَالَ الْمُعَلِّمُ لِطَالِبَةٍ وَاحِدَةٍ: “........ فِي مَكَانِكِ”. فِعْلُ الْأَمْرِ الصَّحِيحُ مِنْ "جَلَسَ" هُوَ …	["اِجْلِسْ", "اِجْلِسُوا", "اِجْلِسْنَ", "اِجْلِسِي"]	D	1.00	2026-10-19 07:28:33.206429+00	\N
314	150	mc	قَالَ الْمُعَلِّمُ لِمَجْمُوعَةِ طَالِبَاتٍ: “........ كُتُبَكُنَّ”. الْفِعْلُ الصَّحِيحُ هُوَ	["اِفْتَحُوا", "اِفْتَحِي", "اِفْتَحْنَ", "اِفْتَحَا"]	C	1.00	2026-10-19 07:28:33.206429+00	\N
315	150	mc	حَوِّلِ الْجُمْلَةَ "ذَاكَرَ مُحَمَّدٌ دُرُوسَهُ" إِلَى الْمُضَارِعِ، فَتَكُونُ: “........ مُحَمَّدٌ دُرُوسَهُ”.	["أذْكُرُ", "يَتَذَاكَرُ", "يَذْكُرُ", "يُذَاكِرُ"]	D	1.00	2026-10-19 07:28:33.206429+00	\N
316	150	mc	أَيُّ كَلِمَةٍ تُمَثِّلُ فِعْلَ الْأَمْرِ مِنَ الْفِعْلِ "تَعَلَّمَ" (لِلْمُفْرَدِ الْمُذَكَّرِ)؟	["تَعَلَّمْ", "اِتَعَلَّمْ", "عَلِّمْ", "تُعَلِّمْ"]	A	1.00	2026-10-19 07:28:33.206429+00	\N
317	150	mc	أيُّ جُمْلَةٍ تَحْتَوِي عَلَى فِعْلٍ مَاضٍ ثُمَّ مُضَارِعٍ ثُمَّ أَمْرٍ بِهَذَا التَّرْتِيبِ؟	["يَدْرُسُ أَخِي وَدَرَسَ أَبِي وَاكْتُبْ", "دَرَسْتُ أَمْسِ وَأَدْرُسُ الْآنَ فَاسْتَمِعْ إِلَيَّ", "اِدْرُسْ وَدَرَسَ وَيَدْرُسُ", "دَرَسَ وَدَرَسَتْ وَدَرَسُوا"]	B	1.00	2026-10-19 07:28:33.206429+00	\N
318	150	mc	يَا فَاطِمَةُ، ..... المَاءَ البَارِدَ! (فِعْلُ الأَمْرِ المُنَاسِبُ هُوَ):	["إِشْرَبْ", "إِشْرَبُوا", "إِشْرَبِيْ", "إِشْرَبْنَ"]	C	1.00	2026-10-19 07:28:33.206429+00	\N
319	150	mc	سَافَرَ أَبِي إِلَى جَاكَرْتَا أَمْسِ، وَهُوَ ..... الآنَ فِي الفُنْدُقِ.	["تَنَامُ", "يَنَامُ", "نَامَ", "يَنَامُوا"]	B	1.00	2026-10-19 07:28:33.206429+00	\N
320	150	mc	يَا صَدِيْقِي، لاَ ..... الوَقْتَ، وَ ..... إِلَى المَدْرَسَةِ مُبَكِّرًا!	["ضَاعَ - ذَهَبَ", "تُضِيْعِي - اِذْهَبِي", "تُضِيْعُوا - اِذْهَبُوا", "تُضِعْ - اِذْهَبْ"]	D	1.00	2026-10-19 07:28:33.206429+00	\N
192	144	mc	سورة النور الآية 2 تتحدث عن؟	["عقوبة الزناة", "ب. الشكر لله", "ج. الصلاة", "د. الكفارة"]	A	1.00	2026-10-19 04:34:25.759833+00	\N
193	144	mc	في سورة الإسراء آية 32، يحرم؟	["أ. القتل", "ب. الزنا", "ج. السرقة", "د. الكذب"]	B	1.00	2026-10-19 04:34:25.759833+00	\N
321	150	mc	يَا زَيْنَبُ، ..... الغُرْفَةَ الآنَ، ثُمَّ ..... الدَّرْسَ!	["نَظِّفْ - اُدْرُسْ", "نَظِّفْ - اُدْرُسُوا", "نَظِّفِي - اُدْرُسِي", "نَظِّفيِ - اُدْرُسْ"]	C	1.00	2026-10-19 07:28:33.206429+00	\N
322	150	mc	اخْتَرِ التَّصْرِيْفَ الصَّحِيْحَ لِلْفِعْلِ "دَخَلَ" مَعَ الضَّمَائِرِ (هُوَ - هُمْ - أَنْتِ - أَنَا) فِي المَاضِي:	["دَخَلَ - دَخَلُوا - دَخَلْتِ - دَخَلْتُ", "دَخَلَ - دَخَلْنَ - دَخَلْتَ - دَخَلْنَا", "دَخَلاَ - دَخَلْتُمْ - دَخَلْتُ - دَخَلْتِ", "يَدْخُلُ - يَدْخُلُونَ - تَدْخُلِيْنَ - أَدْخُلُ"]	A	1.00	2026-10-19 07:28:33.206429+00	\N
323	150	mc	يَا أُمِّي، هَلْ ..... الطَّعَامَ؟ أَنَا جَائِعٌ جِدًّا."	["طَبَخْتَ", "طَبَخْتِ", "تَطْبُخِيْنَ", "ِأطْبُخِي"]	B	1.00	2026-10-19 07:28:33.206429+00	\N
324	150	essay	.................الْمَرِيْضُ فِي الْمُسْتَشْفَى اكمل كلّ جملة من هذه الجمل الآتية بفعل ماض!	[]	ناَمَ الْمَرِيْضُ فِي الْمُسْتَشْفَى.	1.00	2026-10-19 07:28:33.206429+00	\N
325	150	essay	.................البُسْتَانِيّ الأَزْهَارَ اكمل كلّ جملة من هذه الجمل الآتية بفعل ماض!	[]	سَقَى البُسْتَانِيّ الأَزْهَارَ	1.00	2026-10-19 07:28:33.206429+00	\N
326	150	essay	حوّل ما يأتي إلى فعل الأمر! تَمْسَحُ السَبُوْرَةَ بِالطَلَاسَةِ	[]	امْسَحْ السَبُوْرَةَ بِالطَلَاسَةِ	1.00	2026-10-19 07:28:33.206429+00	\N
327	150	essay	حوّل ما يأتي إلى فعل الأمر! تَذْكُرُ الأَسْمَاءَ الأَنْبِيَاءِ	[]	اذْكُرْ الأَسْمَاءَ الأَنْبِيَاءِ	1.00	2026-10-19 07:28:33.206429+00	\N
328	150	essay	دَخَلَ غُلَامٌ حَدِيْقَةَ الأَزْهَارِ يَسْتَنْشِقُ هَوَاءً نَقِيًا فَمَشَى عَلَى مَهَلٍ وَانْتَقَلَ مِنْ زَهْرَةٍ إِلَى أُخْرَى يَتَلَذَّذُ بِرَائِحَةٍ شَذِيَّةٍ وَهَوَاءٍ بَارِدٍ   بَدِلْ كَلِمَةَ غُلَامٌ فِي القِصَةِ المَذْكُوْرَةِ بِكَلِمَةٍ "أَنْتَ"	[]	دَخَلْتَ حَدِيْقَةَ الأَزْهَارِ تَسْتَنْشِقُ هَوَاءً نَقِيًا فَمَشَيْتَ عَلَى مَهَلٍ وَانْتَقَلْتَ مِنْ زَهْرَةٍ إِلَى أُخْرَى تَتَلَذَّذُ بِرَائِحَةٍ شَذِيَّةٍ وَهَوَاءٍ بَارِدٍ	1.00	2026-10-19 07:28:33.206429+00	\N
329	151	mc	مَاذَا يَتَمَنَّى عُمَرُ أَنْ يَكُونَ فِي الْمُسْتَقْبَلِ؟	["طَبِيبًا", "مُدَرِّسًا", "جُنْدِيًّا", "مُهَنْدِسًا"]	C	1.00	2026-10-19 08:04:29.077808+00	\N
330	151	mc	كَيْفَ وَصَفَ عُمَرُ الْجُنْدِيَّ الَّذِي يَتَمَنَّى أَنْ يَكُونَهُ؟	["شُجَاعًا وَمُؤَدَّبًا وَمُبْدِعًا", "قَوِيًّا وَمَاهِرًا", "نَافِعًا وَكَرِيمًا", "وَاسِعَ الْعِلْمِ"]	A	1.00	2026-10-19 08:04:29.077808+00	\N
169	143	mc	مَا هُوَ المَعْنَى اللُّغَوِيُّ لِكَلِمَةِ "القُرْآنِ" عِنْدَ جُمْهُورِ العُلَمَاءِ؟	["أ. الكِتَابَةُ وَالتَّدْوِينُ", "ب. القِرَاءَةُ وَالـجَمْعُ", "ج. التَّشْرِيعُ وَالأَحْكَامُ", "د. الهِدَايَةُ وَالنُّورُ"]	B	1.00	2026-10-19 04:22:57.915398+00	\N
170	143	mc	يَرَى الإِمَامُ الشَّافِعِيُّ رَحِمَهُ اللَّهُ أَنَّ لَفْظَ "القُرْآنِ" هُوَ...؟	["أ. اِسْمٌ عَلَمٌ جَامِدٌ غَيْرُ مَهْمُوزٍ خَاصٌّ بِكَلَامِ اللَّهِ", "ب. مُشْتَقٌّ مِنْ فِعْلِ \\"قَرَأَ\\"", "ج. مَأْخُوذٌ مِنْ كَلِمَةِ \\"القِرَانِ\\" بِمَعْنَى الـجَمْعِ", "د. مُشْتَقٌّ مِنْ \\"القَرَائِنِ\\" لِتَشَابُهِ آيَاتِهِ"]	A	1.00	2026-10-19 04:22:57.915398+00	\N
171	143	mc	مَا هُوَ رَأْيُ الإِمَامِ الأَشْعَرِيِّ فِي أَصْلِ اِشْتِقَاقِ لَفْظِ "القُرْآنِ"؟	["أ. مُشْتَقٌّ مِنْ \\"قَرَأَ\\" بِمَعْنَى التِلَاوَةِ", "ب. مُشْتَقٌّ مِنْ \\"قَرَنَ\\" بِمَعْنَى الـجَمْعِ وَالضَّمِّ", "ج. مُشْتَقٌّ مِنْ \\"القَرَائِنِ\\" بِمَعْنَى الـمُشَابَهَةِ", "د. اِسْمٌ عَمَلِيٌّ غَيْرُ مُشْتَقٍّ"]	B	1.00	2026-10-19 04:22:57.915398+00	\N
172	143	mc	تَعْرِيفُ القُرْآنِ عِنْدَ الشَّيْخِ مُحَمَّدٍ عَلِيٍّ الصَّابُونِيِّ هُوَ كَلَامُ اللَّهِ الـمُعْجِزُ الـمُنَزَّلُ عَلَى خَاتَمِ الأَنْبِيَاءِ وَالـمُرْسَلِينَ بِوَاسِطَةِ...؟	["أ. الـمَلَكِ مِيكَائِيلَ عَلَيْهِ السَّلَامُ", "ب. الـمَلَكِ إِسْرَافِيلَ عَلَيْهِ السَّلَامُ", "ج. الـمَلَكِ جِبْرِيلَ عَلَيْهِ السَّلَامُ", "د. الإِلْهَامِ الـمُبَاشِرِ"]	C	1.00	2026-10-19 04:22:57.915398+00	\N
173	143	mc	يُرَكِّزُ عُلَمَاءُ أُصُولِ الفِقْهِ فِي تَعْرِيفِهِمْ لِلْقُرْآنِ الكَرِيمِ عَلَى أَنَّهُ...؟	["أ. المَكْتُوبُ فِي الـمَصَاحِفِ وَالـمَنْقُولُ بِالتَّوَاتُرِ وَالـمُتَعَبَّدُ بِتِلَاوَتِهِ لِاسْتِنْبَاطِ الأَحْكَامِ", "ب. القَصَصُ وَالأَخْبَارُ الـمَاضِيَةُ فَقَطْ", "ج. النَّصُّ الأَدَبِيُّ الـبَلِيغُ لِلْمُطَالَعَةِ", "د. كَلَامٌ الـمُرْسَلُ لِلتَّبَرُّكِ دُونَ التَّدَبُّرِ"]	A	1.00	2026-10-19 04:22:57.915398+00	\N
174	143	mc	السَّبَبُ الرَّئِيسِيُّ لِجَمْعِ القُرْآنِ فِي عَهْدِ أَبِي بَكْرٍ الصِّدِّيقِ رَضِيَ اللَّهُ عَنْهُ هُوَ...	["أ. كَثْرَةُ الفُتُوحَاتِ الإِسْلَامِيَّةِ", "ب. اسْتِشْهَادُ كَثِيرٍ مِنْ حُفَّاظِ القُرْآنِ فِي مَعْرَكَةِ اليَمَامَةِ", "ج. اخْتِلَافُ القِرَاءَاتِ بَيْنَب الأَبْصَارِ", "د. أَمْرٌ مِنَ النَّبِيِّ قَبْلَ وَفَاتِهِ"]	B	1.00	2026-10-19 04:22:57.915398+00	\N
175	143	mc	قَامَ الخَلِيفَةُ عُثْمَانُ بْنُ عَفَّانَ رَضِيَ اللَّهُ عَنْهُ بِنَسْخِ المَصَاحِفِ وَتَوْزِيعِهَا لِـ...	["أ. حِفْظِ القُرْآنِ مِنَ الضَّيَاعِ", "ب. تَوْحِيدِ القِرَاءَةِ وَقَطْعِ الخِلَافِ فِي النُّطْقِ", "ج. زِيَادَةِ المَصَاحِفِ فِي المَسَاجِدِ", "د. كِتَابَةِ التَّفْسِيرِ مَعَ الآيَاتِ"]	B	1.00	2026-10-19 04:22:57.915398+00	\N
176	143	mc	المَقْصُودُ بِكَوْنِ القُرْآنِ "مُنَقَّلًا بِالتَّوَاتُرِ" هُوَ أَنَّهُ نَقَلَهُ...	["أ. شَخْصٌ وَاحِدٌ عَنْ شَخْصٍ وَاحِدٍ", "ب. جَمْعٌ كَثِيرٌ عَنْ جَمْعٍ كَثِيرٍ يُسْتَحِيلُ تُوَاطُؤُهُمْ عَلَى الكَذِبِ", "ج. بَعْضُ الصَّحَابَةِ دُونَ غَيْرِهِمْ", "د. العُلَمَاءُ فِي القَرْنِ الثَّالِثِ الهِجْرِيِّ"]	B	1.00	2026-10-19 04:22:57.915398+00	\N
177	143	mc	مِنْ دَلَائِلِ أَصَالَةِ القُرْآنِ الكَرِيمِ وَعَدَمِ تَحْرِيفِهِ...	["أ. سُهُولَةُ حِفْظِهِ فِي الصُّدُورِ لِلكِبَارِ وَالصِّغَارِ", "ب. كِتَابَتُهُ بِاللُّغَةِ العَرَبِيَّةِ فَقَطْ", "ج. كَثْرَةُ سُوَرِهِ وَآيَاتِهِ", "د. وُجُودُ التَّفَاسِيرِ الكَثِيرَةِ"]	A	1.00	2026-10-19 04:22:57.915398+00	\N
178	143	mc	مَا هُوَ مَوْقِفُ المُسْلِمِ نَحْوَ المَصَاحِفِ العُثْمَانِيَّةِ؟	["أ. عَدَمُ الاعْتِمَادِ عَلَيْهَا", "ب. الاتِّبَاعُ وَالالْتِزَامُ بِرَسْمِهَا وَنَصِّهَا", "ج. جَوَازُ التَّغْيِيرِ فِي أَلْفَاظِهَا", "د. الاعْتِمَادُ عَلَى الحِفْظِ دُونَ الكِتَابَةِ"]	B	1.00	2026-10-19 04:22:57.915398+00	\N
331	151	mc	لِمَاذَا يُرِيدُ عُثْمَانُ أَنْ يَكُونَ طَبِيبًا؟	["لِأَنَّهُ يُحِبُّ التَّرْبِيَةَ", "كَيْ يَسْتَطِيعَ مُعَالَجَةَ الْمَرْضَى", "لِأَنَّهُ وَاسِعُ الْعِلْمِ", "كَيْ يَبْنِيَ الْبُيُوتَ"]	B	1.00	2026-10-19 08:04:29.077808+00	\N
332	151	mc	مَادَا يَقُولُ عُثْمَانُ فِي آخِرِ الْحِوَارِ؟	["نَسْأَلُ اللَّهَ أَنْ يُحَقِّقَ آمَالَنَا فِي الْمُسْتَقْبَلِ إِنْ شَاءَ اللَّهُ، آمِينَ", "مَعَ السَّلَامَةِ إِلَى اللَّقَاءِ", "شُكْرًا جَزِيلًا لَكَ", "صَبَاحَ الْخَيْرِ يَا صَحْبِي"]	A	1.00	2026-10-19 08:04:29.077808+00	\N
369	153	mc	نحن الآن في اليوم الأول من محرم، دخلنا في......	["عام قديم", "عام جديد", "عام كريم", "عام شريف"]	B	1.00	2026-10-20 07:17:16.669944+00	\N
179	143	mc	الغَايَةُ الأَسَاسِيَّةُ مِنْ خَلْقِ الجِنِّ وَالإِنْسِ كَمَا وَرَدَتْ فِي سُورَةِ الذَّارِيَاتِ (الآيَةِ ٥٦) هِيَ...	["أ. عِمَارَةُ الأَرْضِ وَالتِّجَارَةُ", "ب. العِبَادَةُ وَالطَّاعَةُ لِلَّهِ وَحْدَهُ", "ج. جَمْعُ المَالِ وَالأَوْلَادِ", "د. السَّفَرُ وَالاسْتِمْتَاعُ بِالدُّنْيَا"]	B	1.00	2026-10-19 04:22:57.915398+00	\N
180	143	mc	الآيَةُ الَّتِي تَدُلُّ عَلَى اسْتِخْلَافِ الإِنْسَانِ فِي الأَرْضِ هِيَ قَوْلُهُ تَعَالَى: ﴿وَإِذْ قَالَ رَبُّكَ لِلْمَلَائِكَةِ إِنِّي جَاعِلٌ فِي الْأَرْضِ...﴾	["أ. نَبِيًّا", "ب. خَلِيفَةً", "ج. عَبْدًا", "د. بَشَرًا"]	B	1.00	2026-10-19 04:22:57.915398+00	\N
181	143	mc	المَقْصُودُ بِـ "الخَلِيفَةِ" فِي الأَرْضِ كَمَا جَاءَ فِي سُورَةِ البَقَرَةِ (الآيَةِ ٣٠) هُوَ...	["أ. مَنْ يُمَارِسُ الحُكْمَ بِ الظُّلْمِ", "ب. مَنْ يَعْمُرُ الأَرْضَ وَيُقِيمُ العَدْلَ وَالشَّرِيعَةَ فِيهَا", "ج. مَنْ يَعْتَزِلُ النَّاسَ فِي المَسَاجِدِ", "د. المَلَائِكَةُ المُنَزَّلُونَ مِنَ السَّمَاءِ"]	B	1.00	2026-10-19 04:22:57.915398+00	\N
182	143	mc	مَا هُوَ مَوْقِفُ المَلَائِكَةِ عِنْدَمَا أَعْلَنَ اللَّهُ تَعَالَى عَنْ خَلْقِ الآدَمِ خَلِيفَةً فِي الأَرْضِ؟	["أ. الفَرَحُ وَالسُّرُورُ", "ب. التَّسَاؤُلُ عَنْ حِكْمَةِ خَلْقِ مَنْ يُفْسِدُ فِيهَا وَيَسْفِكُ الدِّمَاءَ", "ج. العِصْيَانُ وَالرَّفْضُ", "د. السُّكُوتُ التَّامُّ"]	B	1.00	2026-10-19 04:22:57.915398+00	\N
183	143	mc	بَيَّنَ اللَّهُ تَعَالَى فَضْلَ آدَمَ عَلَى المَلَائِكَةِ بِـ...	["أ. القُوَّةِ الجَسَدِيَّةِ", "ب. القُدْرَةِ عَلَى الطَّيَرَانِ", "ج. تَعْلِيمِهِ الأَسْمَاءَ كُلَّهَا", "د. طُولِ العُمُرِ"]	C	1.00	2026-10-19 04:22:57.915398+00	\N
184	143	essay	بَيِّنِ الفَرْقَ بَيْنَ مَعْنَى "القُرْآنِ" عِنْدَ الإِمَامِ الشَّافِعِيِّ وَالإِمَامِ الأَشْعَرِيِّ مِنْ حَيْثُ الاِشْتِقَاقُ اللُّغَوِيُّ!	[]	الإِمَامُ الشَّافِعِيُّ: يَرَى أَنَّ "القُرْآنَ" اِسْمٌ عَلَمٌ جَامِدٌ غَيْرُ مُشْتَقٍّ وَلَيْسَ مَهْمُوزًا، وُضِعَ خَصِيصًا لِكَلَامِ اللَّهِ المُنَزَّلِ (مِثْلَ التَّوْرَاةِ وَالإِنجِيلِ). الإِمَامُ الأَشْعَرِيُّ: يَرَى أَنَّهُ مُشْتَقٌّ مِنْ فِعْلِ "قَرَنَ" (بِلَا هَمْزَةٍ) بِمَعْنَى ضَمَّ الشَّيْءَ إِلَى الشَّيْءِ، لِأَنَّ آيَاتِهِ وَسُوَرَهُ يَقْتَرِنُ بَعْضُهَا بِبَعْضٍ	1.00	2026-10-19 04:22:57.915398+00	\N
185	143	essay	اُكْتُبِ التَّعْرِيفَ الاِصْطِلَاحِيَّ لِلْقُرْآنِ الكَرِيمِ عِنْدَ الشَّيْخِ مُحَمَّدٍ عَلِيٍّ الصَّابُونِيِّ!	[]	هُوَ كَلَامُ اللَّهِ الـمُعْجِزُ، الـمُنَزَّلُ عَلَى خَاتَمِ الأَنْبِيَاءِ وَالـمُرْسَلِينَ (مُحَمَّدٍ ﷺ)، بِوَاسِطَةِ الأَمِينِ جِبْرِيلَ عَلَيْهِ السَّلَامُ، الـمَكْتُوبُ فِي الـمَصَاحِفِ، الـمَنْقُولُ إِلَيْنَا بِالتَّوَاتُرِ، الـمُتَعَبَّدُ بِتِلَاوَتِهِ، الـمَبْدُوءُ بِسُورَةِ الفَاتِحَةِ وَالـمَخْتُومُ بِسُورَةِ النَّاسِ."	1.00	2026-10-19 04:22:57.915398+00	\N
189	144	mc	ما المقصود بالتحريم في النهي عن الاختلاط بغير المحرم؟	["المسموح به", "الممنوع والمحظور شرعاً", "مستحب", "مكروه"]	B	1.00	2026-10-19 04:34:25.759833+00	\N
190	144	mc	الآية التي تحرم الاختلاط بغير المحرم في سورة النور هي؟	["أ. الآية 2", "ب. الآية 3", "ج. الآية 4", "د. الآية 5"]	A	1.00	2026-10-19 04:34:25.759833+00	\N
188	143	essay	اُذْكُرِ المَرَاحِلَ القُرْآنِيَّةَ لِتَطَوُّرِ خَلْقِ الإِنْسَانِ فِي الرَّحِمِ بِالتَّرْتِيبِ كَمَا وَرَدَتْ فِي سُورَةِ المُؤْمِنُونَ (١٢-١٤)!	[]	المَرَاحِلُ القُرْآنِيَّةُ لِخَلْقِ الإِنْسَانِ: السُّلَالَةُ مِنْ طِينٍ. النُّطْفَةُ فِي قَرَارٍ مَكِينٍ. العَلَقَةُ (دَمٌ مُنْعَقِدٌ). المُضْغَةُ (قِطْعَةُ لَحْمٍ). كِسَاءُ العِظَامِ بِاللَّحْمِ. إِنْشَاؤُهُ خَلْقًا آخَرَ (نَفْخُ الرُّوحِ).	1.00	2026-10-19 04:22:57.915398+00	\N
187	143	essay	اُذْكُرْ آيَةً قُرْآنِيَّةً تَدُلُّ عَلَى حِفْظِ اللَّهِ تَعَالَى لِلْقُرْآنِ الكَرِيمِ مِنَ التَّحْرِيفِ وَالتَّبْدِيلِ!	[]	الآيَةُ الدَّالَّةُ: قَوْلُهُ تَعَالَى فِي سُورَةِ الحِجْرِ (الآيَةُ ٩): ﴿إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ﴾.	1.00	2026-10-19 04:22:57.915398+00	\N
194	144	mc	مَا الحُكْمُ إِذَا تَخَاصَمَ اِثْنَانِ مِنَ المـُؤْمِنِينَ كَمَا فِي سُورَةِ الحُجُرَاتِ؟	["أ. الإِصْلَاحُ بَيْنَهُمَا", "ب. تَرْكُهُمَا", "ج. مَسَاعَدَةُ الأَقْوَى", "د. نَشْرُ الخِلَافِ"]	A	1.00	2026-10-19 04:34:25.759833+00	\N
195	144	mc	السُّخْرِيَةُ مِنَ الآخَرِينَ فِي سُورَةِ الحُجُرَاتِ (آيَة 11) حُكْمُهَا	["أ. مُبَاحَةٌ", "ب. مُسْتَحَبَّةٌ", "ج. مُحَرَّمَةٌ", "د. مَكْرُوهَةٌ"]	C	1.00	2026-10-19 04:34:25.759833+00	\N
196	144	mc	نَهَتْ سُورَةُ الحُجُرَاتِ (آيَة 12) عَنْ عِدَّةِ أَخْلَاقٍ سَيِّئَةٍ، مِنْهَا	["أ. الغِيبَةُ وَالـجَسَّسُ وَكَثْرَةُ الظَّنِّ", "ب. الصَّدَقَةُ وَالإِحْسَانُ", "ج. الصَّبْرُ وَالتَّوَكُّلُ", "د. الصِّدْقُ وَالأَمَانَةُ"]	A	1.00	2026-10-19 04:34:25.759833+00	\N
197	144	mc	كَيْفَ شَبَّهَ اللَّهُ تَعَالَى الغِيبَةَ فِي سُورَةِ الحُجُرَاتِ؟	["أ. كَأَكْلِ مَالِ اليَتِيمِ", "ب. كَأَكْلِ لَحْمِ الأَخِ مَيْتًا", "ج. كَالشِّرْكِ بِاللَّهِ", "د. كَقَطْعِ الرَّحِمِ"]	B	1.00	2026-10-19 04:34:25.759833+00	\N
198	144	mc	مِعْيَارُ الأَفْضَلِيَّةِ بَيْنَ النَّاسِ عِنْدَ اللَّهِ فِي سُورَةِ الحُجُرَاتِ (آيَة 13) هُوَ	["أ. النَّسَبُ وَالـحَسَبُ", "ب. المَالُ وَالثَّرْوَةُ", "ج. التَّقْوَى", "د. الـجَمَالُ وَالقُوَّةُ"]	C	1.00	2026-10-19 04:34:25.759833+00	\N
199	144	mc	مَا الحُكْمُ الشَّرْعِيُّ لِطَلَبِ العِلْمِ عَلَى كُلِّ مُسْلِمٍ؟	["أ. وَاجِبٌ / فَرْضٌ", "ب. مُسْتَحَبٌّ", "ج. مُبَاحٌ", "د. مَكْرُوهٌ"]	A	1.00	2026-10-19 04:34:25.759833+00	\N
200	144	mc	فِي سُورَةِ التَّوْبَةِ (آيَة 122)، أَمَرَ اللَّهُ أَنْ تَنْفِرَ طَائِفَةٌ مِنْ كُلِّ فِرْقَةٍ لِ	["أ. التِّجَارَةِ", "ب. التَّفَقُّهِ فِي الدِّينِ", "ج. الزِّرَاعَةِ", "د. السَّفَرِ لِلنُّزْهَةِ"]	B	1.00	2026-10-19 04:34:25.759833+00	\N
201	144	mc	مَا الغَرَضُ مِنْ تَعَلُّمِ الدِّينِ كَمَا فِي سُورَةِ التَّوْبَةِ: 122؟	["أ. لِيُنْذِرُوا قَوْمَهُمْ إِذَا رَجَعُوا إِلَيْهِمْ", "ب. لِيَجْمَعُوا المَالَ", "ج. لِيَتَفَاخَرُوا بِالعِلْمِ", "د. لِيَأْخُذُوا المَنَاصِبَ"]	A	1.00	2026-10-19 04:34:25.759833+00	\N
202	144	mc	مَا مَعْنَى المُنْذِرِينَ فِي الآيَةِ؟	["أ. المـُعَلِّمُونَ وَالـدُّعَاةُ", "التُّجَّارُ", "ج. الـحُكَّامُ", "د. الـجُنُودُ"]	A	1.00	2026-10-19 04:34:25.759833+00	\N
203	144	mc	تَدُلُّ سُورَةُ التَّوْبَةِ (122) عَلَى أَنَّ تَعَلُّمَ العِلْمِ وَنَشْرَهُ	["أ. مَلاَزِمٌ لِلْجِهَادِ فِي سَبِيلِ اللَّهِ", "ب. أَمْرٌ ثَانَوِيٌّ", "ج. غَيْرُ مُهِمٍّ", "د. خَاصٌّ بِالعُلَمَاءِ فَقَطْ"]	A	1.00	2026-10-19 04:34:25.759833+00	\N
204	144	essay	مَا هُوَ عِقَابُ الزَّانِي وَالزَّانِيَةِ غَيْرِ المـُحْصَنَيْنِ فِي سُورَةِ النُّورِ: 2؟	[]	عِقَابُهُمَا هُوَ جَلْدُ كُلِّ وَاحِدٍ مِنْهُمَا مِائَةَ جَلْدَةٍ	1.00	2026-10-19 04:34:25.759833+00	\N
205	144	essay	. اُذْكُرْ أَمْرَيْنِ هَامَّيْنِ يَتَعَلَّقَانِ بِتَنفِيذِ حُدُودِ الزِّنَا فِي سُورَةِ النُّورِ: 2	[]	(1) عَدَمُ الأَخْذِ بِالرَّأْفَةِ فِي دِينِ اللَّهِ عِنْدَ تَطْبِيقِ الحَدِّ، (2) حُضُورُ طَائِفَةٍ مِنَ المـُؤْمِنِينَ لِشَهَادَةِ العَذَابِ	1.00	2026-10-19 04:34:25.759833+00	\N
206	144	essay	مَاذَا يَجِبُ عَلَى المُسْلِمِينَ إِذَا حَدَثَ خِلَافٌ بَيْنَهُمْ وَفْقًا لِسُورَةِ الحُجُرَاتِ: 10؟	[]	يَجِبُ عَلَيْهِمْ الإِصْلَاحُ بَيْنَ الأَخَوَيْنِ بِالـعَدْلِ وَالتَّقْوَى لِتَحْقِيقِ الأُخُوَّةِ الإِسْلَامِيَّةِ	1.00	2026-10-19 04:34:25.759833+00	\N
207	144	essay	اُذْكُرْ ثَلَاثَةً مِنَ الأَدَابِ الاِجْتِمَاعِيَّةِ المَذْكُورَةِ فِي سُورَةِ الحُجُرَاتِ (11-12)!	[]	(1) تَرْكُ السُّخْرِيَةِ، (2) اجْتِنَابُ كَثْرَةِ الظَّنِّ، (3) تَرْكُ الغِيبَةِ وَالتَّجَسُّسِ	1.00	2026-10-19 04:34:25.759833+00	\N
208	144	essay	كَيْفَ بَيَّنَتْ سُورَةُ التَّوْبَةِ (آيَة 122) أَهَمِّيَّةَ التَّوَازُنِ بَيْنَ الجِهَادِ وَتَعَلُّمِ العِلْمِ؟	[]	بَيَّنَتْ الآيَةُ أَنَّهُ لاَ يَجُوزُ أَنْ يَخْرُجَ المـُسْلِمُونَ كُلُّهُمْ إِلَى الجِهَادِ، بَلْ لاَبُدَّ مِنْ بَقَاءِ جَمَاعَةٍ لِتَعَلُّمِ الدِّينِ وَحِفْظِ المَعْرِفَةِ لِلأُمَّةِ	1.00	2026-10-19 04:34:25.759833+00	\N
333	151	mc	مَا هِيَ الْجُمْلَةُ الَّتِي تَدُلُّ عَلَى دُعَاءِ عُثْمَانَ فِي نِهَايَةِ الْكَلَامِ؟	["أَتَمَنَّى أَنْ أَكُونَ طَبِيبًا", "هَذَا مُنَاسِبٌ لَكَ يَا عَلِيُّ", "نَسْأَلُ اللَّهَ أَنْ يُحَقِّقَ آمَالَنَا", "أَنَا أُفَضِّلُ أَنْ أَكُونَ مُدَرِّسًا"]	C	1.00	2026-10-19 08:04:29.077808+00	\N
334	151	mc	مَاذَا يَفْعَلُ حُسَيْنٌ عِنْدَمَا رَآهُ عَبْدُ الرَّحْمَنِ؟	["يُنَظِّفُ الْمَكْتَبَ", "يُنَظِّفُ الْبَيْتَ", "يَأْكُلُ الطَّعَامَ", "يَذْهَبُ إِلَى الْمُسْتَشْفَى"]	B	1.00	2026-10-19 08:04:29.077808+00	\N
335	151	mc	لِمَذَا مَرِضَ عَبْدُ الرَّحْمَنِ فِي بَطْنِهِ؟	["لِأَنَّهُ شَرِبَ مَاءً بَارِدًا", "لِأَنَّهُ اشْتَرَى الْمَأْكُولَاتِ فِي الشَّارِعِ", "لِأَنَّهُ لَمْ يَنَمْ لَيْلًا", "لِأَنَّهُ أَكَلَ كَثِيرًا فِي الْبَيْتِ"]	B	1.00	2026-10-19 08:04:29.077808+00	\N
372	153	mc	مَاذَا عَرَفْت عَنْ بِدَايَةِ رَأْسِ السَّنَةِ الهِجْرِيَّةِ؟	["بَدَأَتِ السَّنَةُ الهِجْرِيَّةُ عِنْدَمَا هَاجَرَ الرَّسُوْلُ مِنْ مَكَّةَ إِلَى يَثْرِبَ.", "بَدَأَتِ السَّنَةُ الهِجْرِيَّةُ عِنْدَمَا وُلِدَ الرَّسُوْلُ فِيْ مَكَّةَ.", "بَدَأَتِ السَّنَةُ الهِجْرِيَّةُ عِنْدَمَا تُوُفِّيَ الرَّسُوْلُ فِيْ المَدِيْنَةِ", "بَدَأَتِ السَّنَةُ الهِجْرِيَّةُ عِنْدَمَا نَامَ عَلِيٌّ فِيْ فِرَاشِ الرَّسُوْلِ"]	A	1.00	2026-10-20 07:17:16.669944+00	\N
373	153	mc	مَا هُوَ الِاسْمُ الآخَرُ لِمَدِيْنَةِ يَثْرِبَ بَعْدَ هِجْرَةِ الرَّسُوْلِ؟	["مَكَّةُ المُكَرَّمَةُ", "المَدِيْنَةُ المُنَوَّرَةُ", "جِدَّةُ", "القَاهِرَةُ"]	B	1.00	2026-10-20 07:17:16.669944+00	\N
374	153	mc	مَنْ هُوَ مُحَمَّدٌ؟	["هُوَ مُحَمَّدُ بْنُ عَبْدِ اللهِ خَاتَمُ النَّبِيِّيْنَ.", "هُوَ مُحَمَّدُ بْنُ عَبْدِ اللهِ أَوَّلُ الرَّسُوْلِ.", "هُوَ مُحَمَّدُ بْنُ عَبْدِ المُطَّلِبِ خَاتَمُ النَّبِيِّيْنَ.", "هُوَ مُحَمَّدُ بْنُ عَبْدِ الرَّحْمَنِ خَاتَمُ الرُّسُلِ."]	A	1.00	2026-10-20 07:17:16.669944+00	\N
375	153	mc	كَيْفَ كَانَ خُلُقُهُ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ؟	["كَانَ خُلُقُهُ الأَنَامَ.", "بِخَيْرٍ، كَانَ خُلُقُهُ الإِحْسَانَ.", "كَانَ خُلُقُهُ الإِنْسَانَ.", "كَانَ خُلُقُهُ القُرْآنَ."]	D	1.00	2026-10-20 07:17:16.669944+00	\N
376	153	mc	كَيْفَ نُحْيِي ذِكْرَى مَوْلِدِ رَسُوْلِ اللهِ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ؟	["بِاتِّبَاعِ سُنَّتِهِ.", "بِزِيَارَةِ بَيْتِهِ.", "بِإِكْرَامِ مَدِيْنَتِهِ.", "بِتَرْكِ سُنَّتِهِ."]	A	1.00	2026-10-20 07:17:16.669944+00	\N
377	153	mc	مَا اسْمُ أُمِّهِ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ؟	["آمِنَة", "خَدِيْجَة", "حَلِيْمَة", "أَمِيْنَة"]	A	1.00	2026-10-20 07:17:16.669944+00	\N
378	153	mc	وَمَا اسْمُ أَبِيْهِ وَجَدِّهِ وَعَمِّهِ؟	["اِسْمُ أَبِيْهِ عَبْدُ المُطَّلِبِ، وَجَدِّهُ عَبْدُ اللهِ وَعَمِّهُ أَبِيْ طَالِبٍ.", "اِسْمُ أَبِيْهِ أَبِيْ طَالِبٍ، وَجَدِّهُ عَبْدُ المُطَّلِبِ وَعَمِّهُ عَبْدُ اللهِ.", "اِسْمُ أَبِيْهِ عَبْدُ اللهِ، وَجَدِّهُ عَبْدُ المُطَّلِبِ وَعَمِّهُ أَبِيْ طَالِبٍ.", "سْمُ أَبِيْهِ عَبْدُ اللهِ، وَجَدِّهُ أَبِيْ طَالِبٍ وَعَمِّهُ عَبْدُ المُطَّلِبِ."]	C	1.00	2026-10-20 07:17:16.669944+00	\N
379	153	mc	ما أول ما نزل من القرآن؟	["الآيات الخمس الأولى من سورة العلق", "الآيات الخمس الأولى من سورة الفلق.", ". الآيات الخمس الأولى من سورة المدثر.", ". الآيات الخمس الأولى من سورة المائدة."]	A	1.00	2026-10-20 07:17:16.669944+00	\N
380	153	mc	كم عدد سور القرآن الكريم ...	["١١٤ سورة", "١١٥ سورة", "١١٦ سورة", ". ١١٧ سورة"]	A	1.00	2026-10-20 07:17:16.669944+00	\N
381	153	mc	فِي أَيِّ تَارِيخٍ نَزَلَ القُرْآنُ؟	["فِي السَّابِعِ مِنْ رَمَضَانَ", "فِي السَّابِعَ عَشَرَ مِنْ رَمَضَانَ", ". فِي التَّاسِعَ عَشَرَ مِنْ رَمَضَانَ", "فِي الخَامِسَ عَشَرَ مِنْ رَمَضَانَ"]	B	1.00	2026-10-20 07:17:16.669944+00	\N
382	153	mc	وَمَا مُدَّةُ نُزُولِ الْقُرْآنِ؟	["مُدَّتُه ٢٠ سَنَةً، مِنْهَا ١٠ سَنَوَاتٍ فِي مَكَّةَ الْمُكَرَّمَةِ وَ ١٠ سَنَوَاتٍ فِي الْمَدِينَةِ الْمُنَوَّرَةِ.", "مُدَّتُه ٢٣ سَنَةً، مِنْهَا ١٥ سَنَةً فِي مَكَّةَ الْمُكَرَّمَةِ وَ ٨ سَنَوَاتٍ فِي الْمَدِينَةِ الْمُنَوَّرَةِ.", "مُدَّتُه ٢٣ سَنَةً، مِنْهَا ١٣ سَنَةً فِي مَكَّةَ الْمُكَرَّمَةِ وَ ١٠ سَنَوَاتٍ فِي الْمَدِينَةِ الْمُنَوَّرَةِ.", "مُدَّتُه ٣٣ سَنَةً، مِنْهَا ٢٣ سَنَةً فِي مَكَّةَ الْمُكَرَّمَةِ وَ ١٠ سَنَوَاتٍ فِي الْمَدِينَةِ الْمُنَوَّرَةِ."]	C	1.00	2026-10-20 07:17:16.669944+00	\N
383	153	mc	مَا زِيدَ فِيهِ ثَلَاثَةُ أَحْرُفٍ فَلَهُ ....	["أَرْبَعَةُ أَوْزَانٍ", "خَمْسَةُ أَوْزَانٍ", ". سِتَّةُ أَوْزَانٍ", "سَبْعَةُ أَوْزَانٍ"]	A	1.00	2026-10-20 07:17:16.669944+00	\N
384	153	essay	في أي شهر نحن الآن بحسب الحوار؟	[]	في شهر محرم.	1.00	2026-10-20 07:17:16.669944+00	\N
385	153	essay	ماذا كانت تسمية المدينة المنورة قبل هجرة الرسول إليها؟	[]	يثرب	1.00	2026-10-20 07:17:16.669944+00	\N
386	153	essay	في أي سنة ميلادية كانت هجرة الرسول صلى الله عليه وسلم؟	[]	في عام ٦٢٢ ميلادي.	1.00	2026-10-20 07:17:16.669944+00	\N
387	153	essay	صَرِّفِ الفِعْلَ (كَتَبَ) مَعَ الضَّمِيْرِ "هُمْ"!	[]	كَتَبُوا	1.00	2026-10-20 07:17:16.669944+00	\N
388	153	essay	صَرِّفِ الفِعْلَ (جَلَسَ) مَعَ الضَّمِيْرِ "أَنْتُمْ"!	[]	جَلَسْتُمْ	1.00	2026-10-20 07:17:16.669944+00	\N
410	155	mc	٢. اين نام محمد ؟	["في فرا شه", "في الفصل", "في المدرسة", "في المسجد"]	A	1.00	2026-10-20 07:22:07.273965+00	\N
411	155	mc	٣. ماذا عمل محمد في الساعة عاشرة ؟	["ينام", "ياكل", "يشرب", "يسثحم"]	A	1.00	2026-10-20 07:22:07.273965+00	\N
412	155	mc	٤. كيف كان الد نيا حين ذلك ؟	["ساكنة", "ظلم", "برد", "حار"]	A	1.00	2026-10-20 07:22:07.273965+00	\N
413	155	mc	٥. كيف كان ا ليل حين ذلك ؟	["ظلم", "برد", "ساكنة", "حار"]	A	1.00	2026-10-20 07:22:07.273965+00	\N
414	155	mc	٦ اي صوت في الشارع ؟	["الخفير", "القط", "دفدع", "البومة"]	A	1.00	2026-10-20 07:22:07.273965+00	\N
415	155	mc	١٠. مَاذَا فَعَلَ النَّاسُ بَعْدَ انْقِطَاعِ الْمَطَرِ	["أ. ذَهَبُوا إِلَى الْمَدْرَسَةِ", "ب. ذَهَبُوا إِلَى السُّوقِ", "ج. ذَهَبُوا إِلَى الْبَيْتِ", "د. ذَهَبُوا إِلَى الْمَزْرَعَةِ"]	C	1.00	2026-10-20 07:22:07.273965+00	\N
416	155	mc	١. مَاذَا فِي السَّمَاءِ؟	["أ. نُجُومٌ كَثِيرَةٌ", "ب. سَحَابٌ كَثِيرٌ", "أ. نُجُومٌ كَثِيرَةٌ", "ج. طُيُورٌ كَثِيرَةٌ"]	B	1.00	2026-10-20 07:22:07.273965+00	\N
417	155	mc	٢. مَاذَا حَجَبَ السَّحَابُ	["أ. الْقَمَرَ", "ب. النُّجُومَ", "ج. الشَّمْسَ", "ج. الشَّمْسَ"]	D	1.00	2026-10-20 07:22:07.273965+00	\N
418	155	mc	٣. مَاذَا نَسْمَعُ قَبْلَ الْمَطَرِ؟	["أ. صَوْتَ الرَّعْدِ", "صَوْتَ الرِّيَاحِ", "صَوْتَ الطُّيُورِ", "صَوْتَ النَّاسِ"]	A	1.00	2026-10-20 07:22:07.273965+00	\N
419	155	mc	٤. مَاذَا يَلْمَعُ فِي السَّمَاءِ؟	["أ. الْمَطَرُ", "ب. الْبَرْقُ", "ج. السَّحَابُ", "د. الْهَوَاءُ"]	B	1.00	2026-10-20 07:22:07.273965+00	\N
420	155	mc	٥. أَيْنَ وَقَفَ الرَّجُلُ لِيَرَى الْمَطَرَ؟	["أ. فِي الطَّرِيقِ", "ب. فِي الْمَدْرَسَةِ", "ج. فِي الْبَابِ", "د. فِي الْبَيْتِ"]	C	1.00	2026-10-20 07:22:07.273965+00	\N
855	177	mc	ماهو الرزق لغةً؟ الرزق في اللغة...	["المال", "الشئ", "ما ينفع به", "مالا ينفع به"]	C	1.00	2026-10-26 06:55:54.049897+00	\N
856	177	mc	ارزاق العباد وأقواتهم بيد...	["الرزق", "الرزّاق", "رزقين", "رزقة"]	B	1.00	2026-10-26 06:55:54.049897+00	\N
857	177	mc	اذكر بعض فوائد فى حياة المؤمنين بعد لإيمان باسم الله الرزاق؟	["يزداد ثقة يقينافي ربه", "يزداد الروق", "الرزق من الله", "كل رزق من الله"]	A	1.00	2026-10-26 06:55:54.049897+00	\N
858	177	mc	مارأيك فى موظف يتودد ويتقرب الى المديره وأنه الذى يرزقه؟	["واجب", "جائز", "مخالف فى الدين", "يرجي في الدين"]	C	1.00	2026-10-26 06:55:54.049897+00	\N
859	177	mc	ما معنى الملك عند الامام الغزالى؟	["هو الذى يستغنى فى ذاته وصفاته عن كل موجود", "هو الذى لا يستغنى فى ذاته وصفاته عن كل موجود", "كل موجود", "كل موجود يستغنى في ذاته"]	A	1.00	2026-10-26 06:55:54.049897+00	\N
860	177	mc	ماالمراد من هذه الآية "إِنَّ اللهَ كَانَ عَلَى كُلِّ شَيْءٍ حَسِيْبًا"	["يحفظ الله العباد اعمالهم", "الله الرزاق", "الله الملك", "عباد الله يحفظون اعمالهم"]	A	1.00	2026-10-26 06:55:54.049897+00	\N
861	177	mc	وَلِلَّهِ مُلْكُ السَّمَاوَاتِ وَالْأَرْضِ ۗ وَاللَّهُ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ (ال عمران : 189) هذه الآية دليلٌ أنَّ الله...	["عَالِمُ الْغَيْبِ وَ الشَّهادَة", "الملك صاحب المُلْكِ", "أن الله عالم", "مافى السماء والأرض لله"]	B	1.00	2026-10-26 06:55:54.049897+00	\N
862	177	mc	من القيم الايجابية فى الايمان باسم الله الرازق...	["التوكل وتوحيد الله والدعاء باسم الله", "التوكل والعبادة", "التوحيد والعبادة", "العبادة"]	A	1.00	2026-10-26 06:55:54.049897+00	\N
863	177	mc	متى يشرع لمؤمن أنيحرص على فعل مكفرات الذنوب؟	["اذا علم المؤمن أنَّ الله غفور", "اذا علم المؤمن ذنوبة", "اذا علم المؤمن المعاصى", "اذا علم الذنوب"]	A	1.00	2026-10-26 06:55:54.049897+00	\N
864	177	mc	الدعاء عند الخروج من البيت...	["أَعُوْذُ بِالله", "السَّلَامَة", "بِسْمِ اللهِ تَوَكَّلْتُ عَلَى اللَّهِ لَاحَوْلَ وَلَا قُوَّةَ الا بالله", "بِاسْمِ الله"]	C	1.00	2026-10-26 06:55:54.049897+00	\N
865	177	essay	اكتب دليلًا أن رزاق العباد واقواتهم بيد للهِ!	[]	وَمَا مِنْ دَابَّةٍ فِي الْأَرْضِ إِلَّا عَلَى اللَّهِ رِزْقُهَا وَيَعْلَمُ مُسْتَقَرَّهَا وَمُسْتَوْدَعَهَا (هود : 6)	1.00	2026-10-26 06:55:54.049897+00	\N
866	177	essay	اشرح أن الفائدة الاولى من الايمان باسم الله الرزاق كوجوب التوكل!	[]	اول شيء ان يتعلم العبد من اسم الله الرزاق أن يزداد ثقه يقينا فى ربّه فلا يتوكل الّا عليه	1.00	2026-10-26 06:55:54.049897+00	\N
867	177	essay	لماذا غفر الله ذنوب العبد مهما عظمت ذنوبه؟	[]	لأن مغفرة الله واسعة	1.00	2026-10-26 06:55:54.049897+00	\N
868	177	essay	اكتب دليلا أن الله غفارٌ!	[]	رَبُّ السَّمَاوَاتِ وَالْأَرْضِ وَمَا بَيْنَهُمَا الْعَزِيزُ الْغَفَّارُ (ص : 66)	1.00	2026-10-26 06:55:54.049897+00	\N
869	177	essay	اكمل هذه الآية "أَيُّهَا النَّبِي حَسْبُكَ الله...	[]	يَٰٓأَيُّهَا ٱلنَّبِىُّ حَسْبُكَ ٱللَّهُ وَمَنِ ٱتَّبَعَكَ مِنَ ٱلْمُؤْمِنِينَ (الانفال : 64)	1.00	2026-10-26 06:55:54.049897+00	\N
1083	188	mc	مامعنى "وقت الصغر"؟	["ابان الصبا", "بادر", "العز", "مسعاك"]	A	1.00	2026-10-26 08:07:13.604031+00	\N
1084	188	mc	مامعنى "مكان سعيك"؟	["ابان الصبا", "بادر", "العز", "مسعاك"]	D	1.00	2026-10-26 08:07:13.604031+00	\N
1085	188	essay	ما أغنى الغنى؟	[]	أغنى الغنى غنى النفس	1.00	2026-10-26 08:07:13.604031+00	\N
1086	188	essay	فيم تنال العز والشرف؟	[]	تنال العز والشرف باالعلم والعمل الصالح	1.00	2026-10-26 08:07:13.604031+00	\N
421	155	mc	٣. مَاذَا فَعَلَ الْأَسَدُ بِالْفَأْرِ؟	["أ. أَكَلَه", "ب. تَرَكَهُ وَخَلَّى عَنْه", "ج. ضَرَبَه", "د. طَرَدَه"]	B	1.00	2026-10-20 07:22:07.273965+00	\N
422	155	mc	٤. أَيْنَ وَقَعَ الْأَسَدُ؟	["أ. فِي الْبَيْت", "ب. فِي النَّهْر", "ج. فِي الشَّبَكَة", "د. فِي الْحَقْل"]	C	1.00	2026-10-20 07:22:07.273965+00	\N
423	155	mc	٥. مَنْ جَاءَ لِيُنْقِذَ الْأَسَدَ؟	[". الْفَأْرُ", "ب. الْقَار", "ج. الْقِط", "د. الصَّيَّاد"]	A	1.00	2026-10-20 07:22:07.273965+00	\N
424	155	mc	٦. بِمَاذَا قَطَعَ الْفَأْرُ الشَّبَكَةَ؟	["أ. بِأَسْنَانِه", "ب. بِسَيْفِه", "ج. بِقَدَمِه", "د. بِحَجَر"]	A	1.00	2026-10-20 07:22:07.273965+00	\N
425	155	essay	مَاذَا رَأَى مُحَمَّدٌ؟	[]	حريقا	1.00	2026-10-20 07:22:07.273965+00	\N
426	155	essay	١. كَيْفَ كَانَ السَّحَابُ فِي السَّمَاءِ؟	[]	كَانَ فِي السَّمَاءِ سَحَابٌ كَثِيرٌ، وَقَدْ صَارَ أَسْوَدَ جِدًّا.	1.00	2026-10-20 07:22:07.273965+00	\N
427	155	essay	٢. مَاذَا يَأْتِي بَعْدَ صَوْتِ الرَّعْدِ؟	[]	الإجابة: يَأْتِي بَعْدَ صَوْتِ الرَّعْدِ الْمَطَرُ	1.00	2026-10-20 07:22:07.273965+00	\N
428	155	essay	٣. كَيْفَ أَنْقَذَ الْفَأْرُ الْأَسَدَ مِنَ الشَّبَكَةِ؟	[]	. قَطَعَ الْفَأْرُ الشَّبَكَةَ بِأَسْنَانِهِ حَتَّى خَرَجَ الْأَسَدُ سَالِمًا	1.00	2026-10-20 07:22:07.273965+00	\N
429	155	essay	٤، مَاذَا قَالَ الْأَسَدُ لِلْفَأْرِ بَعْدَ أَنْ أَنْقَذَهُ؟	[]	. قَالَ الْأَسَدُ لِلْفَأْرِ: شُكْرًا جَزِيلًا عَلَى مُسَاعَدَتِكَ.	1.00	2026-10-20 07:22:07.273965+00	\N
430	156	mc	كَمْ يَوْمًافِي الأُسْبُوْعِ؟	["سَبْعَةُ", "ثَمَانِيَّةُ", "عِسْرُوْنَ", "سَادِسَةُ"]	A	1.00	2026-10-20 07:25:55.287625+00	\N
431	156	mc	أَيُّ يَوْمٍ قَبْلَ يَوْمِ الإِثْنَيْنِ؟	["الجُمُعَةُ", "الخَمِيْسُ", "الأَحَدُ", "الثُّلّاثَاءُ"]	C	1.00	2026-10-20 07:25:55.287625+00	\N
432	156	mc	أَيُّ يَوْمٍ بَعْدَ يَوْمِ الأَحَدِ؟	["الأَرْبِعَاءُ", "الإِثْنَيْنِ", "السَّبْةُ", "الجُمُعَةُ"]	B	1.00	2026-10-20 07:25:55.287625+00	\N
433	156	mc	كَمْ شَهْرًا فِي السَّنَةِ الهِجْرِيَّةِ؟	["عَشَرَ شَهْرًا", "عِشْرُوْنَ شَهْرًا", "خَمْسَ شَهْرً", "شَهْرَيْنِ"]	A	1.00	2026-10-20 07:25:55.287625+00	\N
434	156	mc	أَيُّ شَهْرٍ بَيْنَ شَهْرِ مُحَرَّمَ وَ رَبِيْعُ الأَوَّلُ؟	["شَوَّالُ", "رَمَضَانُ", "رَجَبُ", "صَفَّارُ"]	D	1.00	2026-10-20 07:25:55.287625+00	\N
435	156	mc	أَيُّ شَهْرٍ بَعْدَ شَهْرِ أَبْرِيْلْ؟	["مَايُو", "أَغُسْطُسْ", "أُكْتُوْبَرْ", "دِيْسَمْبِرْ"]	A	1.00	2026-10-20 07:25:55.287625+00	\N
436	156	mc	أَيُّ شَهْرٍ بَيْنَ شَهْرِ أَغُسْطُسْ وَ أُكْتُوْبَرْ	["يُوْلِيُوْ", "أََبْرِيْلْ", "سِبْتَمْبٍرْ", "يَنَايِرْ"]	C	1.00	2026-10-20 07:25:55.287625+00	\N
437	156	mc	كَمْ أَصْبُعًا لِكُلِّ يَدٍ؟	["ثَلَاثُ أَصْبُعَ", "تِسْعُ أَصَابِعَ", "عَشَرَ أَصَابِعَ", "خَمْسُ أَصَابِعَ"]	D	1.00	2026-10-20 07:25:55.287625+00	\N
438	156	mc	أَيْنَ السَّبَابَةُ؟	["بَيْنَ الحِنْصَرُ وَالبِنْصَرُ", "بَيْنَ الحِنْصَرُ وَالسَّبَابَةُ", "بَيْنَ الوُسْطَى وَالبِنْصَرُ", "بَيْنَ الإِبْهمُ وَالْوُسْطَى"]	D	1.00	2026-10-20 07:25:55.287625+00	\N
439	156	mc	مَاذَاللرَّأْسِ؟	["هُدْبٌ وحَاجِبٌ", "شَأْرٌ وَجَبْهَةٌ وَأَنْفٌ", "شَارِبٌ وَالْحِيَّةٌ", "شَفَةٌ وَسِنٌّ ولِسَانٌ"]	B	1.00	2026-10-20 07:25:55.287625+00	\N
440	156	mc	مََاذَالِلْعَيْنِ؟	["جَفْنٌ وهُدْبٌ وحَاجِبٌ", "شَفَةٌ وَسِنٌّ ولِسَانٌ", "شَأْرٌ وَجَبْهَةٌ وَأَنْفٌ", "شَأْرٌ وَجَبْهَةٌ وَأَنْفٌ"]	A	1.00	2026-10-20 07:25:55.287625+00	\N
441	156	mc	مَاذَا فِيْ السَّاحَةِ؟	["فِي السَّاحَةِ الْأُسْتَاذُ", "فِي السَّاحَةِ الْقِطُّ", "فِي السَّاحَةِ الدَّجَاجَةُ", "فِي السَّاحَةِ الدِّيْكُ"]	D	1.00	2026-10-20 07:25:55.287625+00	\N
442	156	mc	مَعْنَي فِي لْإِنْدُونِسِيَّا "لَهُ رِيْشٌ جَمِيْلٌ"	["Ia memiliki wajah", "Ia memiliki dua kepala", "Ia Memiliki bulu yang indah", "Ia Memiliki kuku yang besar"]	C	1.00	2026-10-20 07:25:55.287625+00	\N
443	156	mc	مَتَي يَصِيْحُ الدِّيْقِ؟	["يَصِيْحُ فِي اللَّيْلِ", "يَصِيْحُ فِي الصَّبَاحِ", "يَصِيْحُ فِي الْمَسَاءِ", "يَصِيْحُ فِي الْفَصْلِ"]	B	1.00	2026-10-20 07:25:55.287625+00	\N
444	156	mc	مَعْنَي فِي لْإِنْدُونِسِيَّا "يَقِفُ الْقِطَارُ فِي الْمَحَطَّةِ"	["Kereta berhenti di stasiun", "Kereta melewati stasiun", "Kereta tetap di stasiun", "Kereta berjalan di stasiun"]	A	1.00	2026-10-20 07:25:55.287625+00	\N
445	156	essay	أََيُّ يَوْمٍ بَيْنَ السَّبْتُ وَ الثُّلَاثَاءُ؟	[]	يَوْمٌ بَيْنَ السَّبْتُ وَ الثُّلَاثَاءُ هُمَا الأَحَدُ وَ الاِثْنَيْنِ	1.00	2026-10-20 07:25:55.287625+00	\N
446	156	essay	مَاهِى الشُّهُوْرُ الْهِجْرِيَّةِ؟	[]	أَشْهُرُ السَّنَةِ الْهِجْرِيَّةِ اثْنَا عَشَرَ شَهْرًا، وَهِيَ: مُحَرَّمٌ، صَفَرٌ، رَبِيعُ الْأَوَّلِ، رَبِيعُ الْآخِرِ، جُمَادَى الْأُولَى، جُمَادَى الْآخِرَةِ، رَجَبٌ، شَعْبَانُ، رَمَضَانُ، شَوَّالٌ، ذُو الْقَعْدَةِ، وَذُو الْحِجَّةِ.	1.00	2026-10-20 07:25:55.287625+00	\N
447	156	essay	كََمْ يَدًا لِلْإِنْسَانِ؟	[]	لِلْإِنْسَانِ يَدَانِ	1.00	2026-10-20 07:25:55.287625+00	\N
448	156	essay	أَيْنَ الْوُسْطَى؟	[]	اَلْوُسْطَى بَيْنَ السَّبَابَةُ وَالْبِنْصَرُ	1.00	2026-10-20 07:25:55.287625+00	\N
449	156	essay	مَاذَا فِى السَّاحَةِ؟	[]	فِىى السَّاحَةِ دِيْكٌ	1.00	2026-10-20 07:25:55.287625+00	\N
450	157	mc	١. إِلَى مَنْ ذَهَبَ الْفَلَّاحُ؟	["إِلَى السُّوق", ". إِلَى جَارِهِ", ". إِلَى الْمَدْرَسَة", ". إِلَى الْمَسْجِد"]	B	1.00	2026-10-20 07:27:56.591697+00	\N
451	157	mc	٢. مَاذَا أَصَابَ الْقَمْحَ فِي حَقْلِ الْفَلَّاحِ؟	["الْحَرِيق", ". الْمَطَر", "التَّلَف", "الْجَفَاف"]	C	1.00	2026-10-20 07:27:56.591697+00	\N
452	157	mc	٣. مَا سَبَبُ تَلَفِ الْقَمْحِ؟	["كَثْرَةُ دُخُولِ الْكِلَابِ فِيه", "كَثْرَةُ الْمَطَر", "قِلَّةُ الْمَاء", "قِلَّةُ الشَّمْس"]	A	1.00	2026-10-20 07:27:56.591697+00	\N
453	157	mc	٤. كَمْ بَلَغَتِ الْخَسَارَةُ؟	["عَشَرِينَ جُنَيْهًا", "ب. ثَلَاثِينَ جُنَيْهًا", "أَرْبَعِينَ جُنَيْهًا", "خَمْسِينَ جُنَيْهًا"]	B	1.00	2026-10-20 07:27:56.591697+00	\N
454	157	mc	٥. مَاذَا قَالَ الْجَارُ لِلْفَلَّاحِ؟	["لَا أُرِيدُ مُسَاعَدَتَك", ". أَنَا مُسْتَعِدٌّ لِتَعْوِيضِ خَسَارَتِك", ". اذْهَبْ إِلَى السُّوقِ", "لَا تَزْرَعِ الْقَمْحَ"]	B	1.00	2026-10-20 07:27:56.591697+00	\N
455	157	mc	١. إِلَى أَيْنَ ذَهَبَتِ النَّمْلَةُ؟	["إِلَى الْمَدْرَسَة", ". إِلَى جَدْوَلِ الْمَاء", "إِلَى السُّوق", ". إِلَى الْحَدِيقَة"]	B	1.00	2026-10-20 07:27:56.591697+00	\N
456	157	mc	٢. لِمَاذَا ذَهَبَتِ النَّمْلَةُ إِلَى الْمَاءِ؟	["أ. لِتَلْعَب", "لِتَسْبَح", "لِتَشْرَبَ وَتَسْتَرِيح", "لِتَصْطَادَ السَّمَكَ"]	C	1.00	2026-10-20 07:27:56.591697+00	\N
457	157	mc	٣. مَاذَا حَدَثَ لِلنَّمْلَةِ فِي الْمَاءِ ؟	["سَقَطَتْ فِي الْمَاء", "خَرَجَتْ مِنَ الْمَاء", "طَارَت", ". نَامَت"]	A	1.00	2026-10-20 07:27:56.591697+00	\N
458	157	mc	٤. لِمَاذَا لَمْ تَسْتَطِعِ النَّمْلَةُ الْخُرُوجَ مِنَ الْمَاءِ؟	[". لِأَنَّهَا جَائِعَة", "لِأَنَّهَا لَا تَعْرِفُ السِّبَاحَة", "لِأَنَّهَا مَرِيضَة", "لِأَنَّهَا نَائِمَةٌ"]	B	1.00	2026-10-20 07:27:56.591697+00	\N
459	157	mc	٥. مَنْ أَنْقَذَ النَّمْلَةَ مِنَ الْغَرَقِ؟	[". الْقِطَّة", "الْكَلْب", "الْحَمَامَة", "الثَّعْلَب"]	C	1.00	2026-10-20 07:27:56.591697+00	\N
460	157	mc	١. كم كان كان عمر عد يلة ؟	["ثلاث سنوات", "اربع سنوات", "ثماني سنوات", "عشر سنوات"]	B	1.00	2026-10-20 07:27:56.591697+00	\N
461	157	mc	٢. ماذا كانت تحب عد يلة ؟	["الاسماك", "الطيور", "القط", "الخيول"]	B	1.00	2026-10-20 07:27:56.591697+00	\N
462	157	mc	٣. الي اين كان ابوها يرسلها مع اخيها الكبير ؟	["الي المدرسة", "الي السوق", "الي حديقة الحيوان", "الي المسجد"]	C	1.00	2026-10-20 07:27:56.591697+00	\N
463	157	mc	٤. كيف كان شكل الطاءر ؟	["قبيحا", "جميلا", "كبيرا", "ابيض"]	B	1.00	2026-10-20 07:27:56.591697+00	\N
464	157	mc	٥. ما اونه الراس و الذنبه الطاءر ؟	["ابيض", "احمر", "اسود", "احضر"]	C	1.00	2026-10-20 07:27:56.591697+00	\N
465	157	essay	٣. كَمْ بَلَغَتْ خَسَارَةُ الْفَلَّاحِ؟	[]	: بَلَغَتْ خَسَارَةُ الْفَلَّاحِ ثَلَاثِينَ جُنَيْهًا.	1.00	2026-10-20 07:27:56.591697+00	\N
466	157	essay	٤. مَاذَا فَعَلَ السَّرِيُّ بِالْمَبْلَغِ؟	[]	أَحْضَرَ السَّرِيُّ خَمْسَةَ أَمْثَالِ الْمَبْلَغِ وَقَدَّمَهَا إِلَى الْفَلَّاحِ لِيَحْفَظَهَا لِابْنِهِ.	1.00	2026-10-20 07:27:56.591697+00	\N
467	157	essay	٣. كَيْفَ أَنْقَذَتِ الْحَمَامَةُ النَّمْلَةَ مِنَ الْغَرَقِ؟	[]	٣. أَلْقَتِ الْحَمَامَةُ عُودًا مِنَ الْحَشِيشِ إِلَى الْمَاءِ، فَتَعَلَّقَتْ بِهِ النَّمْلَةُ وَخَرَجَت من العالم بسلام	1.00	2026-10-20 07:27:56.591697+00	\N
468	157	essay	٤. مَاذَا فَعَلَتِ النَّمْلَةُ عِنْدَمَا رَأَتِ الصَّيَّادَ يُرِيدُ اصْطِيَادَ الْحَمَامَةِ؟	[]	٤. قَرَصَتِ النَّمْلَةُ الصَّيَّادَ قَرْصَةً شَدِيدَةً، فَتَحَرَّكَتِ الرَّصَاصَةُ وَلَمْ تُصِب الحا مة	1.00	2026-10-20 07:27:56.591697+00	\N
469	157	essay	١. من هي عد يلة ؟	[]	عد يلة بنت سنها ثماني سنوات	1.00	2026-10-20 07:27:56.591697+00	\N
470	158	mc	مَنْ هُوَ الرَّجُلُ الَّذِي اشْتَهَرَ بِالْكَرَمِ فِي هَذِهِ الْقِصَّةِ؟	["عَبْدُ اللَّهِ بْنُ عُمَرَ", "عَبْدُ اللَّهِ بْنُ جَعْفَرٍ", "أَبُو بَكْرٍ الصِّدِّيقُ", "عَلِيُّ بْنُ أَبِي طَالِبٍ"]	B	1.00	2026-10-20 07:29:32.25262+00	\N
471	158	mc	كَمْ رَغِيفًا أَعْطَى الْغُلَامُ لِلْكَلْبِ؟	["رَغِيفًا وَاحِدًا", "رَغِيفَيْنِ", "ثَلَاثَةَ أَقْرَاصٍ", "أَرْبَعَةَ أَقْرَاصٍ"]	C	1.00	2026-10-20 07:29:32.25262+00	\N
472	158	mc	لِمَاذَا آثَرَ الْغُلَامُ الْكَلْبَ بِطَعَامِهِ؟	["لِأَنَّهُ كَانَ خَائِفًا مِنَ الْكَلْبِ", "لِأَنَّ الْكَلْبَ جَاءَ مِنْ مَسَافَةٍ بَعِيدَةٍ وَلَيْسَ فِي أَرْضِهِمْ كِلَابٌ", "لِأَنَّ الْغُلَامَ لَمْ يَكُنْ جَائِعًا", "لِأَنَّ صَاحِبَ الْبُسْتَانِ أَمَرَهُ بِذَلِك"]	B	1.00	2026-10-20 07:29:32.25262+00	\N
473	158	mc	مَاذَا فَعَلَ عَبْدُ اللَّهِ بْنُ جَعْفَرٍ بَعْدَ أَنْ رَأَى صَنِيعَ الْغُلَامِ؟	["اشْتَرَى الْبُسْتَانَ وَالْغُلَامَ وَأَعْتَقَهُ وَوَهَبَهُ الْبُسْتَانَ", "أَعْطَى الْغُلَامَ بَعْضَ الْمَالِ وَرَحَلَ", "غَضِبَ مِنْ تَصَرُّفِ الْغُلَامِ", "أَخَذَ الْكَلْبَ مَعَهُ"]	A	1.00	2026-10-20 07:29:32.25262+00	\N
474	158	mc	مَنِ الْمَلِكُ الَّذِي وَحَّدَ الْقُطْرَيْنِ (مِصْرَ الْعُلْيَا وَالسُّفْلَى)؟	["الْمَلِكُ خُوفُو", "الْمَلِكُ رَمْسِيسُ الثَّانِي", "الْمَلِكُ مِينَا", "الْمَلِكُ أُوزُورِيس"]	C	1.00	2026-10-20 07:29:32.25262+00	\N
475	158	mc	مَا الأَثَرُ الشَّهِيرُ الَّذِي بَنَاهُ الْمَلِكُ خُوفُو فِي الْجِيزَةِ؟	["مَعْبَدُ أَبِي سِمْبِل", "الْهَرَمُ الْأَكْبَرُ", "السَّدُّ الْعَالِي", "أَبُو الْهَوْل"]	B	1.00	2026-10-20 07:29:32.25262+00	\N
476	158	mc	أَيُّ مَلِكٍ شَهِدَتْ فَتْرَةُ حُكْمِهِ بِنَاءَ مَعْبَدِ أَبِي سِمْبِل؟	["الْمَلِكُ مِينَا", "الْمَلِكُ خُوفُو", "الْمَلِكُ رَمْسِيسُ الثَّانِي", "الْمَلِكُ حَتْشَبْسُوت"]	C	1.00	2026-10-20 07:29:32.25262+00	\N
477	158	mc	لِمَاذَا شَيَّدَ الْفَرَاعِنَةُ الأَهْرَامَاتِ وَالْمَقَابِرَ الْفَاخِرَةَ؟	["لِلزِّينَةِ وَالتِّجَارَةِ", "لِتَكُونَ مَلَاذًا لِأَرْوَاحِهِمْ بَعْدَ الْمَوْتِ", "لِحِمَايَةِ الْبِلَادِ مِنَ الأَعْدَاءِ", "لِتَخْزِينِ الْحُبُوبِ وَالْمَاءِ"]	B	1.00	2026-10-20 07:29:32.25262+00	\N
478	158	mc	مَنِ الْخَلِيفَةُ الْعَبَّاسِيُّ الَّذِي حَاصَرَ مَدِينَةَ عَمُّورِيَّةَ؟	["هَارُونُ الرَّشِيدُ", "الْمُعْتَصِمُ بِاللَّهِ", "أَبُو جَعْفَرٍ الْمَنْصُورُ", "الْمَأْمُونُ"]	B	1.00	2026-10-20 07:29:32.25262+00	\N
479	158	mc	بِمَاذَا حَذَّرَ الْمُنَجِّمُونَ الْخَلِيفَةَ الْمُعْتَصِمَ؟	["حَذَّرُوهُ مِنْ خِيَانَةِ جُنُودِهِ", "حَذَّرُوهُ مِنْ فَتْحِ عَمُّورِيَّةَ وَقَالُوا إِنَّ الطَّالِعَ يَدُلُّ عَلَى الْهَزِيمَةِ", "حَذَّرُوهُ مِنْ قِلَّةِ الْمَاءِ", "حَذَّرُوهُ مِنْ شِدَّةِ الْبَرْدِ"]	B	1.00	2026-10-20 07:29:32.25262+00	\N
480	158	mc	كَيْفَ كَانَ مَوْقِفُ الْمُعْتَصِمِ مِنْ تَكَهُّنَاتِ الْمُنَجِّمِينَ؟	["اسْتَمَعَ إِلَيْهِمْ وَأَجَّلَ الْهَجُومَ", "لَمْ يَلْتَفِتْ إِلَيْهِمْ وَتَوَكَّلَ عَلَى اللَّهِ", "أَعْطَاهُمُ الْمَالَ", "هَرَبَ مِنَ الْمَعْرَكَةِ"]	B	1.00	2026-10-20 07:29:32.25262+00	\N
481	158	mc	مَنِ الشَّاعِرُ الَّذِي قَالَ قَصِيدَتَهُ الْمَشْهُورَةَ "السَّيْفُ أَصْدَقُ أَنْبَاءً مِنَ الْكُتُبِ"؟	["أَبُو الطَّيِّبِ الْمُتَنَبِّي", "أَبُو تَمَّامٍ", "زُهَيْرُ بْنُ أَبِي سُلْمَى", "أَبُو نُوَّاسٍ"]	B	1.00	2026-10-20 07:29:32.25262+00	\N
482	158	mc	مَاذَا كَانُوا يَدْفِنُونَ مَعَ الْمُلُوكِ وَالأَثْرِيَاءِ؟	["أَوْرَاقًا وَأَقْلَامًا فَقَطْ", "مَقَادِيرَ هَائِلَةً مِنَ الذَّهَبِ وَالْقِطَعِ الثَّمِينَةِ وَالأَثَاثِ وَالأَطْعِمَةِ", "أَسْلِحَةً خَشَبِيَّةً", "لَا يَدفِنُونَ مَعَهُمْ شَيْئًا"]	B	1.00	2026-10-20 07:29:32.25262+00	\N
483	158	mc	مَاذَا بَنَوْا لِحِفْظِ الأَجْسَادِ وَالأَمْوَالِ؟	["بَنَوْا مَقَابِرَ مُصَفَّحَةً وَقَامُوا بِتَحْنِيطِ الأَجْسَادِ", "بَنَوْا سُفُنًا بَحْرِيَّةً", "بَنَوْا مُسْتَشْفَيَاتٍ", "بَنَوْا مَدَارِسَ حَدِيثَةً"]	A	1.00	2026-10-20 07:29:32.25262+00	\N
484	158	mc	مَا الأَثَرُ السَّلْبِيُّ لِهَذَا التَّرَفِ وَالإِسْرَافِ المفرِطِ؟	["أَدَّى إِلَى فَوْزِهِمْ فِي الْحُرُوبِ", "أَرْهَقَ اقْتِصَادَ الْبِلَادِ فِي بَعْضِ الْعُصُورِ", "زَادَ مِنْ عَدَدِ السُّكَّانِ", "جَعَلَ الْجَمِيعَ أَغْنِيَاءَ"]	B	1.00	2026-10-20 07:29:32.25262+00	\N
485	158	essay	كَيْفَ أَظْهَرَ الْغُلَامُ كَرَمَهُ وَإِيثَارَهُ فِي الْقِصَّةِ؟	[]	أَظْهَرَ الْغُلَامُ كَرَمَهُ بِإِطْعَامِ الْكَلْبِ كُلَّ قُوتِ يَوْمِهِ (أَقْرَاصِهِ الثَّلَاثَةِ) رَغْمَ حَاجَتِهِ إِلَيْهِ.	1.00	2026-10-20 07:29:32.25262+00	\N
486	158	essay	لِمَاذَا اشْتَرَى عَبْدُ اللَّهِ بْنُ جَعْفَرٍ الْغُلَامَ وَأَعْتَقَهُ؟	[]	لِأَنَّهُ رَأَى سَخَاءَ الْغُلَامِ وَإِيثَارَهُ الْعَظِيمَ، فَقَدَّرَ جُودَهُ وَأَرادَ جَزَاءَهُ بِالْحُرِّيَّةِ وَالإِحْسَانِ.	1.00	2026-10-20 07:29:32.25262+00	\N
487	158	essay	مَا السَّبَبُ الرَّئِيسِيُّ وَرَاءَ بِنَاءِ الْفَرَاعِنَةِ لِلأَهْرَامَاتِ وَالْمَقَابِرِ الضَّخْمَةِ؟	[]	كَانَ السَّبَبُ شَغَفَهُمْ بِالْخُلُودِ وَاعْتِقَادَهُمْ أَنَّهَا تَكُونُ مَلَاذًا لِأَرْوَاحِهِمْ بَعْدَ الْمَوْتِ.	1.00	2026-10-20 07:29:32.25262+00	\N
488	158	essay	مَيِّزْ بَيْنَ أَعْمَالِ الْمَلِكِ مِينَا وَالْمَلِكِ رَمْسِيسَ الثَّانِي كَمَا وَرَدَ فِي النَّصِّ.	[]	الْمَلِكُ مِينَا قَامَ بِتَوْحِيدِ الْقُطْرَيْنِ (مِصْرَ الْعُلْيَا وَالسُّفْلَى)، بَيْنَمَا رَمْسِيسُ الثَّانِي اشْتَهَرَ بِبِنَاءِ الْمَعَابِدِ الضَّخْمَةِ كَمَعْبَدِ أَبِي سِمْبِل.	1.00	2026-10-20 07:29:32.25262+00	\N
489	158	essay	لِمَاذَا رَفَضَ قَائِدُ الأَعْدَاءِ احْتِرَامَ الْخَائِنِ رَغْمَ أَنَّهُ خَدَمَهُمْ؟	[]	لِأَنَّهُ يَعْلَمُ أَنَّ مَنْ خَانَ قَوْمَهُ وَوَطَنَهُ لَا يُؤْمَنُ شَرُّهُ، وَأَنَّهُ لَا أَمَانَ لِلْخَائِنِ حَتَّى عِنْدَ الأَعْدَاءِ.	1.00	2026-10-20 07:29:32.25262+00	\N
490	159	mc	مَاذَا أَرَادَ التَّاجِرُ أَنْ يَسْتَخْدِمَ عِنْدَهُ؟	["طَبِيبًا", "كَاتِبًا", "مُعَلِّمًا", "مُهَنْدِسًا"]	B	1.00	2026-10-20 07:31:21.137099+00	\N
491	159	mc	كَيْفَ كَانَ عَدَدُ الشُّبَّانِ الَّذِينَ تَقَدَّمُوا لِلْوَظِيفَةِ؟	["قَلِيلًا جِدًّا", "غَيْرَ قَلِيلٍ", "وَاحِدًا فَقَطْ", "ثَلَاثَةً"]	B	1.00	2026-10-20 07:31:21.137099+00	\N
492	159	mc	لِمَاذَا كَانَ التَّاجِرُ يُحَادِثُ الشُّبَّانَ فِي مَسَائِلَ كَثِيرَةٍ؟	["لِيَعْلَمَ مِقْدَارَ فِطْنَتِهِمْ وَآدَابِهِمْ", "لِيُعَلِّمَهُمُ الْكِتَابَةَ", "لِيَشْتَرِيَ مِنْهُمْ بَضَائِعَ", "لِيَمْضِيَ الْوَقْتَ"]	A	1.00	2026-10-20 07:31:21.137099+00	\N
535	161	mc	الْخَبَرُ فِي الْجُمْلَةِ الِاسْمِيَّةِ اسْمٌ ...	["A. مَرْفُوعٌ", "B. مَنْصُوبٌ", "C. مَجْرُورٌ", "D. مَجْزُومٌ"]	A	1.00	2026-10-20 07:40:17.585081+00	\N
493	159	mc	مَنْ الَّذِي اسْتَغْرَبَ مِنْ سُرْعَةِ اخْتِيَارِ التَّاجِرِ؟	["الشَّابُّ الْمُخْتَارُ", "كَاتِبُ الْمَكْتَبِ", "صَدِيقُ التَّاجِرِ", "أُسْرَةُ التَّاجِرِ"]	C	1.00	2026-10-20 07:31:21.137099+00	\N
494	159	mc	مَاذَا فَعَلَ الشَّابُّ عِنْدَ دُخُولِهِ الْمَكْتَبَ؟	["جَلَسَ فَوْرًا", "مَسَحَ نَعْلَيْهِ عَلَى الْمِمْسَحَةِ", "فَتَحَ الْبَابَ بِقُوَّةٍ", "تَكَلَّمَ بِصَوْتٍ عَالٍ"]	B	1.00	2026-10-20 07:31:21.137099+00	\N
495	159	mc	الصِّفَةُ الَّتِي فَهِمَهَا التَّاجِرُ مِنْ انْتِظَارِ الشَّابِّ لِدَوْرِهِ هِي:َ	["الشَّجَاعَةُ", "التَّوَاضُعُ", "الْكَرَمُ", "الصَّبْرُ"]	B	1.00	2026-10-20 07:31:21.137099+00	\N
496	159	mc	مَا هُوَ عُنْوَانُ النَّصِّ؟	["التَّاجِرُ وَالصَّدِيقُ", "كَيْفَ تَكُونُ كَاتِبًا", "الأَدَبُ أَمَامَ النَّاسِ", "الأَدَبُ أَسَاسُ النَّجَاحِ"]	D	1.00	2026-10-20 07:31:21.137099+00	\N
497	159	mc	أَيْنَ مَرَّ الرَّجُلَانِ؟	["فِي مَدِينَةٍ كَبِيرَةٍ", "فِي أَجَمَةٍ كَثِيرَةِ الأَشْجَارِ", "فِي شَاطِئِ الْبَحْرِ", "فِي السُّوقِ"]	B	1.00	2026-10-20 07:31:21.137099+00	\N
498	159	mc	مَاذَا رَأَى أَحَدُهُمَا عَلَى الأَرْضِ؟	["مَالًا كَثِيرًا", "ثِمارًا سَاقِطَةً", "آثَارَ أَقْدَامِ السِّبَاعِ", "حَبْلًا طَوِيلًا"]	C	1.00	2026-10-20 07:31:21.137099+00	\N
499	159	mc	ِمَاذَا خَافَ الرَّجُلُ الأَوَّلُ؟	["خَشِيَ أَنْ يَخْرُجَ عَلَيْهِمَا سَبُعٌ وَلَيْسَ مَعَهُمَا سِلَاحٌ", "خَافَ مِنَ الظَّلَامِ", "ضَلَّ الطَّرِيقَ", "كَانَ مَرِيضًا"]	A	1.00	2026-10-20 07:31:21.137099+00	\N
500	159	mc	مَاذَا قَالَ الرَّجُلُ المُدَّعِي لِرَفِيقِهِ فِي البِدَايَةِ؟	["\\"اهْرُبْ سَرِيعًا!\\"", "\\"لا تَخَفْ مَا دُمْتُ أَنَا مَعَكَ\\"", "\\"أَعْطِنِي السِّلَاحَ\\"", "\\"اتْرُكْنِي وَاحْدِي\\""]	B	1.00	2026-10-20 07:31:21.137099+00	\N
501	159	mc	مَا الحَيَوَانُ الَّذِي أَتَى إِلَيْهِمَا؟	["أَسَدٌ", "ذِئْبٌ", "دُبٌّ", "نَمِرٌ"]	C	1.00	2026-10-20 07:31:21.137099+00	\N
502	159	mc	َاذَا فَعَلَ المُمَدَّعِي عِنْدَمَا سَمِعَ صَوْتَ الدُّبِّ؟	["قَاتَلَ الدُّبَّ", "جَرَى نَحْوَ شَجَرَةٍ وَصَعِدَ إِلَى قِمَّتِهَا", "نَامَ عَلَى الأَرْضِ", "سَاعَدَ صَدِيقَهُ"]	B	1.00	2026-10-20 07:31:21.137099+00	\N
503	159	mc	كَيْفَ نَجَا الرَّجُلُ الآخَرُ مِنَ الدُّبِّ؟	["فَاسْتَلْقَى عَلَى الأَرْضِ وَكَتَمَ نَفَسَهُ", "صَعِدَ الشَّجَرَةَ", "ضَرَبَ الدُّبَّ", "جَرَى سَرِيعًا"]	A	1.00	2026-10-20 07:31:21.137099+00	\N
504	159	mc	لِمَاذَا تَرَكَ الدُّبُّ الرَّجُلَ المُلْتَقِيَ عَلَى الأَرْضِ وَانْصَرَفَ؟	["لأَنَّ الدُّبَّ شَبِعَ", "لأَنَّهُ خَافَ مِنْهُ", "لأَنَّهُ ظَنَّ أَنَّهُ مَيِّتٌ، وَالدُّبُّ لا يَأْكُلُ المَيِّتَةَ", "لأَنَّ الصَّدِيقَ نَادَاهُ"]	C	1.00	2026-10-20 07:31:21.137099+00	\N
505	159	essay	ماذا أعلن التاجر؟	[]	أعلن التاجر أنه يريد أن يستخدم عنده شابًا كاتبًا	1.00	2026-10-20 07:31:21.137099+00	\N
506	159	essay	لأي شيء حضر إليه الشباب؟	[]	حضر الشباب لمقابلته في ساعة معيّنة للتقدم لهذه الوظيفة	1.00	2026-10-20 07:31:21.137099+00	\N
507	159	essay	بأي طريقة اختار التاجر الموظف؟ وعلى من وقع اختياره؟	[]	كان التاجر يدعوهم إلى مكتبه واحدًا فواحدًا ويحادثهم في مسائل كثيرة ليعلم مقدار فطنتهم وآدابهم، ووقع اختياره على أحد الشبان بعد محادثة قصيرة.	1.00	2026-10-20 07:31:21.137099+00	\N
508	159	essay	إِلَى أَيْنَ ذَهَبَ الرَّجُلَانِ؟	[]	مَرَّ الرَّجُلَانِ فِي أَجَمَةٍ كَثِيرَةِ الْأَشْجَارِ	1.00	2026-10-20 07:31:21.137099+00	\N
509	159	essay	مَاذَا رَأَى أَحَدُهُمَا هُنَاكَ؟	[]	رَأَى أَحَدُهُمَا عَلَى الْأَرْضِ آثَارَ أَقْدَامِ السِّبَاعِ	1.00	2026-10-20 07:31:21.137099+00	\N
510	160	mc	أَيْنَ شُيِّدَ هَذَا الْمَسْجِدُ؟	["عَلَى جَبَلِ الْمُقَطَّمِ", "فِي مَدِينَةِ الإِسْكَنْدَرِيَّةِ", "عَلَى شَاطِئِ النِّيلِ", "فِي سُورِيَا"]	A	1.00	2026-10-20 07:38:26.590316+00	\N
511	160	mc	فِي أَيِّ جِهَةٍ مِنْ مَدِينَةِ الْقَاهِرَةِ يَقَعُ الْمَسْجِدُ؟	["فِي الشَّمَالِ الْغَرْبِيِّ", "فِي الْجَنُوبِ الشَّرْقِيِّ", "فِي الْوَسَطِ", "فِي الشَّمَالِ الشَّرْقِيِّ"]	B	1.00	2026-10-20 07:38:26.590316+00	\N
512	160	mc	عَلَى هَيْئَةِ أَيِّ مَسَاجِدَ بُنِيَ هَذَا الْمَسْجِدُ؟	["مَسَاجِدِ دِمَشْقَ", "مَسَاجِدِ الْآسِتَانَةِ", "مَسَاجِدِ بَغْدَادَ", "مَسَاجِدِ الْقَيْرَوَانِ"]	B	1.00	2026-10-20 07:38:26.590316+00	\N
513	160	mc	كَيْفَ صُمِّمَتِ الْقِبَابُ فِي هَذَا الْمَسْجِدِ؟	["قُبَّةٌ صَغِيرَةٌ وَاحِدَةٌ فَقَطْ", "قُبَّةٌ كَبِيرَةٌ تُحِيطُ بِهَا قِبَابٌ أُخْرَى صَغِيرَةٌ", "ثَلَاثُ قِبَابٍ كَبِيرَةٍ", "مَجْمُوعَةُ قِبَابٍ خَشَبِيَّةٍ"]	B	1.00	2026-10-20 07:38:26.590316+00	\N
514	160	mc	كَمْ مِئْذَنَةً أُقِيمَتْ عَلَى رَأْسِ الْمَسْجِدِ؟	["مِئْذَنَةٌ وَاحِدَةٌ", "مِئْذَنَتَانِ", "ثَلَاثُ مَآذِنَ", "أَرْبَعُ مَآذِنَ"]	B	1.00	2026-10-20 07:38:26.590316+00	\N
515	160	mc	مَا هِيَ اللُّغَةُ الْعَرَبِيَّةُ لِكُلِّ مُسْلِمٍ كَمَا وَرَدَ فِي النَّصِّ؟	["لُغَةُ التِّجَارَةِ", "مِفْتَاحُ فَهْمِ الدِّينِ الْإِسْلَامِيِّ", "لُغَةٌ صَعْبَةٌ", "لُغَةٌ لِلْقِرَاءَةِ فَقَطْ"]	B	1.00	2026-10-20 07:38:26.590316+00	\N
536	161	mc	مَا الْمُبْتَدَأُ فِي جُمْلَةِ «الْعِلْمُ نُورٌ»؟	["A. الْعِلْمُ", "B. نُورٌ", "C. الْعِلْمَ", "D. هُوَ"]	A	1.00	2026-10-20 07:40:17.585081+00	\N
516	160	mc	كَيْفَ كَانَتِ اللُّغَةُ الْعَرَبِيَّةُ أَيَّامَ عِزِّ الْإِسْلَامِ؟	["لُغَةَ الْعِلْمِ وَالْحَضَارَةِ", "لُغَةً مَهْجُورَةً", "لُغَةً ضَعِيفَةً", "لُغَةً خَاصَّةً بِالْعَرَبِ فَقَطْ"]	A	1.00	2026-10-20 07:38:26.590316+00	\N
517	160	mc	بِمَاذَا امْتَازَتِ اللُّغَةُ الْعَرَبِيَّةُ أَيَّامَ عِزِّ الْإِسْلَامِ؟	["بِالصُّعُوبَةِ وَالتَّعْقِيدِ", "بِالْقِلَّةِ وَالِانْحِصَارِ", "بِالْفَصَاحَةِ وَالْبَلَاغَةِ وَالِانْتِشَارِ الْعَظِيمِ", "بِالْإِهْمَالِ وَالنِّسْيَانِ"]	C	1.00	2026-10-20 07:38:26.590316+00	\N
518	160	mc	لِمَاذَا تَأَخَّرَتِ اللُّغَةُ الْعَرَبِيَّةُ فِي بَعْضِ الْأَزْمَانِ؟	["لِأَنَّهَا لُغَةٌ قَدِيمَةٌ", "لِضَعْفِ اهْتِمَامِ الْمُسْلِمِينَ بِهَا", "لِقِلَّةِ الْكُتُبِ", "لِعَدَمِ وُجُودِ الْمُتَعَلِّمِينَ"]	B	1.00	2026-10-20 07:38:26.590316+00	\N
519	160	mc	مَا الَّذِي نَشَأَ فِي نُفُوسِ الْمُسْلِمِينَ الْيَوْمَ؟	["خَوْفٌ مِنَ اللُّغَةِ", "إِهْمَالٌ جَدِيدٌ", "نَهْضَةٌ مُبَارَكَةٌ لِإِحْيَاءِ لُغَةِ دِينِهِمْ", "انْتِشَارُ لُغَةٍ أُخْرَى"]	C	1.00	2026-10-20 07:38:26.590316+00	\N
520	160	mc	مَنْ هُوَ كِسْرَى أَنُوشِرْوَانَ؟	["مَلِكُ الرُّومِ", "مَلِكُ فَارِسَ", "مَلِكُ الْعَرَبِ", "مَلِكُ مِصْرَ"]	B	1.00	2026-10-20 07:38:26.590316+00	\N
521	160	mc	مَاذَا كَانَ الشَّيْخُ يَعْمَلُ حِينَ مَرَّ بِهِ الْمَلِكُ؟	["يَحْصُدُ الْقَمْحَ", "يَقْطِفُ الزَّيْتُونَ", "يَغْرِسُ شَجَرَ الزَّيْتُونِ", "يَسْقِي الْأَزْهَارَ"]	C	1.00	2026-10-20 07:38:26.590316+00	\N
522	160	mc	لِمَاذَا تَعَجَّبَ الْمَلِكُ مِنْ عَمَلِ الشَّيْخِ؟	["لِأَنَّ الشَّيْخَ لَا يَعْرِفُ الزِّرَاعَةَ", "لِأَنَّ شَجَرَ الزَّيْتُونِ بَطِيءُ النَّمَاءِ وَالشَّيْخُ هَرِمٌ", "لِأَنَّ الْأَرْضَ غَيْرُ صَالِحَةٍ", "لِأَنَّ الشَّيْخَ يَعْمَلُ فِي اللَّيْلِ"]	B	1.00	2026-10-20 07:38:26.590316+00	\N
523	160	mc	مَاذَا قَالَ الشَّيْخُ رَدًّا عَلَى الْمَلِكِ فِي الْمَرَّةِ الْأُولَى؟	["\\"قَدْ غَرَسَ مَنْ قَبْلَنَا فَأَكَلْنَا، وَنَغْرِسُ نَحْنُ لِيَأْكُلَ مَنْ بَعْدَنَا\\"", "\\"أَرِيدُ أَنْ أَبِيعَ الثَّمَرَ فِي السُّوقِ\\"", "\\"أَنَا أَكُلْتُ مِنْ هَذَا الشَّجَرِ قَبْلَ ذَلِكَ\\"", "\\"أَمَرَنِي الْحَاكِمُ بِالزِّرَاعَةِ\\""]	A	1.00	2026-10-20 07:38:26.590316+00	\N
524	160	mc	مَا مَعْنَى كَلِمَةِ «زَهْ» فِي عُرْفِ قَوْمِ كِسْرَى؟	["أَمْرٌ بِالِانْصِرَافِ", "إِعْطَاءُ جَائِزَةٍ أَوْ قَدْرٍ مِنَ الْمَالِ", "كَلِمَةُ غَضَبٍ", "دُعَاءٌ بِالصِّحَّةِ"]	B	1.00	2026-10-20 07:38:26.590316+00	\N
525	160	essay	أَيْنَ يَقَعُ الْمَسْجِدُ الْمَذْكُورُ فِي النَّصِّ بِالتَّفْصِيلِ؟	[]	يَقَعُ فِي الْقَلْعَةِ الشَّهِيرَةِ عَلَى جَبَلِ الْمُقَطَّمِ فِي الْجَنُوبِ الشَّرْقِيِّ مِنْ مَدِينَةِ الْقَاهِرَةِ عَاصِمَةِ الدِّيَارِ الْمِصْرِيَّةِ.	1.00	2026-10-20 07:38:26.590316+00	\N
526	160	essay	كَيْفَ تَمَّتْ زَخْرَفَةُ جُدُرِ الْمَسْجِدِ وَأَسْقُفِهِ؟	[]	دُهِنَتْ جُدُرُهُ وَأَسْقُفُهُ بِالْأَلْوَانِ الزَّاهِيَةِ وَالْأَشْكَالِ الْجَمِيلَةِ، وَنُقِشَتْ عَلَيْهَا آيَاتٌ مِنَ الْقُرْآنِ الْكَرِيمِ مُمَوَّهَةٌ بِالذَّهَبِ الْخَالِصِ.	1.00	2026-10-20 07:38:26.590316+00	\N
527	160	essay	لِمَاذَا تُعْتَبَرُ اللُّغَةُ الْعَرَبِيَّةُ مُهِمَّةً لِكُلِّ مُسْلِمٍ كَمَا وَرَدَ فِي النَّصِّ؟	[]	لِأَنَّهَا لُغَةُ الْقُرْآنِ الْكَرِيمِ وَالسُّنَّةِ النَّبَوِيَّةِ، وَهِيَ مِفْتَاحُ فَهْمِ الدِّينِ الْإِسْلَامِيِّ لِكُلِّ مُسْلِمٍ.	1.00	2026-10-20 07:38:26.590316+00	\N
528	160	essay	كَيْفَ كَانَتْ مَكَانَةُ اللُّغَةِ الْعَرَبِيَّةِ أَيَّامَ عِزِّ الْإِسْلَامِ؟	[]	كَانَتْ أَيَّامَ عِزِّ الْإِسْلَامِ لُغَةَ الْعِلْمِ وَالْحَضَارَةِ، وَامْتَازَتْ بِالْفَصَاحَةِ وَالْبَلَاغَةِ وَالِانْتِشَارِ الْعَظِيمِ فِي شَتَّى الْأَقْطَارِ.	1.00	2026-10-20 07:38:26.590316+00	\N
529	160	essay	لِمَاذَا اسْتَغْرَبَ الْمَلِكُ كِسْرَى عِنْدَمَا رَأَى الشَّيْخَ يَغْرِسُ شَجَرَ الزَّيْتُونِ؟	[]	اسْتَغْرَبَ الْمَلِكُ لِأَنَّ شَجَرَ الزَّيْتُونِ بَطِيءُ النَّمَاءِ وَالْإِثْمَارِ، وَالشَّيْخُ كَبِيرٌ فِي السِّنِّ (هَرِمٌ)، فَلَيْسَ مِنَ الْمُحْتَمَلِ أَنْ يَعِيشَ حَتَّى يَأْكُلَ مِنْ ثَمَرِهِ.	1.00	2026-10-20 07:38:26.590316+00	\N
530	161	mc	أَيُّ الْكَلِمَاتِ الْآتِيَةِ فِعْلٌ مَاضٍ؟	["A. يَكْتُبُ", "B. اُكْتُبْ", "C. كَتَبَ", "D. كَاتِبٌ"]	C	1.00	2026-10-20 07:40:17.585081+00	\N
531	161	mc	أَيُّ الْكَلِمَاتِ الْآتِيَةِ فِعْلٌ مُضَارِعٌ؟	["A. جَلَسَ", "B. اِجْلِسْ", "C. مَجْلِسٌ", "D. يَجْلِسُ"]	D	1.00	2026-10-20 07:40:17.585081+00	\N
532	161	mc	أَيُّ الْكَلِمَاتِ الْآتِيَةِ فِعْلُ أَمْرٍ؟	["A. اِفْتَحْ", "B. فَتَحَ", "C. يَفْتَحُ", "D. فَاتِحٌ"]	A	1.00	2026-10-20 07:40:17.585081+00	\N
533	161	mc	الْفَاعِلُ هُوَ اسْمٌ ...	["A. مَنْصُوبٌ", "B. مَجْرُورٌ", "C. مَرْفُوعٌ", "D. مَجْزُومٌ"]	A	1.00	2026-10-20 07:40:17.585081+00	\N
534	161	mc	الْمَفْعُولُ بِهِ اسْمٌ ...	["A. مَرْفُوعٌ", "B. مَنْصُوبٌ", "C. مَجْرُورٌ", "D. مَجْزُومٌ"]	C	1.00	2026-10-20 07:40:17.585081+00	\N
671	168	mc	فِعْلُ الأَمْرِ مِنْ ذَهَبَ هُوَ ...	["يَذْهَبُ", "ذَاهِبٌ", "اِذْهَبْ", "مَذْهَبٌ"]	C	1.00	2026-10-26 06:41:07.452329+00	\N
537	161	mc	مَا الْخَبَرُ فِي جُمْلَةِ «الْجَوُّ جَمِيلٌ»؟	["A. الْجَوُّ", "B. جَمِيلٌ", "C. الْجَوَّ", "D. هُوَ"]	B	1.00	2026-10-20 07:40:17.585081+00	\N
538	161	mc	أَيُّ الْجُمَلِ الْآتِيَةِ جُمْلَةٌ اسْمِيَّةٌ؟	["A. كَتَبَ الطَّالِبُ", "B. يَجْلِسُ الْوَلَدُ", "C. الْبَيْتُ وَاسِعٌ", "D. اِفْتَحِ الْبَابَ"]	C	1.00	2026-10-20 07:40:17.585081+00	\N
539	161	mc	أَيُّ الْجُمَلِ الْآتِيَةِ جُمْلَةٌ فِعْلِيَّةٌ؟	["A. الْمُعَلِّمُ حَاضِرٌ", "B. الْمَدْرَسَةُ كَبِيرَةٌ", "C. الْكِتَابُ مُفِيدٌ", "D. نَجَحَ الطَّالِبُ"]	D	1.00	2026-10-20 07:40:17.585081+00	\N
540	161	mc	فِي جُمْلَةِ «الشَّجَرَةُ مُثْمِرَةٌ»، كَلِمَةُ «مُثْمِرَةٌ» هِيَ ...	["A. فَاعِلٌ", "B. مَفْعُولٌ بِهِ", "C. مُبْتَدَأٌ", "D. خَبَرٌ"]	D	1.00	2026-10-20 07:40:17.585081+00	\N
541	161	mc	أَيُّ الْجُمَلِ الْآتِيَةِ تَحْتَوِي عَلَى مُبْتَدَأٍ وَخَبَرٍ؟	["A. شَرِبَ الطِّفْلُ الْحَلِيبَ", "B. الْمَاءُ بَارِدٌ", "C. يَقْرَأُ عَلِيٌّ الْكِتَابَ", "D. فَتَحَ الْوَلَدُ الْبَابَ"]	B	1.00	2026-10-20 07:40:17.585081+00	\N
542	161	mc	مَا الْإِعْرَابُ الصَّحِيحُ لِكَلِمَةِ «الطَّالِبُ» فِي جُمْلَةِ «حَضَرَ الطَّالِبُ»؟	["A. فَاعِلٌ مَرْفُوعٌ", "B. مَفْعُولٌ بِهِ مَنْصُوبٌ", "C. مُبْتَدَأٌ مَرْفُوعٌ", "D. خَبَرٌ مَرْفُوعٌ"]	A	1.00	2026-10-20 07:40:17.585081+00	\N
543	161	mc	مَا الْإِعْرَابُ الصَّحِيحُ لِكَلِمَةِ «الدَّرْسَ» فِي جُمْلَةِ «شَرَحَ الْمُعَلِّمُ الدَّرْسَ»؟	["A. فَاعِلٌ مَرْفُوعٌ", "B. مُبْتَدَأٌ مَرْفُوعٌ", "C. مَفْعُولٌ بِهِ مَنْصُوبٌ", "D. خَبَرٌ مَرْفُوعٌ"]	C	1.00	2026-10-20 07:40:17.585081+00	\N
544	161	mc	أَيُّ الْجُمَلِ الْآتِيَةِ تَجْمَعُ بَيْنَ الْفِعْلِ وَالْفَاعِلِ وَالْمَفْعُولِ بِهِ؟	["A. الْعِلْمُ نَافِعٌ", "B. الْوَلَدُ صَغِيرٌ", "C. الْمُعَلِّمُ حَاضِرٌ", "D. قَرَأَ الطَّالِبُ الْكِتَابَ"]	D	1.00	2026-10-20 07:40:17.585081+00	\N
545	161	essay	مَا الفِعْلُ المَاضِي؟ وَاذْكُرْ مِثَالًا لَهُ	[]	الفِعْلُ المَاضِي هُوَ كُلُّ فِعْلٍ يَدُلُّ عَلَى حُصُولِ عَمَلٍ فِي الزَّمَنِ المَاضِي	1.00	2026-10-20 07:40:17.585081+00	\N
546	161	essay	مَا الفِعْلُ المُضَارِعُ؟ وَاذْكُرْ مِثَالًا لَهُ	[]	الفِعْلُ المُضَارِعُ هُوَ كُلُّ فِعْلٍ يَدُلُّ عَلَى حُصُولِ عَمَلٍ فِي الزَّمَنِ الحَاضِرِ أَوِ المُسْتَقْبَلِ	1.00	2026-10-20 07:40:17.585081+00	\N
547	161	essay	اسْتَخْرِجِ الفَاعِلَ مِنَ الجُمْلَتَيْنِ الآتِيَتَيْنِ: طَارَ العُصْفُورُ.	[]	العُصْفُورُ	1.00	2026-10-20 07:40:17.585081+00	\N
548	161	essay	اسْتَخْرِجِ المَفْعُولَ بِهِ مِنَ الجُمَلِ الآتِيَةِ يَلْعَبُ الوَلَدُ	[]	الوَلَدُ	1.00	2026-10-20 07:40:17.585081+00	\N
549	161	essay	حَوِّلِ الْفِعْلَ الْمَاضِيَ فِي الْجُمْلَةِ الْآتِيَةِ إِلَى فِعْلٍ مُضَارِعٍ، ثُمَّ إِلَى فِعْلِ أَمْرٍ: «كَتَبَ التِّلْمِيذُ الدَّرْسَ».	[]	الْمُضَارِعُ: يَكْتُبُ التِّلْمِيذُ الدَّرْسَ. الْأَمْرُ: اُكْتُبِ الدَّرْسَ.	1.00	2026-10-20 07:40:17.585081+00	\N
550	162	mc	مَا عَلامَةُ نَصْبِ الْفِعْلِ الْمُضَارِعِ الصَّحِيحِ الْآخِرِ؟	["الضَّمَّةُ", "الْفَتْحَةُ", "الْكَسْرَةُ", "السُّكُونُ"]	B	1.00	2026-10-20 07:42:10.92841+00	\N
551	162	mc	أَيُّ الْحُرُوفِ يَنْصِبُ الْفِعْلَ الْمُضَارِعَ؟	["لَمْ", "لَا النَّاهِيَةُ", "لَنْ", "لَمَّا"]	C	1.00	2026-10-20 07:42:10.92841+00	\N
552	162	mc	مَا إِعْرَابُ الْفِعْلِ «يَكْتُبَ» فِي جُمْلَةِ «لَنْ يَكْتُبَ عَلِيٌّ»؟	["مَرْفُوعٌ", "مَجْزُومٌ", "مَنْصُوبٌ", "مَجْرُورٌ"]	C	1.00	2026-10-20 07:42:10.92841+00	\N
553	162	mc	أَكْمِلِ الْجُمْلَةَ: «أُرِيدُ أَنْ ... الدَّرْسَ»	["أَفْهَمُ", "أَفْهَمَ", "أَفْهَمْ", "فَاهِمٌ"]	B	1.00	2026-10-20 07:42:10.92841+00	\N
554	162	mc	أَيُّ الْجُمَلِ الْآتِيَةِ تَحْتَوِي عَلَى فِعْلٍ مُضَارِعٍ مَنْصُوبٍ؟	["لَمْ يَذْهَبْ عَلِيٌّ", "يَذْهَبُ عَلِيٌّ", "لَنْ يَذْهَبَ عَلِيٌّ", "ذَهَبَ عَلِيٌّ"]	C	1.00	2026-10-20 07:42:10.92841+00	\N
555	162	mc	مَا عَلامَةُ رَفْعِ الْفِعْلِ الْمُضَارِعِ الصَّحِيحِ الْآخِرِ؟	["السُّكُونُ", "الْفَتْحَةُ", "الضَّمَّةُ", "الْكَسْرَةُ"]	C	1.00	2026-10-20 07:42:10.92841+00	\N
556	162	mc	أَيُّ الْجُمَلِ الْآتِيَةِ فِيهَا فِعْلٌ مُضَارِعٌ مَرْفُوعٌ؟	["لَنْ يَكْتُبَ عَلِيٌّ", "لَمْ يَكْتُبْ عَلِيٌّ", "يَكْتُبُ عَلِيٌّ", "أَنْ يَكْتُبَ عَلِيٌّ"]	C	1.00	2026-10-20 07:42:10.92841+00	\N
557	162	mc	أَكْمِلِ الْجُمْلَةَ: «الطَّالِبُ ... الدَّرْسَ كُلَّ يَوْمٍ»	["يَكْتُبَ", "يَكْتُبْ", "يَكْتُبُ", "كَتَبَ"]	C	1.00	2026-10-20 07:42:10.92841+00	\N
558	162	mc	مَا إِعْرَابُ الْفِعْلِ «يَقْرَأُ» فِي جُمْلَةِ «يَقْرَأُ أَحْمَدُ الْكِتَابَ»؟	["مَرْفُوعٌ", "مَنْصُوبٌ", "مَجْزُومٌ", "مَاضٍ"]	A	1.00	2026-10-20 07:42:10.92841+00	\N
559	162	mc	أَيُّ الْجُمَلِ الْآتِيَةِ فِعْلُهَا الْمُضَارِعُ مَرْفُوعٌ؟	["لَمْ يَجْلِسْ", "لَنْ يَجْلِسَ", "أَنْ يَجْلِسَ", "يَجْلِسُ"]	D	1.00	2026-10-20 07:42:10.92841+00	\N
560	162	mc	أَكْمِلِ الْجُمْلَةَ: «إِنَّ الْعِلْمَ ...»	["نَافِعٌ", "نَافِعًا", "نَافِعٍ", "يَنْفَعُ"]	A	1.00	2026-10-20 07:42:10.92841+00	\N
561	162	mc	أَيُّ الْجُمَلِ الْآتِيَةِ فِيهَا «كَانَ»؟	["إِنَّ الْجَوَّ جَمِيلٌ", "لَعَلَّ الطَّالِبَ نَاجِحٌ", "كَانَ الْمَطَرُ غَزِيرًا", "لَيْتَ الْوَلَدَ حَاضِرٌ"]	C	1.00	2026-10-20 07:42:10.92841+00	\N
562	162	mc	أَيُّ الْجُمَلِ الْآتِيَةِ فِيهَا «إِنَّ»؟	["أَصْبَحَ الْجَوُّ بَارِدًا", "إِنَّ الْمُعَلِّمَ حَاضِرٌ", "كَانَ الْبَيْتُ وَاسِعًا", "أَمْسَى الْوَلَدُ تَعِبًا"]	B	1.00	2026-10-20 07:42:10.92841+00	\N
563	162	mc	مَا إِعْرَابُ «الْبَيْتُ» فِي جُمْلَةِ «كَانَ الْبَيْتُ وَاسِعًا»؟	["خَبَرُ كَانَ مَنْصُوبٌ", "اسْمُ إِنَّ مَنْصُوبٌ", "مُبْتَدَأٌ مَرْفُوعٌ", "اسْمُ كَانَ مَرْفُوعٌ"]	D	1.00	2026-10-20 07:42:10.92841+00	\N
564	162	mc	أَيُّ الْجُمَلِ الْآتِيَةِ صَحِيحَةٌ فِي اسْتِعْمَالِ «إِنَّ»؟	["إِنَّ الْمُسْلِمُ صَادِقٌ", "إِنَّ الْمُسْلِمَ صَادِقٌ", "إِنَّ الْمُسْلِمَ صَادِقًا", "إِنَّ الْمُسْلِمُ صَادِقًا"]	B	1.00	2026-10-20 07:42:10.92841+00	\N
565	162	essay	أَدْخِلْ «لَنْ» عَلَى جُمْلَةِ «يَذْهَبُ عَلِيٌّ إِلَى الْمَدْرَسَةِ»، وَاضْبِطِ الْفِعْلَ الْمُضَارِعَ.	[]	لَنْ يَذْهَبَ عَلِيٌّ إِلَى الْمَدْرَسَةِ.	1.00	2026-10-20 07:42:10.92841+00	\N
566	162	essay	أَدْخِلْ «لَمْ» عَلَى جُمْلَةِ «يَكْتُبُ الطَّالِبُ الدَّرْسَ»، وَاضْبِطِ الْفِعْلَ الْمُضَارِعَ.	[]	لَمْ يَكْتُبْ الطَّالِبُ الدَّرْسَ.	1.00	2026-10-20 07:42:10.92841+00	\N
567	162	essay	أَدْخِلْ «كَانَ» عَلَى جُمْلَةِ «الْجَوُّ جَمِيلٌ»، وَاضْبِطْ آخِرَ كُلِّ كَلِمَةٍ.	[]	٩. كَانَ الْجَوُّ جَمِيلًا.	1.00	2026-10-20 07:42:10.92841+00	\N
568	162	essay	. أَدْخِلْ «إِنَّ» عَلَى جُمْلَةِ «الْعِلْمُ نَافِعٌ»، وَاضْبِطْ آخِرَ كُلِّ كَلِمَةٍ.	[]	١٠. إِنَّ الْعِلْمَ نَافِعٌ.	1.00	2026-10-20 07:42:10.92841+00	\N
569	162	essay	١٤. صَحِّحِ الْخَطَأَ فِي الْجُمْلَتَيْنِ الْآتِيَتَيْنِ، ثُمَّ اذْكُرْ سَبَبَ التَّصْحِيحِ: أ. لَنْ يَذْهَبُ عَلِيٌّ. ب. لَمْ يَكْتُبَ الطَّالِبُ الدَّرْسَ.	[]	١٤.\r\nأ. لَنْ يَذْهَبَ عَلِيٌّ. السَّبَبُ: الْفِعْلُ الْمُضَارِعُ مَنْصُوبٌ بِـ«لَنْ»، وَعَلامَةُ نَصْبِهِ الْفَتْحَةُ.\r\nب. لَمْ يَكْتُبْ الطَّالِبُ الدَّرْسَ. السَّبَبُ: الْفِعْلُ الْمُضَارِعُ مَجْزُومٌ بِـ«لَمْ»، وَعَلامَةُ جَزْمِهِ السُّكُونُ.	1.00	2026-10-20 07:42:10.92841+00	\N
1087	188	essay	بما تفخر إذا وجدت مفتخرا بالمال والنسب؟	[]	أفخر بالعلم والعمل الصالح	1.00	2026-10-26 08:07:13.604031+00	\N
1088	188	essay	متى يكون فقد الحياة أنسب للمرء؟	[]	يكون فقد الحياة أنسب للمرء إذا فقد الشرف والكرامة	1.00	2026-10-26 08:07:13.604031+00	\N
1089	188	essay	بن مثل محمود سامي باشا من لا يريد ترك مسكنة؟ لماذا؟	[]	يشبة من لا يريد مسكنه بمحمود يامي باشا. لأنه لا يريد ترك مسكنه	1.00	2026-10-26 08:07:13.604031+00	\N
1273	198	mc	كم عدد أركان الإيمان؟	["خمسة", "ستة", "سبعة", "أربعة"]	B	1.00	2026-10-26 08:24:03.621863+00	\N
1274	198	mc	أيُّ مما يأتي يُعَدُّ من أركان الإيمان؟	["الإيمان بالمال", "الإيمان بالملائكة", "الإيمان بالأوثان", "الإيمان بالطاغوت"]	B	1.00	2026-10-26 08:24:03.621863+00	\N
1275	198	mc	قَالَ اللهُ تَعَالَى: ﴿إِنَّمَا الْمُؤْمِنُونَ الَّذِينَ إِذَا ذُكِرَ اللهُ وَجِلَتْ قُلُوبُهُمْ﴾. تَدُلُّ الْآيَةُ عَلَى ...	["أَهَمِّيَّةِ التِّجَارَةِ", "أَثَرِ ذِكْرِ اللهِ فِي قُلُوبِ الْمُؤْمِنِينَ", "وُجُوبِ السَّفَرِ", "أَنَّ الْإِيمَانَ لَا يَتَأَثَّرُ بِالْأَعْمَالِ"]	B	1.00	2026-10-26 08:24:03.621863+00	\N
1276	198	mc	أَيُّ الْعِبَارَاتِ التَّالِيَةِ صَحِيحَةٌ عَنْ زِيَادَةِ الْإِيمَانِ وَنُقْصَانِهِ؟	["الْإِيمَانُ يَزِيدُ بِالْمَالِ فَقَطْ", "الْإِيمَانُ لَا يَتَعَلَّقُ بِالْأَعْمَالِ", "يَزِيدُ الْإِيمَانُ بِالطَّاعَةِ وَيَنْقُصُ بِالْمَعْصِيَةِ", "الْإِيمَانُ يَنْقُصُ بِالصَّدَقَةِ"]	C	1.00	2026-10-26 08:24:03.621863+00	\N
1277	198	mc	الْأَدِلَّةِ التَّالِيَةِ يَدُلُّ عَلَى زِيَادَةِ الْإِيمَانِ	["﴿وَاللهُ غَفُورٌ رَحِيمٌ﴾", "﴿وَإِذَا تُلِيَتْ عَلَيْهِمْ آيَاتُهُ زَادَتْهُمْ إِيمَانًا﴾", "﴿وَاللهُ سَمِيعٌ بَصِيرٌ﴾", "﴿إِنَّ اللهَ عَلِيمٌ حَكِيمٌ﴾"]	B	1.00	2026-10-26 08:24:03.621863+00	\N
1278	198	mc	حُكْمُ الْإِيمَانِ بِاللهِ تَعَالَى	["وَاجِبٌ عَلَى كُلِّ مُسْلِمٍ مُكَلَّفٍ", "مُبَاحٌ فَقَطْ", "مَكْرُوهٌ", "مُسْتَحَبٌّ"]	A	1.00	2026-10-26 08:24:03.621863+00	\N
1279	198	mc	مِنْ ثَمَرَاتِ الْإِيمَانِ بِاللهِ تَعَالَى ...	["الْكَذِبُ وَالْخِيَانَةُ", "الْكِبْرُ وَالْغُرُورُ", "إِهْمَالُ الْعِبَادَةِ", "خشية الله والطُّمَأْنِينَةُ وَالثِّقَةُ بِاللهِ"]	D	1.00	2026-10-26 08:24:03.621863+00	\N
1280	198	mc	الْمُرَادُ بِتَوْحِيدِ الْأُلُوهِيَّةِ	["الْإِيمَانُ بِأَنَّ اللهَ هُوَ الْخَالِقُ فَقَطْ", "إِفْرَادُ اللهِ تَعَالَى بِالْعِبَادَةِ", "الْإِيمَانُ بِالْمَلَائِكَةِ", "الْإِيمَانُ بِالْكُتُبِ السَّمَاوِيَّةِ"]	B	1.00	2026-10-26 08:24:03.621863+00	\N
1281	198	mc	اسْمٌ آخَرُ لِعِلْمِ التَّوْحِيدِ	["عِلْمُ النَّحْوِ", "عِلْمُ الْبَلَاغَةِ", "عِلْمُ الْعَقِيدَةِ", "عِلْمُ الْحِسَابِ"]	C	1.00	2026-10-26 08:24:03.621863+00	\N
1282	198	mc	كَمْ قِسْمًا لِلتَّوْحِيدِ فِي التَّقْسِيمِ الْمَشْهُورِ؟	["قِسْمَانِ", "خمسة أَقْسَامٍ", "أربعة أَقْسَامٍ", "ثَلَاثَةُ أَقْسَامٍ"]	D	1.00	2026-10-26 08:24:03.621863+00	\N
590	164	mc	ما هي علامة التأنيث الظاهرة في كلمة "فاطمة"؟	["A. ألف التأنيث المقصورة.", "B. ألف التأنيث الممدودة.", "C. تاء التأنيث المربوطة.", "D. التاء المفتوحة"]	C	1.00	2026-10-20 07:53:26.036921+00	\N
591	164	mc	. لماذا تُحرَّك تاء التأنيث الساكنة بالكسر في نحو: "قالتِ المعلمةُ الحقَّ"؟	["A. لأن الفعل أصبح مبنياً للمجهول..", "B. لأن الفاعل أصبح مجروراً بالكسرة..", "C. لأنها تحولت إلى تاء الفاعل المتحركة..", "للتخلص من التقاء الساكنين في النطق"]	D	1.00	2026-10-20 07:53:26.036921+00	\N
592	164	mc	في الفعل المضارع "تكتبُ الطفلةُ الدرسَ"، ما دلالة حرف التاء في أوله؟	["A. الدلالة على المخاطب المذكر أو المؤنث الغائب.", "B. الدلالة حصراً على المتكلم المعظّم لنفسه.", "C. الدلالة على جمع الذكور الغائبين.", "D. الدلالة على الفعل الماضي فقط."]	A	1.00	2026-10-20 07:53:26.036921+00	\N
593	164	mc	ما إعراب "ياء المخاطبة" في قولنا: "يا فاطمة، اكتبي الدرسَ"؟	["A. حرف مبني لا محل له من الإعراب.", "B. اسم مبني في محل نصب مفعول به.", "C. ضمير متصل مبني في محل رفع فاعل.", "D. علامة إعراب فرعية لرفع الفعل."]	C	1.00	2026-10-20 07:53:26.036921+00	\N
594	164	mc	ما حركة الحرف الأخير من الفعل الماضي عند اتصال "نون النسوة" به، في مثل: "الطالباتُ ذهبْنَ"؟	["A. الفتح الظاهر.", "B. السكون.", "C. الضم المقدر.", "D. الكسر الظاهر."]	B	1.00	2026-10-20 07:53:26.036921+00	\N
595	164	mc	ما نوع المعرفة في كلمة (الرَّجُلُ)؟	["A. معرف بأل", "B. علم", "C. ضمير", "D. مضاف إلى معرفة"]	A	1.00	2026-10-20 07:53:26.036921+00	\N
596	164	mc	في قولنا: (هوَ طالبٌ مجتهدٌ)، ما نوع المعرفة في كلمة (هوَ)؟	["A. علم", "B. معرف بأل", "C. مضاف إلى معرفة", "D. ضمير منفصل"]	D	1.00	2026-10-20 07:53:26.036921+00	\N
597	164	mc	أيّ من الكلمات التالية تُعتبر معرفةً لأنها (عَلَمٌ) يُميز مسماها تحديداً؟	["A. كتابٌ", "B. فاطمةُ", "C. البيتُ", "D. رجلٌ"]	B	1.00	2026-10-20 07:53:26.036921+00	\N
598	164	mc	ما نوع المعرفة في اسم الإشارة (هذانِ)؟	["A. علم", "B. اسم إشارة", "C. ضمير", "D. معرف بأل"]	B	1.00	2026-10-20 07:53:26.036921+00	\N
599	164	mc	ما هو التعريف الاصطلاحي الصحيح لـ"العلم" في النحو العربي؟	["A. اسم يُعيّن مسماه مطلقاً بلا قرينة تعيين خارجية", "B. اسم يدل على شيء شائع وغير معين في جنسه", "C. كلمة تدل على حدث مقترن بزمن معين", "D. اسم يتصل بحرف الجر دون سائر الأسماء"]	A	1.00	2026-10-20 07:53:26.036921+00	\N
600	164	mc	في قولنا: "أبو بكرٍ رجلٌ صالحٌ"، ماذا يُصنَّف اللفظ (أبو بكر) اصطلاحاً ضمن أقسام العلم؟	["A. اسم مفرد", "B. كنية", "C. لقب", "D. اسم جنس"]	B	1.00	2026-10-20 07:53:26.036921+00	\N
601	164	mc	إذا اجتمع الاسم واللقب في جملة واحدة مثل: "جاءَ عُمرُ الفاروقُ"، فما الحكم الإعرابي لـ(الفاروق)؟	["A. مفعول به منصوب دائماً", "B. مضاف إليه مجرور", "C. خبر مرفوع", "D. يتبع ما قبله في إعرابه على أنه بدل أو نعت (صفة)"]	D	1.00	2026-10-20 07:53:26.036921+00	\N
602	164	mc	ماذا يُطلق النحاة على العلم الذي ليس بـ"كنية" ولا بـ"لقب"، مثل "محمد" أو "جعفر"؟	["A. كل علم من مفرد واحد يدل على مذكر", "B. الكنية", "C. اللقب", "D. اسم المعرفة المطلقة"]	B	1.00	2026-10-20 07:53:26.036921+00	\N
603	164	mc	ما هو تقدير الضمير المستتر في الفعل المضارع "أَكْتُبُ الدَّرْسَ"؟	["A. هُوَ", "B. نَحْنُ", "C. أَنَا", "D. أَنْتَ"]	C	1.00	2026-10-20 07:53:26.036921+00	\N
672	168	mc	حَوِّلِ الفِعْلَ المَاضِيَ جَلَسَ إِلَى الفِعْلِ المُضَارِعِ!	["اِجْلِسْ", "يَجْلِسُ", "جَالِسٌ", "مَجْلِسٌ"]	B	1.00	2026-10-26 06:41:07.452329+00	\N
604	164	mc	في قولنا "رَأَيْتُكَ فِي المَدْرَسَةِ"، ما محل الإعراب لتاء الفاعل وكاف الخطاب على الترتيب؟	["A. في محل رفع فاعل / في محل نصب مفعول به", "B. في محل نصب مفعول به / في محل رفع فاعل", "C. في محل جر مضاف إليه / في محل رفع فاعل", "D. في محل جر بحرف الجر / في محل نصب مفعول به"]	A	1.00	2026-10-20 07:53:26.036921+00	\N
605	164	essay	مَا الفَرْقُ الإعرابي الجوهري بين "تاء التأنيث الساكنة" و"تاء الفاعل المتحركة" عند اتصالهما بالفعل الماضي؟	[]	الإجابة النموذجية: تاء التأنيث الساكنة هي حرف مبني لا محل له من الإعراب، أما تاء الفاعل المتحركة فهي ضمير متصل مبني في محل رفع فاعل.	1.00	2026-10-20 07:53:26.036921+00	\N
606	164	essay	يَنْقَسِمُ الاسمُ العَلَمُ من حيث اللفظ إلى ثلاثة أقسام، اذْكُرْهَا ثم عَرِّفْ "الكنية".	[]	الإجابة النموذجية: أقسام العلم هي: الاسم، الكنية، واللقب. \r\n تعريف الكنية: هو كل علم يُصدَّر بلفظ (أب، أو أم، أو ابن، أو بنت).	1.00	2026-10-20 07:53:26.036921+00	\N
607	164	essay	مَا هُوَ "الضمير المستتر"؟ ثُمَّ بَيِّنْ تقديره في الجملة الآتية: "نَكْتُبُ الدَّرْسَ بنِظَامٍ".	[]	الإجابة النموذجية: الضمير المستتر هو ضمير ليس له صورة ظاهرة في اللفظ أو الكتابة ويُقدَّر في الذهن. \r\n تقدير الضمير المستتر في جملة "نكتب" هو: (نَحْنُ)، وهو مستتر وجوباً.	1.00	2026-10-20 07:53:26.036921+00	\N
608	164	essay	نوع الضمير:	[]	(أَنَا): ضَمِيرٌ مُنْفَصِلٌ\r\n (كِتَابُـهُ): ضَمِيرٌ مُتَّصِلٌ (الهاء)	1.00	2026-10-20 07:53:26.036921+00	\N
609	164	essay	تعيين الضمير المستتر في جملة "المُعَلِّمُ يَشْرَحُ الدَّرْسَ":	[]	الجواب: الفاعل ضمير مستتر تقديره (هُوَ) يعود على المعلم	1.00	2026-10-20 07:53:26.036921+00	\N
630	166	mc	أَيُّ التَّرَاكِيبِ الْآتِيَةِ يُعْتَبَرُ جُمْلَةً مُفِيدَةً؟	["فِي الْبَيْتِ", "كِتَابُ مُحَمَّدٍ", "قَامَ عَلِيٌّ", "إِنْ تَجْتَهِدْ"]	C	1.00	2026-10-22 02:09:37.948014+00	\N
631	166	mc	الْكَلِمَةُ الَّتِي تَحْتَهَا خَطٌّ فِي جُمْلَةِ "كَتَبَ الطَّالِبُ الرِّسَالَةَ" هِيَ...	["فِعْلٌ مَاضٍ", "فِعْلٌ مُضَارِعٌ", "فِعْلُ أَمْرٍ", "اِسْمُ فَاعِلٍ"]	A	1.00	2026-10-22 02:09:37.948014+00	\N
632	166	mc	مَا هُوَ الْفِعْلُ الْمُضَارِعُ فِي جُمْلَةِ "يَشْرَبُ الطِّفْلُ اللَّبَنَ"؟	["يَشْرَبُ", "الطِّفْلُ", "اللَّبَنَ", "لَا يُوجَدُ فِعْلٌ"]	A	1.00	2026-10-22 02:09:37.948014+00	\N
633	166	mc	أَيُّ الْجُمَلِ الْآتِيَةِ تَحْتَوِي عَلَى فِعْلِ أَمْرٍ؟	["يَفْتَحُ عَلِيٌّ الْبَابَ", "فَتَحَ عَلِيٌّ الْبَابَ", "اِفْتَحِ الْبَابَ يَا عَلِيُّ", "لَنْ يَفْتَحَ عَلِيٌّ الْبَابَ"]	C	1.00	2026-10-22 02:09:37.948014+00	\N
634	166	mc	أَيْنَ الْفَاعِلُ فِي جُمْلَةِ "طَبَخَتِ الْأُمُّ الطَّعَامَ"؟	["طَبَخَتِ", "الْأُمُّ", "الطَّعَامَ", "الْفَاعِلُ مُسْتَتِرٌ"]	B	1.00	2026-10-22 02:09:37.948014+00	\N
635	166	mc	عَيِّنِ الْمَفْعُولَ بِهِ فِي جُمْلَةِ "قَرَأَ زَيْدٌ الْقُرْآنَ"؟	["قَرَأَ", "زَيْدٌ", "الْقُرْآنَ", "زَيْدٌ الْقُرْآنَ"]	C	1.00	2026-10-22 02:09:37.948014+00	\N
636	166	mc	لِمَاذَا سُمِّيَتْ جُمْلَةُ "سَافَرَ الْوَالِدُ إِلَى مَكَّةَ" جُمْلَةً فِعْلِيَّةً؟	["لِأَنَّهَا تَبْدَأُ بِالِاسْمِ", "لِأَنَّهَا تَبْدَأُ بِالْفِعْلِ", "لِأَنَّ فِيهَا حَرْفَ جَرٍّ", "لِأَنَّ مَعْنَاهَا غَيْرُ تَامٍّ"]	B	1.00	2026-10-22 02:09:37.948014+00	\N
637	166	mc	أَيُّ الْجُمَلِ الْآتِيَةِ هِيَ جُمْلَةٌ اِسْمِيَّةٌ؟	["الْعِلْمُ نُورٌ", "نَجَحَ الطَّالِبُ", "اُدْخُلِ الْفَصْلَ", "لَمْ يَحْضُرْ زَيْدٌ"]	A	1.00	2026-10-22 02:09:37.948014+00	\N
638	166	mc	جُمْلَةُ "إِذَا جَاءَ نَصْرُ اللَّهِ..." لَيْسَتْ جُمْلَةً مُفِيدَةً لِأَنَّهَا...	["لَا تَبْدَأُ بِالِاسْمِ", "لَا تُفِيدُ فَائِدَةً تَامَّةً يَحْسُنُ السُّكُوتُ عَلَيْهَا", "قَصِيرَةٌ جِدًّا", "فِيهَا فِعْلٌ مَاضٍ"]	B	1.00	2026-10-22 02:09:37.948014+00	\N
639	166	mc	حَوِّلِ الْفِعْلَ فِي جُمْلَةِ "غَسَلَ الرَّجُلُ السَّيَّارَةَ" إِلَى الْفِعْلِ الْمُضَارِعِ الصَّحِيحِ:	["اِغْسِلْ السَّيَّارَةَ", "يَغْسِلُ الرَّجُلُ السَّيَّارَةَ", "سَوْفَ غَسَلَ الرَّجُلُ السَّيَّارَةَ", "لَمْ يَغْسِلْ الرَّجُلُ السَّيَّارَةَ"]	B	1.00	2026-10-22 02:09:37.948014+00	\N
640	166	mc	اخْتَرِ الْجُمْلَةَ الصَّحِيحَةَ بَعْدَ دُخُولِ حَرْفِ النَّصْبِ (لَنْ):	["لَنْ يَكْتُبُ التِّلْمِيذُ", "لَنْ يَكْتُبَ التِّلْمِيذُ", "لَنْ يَكْتُبْ التِّلْمِيذُ", "لَنْ يَكْتُبِ التِّلْمِيذُ"]	B	1.00	2026-10-22 02:09:37.948014+00	\N
641	166	mc	خْتَرِ الْجُمْلَةَ الصَّحِيحَةَ بَعْدَ دُخُولِ حَرْفِ الْجَزْمِ (لَمْ):	["لَمْ يَقْرَأُ خَالِدٌ", "لَمْ يَقْرَأَ خَالِدٌ", "لَمْ يَقْرَأْ خَالِدٌ", "لَمْ يَقْرَأِ خَالِدٌ"]	C	1.00	2026-10-22 02:09:37.948014+00	\N
642	166	mc	عَيِّنِ الفَاعِلَ فِي الجُمْلَةِ الآتِيَةِ: (قَرَأَ الطَّالِبُ الكِتَابَ)	["قَرَأَ", "الكِتَابَ", "الطَّالِبُ", "لَيْسَ فِي الجُمْلَةِ فَاعِلٌ"]	A	1.00	2026-10-22 02:09:37.948014+00	\N
643	166	mc	أَدْخِلْ (كَانَ) عَلَى الجُمْلَةِ الآتِيَةِ: (الطَّالِبَانِ مُجْتَهِدَانِ).	["كَانَ الطَّالِبَانِ مُجْتَهِدَانِ", "كَانَ الطَّالِبَيْنِ مُجْتَهِدَانِ", "كَانَ الطَّالِبَانِ مُجْتَهِدَيْنِ", "كَانَ الطَّالِبَيْنِ مُجْتَهِدَيْنِ"]	C	1.00	2026-10-22 02:09:37.948014+00	\N
673	168	mc	الفِعْلُ المَاضِي مِنْ اِجْلِسْ هُوَ ...	["جَلَسَ", "يَجْلِسُ", "جَالِسٌ", "مَجْلِسٌ"]	A	1.00	2026-10-26 06:41:07.452329+00	\N
674	168	mc	حَوِّلِ الفِعْلَ المُضَارِعَ يَشْرَبُ إِلَى فِعْلِ الأَمْرِ!	["شَرِبَ", "يَشْرَبُ", "اِشْرَبْ", "شَارِبٌ"]	C	1.00	2026-10-26 06:41:07.452329+00	\N
675	168	mc	الفِعْلُ المُضَارِعُ مِنْ كَتَبَ هُوَ ...	["كَاتِبٌ", "اُكْتُبْ", "يَكْتُبُ", "مَكْتُوبٌ"]	C	1.00	2026-10-26 06:41:07.452329+00	\N
676	168	mc	مَا وَزْنُ كَلِمَةِ كَاتِبٌ؟	["فَاعِلٌ", "مَفْعُولٌ", "فَعَّالٌ", "أَفْعَلُ"]	A	1.00	2026-10-26 06:41:07.452329+00	\N
677	168	mc	مَا وَزْنُ كَلِمَةِ كَتَبَ؟	["فَعَّلَ", "فَاعَلَ", "فَعَلَ", "أَفْعَلَ"]	C	1.00	2026-10-26 06:41:07.452329+00	\N
678	168	mc	الفِعْلُ المَاضِي مِنْ اِشْرَبْ هُوَ ...	["يَشْرَبُ", "شَرِبَ", "شَارِبٌ", "مَشْرَبٌ"]	B	1.00	2026-10-26 06:41:07.452329+00	\N
679	168	mc	فِعْلُ الأَمْرِ مِنْ نَصَرَ هُوَ ...	["يَنْصُرُ", "نَاصِرٌ", "اُنْصُرْ", "مَنْصُورٌ"]	C	1.00	2026-10-26 06:41:07.452329+00	\N
680	168	mc	حَوِّلِ الفِعْلَ اُدْخُلْ إِلَى الفِعْلِ المَاضِي!	["يَدْخُلُ", "دَخَلَ", "دَاخِلٌ", "مَدْخَلٌ"]	B	1.00	2026-10-26 06:41:07.452329+00	\N
681	168	mc	حَوِّلِ الفِعْلَ المَاضِيَ قَرَأَ إِلَى الفِعْلِ المُضَارِعِ!	["اِقْرَأْ", "يَقْرَأُ", "قَارِئٌ", "مَقْرُوءٌ"]	B	1.00	2026-10-26 06:41:07.452329+00	\N
682	168	mc	حَوِّلِ الفِعْلَ شَرِبَ إِلَى فِعْلِ الأَمْرِ!	["يَشْرَبُ", "اِشْرَبْ", "شَارِبٌ", "مَشْرَبٌ"]	B	1.00	2026-10-26 06:41:07.452329+00	\N
683	168	mc	أَكْمِلِ التَّرْتِيبَ الآتِيَ! ........ → يَفْتَحُ → اِفْتَحْ	["فَتَحَ", "فَاتِحٌ", "مَفْتُوحٌ", "فَتَّحَ"]	A	1.00	2026-10-26 06:41:07.452329+00	\N
644	166	mc	عَيِّنِ الجُمْلَةَ الَّتِي تَحْتَوِي عَلَى فِعْلٍ مُضَارِعٍ مَجْزُوْمٍ صَحِيْحٍ:	["لَا تَشْرَبُ المَاءَ بَارِدًا", "لَا تَشْرَبَ المَاءَ بَارِدًا", "لَا تَشْرَبْ المَاءَ بَارِدًا", "لَنْ تَشْرَبْ المَاءَ بَارِدًا"]	C	1.00	2026-10-22 02:09:37.948014+00	\N
645	166	essay	عَيِّنِ الفَاعِلَ وَالمَفْعُوْلَ بِهِ فِي الجُمْلَةِ الآتِيَةِ: «أَكَلَ الوَلَدُ التُّفَّاحَةَ»!	[]	الفَاعِلُ: الوَلَدُ | المَفْعُوْلُ بِهِ: التُّفَّاحَةَ.	1.00	2026-10-22 02:09:37.948014+00	\N
646	166	essay	أَدْخِلْ «إِنَّ» عَلَى الجُمْلَةِ الإِسْمِيَّةِ الآتِيَةِ مَعَ الشَّكْلِ: «الطَّالِبُ مُجْتَهِدٌ».	[]	إِنَّ الطَّالِبَ مُجْتَهِدٌ.	1.00	2026-10-22 02:09:37.948014+00	\N
647	166	essay	أَدْخِلْ «كَانَ» عَلَى الجُمْلَةِ الآتِيَةِ مَعَ الشَّكْلِ: «المُعَلِّمُ مَاهِرٌ».	[]	كَانَ المُعَلِّمُ مَاهِرًا.	1.00	2026-10-22 02:09:37.948014+00	\N
648	166	essay	أَكْمِلِ الجُمْلَةَ الآتِيَةَ بِفَاعِلٍ مُنَاسِبٍ: «قَرَأَ [...] الكِتَابَ»	[]	الطَّالِبُ	1.00	2026-10-22 02:09:37.948014+00	\N
649	166	essay	إِعْرَابٌ كَامِلٌ: إِعْرِبِ الجُمْلَةَ الآتِيَةَ: «لَنْ يَنْجَحَ الكَسْلاَنُ».	[]	لَنْ: حَرْفُ نَصْبٍ وَنَفْيٍ وَاسْتِقْبَالٍ مَبْنِيٌّ عَلَى السُّكُوْنِ. * يَنْجَحَ: فِعْلٌ مُضَارِعٌ مَنْصُوْبٌ بِـ (لَنْ) وَعَلاَمَةُ نَصْبِهِ الفَتْحَةُ الظَّاهِرَةُ. * الكَسْلاَنُ: فَاعِلٌ مَرْفُوْعٌ وَعَلاَمَةُ رَفْعِهِ الضَّمَّةُ الظَّاهِرَةُ.	1.00	2026-10-22 02:09:37.948014+00	\N
650	167	mc	ما هو الفعل الثلاثي المزيد؟	["أ) هو ما خلت حروفه الأصلية من حروف الزيادة", "ب) هو ما زيد على حروفه الأصلية الثلاثة حرف أو حرفان أو ثلاثة", "ج) هو ما كانت حروفه الأصلية أربعة أحرف", "د) هو الفعل الذي يأتي بصيغة المضارع فقط"]	B	1.00	2026-10-26 06:35:54.467454+00	\N
651	167	mc	أيّ من الأفعال التالية يعتبر مزيداً بحرف واحد؟	["أ) اسْتَغْفَرَ", "ب) انْكَسَرَ", "ج) أَحْسَنَ", "د) تَسَامَحَ"]	C	1.00	2026-10-26 06:35:54.467454+00	\N
652	167	mc	الفعل (عَلَّمَ) مزيد بحرف هو:	["أ) الهمزة في أوله", "ب) الألف بعد فاء الفعل", "ج) التضعيف (الشدة) على عينه", "د) التاء في أوله"]	C	1.00	2026-10-26 06:35:54.467454+00	\N
653	167	mc	كم عدد حروف الزيادة في الفعل (اسْتَخْرَجَ)؟	["أ) حرف واحد", "ب) حرفان", "ج) ثلاثة أحرف", "د) أربعة أحرف"]	C	1.00	2026-10-26 06:35:54.467454+00	\N
654	167	mc	أيّ الأوزان التالية يعدّ من مزيد الحرفين؟	["أ) أَفْعَلَ", "ب) فَاعَلَ", "ج) انْفَعَلَ", "د) اسْتَفْعَلَ"]	C	1.00	2026-10-26 06:35:54.467454+00	\N
655	167	mc	تجمع حروف الزيادة في اللغة العربية في كلمة:	["أ) سَأَلْتُمُونِيهَا", "ب) كَتَبْتُمُوهَا", "ج) قَرَأْتُمُوهَا", "د) عَلِمْتُمُوهَا"]	A	1.00	2026-10-26 06:35:54.467454+00	\N
656	167	mc	كم أقصى عدد لحروف الزيادة التي يمكن أن تُضاف إلى الفعل الرباعي؟	["أ) حرف واحد فقط", "ب) حرفان", "ج) ثلاثة أحرف", "د) أربعة أحرف"]	B	1.00	2026-10-26 06:35:54.467454+00	\N
657	167	mc	الفعل (تَدَحْرَجَ) يعتبر مزيداً بـ:	["أ) حرف واحد (التاء في أوله)", "ب) حرفين (الهمزة والتاء)", "ج) ثلاثة أحرف", "د) لا زيادة فيه فهو مجرد"]	A	1.00	2026-10-26 06:35:54.467454+00	\N
658	167	mc	ما هو وزن الفعل (تَزَلْزَلَ)؟	["أ) افْعَلَلَّ", "ب) افْعَنْلَلَ", "ج) تَفَعْلَلَ", "د) فَعْلَلَ"]	C	1.00	2026-10-26 06:35:54.467454+00	\N
659	167	mc	أيّ من الأفعال التالية يعدّ مزيداً بحرفين على وزن (افْعَلَلَّ)؟	["أ) تَبَعْثَرَ", "ب) زَلْزَلَ", "ج) اطْمَأَنَّ", "د) تَدَحْرَجَ"]	C	1.00	2026-10-26 06:35:54.467454+00	\N
660	167	mc	ما هما حرفا الزيادة في الفعل (احْرَنْجَمَ)؟	["أ) التاء والتضعيف", "ب) الهمزة والنون", "ج) الهمزة والتاء", "د) الألف والسين"]	B	1.00	2026-10-26 06:35:54.467454+00	\N
661	167	mc	الفعل (اطْمَأَنَّ) يأتي على صيغة:	["أ) تَفَعْلَلَ", "ب) افْعَنْلَلَ", "ج) افْعَلَلَّ", "د) افْتَعَلَ"]	C	1.00	2026-10-26 06:35:54.467454+00	\N
662	167	mc	أيّ من الأفعال التالية جاء على صيغة (انْفَعَلَ)؟	["أ) اجْتَمَعَ", "ب) انْكَسَرَ", "ج) تَعَلَّمَ", "د) احْمَرَّ"]	B	1.00	2026-10-26 06:35:54.467454+00	\N
663	167	mc	صيغة (افْتَعَلَ) من صيغ الثلاثي المزيد بـ:	["أ) حرف واحد", "ب) حرفين", "ج) ثلاثة أحرف", "د) أربعة أحرف"]	B	1.00	2026-10-26 06:35:54.467454+00	\N
664	167	mc	الفعل (احْرَنْجَمَ) يصاغ على وزن:	["أ) افْعَلَلَّ", "ب) افْعَنْلَلَ", "ج) تَفَعْلَلَ", "د) اسْتَفْعَلَ"]	B	1.00	2026-10-26 06:35:54.467454+00	\N
665	167	essay	اذكر مثالاً واحداً لفعل ثلاثي مزيد بـ حرف واحد.	[]	َحْسَنَ (أو: سَافَرَ / عَلَّمَ).	1.00	2026-10-26 06:35:54.467454+00	\N
666	167	essay	اذكر مثالاً واحداً لفعل رباعي مجرد (4 أحرف أصلية).	[]	دَحْرَجَ (أو: زَلْزَلَ / بَعْثَرَ).	1.00	2026-10-26 06:35:54.467454+00	\N
667	167	essay	صرفي التصريفا إصطلاحيا من : روي- يروى	[]	إذا أردت أي تعديل أو إضافة أسئلة أخرى بأسلوب مختلف، فأنا في الخدمة!	1.00	2026-10-26 06:35:54.467454+00	\N
668	167	essay	صرفي التصريفا إصطلاحيا من وقى - يقى	[]	إذا أردت أي تعديل أو إضافة أسئلة أخرى بأسلوب مختلف، فأنا في الخدمة!	1.00	2026-10-26 06:35:54.467454+00	\N
669	167	essay	صرفي التصريفا إصطلاحيا من هَاب - يهاب	[]	إذا أردت أي تعديل أو إضافة أسئلة أخرى بأسلوب مختلف، فأنا في الخدمة!	1.00	2026-10-26 06:35:54.467454+00	\N
670	168	mc	حَوِّلِ الفِعْلَ الأَمْرَ اُكْتُبْ إِلَى الفِعْلِ المَاضِي	["كَتَبَ", "يَكْتُبُ", "كَاتِبٌ", "مَكْتُوبٌ"]	A	1.00	2026-10-26 06:41:07.452329+00	\N
684	168	mc	أَيُّ تَرْتِيبٍ صَحِيحٌ لِلْفِعْلِ المَاضِيِّ → المُضَارِعِ → الأَمْرِ؟	["كَتَبَ → يَكْتُبُ → اُكْتُبْ", "يَكْتُبُ → كَتَبَ → اُكْتُبْ", "اُكْتُبْ → يَكْتُبُ → كَتَبَ", "كَاتِبٌ → مَكْتُوبٌ → كَتَبَ"]	A	1.00	2026-10-26 06:41:07.452329+00	\N
685	168	essay	ما هو الصرف لغة‏	[]	الصرف لغةً: التغيير	1.00	2026-10-26 06:41:07.452329+00	\N
686	168	essay	‏وما هو صرف اصطلاح	[]	علم يبحث انتغيير اصل واحد الى صيغ متعددة ليدل على معان مختلفة	1.00	2026-10-26 06:41:07.452329+00	\N
687	168	essay	صرف تصريف إصطلاحيا من كلمة صان	[]	صَانَ – يَصُونُ – صَوْنًا – وَمَصَا ناً -- فَهُوَ صَائِنٌ – وَذَاكَ مَصُونٌ – صُنْ – لَا تَصُنْ – مَصَانٌ – مِصْوَنٌ	1.00	2026-10-26 06:41:07.452329+00	\N
688	168	essay	صرف تصريف إصطلاحيا من كلمة سار	[]	سَارَ – يَسِيرُ – سَيْرًا – وَمَسِيرَةً -- فَهُوَ سَائِرٌ – وَذَاكَ مَسِيرٌ – سِرْ – لَا تَسِرْ – مَسِيرٌ – مِسْيَرٌ	1.00	2026-10-26 06:41:07.452329+00	\N
689	168	essay	صرف تصريف إصطلاحيا من كلمة وقى	[]	وَقَى – يَقِي – وِقَايَةً – وَمَوقىً -- فَهُوَ وَاقٍ – وَذَاكَ مَوْقِيٌّ – قِ – لَا تَقِ – مَوْقًى – مِيْقًى	1.00	2026-10-26 06:41:07.452329+00	\N
690	169	mc	مَا هُوَ الصَّرْفُ لُغَةً	["هُوَ التَّغْيِيْرِ", "هُوَ التَّغْيِيْرُ", "مُعَاذُ بْنُ مُسْلِمٍ الهَرَّاءُ", "هُوَ التَّغْيِيْرَ"]	B	1.00	2026-10-26 06:43:50.578932+00	\N
691	169	mc	مَا هُوَ الصَّرْفُ اصْطِلَاحًا	["هُوَ التَّغْيِيْرُ", "هُوَ عِلمُ يَبْحَثُ عَنْ تَغْيِيْرِ الأَصْلِ إِلَى صِيَغٍ مُتَعَدِّدَةٍ لِيَدُلَّ عَلَى مَعَانٍ مُخْتَلِفَةٍ", "هُوَ الكَلِمَةُ العَرَبِيَّةُ مِنَ الأَسْمَاءِ المُعْرَبَةِ والأَفْعَالِ المُتَصَرِّفَةِ فِي حَالِ إفْرَادِهَا", "هُوَ عِلمُ يَبْحَثُ عَنْ تَغْيِيْرِ الأَصْلِ الوَاحِدِ إِلَى صِيَغٍ مُتَعَدِّدَةٍ لِيَدُلَّ عَلَى مَعَانٍ مُخْتَلِفَةٍ"]	D	1.00	2026-10-26 06:43:50.578932+00	\N
692	169	mc	مَنْ وَاضِعُهٌ مِنْ عِلْمِ الصَّرْفُ	["مُعَاذُ بْنُ مُسْلِمٍ الهَرَّاءُ", "مُعَاذُ بْنُ مُسْلِمٍ الهَرَّاءَ", "الشَّيْخُ الإِمَامُ النَّوَوِيُّ", "مُعَاذُ بْنُ مُسْلِمَ"]	A	1.00	2026-10-26 06:43:50.578932+00	\N
693	169	mc	مَا مَوْضُوْعُهُ مِنْ عِلْمِ الصَّرْفُ	["هُوَ الكَلِمَةُ العَرَبِيَّةُ مِنَ الالأَفْعَالِ المُتَصَرِّفَةِ فِي حَالِ إفْرَادِهَا", "هُوَ عِلمُ يَبْحَثُ عَنْ تَغْيِيْرِ الأَصْلِ إِلَى صِيَغٍ مُتَعَدِّدَةٍ لِيَدُلَّ عَلَى مَعَانٍ مُخْتَلِفَةٍ", "هُوَ الكَلِمَةُ العَرَبِيَّةُ مِنَ الأَسْمَاءِ المُعْرَبَةِ والأَفْعَالِ المُتَصَرِّفَةِ فِي حَالِ إفْرَادِهَا", "هُوَ التَّغْيِيْرِ"]	C	1.00	2026-10-26 06:43:50.578932+00	\N
694	169	mc	مَا هُوَ فِعْلُ المَاضِي ؟	["اِسْمٌ يَدُلُّ عَلَى حَصَلَ عَلَيْهِ فِعْلُ الفَاعِلِ", "كُلُّ فِعْلٍ يَدُلُّ عَلَى حُصُوْلٍ عَمَلٍ فِي الزَّمَنِ المَضِيْ", "كُلُّ فِعْلٍ يَدُلُّ عَلَى حُصُوْلٍ عَمَلٍ فِي الزَّمَنِ الحَاضِرِ أَو المُسْتقْبَلِ", "جَلَسَ"]	B	1.00	2026-10-26 06:43:50.578932+00	\N
695	169	mc	مَا هُوَ فِعْلُ المُضَارِعْ ؟	["كُلُّ اِسْمٍ يَدُلُّ عَلَى أَدَةِ الفِعْلِ", "اِسْمٌ يَدُلُّ عَلَى حَصَلَ عَلَيْهِ فِعْلُ الفَاعِلِ", "كُلُّ فِعْلٍ يَدُلُّ عَلَى حُصُوْلٍ عَمَلٍ فِي الزَّمَنِ المَضِيْ", "كُلُّ فِعْلٍ يَدُلُّ عَلَى حُصُوْلٍ عَمَلٍ فِي الزَّمَنِ الحَاضِرِ أَو المُسْتقْبَلِ"]	D	1.00	2026-10-26 06:43:50.578932+00	\N
696	169	mc	مَا هُوَ المَصْدَرُ؟	["اِسْمٌ يَدُلُّ عَلَى حَصَلَ عَلَيْهِ فِعْلُ الفَاعِلِ", "قِرَاءَةٌ", "هُوَ التَّغْيِيْرُ", "هُوَ الكَلِمَةُ العَرَبِيَّةُ مِنَ الأَسْمَاءِ المُعْرَبَةِ والأَفْعَالِ المُتَصَرِّفَةِ فِي حَالِ إفْرَادِهَا"]	A	1.00	2026-10-26 06:43:50.578932+00	\N
697	169	mc	مَا هُوَ اِسْمُ الآلَةِ ؟	["مَكْتَبٌ", "مُعَاذُ بْنُ مُسْلِمَ", "كُلُّ اِسْمٍ يَدُلُّ عَلَى أَدَةِ الفِعْلِ", "صَبَاحًا"]	C	1.00	2026-10-26 06:43:50.578932+00	\N
698	169	mc	مَا صِيغَةُ «فَتَحَ» مَعَ الضَّمِيرِ «أَنْتُمَا»؟	["فَتَحْتَ", "فَتَحْتِ", "فَتَحْتُمَا", "فَتَحَا"]	C	1.00	2026-10-26 06:43:50.578932+00	\N
699	169	mc	مَا صِيغَةُ الْفِعْلِ «فَتَحَ» فِي الْفِعْلِ الْمُضَارِعِ مَعَ الضَّمِيرِ «نَحْنُ»؟	["يَفْتَحُ", "تَفْتَحُ", "أَفْتَحُ", "نَفْتَحُ"]	D	1.00	2026-10-26 06:43:50.578932+00	\N
700	169	mc	مَا صِيغَةُ «نَصَرَ» فِي الْفِعْلِ الْمُضَارِعِ مَعَ الضَّمِيرِ «هِيَ»؟	["يَنْصُرُ", "تَنْصُرُ", "أَنْصُرُ", "نَنْصُرُ"]	B	1.00	2026-10-26 06:43:50.578932+00	\N
701	169	mc	مَا صِيغَةُ «ضَرَبَ» فِي الْفِعْلِ الْمُضَارِعِ مَعَ الضَّمِيرِ «أَنْتَ»؟	["يَضْرِبُ", "تَضْرِبُ", "أَضْرِبُ", "نَضْرِبُ"]	B	1.00	2026-10-26 06:43:50.578932+00	\N
720	170	mc	ما علامة التأنيث الظاهرة في كلمة "صَحْرَاء"؟	["تاء التأنيث الساكنة", "الألف المقصورة", "تاء التأنيث المربوطة", "الألف الممدودة"]	D	1.00	2026-10-26 06:45:36.070193+00	\N
721	170	mc	أيّ الكلمات الآتية تُعدّ "مؤنثاً معنوياً" (تدل على مؤنث وليس فيها علامة تأنيث لفظية)؟	["فَاطِمَةُ", "هِنْدٌ", "حَمْزَةُ", "سَرِيرَةٌ"]	B	1.00	2026-10-26 06:45:36.070193+00	\N
745	171	essay	مَا مَعْنَى الخَوْفِ الأَوَّلِ؟	[]	الخَوْفُ الأَوَّلُ هُوَ الخَوْفُ عَلَى العُمْرِ الَّذِي مَضَى وَالأَعْمَالِ الَّتِي عَمِلَهَا الإِنْسَانُ	1.00	2026-10-26 06:49:52.457299+00	\N
702	169	mc	أَيُّ خِيَارٍ صَحِيحٌ؟هُوَ ذَهَبَ إِلَى الْمَكْتَبِ وَحَمَلَ الْكِتَابَ فِي الصَّبَاحِ.	["ذَهَبَ: فِعْلٌ مَاضٍ لِضَمِيرِ هُوَ، الْمَكْتَبِ: اسْمُ مَكَانٍ، حَمَلَ: فِعْلٌ مَاضٍ لِضَمِيرِ هُوَ، الْكِتَابَ: مَفْعُولٌ بِهِ، الصَّبَاحِ: اسْمُ زَمَانٍ.", "ذَهَبَ: فِعْلٌ مُضَارِعٌ لِضَمِيرِ هُوَ، الْمَكْتَبِ: اسْمُ آلَةٍ، حَمَلَ: فِعْلُ أَمْرٍ.", "ذَهَبَ: فِعْلٌ مَاضٍ لِضَمِيرِ هِيَ، الْكِتَابَ: فَاعِلٌ، الصَّبَاحِ: اسْمُ مَكَانٍ.", "ذَهَبَ: فِعْلُ أَمْرٍ لِضَمِيرِ أَنْتَ، الْمَكْتَبِ: اسْمُ زَمَانٍ، حَمَلَ: مَصْدَرٌ."]	A	1.00	2026-10-26 06:43:50.578932+00	\N
703	169	mc	أَيُّ خِيَارٍ صَحِيحٌ؟ كَتَبَتِ الطَّالِبَةُ الْوَاجِبَ بِالْقَلَمِ فِي الْفَصْلِ مَسَاءً.	["كَتَبَتْ: فِعْلٌ مَاضٍ لِضَمِيرِ هُوَ، الطَّالِبَةُ: فَاعِلٌ، الْوَاجِبَ: اسْمُ فَاعِلٍ.", "كَتَبَتْ: فِعْلٌ مَاضٍ لِضَمِيرِ هِيَ، الطَّالِبَةُ: فَاعِلٌ، الْوَاجِبَ: مَفْعُولٌ بِهِ، الْقَلَمِ: اسْمُ آلَةٍ، الْفَصْلِ: اسْمُ مَكَانٍ، مَسَاءً: اسْمُ زَمَانٍ.", "كَتَبَتْ: فِعْلٌ مُضَارِعٌ لِضَمِيرِ هِيَ، الطَّالِبَةُ: مَفْعُولٌ بِهِ، الْوَاجِبَ: فَاعِلٌ.", "كَتَبَتْ: فِعْلُ أَمْرٍ لِضَمِيرِ أَنْتِ، الْقَلَمِ: اسْمُ مَكَانٍ، الْفَصْلِ: اسْمُ آلَةٍ."]	B	1.00	2026-10-26 06:43:50.578932+00	\N
704	169	mc	أَيُّ خِيَارٍ صَحِيحٌ؟ أَنْتَ تَقْرَأُ الْكِتَابَ فِي الْمَكْتَبَةِ مَسَاءً.	["تَقْرَأُ: فِعْلٌ مَاضٍ لِضَمِيرِ هِيَ، الْكِتَابَ: فَاعِلٌ، الْمَكْتَبَةِ: اسْمُ آلَةٍ.", "تَقْرَأُ: فِعْلُ أَمْرٍ لِضَمِيرِ أَنْتَ، الْكِتَابَ: فَاعِلٌ، مَسَاءً: اسْمُ مَكَانٍ.", "تَقْرَأُ: فِعْلٌ مُضَارِعٌ لِضَمِيرِ أَنْتَ، الْكِتَابَ: مَفْعُولٌ بِهِ، الْمَكْتَبَةِ: اسْمُ مَكَانٍ، مَسَاءً: اسْمُ زَمَانٍ.", "تَقْرَأُ: فِعْلٌ مُضَارِعٌ لِضَمِيرِ هُوَ، الْكِتَابَ: فَاعِلٌ، الْمَكْتَبَةِ: اسْمُ زَمَانٍ."]	C	1.00	2026-10-26 06:43:50.578932+00	\N
705	169	essay	مَا هُوَ الصَّرْفُ لُغَةً	[]	هُوَ التَّغْيِيْرُ	1.00	2026-10-26 06:43:50.578932+00	\N
706	169	essay	مَا هُوَ الصَّرْفُ اصْطِلَاحًا	[]	هُوَ عِلمُ يَبْحَثُ عَنْ تَغْيِيْرِ الأَصْلِ الوَاحِدِ إِلَى صِيَغٍ مُتَعَدِّدَةٍ لِيَدُلَّ عَلَى مَعَانٍ مُخْتَلِفَةٍ	1.00	2026-10-26 06:43:50.578932+00	\N
707	169	essay	مَا مَوْضُوْعُهُ مِنْ عِلْمِ الصَّرْفُ	[]	هُوَ الكَلِمَةُ العَرَبِيَّةُ مِنَ الأَسْمَاءِ المُعْرَبَةِ والأَفْعَالِ المُتَصَرِّفَةِ فِي حَالِ إفْرَادِهَا	1.00	2026-10-26 06:43:50.578932+00	\N
708	169	essay	صَرِّفِ الْفِعْلَ «وَقَى» تَصْرِيفًا اصْطِلَاحِيًّا!	[]	وَقَى – يَقِى – وِِقَايَةً – وَمَوْقًا – فَهُوَ – وَاقٍ – وَذَاكَ – مَوْقِيٌّ – قِ – لَا تَقِ – مَوقًا 2 – مِيْقًا	1.00	2026-10-26 06:43:50.578932+00	\N
709	169	essay	صَرِّفِ الْفِعْلَ «شَوَى» تَصْرِيفًا اصْطِلَاحِيًّا!	[]	شَوَى – يَشْوِى – شَيًّا – وَ مَشْوًى – فهو – شَاوٍ – وذاك – مَشْوِيٌّ – أشْوِ – لَا تَشْوِ – مَشْوًى 2 - مِشْوًى	1.00	2026-10-26 06:43:50.578932+00	\N
710	170	mc	في جملة: "كِتَابُ الطَّالِبِ مُفِيدٌ"، ما الإعراب الصحيح لكلمة "كتاب"؟	["مبتدأ مرفوع وعلامة رفعه الضمة وهو مضاف إليه.", "مبتدأ مرفوع وعلامة رفعه الضمة الظاهرة وهو مضاف", "مضاف إليه مجرور وعلامة جره الكسرة.", "خبر مرفوع وعلامة رفعه الضمة"]	B	1.00	2026-10-26 06:45:36.070193+00	\N
711	170	mc	لماذا حُذف التنوين من كلمة "بيتٌ" عندما أصبحت مضافة في قولنا: "بَيْتُ الرَّجُلِ واسعٌ"؟	["لأن المضاف لا يجتمع مع التنوين في كلمة واحدة.", "لأن المضاف إليه مرفوع بالضمة", "لأن كلمة بيت أصبحت ممنوعة من الصرف", "لأن المضاف إليه يجب أن يكون نكرة"]	A	1.00	2026-10-26 06:45:36.070193+00	\N
712	170	mc	ما هي الصورة الصحيحة لإضافة المثنى "معلمان" إلى كلمة "المدرسة"؟	["معلمان المدرسة", "معلِما المدرسة", "معلمين المدرسة", "معلمانِ المدرسةِ"]	B	1.00	2026-10-26 06:45:36.070193+00	\N
713	170	mc	ما هي الحركة الإعرابية أو الحالة الخاصة الدائمة للاسم المضاف إليه؟	["النصب دائماً", "الرفع دائماً", "الجزم دائماً.", "الجر دائماً"]	D	1.00	2026-10-26 06:45:36.070193+00	\N
714	170	mc	ما هي الكلمات الصحيحة التي تمثل "الأسماء الخمسة" في النحو العربي؟	["أب، أم، أخ، أخت، حم", "أب، أخ، حم، فو، ذو", "أب، أخ، ابن، حم، ذو", "أخ، عم، حم، فو، مال"]	B	1.00	2026-10-26 06:45:36.070193+00	\N
715	170	mc	ما هي العلامة الإعرابية الفرعية للأسماء الخمسة في حالة الرفع؟	["الضمة الظاهرة", "الألف", "الواو", "الياء"]	C	1.00	2026-10-26 06:45:36.070193+00	\N
716	170	mc	في الجملة "رأيت أباك في المسرح"، ما علامة نصب كلمة (أباك)؟	["الفتحة الظاهرة", "الياء", "الألف", "حذف النون"]	C	1.00	2026-10-26 06:45:36.070193+00	\N
717	170	mc	ما هي علامة الجر المناسبة عند إعراب كلمة (أخيك) في قولنا: مررتُ بأخيك؟	["الكسرة المقدرة", "الألف", "الكسرة الظاهرة", "الياء"]	D	1.00	2026-10-26 06:45:36.070193+00	\N
718	170	mc	أيّ من الكلمات الآتية تدلّ على التأنيث بوجود تاء التأنيث المربوطة؟	["مَرْيَمُ", "عُثْمَانُ", "شَجَرَةٌ", "زَيْدٌ"]	C	1.00	2026-10-26 06:45:36.070193+00	\N
719	170	mc	الكلمة التي ختمت بألف مقصورة دالة على التأنيث فيما يلي هي:	["صُغْرَى", "مُصْطَفَى", "رَمَى", "فَتًى"]	A	1.00	2026-10-26 06:45:36.070193+00	\N
722	170	mc	في جملة "قَالَتِ الطَّالِبَةُ الصِّدْقَ"، ما نوع التاء في الفعل وكيف وُجّهت إعرابياً؟	["تاء التأنيث الساكنة في آخر الفعل (حُرِّكَتْ بالكسر للتقاء الساكنين)", "تاء الفاعل المتحركة في أول الفعل", "تاء المضارعة تدل على المذكر", "حرف جر يفيد التوكيد"]	A	1.00	2026-10-26 06:45:36.070193+00	\N
723	170	mc	أيّ الكلمات الآتية يُعدّ معرفةً من نوع الضمير المنفصل في الجملة الآتية: (هُوَ طَالِبٌ مُجْتَهِدٌ)؟	["طَالِبٌ", "مُجْتَهِد", "هُوَ", "طَالِبٌ وَمُجْتَهِدٌ"]	C	1.00	2026-10-26 06:45:36.070193+00	\N
724	170	mc	أيّ الكلمات الآتية تُعدّ اسماً نكرةً محضةً؟	["الرَّجُلُ", "قَلَمُ الرَّجُلِ", "هَذَا", "بَيْتٌ"]	D	1.00	2026-10-26 06:45:36.070193+00	\N
725	170	essay	: عَدِّدِ الأَسْمَاءَ الخَمْسَةَ فِي اللُّغَةِ العَرَبِيَّةِ، ثُمَّ اذْكُرْ مَعْنَى كُلِّ اسْمٍ مِنْهَا	[]	1. الأسماء الخمسة هي: أَب (Ayah)، أَخ (Saudara laki-laki)، حَم (Ipar)، فُو (الفم - Mulut)، ذُو (صاحب - Pemilik).	1.00	2026-10-26 06:45:36.070193+00	\N
726	170	essay	: مَا هِيَ عَلَامَاتُ إِعْرَابِ الأَسْمَاءِ الخَمْسَةِ بِالحُرُوفِ فِي حَالَاتِ: الرَّفْعِ، وَالنَّصْبِ، وَالجَرِّ؟	[]	o في حالة الرفع: تُرفع وعلامة رفعها الواو (نيابة عن الضمة). o في حالة النصب: تُنصب وعلامة نصبها الألف (نيابة عن الفتحة). o في حالة الجر: تُجر وعلامة جرها الياء (نيابة عن الكسرة).	1.00	2026-10-26 06:45:36.070193+00	\N
727	170	essay	ما هي علامات التأنيث الثلاث في الأسماء؟ مَثِّل لكل منها بكلمة مفيدة	[]	1. التاء المربوطة (ة): مثل (طالبة). 2. ألف التأنيث المقصورة (ى): مثل (مستشفى / بشرى). \r\n\r\n3. ألف التأنيث الممدودة (اء): مثل (حسناء / نجلاء).	1.00	2026-10-26 06:45:36.070193+00	\N
728	170	essay	كيف تفرق بين علامة التأنيث في الفعل الماضي وعلامة التأنيث في الفعل المضارع؟	[]	في الفعل الماضي: تكون علامة التأنيث تاءً ساكنةً تلحق آخر الفعل، مثل: (قرأَتْ هندُ الكتاب). في الفعل المضارع: تكون علامة التأنيث تاءً متحركةً تأتي في أول الفعل، مثل: (تقرأُ هندُ الكتاب).	1.00	2026-10-26 06:45:36.070193+00	\N
729	170	essay	لِمَاذَا تُعْتَبَرُ كَلِمَةُ (مُحَمَّدٌ) مِنَ الْمَعَارِفِ مَعَ أَنَّ فِي آخِرِهَا تَنْوِينًا، وَالتَّنْوِينُ كَمَا عَلِمْتَ هُوَ مِنْ عَلَامَاتِ الِاسْمِ النَّكِرَةِ؟ وَضِّحْ ذَلِكَ بِاخْتِصَارٍ!	[]	الإجابة: تعتبر كلمة (مُحَمَّدٌ) من المعارف لأنها اسم عَلَم (يدل على شخص معين بذاته	1.00	2026-10-26 06:45:36.070193+00	\N
730	171	mc	مَنْ أَلْقَى الخُطْبَةَ فِي النَّصِّ؟	["الصَّحَابَةُ", "الرَّسُولُ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ", "العَالِمُ", "المُعَلِّمُ"]	B	1.00	2026-10-26 06:49:52.457299+00	\N
731	171	mc	مَا مَوْضُوعُ الخُطْبَةِ؟	["طَرِيقُ العِلْمِ", "طَرِيقُ التَّعَلُّمِ", "طَرِيقُ السَّعَادَةِ", "طَرِيقُ العَمَلِ"]	C	1.00	2026-10-26 06:49:52.457299+00	\N
732	171	mc	مَا نِهَايَةُ حَيَاةِ الإِنْسَانِ؟	["المَالُ", "المَوْتُ", "الشَّبَابُ", "العِلْمُ"]	B	1.00	2026-10-26 06:49:52.457299+00	\N
733	171	mc	مَا الَّذِي لَا يَعْرِفُهُ الإِنْسَانُ عَنْ أَجَلِهِ؟	["مَتَى يَأْتِي", "أَيْنَ يَذْهَبُ", ". مَنْ مَعَهُ", "مَاذَا يَأْكُلُ"]	A	1.00	2026-10-26 06:49:52.457299+00	\N
734	171	mc	مَاذَا يَأْخُذُ العَبْدُ لِنَفْسِهِ؟	["مِنَ المَالِ", "مِنَ النَّاسِ", "مِنْ نَفْسِهِ", "مِنَ البَيْتِ"]	C	1.00	2026-10-26 06:49:52.457299+00	\N
735	171	mc	مَاذَا يَجِبُ عَلَى المُؤْمِنِ الكَامِلِ؟	["أَنْ يَكْذِبَ", "أَنْ يَتَّقِيَ المَحَارِمَ", "أَنْ يَكْثُرَ النَّوْمَ", "أَنْ يَتْرُكَ العِبَادَةَ"]	B	1.00	2026-10-26 06:49:52.457299+00	\N
736	171	mc	مَاذَا يَكُونُ الإِنْسَانُ إِذَا اتَّقَى المَحَارِمَ؟	["أَعْبَدَ النَّاسِ", "أَغْنَى النَّاسِ", "أَقْوَى النَّاسِ", "أَكْبَرَ النَّاسِ"]	A	1.00	2026-10-26 06:49:52.457299+00	\N
737	171	mc	مَاذَا يَجْعَلُ الإِنْسَانَ مَحْبُوبًا بَيْنَ النَّاسِ؟	["الصِّدْقُ", "الكَذِبُ", "الغَضَبُ", "الكِبْرُ"]	A	1.00	2026-10-26 06:49:52.457299+00	\N
738	171	mc	إِلَى مَاذَا يَهْدِي الصِّدْقُ؟	["إِلَى الفُجُورِ", "إِلَى النَّارِ", "إِلَى البِرِّ وَالجَنَّةِ", "إِلَى الخَوْفِ"]	C	1.00	2026-10-26 06:49:52.457299+00	\N
739	171	mc	إِلَى مَاذَا يَهْدِي الكَذِبُ؟	["إِلَى الجَنَّةِ", "إِلَى الفُجُورِ وَالنَّارِ", "إِلَى البِرِّ", "إِلَى السَّعَادَةِ"]	B	1.00	2026-10-26 06:49:52.457299+00	\N
740	171	mc	مَاذَا يَبْنِي البَيْتَ؟	["اللَّبِنَةُ الوَاحِدَةُ", "العَمَدُ", "النَّاسُ", "النَّاسُ"]	B	1.00	2026-10-26 06:49:52.457299+00	\N
741	171	mc	مَاذَا يَحْدُثُ إِذَا لَمْ تُدْرَسِ الأَوْتَادُ؟	["تَقْوَى البَيْتُ", "يَسْقُطُ البَيْتُ", "يَكْبُرُ البَيْتُ", "يَجْمُلُ البَيْتُ"]	B	1.00	2026-10-26 06:49:52.457299+00	\N
742	171	mc	مَاذَا يَحْدُثُ لِلأُمَّةِ إِذَا تَفَرَّقَ أَفْرَادُهَا؟	["تَقْوَى", "تَضْعُفُ", "تَكْبُرُ", "تَفْرَحُ"]	B	1.00	2026-10-26 06:49:52.457299+00	\N
743	171	mc	اذَا يَجِبُ عَلَى النَّاسِ لِصَلَاحِ أُمَّتِهِمْ؟	["التَّفَرُّقُ", "التَّعَاوُنُ", "الكَسَلُ", ". الخِصَامُ"]	B	1.00	2026-10-26 06:49:52.457299+00	\N
744	171	mc	مَاذَا يَحْدُثُ إِذَا تَعَاوَنَ النَّاسُ؟	["تَقْوَى الأُمَّةُ", "تَضْعُفُ الأُمَّةُ", "تَفْسُدُ الأُمَّةُ", "تَتَفَرَّقُ الأُمَّةُ"]	A	1.00	2026-10-26 06:49:52.457299+00	\N
746	171	essay	كَيْفَ يَكُونُ المُسْلِمُونَ كَالجَسَدِ الوَاحِدِ؟	[]	يَكُونُ المُسْلِمُونَ كَالجَسَدِ الوَاحِدِ بِالتَّعَاوُنِ وَالتَّرَاحُمِ وَمُسَاعَدَةِ بَعْضِهِمْ بَعْضًا.	1.00	2026-10-26 06:49:52.457299+00	\N
747	171	essay	مَاذَا يَحْدُثُ إِذَا لَمْ تَكُنْ لِلأُمَّةِ وَحْدَةٌ؟	[]	تَضْعُفُ الأُمَّةُ وَتَتَفَرَّقُ.	1.00	2026-10-26 06:49:52.457299+00	\N
748	171	essay	لِمَاذَا يَجِبُ عَلَى النَّاسِ أَنْ يَتَعَاوَنُوا؟	[]	لِأَنَّ التَّعَاوُنَ يُقَوِّي الأُمَّةَ وَيُصْلِحُهَا.	1.00	2026-10-26 06:49:52.457299+00	\N
749	171	essay	مَاذَا يَسْتَغِلُّ الإِنْسَانُ قَبْلَ هَرَمِهِ؟	[]	يَسْتَغِلُّ الإِنْسَانُ شَبَابَهُ قَبْلَ هَرَمِهِ.	1.00	2026-10-26 06:49:52.457299+00	\N
750	172	mc	Apa arti dari "من جد وجد" ?	["Siapa yang bersabar ia beruntung", "waktu itu adalah emas", "Siapa yang berjalan pada jalannya sampailah ia", "siapa bersungguh-sungguh maka ia akan mendapatkannya"]	D	1.00	2026-10-26 06:50:14.827075+00	\N
751	172	mc	من سار على الدرب ............	["وصل", "وجد", "وضح", "ولد"]	A	1.00	2026-10-26 06:50:14.827075+00	\N
752	172	mc	من.......... بعد السفر استعد	["عرف", "سار", "صبر", "عمل"]	A	1.00	2026-10-26 06:50:14.827075+00	\N
753	172	mc	Arti dari "جرب ولا حظ تكن عارفا"?	["Bersabarlah dan berdoalah, niscaya kamu akan sukses", "Cobalah dan Perhatikanlah, niscaya kamu akan menjadi orang yang tahu", "Perhatikanlah dan amatilah, niscaya kamu akan tahu", "Tuntutlah ilmu dari buaian hingga liang lahat"]	B	1.00	2026-10-26 06:50:14.827075+00	\N
754	172	mc	Arti dari "وما اللذة إلا بعد التعب"?	["Waktu adalah uang", "Kenikmatan itu hanya sementara", "Dan tiada kenikmatan kecuali setelah bersusah payah", "Bekerja keraslah maka kamu akan mendapatkannya"]	C	1.00	2026-10-26 06:50:14.827075+00	\N
755	172	mc	إذا صدق على العزم.............	["وضح العمل", "وضح القلب", "وضح السفر", "وضح السبيل"]	D	1.00	2026-10-26 06:50:14.827075+00	\N
756	172	mc	Apa arti dari " الاعتماد على النفس أساس النجاح"?	["Keberhasilan membutuhkan bantuan orang lain", "Kerja keras adalah suatu kesuksesan", "Jangan pernah tergantung orang lain", "Kemandirian adalah modal keberhasilan"]	D	1.00	2026-10-26 06:50:14.827075+00	\N
757	172	mc	ثمرة التفريط الندامة وثمرة الحزم السلامة. ?Apa arti kata yang bergaris bawah	["Buah kecermatan", "Buah kesabaran", "Buah kecerobohan", "Buah keberhasilan"]	C	1.00	2026-10-26 06:50:14.827075+00	\N
758	172	mc	Apa akibat dari orang yang takut salah?	["Akan menjadi pintar", "Akan jatuh dalam kesalahan", "Akan berhati-hati", "Akan sukses esok hari"]	B	1.00	2026-10-26 06:50:14.827075+00	\N
759	172	mc	اجهد ولا تكسل ولا تك غافلا. ?apa arti kata yang bergaris bawah	["Malas", "Bodoh", "Takut", "Lengah/lalai"]	D	1.00	2026-10-26 06:50:14.827075+00	\N
760	172	mc	Apa maksud dari "الفضل للمبتدء وإن أحسن المقتدي "?	["Keutamaan bagi pemula, walaupun yang mengikuti lebih baik", "Pemula selalu lebih baik dari yang mengikuti", "Mengikuti orang lain adalah suatu hal yang buruk", "Belajarlah dengan sungguh - sungguh"]	A	1.00	2026-10-26 06:50:14.827075+00	\N
761	172	mc	الناس من خوف الذل في الذل. ?Apa arti kata yang bergaris bawah	["Kesalahan", "Keterhinaan", "Kebodohan", "Kemiskinan"]	B	1.00	2026-10-26 06:50:14.827075+00	\N
762	172	mc	Apa pesan moral dari Mahfudzhot. من عرف بعد السفر استعد ?	["Kita harus selalu membawa bekal", "Perjalanan itu melelahkan", "Kita harus selalu siap jika kita ingin melakukan suatu pekerjaan/perjalanan", "Jangan pergi jauh - jauh jika tidak ingin lelah"]	C	1.00	2026-10-26 06:50:14.827075+00	\N
763	172	mc	Apa arti "ثمرة الحزم السلامة"?	["Buah kelengahan adalah penyesalan", "Buah kesabaran adalah keberhasilan", "Buah kerja keras adalah kesuksesan", "Buah kecermatan adalah keselamatan"]	D	1.00	2026-10-26 06:50:14.827075+00	\N
764	172	mc	Apa hubungan antara kemandirian dan keberhasilan dalam Mahfudzhot?	["Kemandirian adalah modal dasar keberhasilan", "Keberhasilan membutuhkan orang lain", "Mandiri itu sulit", "Mandiri itu tidak perlu"]	A	1.00	2026-10-26 06:50:14.827075+00	\N
765	172	essay	Bolehkah kita menunda - nunda pekerjaan? Kenapa, Jelaskan?	[]	Tidak boleh, Karena kita harus memanfaatkan waktu hari ini	1.00	2026-10-26 06:50:14.827075+00	\N
766	172	essay	Kenapa kita harus mengatur pekerjaan dengan baik?	[]	Karena agar mendapatkan hasil yang baik	1.00	2026-10-26 06:50:14.827075+00	\N
767	172	essay	ثمرة التاريط........ وثمرة الحزم.......	[]	الندامة/السلامة	1.00	2026-10-26 06:50:14.827075+00	\N
768	172	essay	اجهد ولا....... ولا تك غافلا فندامة...... لمن.......	[]	تكسل/العقبى/يتكاسل	1.00	2026-10-26 06:50:14.827075+00	\N
769	172	essay	الناس....... الذل فى الذل........ من خوف الخطا فى.........	[]	من خوف/والناس/الخطا	1.00	2026-10-26 06:50:14.827075+00	\N
770	173	mc	رياسة عامة فى الدين وا لدنيا قوامها النظر في المصالح وتدبير شئون الأمة معنى من ......	["الخلافة", "الحلافة", "الجلافة", "الفلافة"]	A	1.00	2026-10-26 06:51:33.346875+00	\N
771	173	mc	ما حكم مشروعية الخلافة	["سنة", "واجب", "حرام", "مباح"]	B	1.00	2026-10-26 06:51:33.346875+00	\N
772	173	mc	يٰٓاَيُّهَا الَّذِيْنَ اٰمَنُوْٓا اَطِيْعُوا اللّٰهَ وَاَطِيْعُوا الرَّسُوْلَ وَ....... مِنْكُمْۚ	["اُولِى الْاَمْرِى", "اُولِى الْاَمْرِو", "اُولِى الْاَمْرِ", "اُولِى الْاَمْرِا"]	C	1.00	2026-10-26 06:51:33.346875+00	\N
773	173	mc	ماالفاظ مترافة الخلافة.....	["الإمامة الكبرو", "الإمامة الكبرا", "الإممة الكبرى", "الإمامة الكبرى"]	D	1.00	2026-10-26 06:51:33.346875+00	\N
774	173	mc	ما هو الجهادلغة ؟	["بذل الجهذى", "بذل الجهد", "بذل الجهد", "بذل الجهدى"]	B	1.00	2026-10-26 06:51:33.346875+00	\N
775	173	mc	خطاب الشارع المتعلق بافعال المكلفين اقتضاء اة تخييرا اوو ضعا	["الحكمة", "الخكم", "الحكم", "الجكم"]	C	1.00	2026-10-26 06:51:33.346875+00	\N
776	173	mc	اِنْفِرُوْا خِفَافًا وَّثِقَالًا وَّجَاهِدُوْا بِاَمْوَالِكُمْ وَاَنْفُسِكُمْ ...... ۗذٰلِكُمْ خَيْرٌ لَّكُمْ اِنْ كُنْتُمْ تَعْلَمُوْنَ	["فِيْ اللّٰهِ ۗ", "فِيْ سَبِيْلِ الرسول", "وَسَبِيْلِ اللّٰهِ ۗ", "فِيْ سَبِيْلِ اللّٰهِ ۗ"]	D	1.00	2026-10-26 06:51:33.346875+00	\N
916	180	mc	من هو مصطفى كمال باشا ؟	["الزعيم التركي", "الزعيم الهند", "الزعيم المصر", "الزعيم العربي"]	A	1.00	2026-10-26 07:05:41.777614+00	\N
777	173	mc	اِنَّ اللّٰهَ اشْتَرٰى مِنَ الْمُؤْمِنِيْنَ اَنْفُسَهُمْ وَاَمْوَالَهُمْ بِاَنَّ لَهُمُ ....	["الْجَنَّةَۗ", "الْجَنَّنةَۗ", "الْجَنَّفةَۗ", "الْجَحنَّةَۗ"]	A	1.00	2026-10-26 06:51:33.346875+00	\N
778	173	mc	كم أحوال الجهاد فى سبيل الله ؟	["واحد احوال", "ثلاثة حالات", "اربع حالات", "حالتان"]	C	1.00	2026-10-26 06:51:33.346875+00	\N
779	173	mc	جهاد النفس على تعلم الدين و العمل به هو تعريف من ......	["جهاد اللسان", "جهاد الشيطان", "جهاد المال", "جهاد النفس"]	D	1.00	2026-10-26 06:51:33.346875+00	\N
780	173	mc	ما مصادر اصلية الاولى لاستنبط الأحكام الشرعية ؟	["السنة", "الإجماع", "القران", "القياس"]	C	1.00	2026-10-26 06:51:33.346875+00	\N
781	173	mc	ما مصادر اصلية الثانى لاستنبط الأحكام الشرعية ؟	["الإجماع", "القران", "القياس", "السنة"]	D	1.00	2026-10-26 06:51:33.346875+00	\N
782	173	mc	ما هوالإجتهاد لغة	["الطاقة و المشقفة", "الجاقة و المشقة", "الطاقة و المسقة", "الطاقة و المشقة"]	D	1.00	2026-10-26 06:51:33.346875+00	\N
783	173	mc	طلب الفعل على جهة الأستعلاء هو تعريف من...	["ألنهى", "الأمر", "النهية", "المامور"]	B	1.00	2026-10-26 06:51:33.346875+00	\N
784	173	mc	كم ينقسم العام ؟	["ثلاث", "ست", "خمس", "اربع"]	B	1.00	2026-10-26 06:51:33.346875+00	\N
785	173	essay	تكلم عن مشروعية الخلافة	[]	اتفق جمهور المسلمين على ان نصب الخليفة أى تولية على الأمة واجب بالش ع	1.00	2026-10-26 06:51:33.346875+00	\N
786	173	essay	كم اقسام الجهاد فى سبيل الله ؟ اذكر	[]	ينقسم الجهاد فى سبيل الله إلى قسمين ألأول : الجهاد بالنفس و المال و اللسان ألثانى : القتال فى سبيل الله	1.00	2026-10-26 06:51:33.346875+00	\N
787	173	essay	اشرح مراتيب المجتهد	[]	ا- المجتهد المستقبل المطلق ب- المجتهد المطلق غير المستقبل ج- المجتهد المقيج د- المجتهد الترجيح ه- المجتهد الفاتوى	1.00	2026-10-26 06:51:33.346875+00	\N
788	173	essay	عرف عن الأمر	[]	الأمر هوطلب الفعل على وجه الإستعلاء	1.00	2026-10-26 06:51:33.346875+00	\N
789	173	essay	كم اقسام العام ؟ اذكر	[]	ينقسم العام إلى ثلاثة اقسام ا- العام الذى يرادبه العموم قطعا ب-العام الذى يرادبه الخصوص قطعا ج- العام المطلق	1.00	2026-10-26 06:51:33.346875+00	\N
790	174	mc	بما يعتبرالعال؟	["بمال", "بالعقل", "بالعلم", "بالنسب"]	C	1.00	2026-10-26 06:52:21.240579+00	\N
791	174	mc	من ه‍و صغير وان كان شيخا؟	["الصدق", "الجاهل", "الصبر", "العالم"]	B	1.00	2026-10-26 06:52:21.240579+00	\N
792	174	mc	من هو كبير وان كان حدثا؟	["الصدق", "الجاهل", "الصبر", "العالم"]	D	1.00	2026-10-26 06:52:21.240579+00	\N
793	174	mc	العالم.....وان كان حدثا# والجاهل.....وان كان شيخا.	["كبير/صغير", "صغير/كبير", "رفيع/صغير", "صغير/رفيع"]	A	1.00	2026-10-26 06:52:21.240579+00	\N
794	174	mc	تعلم فليس المرء يولد.....# وليس أخوعلم كمن هو......	["رفيع/جاهل", "جاهل/رفيع", "جاهل/عالما", "عالما/جاهل"]	D	1.00	2026-10-26 06:52:21.240579+00	\N
795	174	mc	وإن.....القوم العلم عنده# .....إذا التفت عليه المحافل.	["كبير/صغير", "صغير/كبير", "كبير/رفع", "رفع/كبير"]	A	1.00	2026-10-26 06:52:21.240579+00	\N
796	174	mc	مامعنى"صغير السن"؟	["الحث", "المحافل", "حدث", "التفت"]	C	1.00	2026-10-26 06:52:21.240579+00	\N
797	174	mc	مامعنى"المجالس"؟	["الحث", "المحافل", "حدث", "التفت"]	B	1.00	2026-10-26 06:52:21.240579+00	\N
798	174	mc	مامعنى"اجتمعت"؟	["الحث", "المحافل", "حدث", "التفت"]	D	1.00	2026-10-26 06:52:21.240579+00	\N
799	174	mc	مامعني"الحض والحرص"؟	["الحث", "المحافل", "حدث", "التفت"]	A	1.00	2026-10-26 06:52:21.240579+00	\N
800	174	mc	لاتنظرن لأثواب .....أحد# إن رمت تعرفه فانظر .....الأدب.	["ألي/في", "في/إلى", "على/الى", "الى/على"]	C	1.00	2026-10-26 06:52:21.240579+00	\N
801	174	mc	وماااحسن .....وجه الفتى شرفاله# إن لم يكن .....فعله والخلائق.	["في/على", "في/في", "على/في", "الى/على"]	B	1.00	2026-10-26 06:52:21.240579+00	\N
802	174	mc	فلينظرن إلى من فوقه .....# والينظرن إلى من دونه ......	["عالما/مالا", "مالا/عالما", "مالا/أدبا", "أدبا/مالا"]	D	1.00	2026-10-26 06:52:21.240579+00	\N
803	174	mc	فالينظرن .....من فوقه أدبا# والينظرن .....من دونه مالا.	["في/إلى", "في/في", "إلى/في", "إلى/إلى"]	D	1.00	2026-10-26 06:52:21.240579+00	\N
804	174	mc	مامعنى"العلوم المكان العالي"؟	["الشرف", "الفتى", "دونه", "الخلائق"]	A	1.00	2026-10-26 06:52:21.240579+00	\N
805	174	essay	بما يعتبر العالم؟	[]	يعتبر العالم بعلمه	1.00	2026-10-26 06:52:21.240579+00	\N
806	174	essay	بما يعتبر الجا هل؟	[]	يعتبر الجا هل بعقله	1.00	2026-10-26 06:52:21.240579+00	\N
807	174	essay	هل يجب عليك أن تتعلم؟	[]	نعم، يجب عليك أن تتعلم	1.00	2026-10-26 06:52:21.240579+00	\N
808	174	essay	هل المرء يولد عالما؟	[]	لا، لا يولد المرء عالما، بل يتعلم	1.00	2026-10-26 06:52:21.240579+00	\N
809	174	essay	إذا أردت أن تكون حسن الأدب إلى من تنظر؟	[]	تنظر إلى من هو أحسن منك أدبا	1.00	2026-10-26 06:52:21.240579+00	\N
810	175	mc	Bersuci dalam bahasa arab artinya...	["Bersih", "Thaharah", "Wudlu", "Tayamum"]	B	1.00	2026-10-26 06:53:22.791255+00	\N
811	175	mc	Najis berasal dari bahasa arab yaitu An najasa yg berarti...	["Bersih", "Jorok", "Kotor", "kotoran"]	C	1.00	2026-10-26 06:53:22.791255+00	\N
812	175	mc	Maksud dari Q.S. Al - Muddatsir ayat 4 adalah...	["Perintah membersihkan jiwa", "Perintah membersihkan pakaian", "Perintah membersihkan lingkungan rumah", "Perintah membersihkan lingkungan sekitar"]	B	1.00	2026-10-26 06:53:22.791255+00	\N
813	175	mc	Pak Dahlan berada di sebuah Masjid untuk melaksanakan sholat.sebelum sholat ia memastikan tempat yg akan di gunakan bersihdari najis.tindakan pak dahlan sangat penting dlm Islam...	["Karena sholat tidak sah jika tempatnya najis", "karena membersihkan tempatadalah tradisi", "Tempat yg bersih terlihat indah", "Bersihnya tempat tidak mempengaruhi sahnya sholat"]	A	1.00	2026-10-26 06:53:22.791255+00	\N
814	175	mc	Ali bersiap untuk melaksanakan sholat,ia sadar bahwa ada najis di pakaianya, hal yg harus di lakukan ali sesuai ajaran Islam...	["Membiarkan najis tsb karena sholat penting", "pura -pura tidak tau sholat saja", "Membersihkan pakaian dari najis sebelum sholat", "Langsung sholat dg pakaian tsb"]	C	1.00	2026-10-26 06:53:22.791255+00	\N
815	175	mc	Fatimah sedang mengalami haid selama tujuh hari,pada hari ke delapan ia sudah tidak mengeluarkan darah lagi,yg harus di lakukan fatimah agar bisa melaksanakan kembali ibadah sholat...	["Berwudlu saja sebelum sholat", "Menunggu beberapa hari lagi untuk memastikan", "Bertayamum karena tidak yakin haidnya sudah selesai", "Mandi wajib untuk menyucikan diri dari hadas besar"]	D	1.00	2026-10-26 06:53:22.791255+00	\N
816	175	mc	Salah satu hikmah menghilangkan najis sesuai syariat Islam adalah...	["Mengurangi kebutuhan untuk beribadah", "Meningkatkan rasa was was dalam beribadah", "Menjaga lingkungan sekitar dlm keadaan bersih dan sehat", "Mengabaikan pentingnya kebersihan"]	C	1.00	2026-10-26 06:53:22.791255+00	\N
817	175	mc	Hal - hal yg menyebabkan seseorang berhadas besar adalah...	["Keluar air mani karena mimpi", "Buang air besar", "Bersentuhan antara kulit laki laki dan perempuan", "Buang air kecil"]	A	1.00	2026-10-26 06:53:22.791255+00	\N
818	175	mc	Pak Hasan akan menggunakan ember yg airnya telah di jilati anjing, maka tata cara menyucikan ember trb dengan cara...	["Menyuci ember tujuh kali dg air biasa", "Menyuci ember tujuh kali ,salah satunya dg debu tanah", "Menyuci ember sampai bersih dan di beri sabun lalu di bilas", "Menyuci ember sampai bersih di beri tanah dg air sabun lalu di bilas"]	B	1.00	2026-10-26 06:53:22.791255+00	\N
819	175	mc	Andi berada di lokasi yg sangat jauh dari sumber air, karena sedang melakukan perjalanan di gurun,ketika waktu sholat tiba,apa yg harus dilakukan Andi..	["Membasuh tubuhnya dg pasir sebanyak tiga kali", "Mengusap wajah dan kedua tanganya dg debu suci untuk bertayamum", "Menggunakan air minum untuk berwudlu", "Menunda sholat hingga menemukan sumber air"]	B	1.00	2026-10-26 06:53:22.791255+00	\N
820	175	mc	Latifah belajar bersama ibunya ttg cara bersuci, latifah bertanya pada ibunya..Bu..kapan seseorang harus mandi wajib,jawaban yg tepat adalah...	["Ketika seseorang merasa lelah dan kotor setelah bermain", "Saat selesai makan makanan pedas", "Ketika seseorang mengalami haid", "Jika tidak memiliki air untuk wudlu"]	C	1.00	2026-10-26 06:53:22.791255+00	\N
821	175	mc	Hukum sholat bagi umat Islam ...	["Sunah muakad", "Boleh", "Sangat di anjurkan", "Wajib"]	D	1.00	2026-10-26 06:53:22.791255+00	\N
822	175	mc	Pengertian ttg sholat Rawatib adalah...	["Mendatangkan keberkahan rezeki", "Lebih baik dari dunia dan seisinya", "Melengkapi kekurangan dalam pelaksanaan sholat fardlu", "Penghormatan pada masjid sebelum duduk"]	C	1.00	2026-10-26 06:53:22.791255+00	\N
823	175	mc	Pasangan sholat sunah dengan keutamaanya, Tahyatul Masjid	["Melengkapi kekurangan dalam pelaksanaan sholat fardlu", "Penghormatan kepada Masjid sebelum duduk", "Lebih baik dari dunia dan seisinya", "Mendatangkan keberkahan rezeki"]	B	1.00	2026-10-26 06:53:22.791255+00	\N
824	175	mc	Zaenab selalu menjaga sholat lima waktu dengan tepat waktu, salah satu keutamaan yg di dapatkan oleh orang yg mendirikan sholat fardlu adalah...	["Mendapatkan keridhoan dan cinta Allah SWT", "Mendapatkan kekayaan yg melimpah", "Menjadi pemimpin umat", "Dapat masuk surga tanpa melalui ujian"]	A	1.00	2026-10-26 06:53:22.791255+00	\N
825	175	essay	Taharah atau bersuci meliputi dua hal yaitu...	[]	Bersuci dari najis dan bersuci dari hadas	1.00	2026-10-26 06:53:22.791255+00	\N
826	175	essay	Sebutkan sebab sebab mandi wajib..	[]	Mengeluarkan air mani, berhubungan suami Istri, Hendak menghadiri sholat jumat, Selesai haid atau nifas	1.00	2026-10-26 06:53:22.791255+00	\N
827	175	essay	Pak andi sedang dalam perjalanan jauh dan tidak menemukan air untuk bersuci, sementara waktu sholat hampir habis, ia teringat bahwa kondisi tertentu di perbolehkan tayamum, Jelaskan tata cara tayamum yg benar sesuai ajaran Islam	[]	Niat ikhlas karena Allah dg membaca basmalah, meletakkan kedua telapak tangan ke tanah atau debu, mengusap ke wajah dan kedua telapak tangan ke tanah atau debu lalu di usapkan kedua tangan	1.00	2026-10-26 06:53:22.791255+00	\N
828	175	essay	Seorang teman bertanya kepada kamu tentang perbedaan antara darah haid, nifan dan istikhadhoh. Jelaskan perbedaan ketiganya..	[]	Darah haid yaitu darah yg keluar dari rahim seorang wanita pada waktu - waktu tertentu, Darah Nifas yaitu Darah yg keluar dari rahim seorang wanita setelah melahirkan, Darah Istikhadhoh yaitu darah yg keluar dari rahim wanita bukan merupakan darah haid dan nifas.merupakan suatu penyakit.	1.00	2026-10-26 06:53:22.791255+00	\N
829	175	essay	Sebutkan hikmah bersuci..	[]	Menjaga kesehatan , Memperkuat rasa syukur , Menjaga kesucian diri sebagai penghormatan kepada Allah , membangun kesadaran diri, ketenangan saat ibadah, Memelihara lingkungan agar tetap bersih dan sehat	1.00	2026-10-26 06:53:22.791255+00	\N
830	176	mc	معنى "الكتاب" لغة	["كتب", "مكتوب", "مكتب", "كاتب"]	B	1.00	2026-10-26 06:55:15.006358+00	\N
831	176	mc	الإيمان بالكتب هو	["التَّصْدِيقُ بِأَنَّ اللهَ تَعَالَى أَرْسَلَ الرُّسُلَ إِلَى النَّاسِ لِيَدْعُوهُمْ إِلَى عِبَادَتِهِ وَحْدَهُ وَتَرْكِ الْمَعَاصِي", "التَّصْدِيقُ بِوُقُوعِ الْيَوْمِ الْآخِرِ وَمَا يَحْدُثُ فِيهِ مِنَ الْبَعْثِ وَالْحِسَابِ وَالْجَزَاءِ.", "الإيمان بالكتب التي أنزلها الله تعالى على رسله رحمة للخلق وهداية لهم ليصلوا إلى سعادتهم في الدنيا والآخرة.", "التَّصْدِيقُ بِوُجُودِ الْمَلَائِكَةِ الَّذِينَ خَلَقَهُمُ اللهُ تَعَالَى لِطَاعَتِهِ وَتَنْفِيذِ أَوَامِرِهِ."]	C	1.00	2026-10-26 06:55:15.006358+00	\N
832	176	mc	عدد الكتب السماوية هي	["خمسة", "أربعة", "ثلاثة", "اثنان"]	B	1.00	2026-10-26 06:55:15.006358+00	\N
833	176	mc	حُكْمُ اْلإيمان باليوم الآخر هو	["واجب", "سنة", "فرض كفاية", "جائز"]	A	1.00	2026-10-26 06:55:15.006358+00	\N
852	177	mc	لماذا صفات الله لا تشبه صفات المخلوقات؟ لأن صفات الله تتصف...	["بالمخلال", "بالنقص", "بالكمال", "بالجماعة"]	C	1.00	2026-10-26 06:55:54.049897+00	\N
853	177	mc	ما الدليل ان الله لا تشبه بالمخلوقات؟ الدليل...	["قل هوالله أحد (الإخلاص : 1)", "لَيْسَ كَمِثْلِهِ شَيْءٌ ۖ وَهُوَ السَّمِيعُ الْبَصِيرُ (سورة الشورى : 11)", "قل اعوذ برب الناس (سورة الناس : 1)", "اقرأ باسم ربك (سورة العلق : 1)"]	B	1.00	2026-10-26 06:55:54.049897+00	\N
854	177	mc	إِنَّ ٱللَّهَ يَغْفِرُ ٱلذُّنُوبَ جَمِيعًا ۚ إِنَّهُۥ هُوَ ٱلْغَفُورُ ٱلرَّحِيمُ (الزمر : 53) ما معني الغفورالرحيم؟	["كثير الرزق", "كثير العفو", "كثير الدعاء", "كثير المغفرة"]	D	1.00	2026-10-26 06:55:54.049897+00	\N
834	176	mc	الآية التي تدل على وجوب الإيمان بالله هي	["فَسِيْحُوْا فِى الْاَرْضِ اَرْبَعَةَ اَشْهُرٍ وَّاعْلَمُوْٓا اَنَّكُمْ غَيْرُ مُعْجِزِى اللّٰهِ ۙ وَاَنَّ اللّٰهَ مُخْزِى الْكٰفِرِيْنَ ۝٢", "فَاِنْ تَابُوْا وَاَقَامُوا الصَّلٰوةَ وَاٰتَوُا الزَّكٰوةَ فَاِخْوَانُكُمْ فِى الدِّيْنِ ۗ وَنُفَصِّلُ الْاٰيٰتِ لِقَوْمٍ يَّعْلَمُوْنَ ۝١١", "سُوْرَةٌ اَنْزَلْنٰهَا وَفَرَضْنٰهَا وَاَنْزَلْنَا فِيْهَآ اٰيٰتٍۢ بَيِّنٰتٍ لَّعَلَّكُمْ تَذَكَّرُوْنَ ۝١", "اٰمَنَ الرَّسُوْلُ بِمَآ اُنْزِلَ اِلَيْهِ مِنْ رَّبِّهٖ وَالْمُؤْمِنُوْنَ ۗ كُلٌّ اٰمَنَ بِاللّٰهِ وَمَلٰۤىِٕكَتِهٖ وَكُتُبِهٖ وَرُسُلِهٖ ۗ لَا نُفَرِّقُ بَيْنَ اَحَدٍ مِّنْ رُّسُلِهٖ ۗ وَقَالُوْا سَمِعْنَا وَاَطَعْنَا غُفْرَانَكَ رَبَّنَا وَاِلَيْكَ الْمَصِيْرُ ۝٢"]	D	1.00	2026-10-26 06:55:15.006358+00	\N
835	176	mc	الآية التي تدل على ثبوت كتاب التوراة	["وَاٰتَيْنَا مُوْسَى الْكِتٰبَ وَجَعَلْنٰهُ هُدًى لِّبَنِيْٓ اِسْرَاۤءِيْلَ اَلَّا تَتَّخِذُوْا مِنْ دُوْنِيْ وَكِيْلًا ۗ ۝٢", "وَرَبُّكَ اَعْلَمُ بِمَنْ فِى السَّمٰوٰتِ وَالْاَرْضِ ۗ وَلَقَدْ فَضَّلْنَا بَعْضَ النَّبِيّٖنَ عَلٰى بَعْضٍ وَّاٰتَيْنَا دَاوٗدَ زَبُوْرًا ۝٥", "ذٰلِكَ الْكِتٰبُ لَا رَيْبَ ۛ فِيْهِ ۛ هُدًى لِّلْمُتَّقِيْنَ ۙ ۝٢", "وَرَبُّكَ اَعْلَمُ بِمَنْ فِى السَّمٰوٰتِ وَالْاَرْضِ ۗ وَلَقَدْ فَضَّلْنَا بَعْضَ النَّبِيّٖنَ عَلٰى بَعْضٍ وَّاٰتَيْنَا دَاوٗدَ زَبُوْرًا ۝٥٥"]	A	1.00	2026-10-26 06:55:15.006358+00	\N
836	176	mc	الزبور هو الكتاب المنزل على النبي	["موسى", "داوود", "عيسى", "إبراهيم"]	B	1.00	2026-10-26 06:55:15.006358+00	\N
837	176	mc	قد نزلت غير الكتب السماوية الأربعة وهي الصحف. أما عدد الصحف المنزلة على النبي آدم هي	["ثلاثون صحيفة", "خمس صحائف", "خمس عشرة صحيفة", "عشر صحائف"]	D	1.00	2026-10-26 06:55:15.006358+00	\N
838	176	mc	عدد صحف إبراهيم	["عشر صحائف", "ثلاثون صحيفة", "خمس صحائف", "خمس عشرة صحيفة"]	A	1.00	2026-10-26 06:55:15.006358+00	\N
839	176	mc	من حكم الإيمان بالكتب السماوية، إلا	["توضيح عقيدة التوحيد", "لا يصحح الأخطأ والانحرافات التي تطرأ على العقيدة", "حاجة البشر إلى مرجع في أمور العقيدة والعبادة والتشريع", "اتساع الدعوة وانتشارها زمانيا ومكانيا"]	B	1.00	2026-10-26 06:55:15.006358+00	\N
840	176	mc	كتاب الله المنزل على النبي عيسى يسمى بكتاب	["الزبور", "الإنجيل", "التوراة", "القرآن"]	B	1.00	2026-10-26 06:55:15.006358+00	\N
841	176	mc	الآية الدالة على حفظ الله القرآن حتى يوم القيامة هي	["اِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَاِنَّا لَهٗ لَحٰفِظُوْنَ ۝٩", "اِنَّآ اَنْزَلْنٰهُ فِيْ لَيْلَةِ الْقَدْرِ ۝١", "تَبٰرَكَ الَّذِيْ نَزَّلَ الْفُرْقَانَ عَلٰى عَبْدِهٖ لِيَكُوْنَ لِلْعٰلَمِيْنَ نَذِيْرًا ۙ ۝١", "وَمَآ اَرْسَلْنٰكَ اِلَّا كَاۤفَّةً لِّلنَّاسِ بَشِيْرًا وَّنَذِيْرًا وَّلٰكِنَّ اَكْثَرَ النَّاسِ لَا يَعْلَمُوْنَ ۝٢٨"]	A	1.00	2026-10-26 06:55:15.006358+00	\N
842	176	mc	بين كتاب التوراة عن	["الأحكام الشرعية والعقائد الصحيحة والتبشير بظهور النبي مححد", "الأذكار والمواعظ والأدعية والحكم.", "العلوم الطبيعية والعقيدة الصحيحة", "عقيدة التوحيد والأذكار"]	A	1.00	2026-10-26 06:55:15.006358+00	\N
843	176	mc	شَهْرُ رَمَضَانَ الَّذِي أُنْزِلَ فِيهِ الْقُرْآنُ هُدًى لِلنَّاسِ وَبَيِّنَاتٍ مِنَ الْهُدَىٰ وَالْفُرْقَانِ ۚ هذه الآية تدل على	["كتاب التوراة", "كتاب الإنجيل", "زمان نزول القرآن", "زمان نزول الوحي الأول"]	C	1.00	2026-10-26 06:55:15.006358+00	\N
844	176	mc	حكم العمل بأحكام الكتب السماوية غير القرآن	["جائز", "سنة", "واجب", "لا يجوز"]	D	1.00	2026-10-26 06:55:15.006358+00	\N
845	176	essay	مَا مَعْنَى اْلكُتُبِ لُغَةَ؟ ومَا مَعْنَى اْلإِيْمَانِ بِاْلكُتُبِ؟	[]	الكتب لغة جمع كتاب بمعنى مكتوب. الإيمان بالكتب هو الإيمان بالكتب التي أنزلها الله تعالى على رسله رحمة للخلق وهداية لهم ليصلوا بها إلى سعادتهم في الدنيا والآخرة.	1.00	2026-10-26 06:55:15.006358+00	\N
846	176	essay	اُذْكُرْ الدَّلِيْلَ فِي اْلإِيْمَانِ بِاْلكُتُبِ!	[]	أمن الرسول بما أنزل إليه من ربه والمؤمنون كل أمن بالله وملئكته وكتبه ورسله لا تفرق بين أحد من رسله	1.00	2026-10-26 06:55:15.006358+00	\N
847	176	essay	كم كتبا منزلة على الرسل؟ اذكرها!	[]	٤ وهي التوراة و الزبور والإنجيل والقرآن	1.00	2026-10-26 06:55:15.006358+00	\N
848	176	essay	مَا هُوَ اْلإِنْجِيْلُ؟ وَمَا يُوْجَدُ فِيه؟	[]	الإنجيل هو كتاب الله المنزل على النبي عيسى عليه السلام. فيه بيان الحقائق ودعوة الخلق إلى توحيد الخالق ونسخ بعض أحكام التوراة والتبشير بظهور خاتم الأنبياء محمد صلى الله عليه وسلم	1.00	2026-10-26 06:55:15.006358+00	\N
849	176	essay	مَا هُوَ الزَّبُوْرُ؟ وَمَا يُوْجَدُ فِيه؟	[]	الزبور هو كتاب الله المنزلة على النبي داود عليه السلام. فيه أذكار ومواعظ وأدعية وحكم.	1.00	2026-10-26 06:55:15.006358+00	\N
850	177	mc	من أين نعرف أن الله اسماء وصفات؟ نعرف أن الله اسماء وصفات من...	["القرآن والسنة", "القرآن والعدات", "السنة والعدات", "القرآن والسنة العدات"]	A	1.00	2026-10-26 06:55:54.049897+00	\N
851	177	mc	ما حكم الإيمان بأن لله اسماء وصفات؟ حكمه...	["سنة", "واجب", "حرام", "مكروه"]	B	1.00	2026-10-26 06:55:54.049897+00	\N
870	178	mc	اليوم الآخر هو ...	["يَوْمُ بِدَايَةِ الْحَيَاةِ الدُّنْيَا", "يَوْمُ انْتِهَاءِ الْحَيَاةِ الدُّنْيَا وَبَدْءِ الْحَيَاةِ الْآخِرَةِ", "يَوْمُ وِلَادَةِ الْإِنْسَانِ", "يَوْمُ الْعَمَلِ وَالتِّجَارَ"]	C	1.00	2026-10-26 06:55:57.301298+00	\N
871	178	mc	من أسماء اليوم الآخر إلا ...	["يَوْمُ الْقِيَامَةِ", "يَوْمُ الْحِسَابِ", "يَوْمُ الدِّينِ", "يَوْمُ الْمِيلَادِ"]	D	1.00	2026-10-26 06:55:57.301298+00	\N
872	178	mc	حكم الإيمان باليوم الآخر هو ...	["مُسْتَحَبٌّ فَقَطْ", "مُبَاحٌ", "وَاجِبٌ", "مَكْرُوهٌ"]	C	1.00	2026-10-26 06:55:57.301298+00	\N
873	178	mc	الدليل الذي يدركه العقل في الموضوع يسمى ...	["الدَّلِيلَ الْعَقْلِيَّ", "الدَّلِيلَ النَّقْلِيَّ", "الدَّلِيلَ التَّارِيخِيَّ", "الدَّلِيلَ اللُّغَوِيَّ"]	A	1.00	2026-10-26 06:55:57.301298+00	\N
874	178	mc	من الأدلة العقلية على إثبات اليوم الآخر ما يلي، إلا ...	["أَنَّ اللهَ قَادِرٌ عَلَى إِعَادَةِ الْخَلْقِ", "أَنَّ اللهَ خَلَقَ الْإِنْسَانَ مِنَ الْعَدَمِ", ". أَنَّ إِعَادَةَ الْخَلْقِ لَا تَسْتَحِيلُ عَلَى اللهِ", "الْأَحَادِيثُ النَّبَوِيَّةُ الَّتِي تَذْكُرُ الْيَوْمَ الْآخِرَ"]	D	1.00	2026-10-26 06:55:57.301298+00	\N
875	178	mc	تعريف الدليل النقلي	["الدَّلِيلُ الْمَأْخُوذُ مِنَ الْقُرْآنِ الْكَرِيمِ وَالسُّنَّةِ النَّبَوِيَّةِ", "الدَّلِيلُ الَّذِي يَعْتَمِدُ عَلَى الْعَقْلِ وَالتَّفْكِيرِ فَقَطْ", "الدَّلِيلُ الْمَأْخُوذُ مِنَ التَّجَارِبِ الْعِلْمِيَّةِ فَقَطْ", "الدَّلِيلُ الْمَأْخُوذُ مِنَ الْعَادَاتِ وَالتَّقَالِيدِ"]	A	1.00	2026-10-26 06:55:57.301298+00	\N
876	178	mc	الدليل النقلي على وجوب الإيمان باليوم الآخر هو	["وَهُوَ السَّمِيعُ الْبَصِيرُ", "وَبِالْآخِرَةِ هُمْ يُوقِنُونَ", "وَاللهُ غَفُورٌ رَحِيمٌ", "إِنَّ اللهَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ"]	B	1.00	2026-10-26 06:55:57.301298+00	\N
877	178	mc	من علامات اليوم الآخر الصغرى هي	["ظُهُورُ الدَّجَّالِ", "طُلُوعُ الشَّمْسِ مِنْ مَغْرِبِهَا", "قتال المسلمين اليهود وانتصار المسلمين عليهم", "نُزُولُ عِيسَى عَلَيْهِ السَّلَامُ"]	C	1.00	2026-10-26 06:55:57.301298+00	\N
878	178	mc	من علامات اليوم الآخر الكبرى هي	["كَثْرَةُ الْأَمْوَالِ", "طُلُوعُ الشَّمْسِ مِنْ مَغْرِبِهَا", "د. كَثْرَةُ الزنا", "د. كَثْرَةُ القتال"]	B	1.00	2026-10-26 06:55:57.301298+00	\N
879	178	mc	تَعَلَّمَ الطُّلَّابُ مَرَاحِلَ الْيَوْمِ الْآخِرِ، فَذَكَرَ أَحَدُهُمْ الْبَعْثَ وَالْحَشْرَ وَالْحِسَابَ وَالْمِيزَانَ. أَيُّ اسْتِنْتَاجٍ يَدُلُّ عَلَى فَهْمٍ عَمِيقٍ لِهَذِهِ الْمَرَاحِلِ؟	["الْإِنْسَانُ لَا يَحْتَاجُ إِلَى الِاسْتِعْدَادِ لِلْآخِرَةِ", "الْحَيَاةُ الدُّنْيَا هِيَ الْحَيَاةُ الْأَبَدِيَّةُ", "الْإِنْسَانُ مَسْؤُولٌ عَنْ أَعْمَالِهِ وَيَنْبَغِي أَنْ يَسْتَعِدَّ لِلْحِسَابِ", "الْأَعْمَالُ السَّيِّئَةُ لَا تُؤَثِّرُ فِي الْآخِرَةِ"]	C	1.00	2026-10-26 06:55:57.301298+00	\N
880	178	mc	من حوادث اليوم الآخر هي	["نُزُولُ الْمَطَرِ", "طُلُوعُ الشَّمْسِ كُلَّ صَبَاحٍ", "تَعَاقُبُ اللَّيْلِ وَالنَّهَارِ", "الحساب والجزاء"]	D	1.00	2026-10-26 06:55:57.301298+00	\N
881	178	mc	مما يأتي الدليل عن النفخ في الصور هو	["إِنَّ اللهَ يُحِبُّ الْمُحْسِنِينَ", "وَنُفِخَ فِي الصُّورِ فَصَعِقَ مَنْ فِي السَّمَاوَاتِ وَمَنْ فِي الْأَرْضِ إِلَّا مَنْ شَاءَ اللهُ", "وَاللهُ غَفُورٌ رَحِيمٌ", "وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ"]	B	1.00	2026-10-26 06:55:57.301298+00	\N
882	178	mc	الذي يَحْدُثُ عِنْدَ النَّفْخَةِ الْأُولَى فِي الصُّورِ هو	["يَبْدَأُ الْحِسَابُ", "يَمُوتُ مَنْ فِي السَّمَاوَاتِ وَالْأَرْضِ إِلَّا مَنْ شَاءَ اللَّهُ", "يَدْخُلُ الْمُؤْمِنُونَ الْجَنَّةَ", "تُوَزَّعُ الْكُتُبُ"]	B	1.00	2026-10-26 06:55:57.301298+00	\N
883	178	mc	الْمَلَكُ الْمُكَلَّفُ بِالنَّفْخِ فِي الصُّورِ هو	["جِبْرِيلُ عَلَيْهِ السَّلَامُ", ". مِيكَائِيلُ عَلَيْهِ السَّلَامُ", "إِسْرَافِيلُ عَلَيْهِ السَّلَامُ", "مَالِكٌ عَلَيْهِ السَّلَامُ"]	C	1.00	2026-10-26 06:55:57.301298+00	\N
884	178	mc	الْمَقْصُودُ بِالْبَعْثِ يَوْمَ الْقِيَامَةِ	["إِعَادَةُ الْأَرْوَاحِ وَالْأَجْسَادِ إِلَى الْحَيَاةِ", "جَمْعُ الْمَالِ وَالثَّرَوَاتِ", "انْتِهَاءُ الْحَيَاةِ الدُّنْيَا فَقَطْ", "نُزُولُ الْمَطَرِ مِنَ السَّمَاءِ"]	A	1.00	2026-10-26 06:55:57.301298+00	\N
885	178	essay	عرف معنى اليوم الآخر؟	[]	اليوم الذي يأتي بعد الانتهاء من مرحلة الحياة الدنيا.	1.00	2026-10-26 06:55:57.301298+00	\N
886	178	essay	عرف ما المقصود بالإيمان باليوم الآخر!	[]	التصديق الذي محله القلب بصدق كل ما أخبر به الله في كتابه العزيز أو أخبر به رسوله صلى الله عليه وسلم مما يكون بعد الموت.	1.00	2026-10-26 06:55:57.301298+00	\N
887	178	essay	اذكر الدليل في اليوم الآخر!	[]	الذين يؤمنون بالغيب ويقيمون الصلاة ومما رزقناهم ينفقون.	1.00	2026-10-26 06:55:57.301298+00	\N
888	178	essay	ما الفرق بين الدليل النقلي و الدليل العقلي؟	[]	الدليل النقلي هو الدليل النصي من كتاب الله أو سنة رسول الله أو إجماع أهل العلم. والدليل العقلي هو الدليل ما أدركه العقل في الموضوع الذي هو محل الاستدلال.	1.00	2026-10-26 06:55:57.301298+00	\N
889	178	essay	اذكر ٣ علامات اليوم الآخر الصغرى!	[]	إذا ولدت الأمة ربها، وإذا تطاول رعاة البهم في البنيان.، قتال المسلمين اليهود، ظهور الفتن وكثرة القتل والفسوق.	1.00	2026-10-26 06:55:57.301298+00	\N
890	179	mc	اكمل هاذ الحديث: أنَّ النَّبيَّ صلَّى اللَّهُ عليهِ وسلَّمَ مرَّ بسَعدٍ وَهوَ يتوضَّأُ، فقالَ : ما هذا......... يا سَعدُ ؟ قالَ : أفي الوضوءِ ........ قالَ : نعَم، وإن كنتَ على نَهْرٍ جارٍ	["(السَّرَفُ)، (سَرفٌ )", "(الاسراف)، (السرف)", "(السَّرَفُ)، (سَرا فٌ )", "(السَّارَفُ)، (سَا رفٌ )"]	A	1.00	2026-10-26 07:03:31.195207+00	\N
891	179	mc	املاء الفراغ ما يأتى: أنَّ النَّبيَّ صلَّى اللَّهُ عليهِ وسلَّمَ مرَّ بسَعدٍ وَهوَ يتوضَّأُ، فقالَ : ما هذا السَّرَفُ يا سَعدُ ؟ قالَ : أفي الوضوءِ سَرفٌ قالَ : نعَم، وإن كنتَ على .......	["نَهْرٍ جارٍ", "نَهْرٍ جارية", "نَهارٍ جارٍية", "انَهْرٍ جارين"]	A	1.00	2026-10-26 07:03:31.195207+00	\N
892	179	mc	اذكر من الراوي حديث عن مشروعية الشكر عند السراء والصبر عند الضراء	["عبد الله بن عمر", "صهيب بن سنان", "عثمان بن عفان", "ابو بكر"]	B	1.00	2026-10-26 07:03:31.195207+00	\N
893	179	mc	فالمؤمن ان اصابته الضراء........ على اقدار الله.	["سجد", "صبر", "الصلاة", "كفر"]	B	1.00	2026-10-26 07:03:31.195207+00	\N
894	179	mc	فالمؤمن ان اصابته السراء........ على اقدار الله.	["سجد", "شكر", "الصلاة", "كفر"]	B	1.00	2026-10-26 07:03:31.195207+00	\N
895	179	mc	فان كان دينه ..... اشتدّ بلاؤه	["رقة", "قوي", "الصدق", "صلبا"]	D	1.00	2026-10-26 07:03:31.195207+00	\N
896	179	mc	وان كان في دينه ..... ابتلي على حسب دينه.	["صلبا", "قوي", "الضعيف", "رقّة"]	D	1.00	2026-10-26 07:03:31.195207+00	\N
897	179	mc	فما يبرح البلاء بالعبد حتى يتركه يمشي على الارض ما عليه ......(رواه الترمذي)	["مؤمنا", "الايمان", "الصدقية", "خطيئة"]	D	1.00	2026-10-26 07:03:31.195207+00	\N
898	179	mc	ينقسم الناس حين نزول البلاء الى....؟	["قسمان اثنين", "خمسة اقسام", "اربعة اقسام", "ثلاثة اقسام"]	D	1.00	2026-10-26 07:03:31.195207+00	\N
899	179	mc	من فوائد الابتلاء ما يأتي، الّا......	["تكفير الذنوب", "رفع الدرجة", "تقوية صلة العبد بربه", "تقوية صلة الرحيم"]	D	1.00	2026-10-26 07:03:31.195207+00	\N
900	179	mc	ان غرس الشجر ليس من العبث واللهو، وانما فيه....؟	["أجر و ثواب من الله", "أجر و ثواب من الناس", "أجر و ثواب من الشيطان", "أجر و ثواب من المخلوقات"]	A	1.00	2026-10-26 07:03:31.195207+00	\N
901	179	mc	اعلم اخي الكريم، أن اهل العلم هم.....؟	["ورثة الانبياء", "ورثة العلماء", "اهل الجنّة", "اهل اتقوى"]	A	1.00	2026-10-26 07:03:31.195207+00	\N
902	179	mc	وفضل العالم على العابد كما.....؟	["بين المشرق و المغرب", "بين البحر و النهر", "بين السماء والارض", "بين الليل و النهار"]	C	1.00	2026-10-26 07:03:31.195207+00	\N
903	179	mc	من سلك طريقا يبتغي فيه علما سلك الله به طريقا الى....؟	["العلم", "المدرسة", "الجنة", "النار"]	C	1.00	2026-10-26 07:03:31.195207+00	\N
904	179	mc	وانّ ....... لتضع أجنحتها رضا لطالب العلم	["الملائكة", "الله", "العلماء", "الانبياء"]	A	1.00	2026-10-26 07:03:31.195207+00	\N
905	179	essay	تجتمع عند الضراء ثلاث نعم، اذكرها!	[]	تجتمع عند الضراء ثلاث نعم: نعمة تكفير السيئات، نعمة هوان الضراء عليه، نعمة كونه في احدى مراتب الصبر	1.00	2026-10-26 07:03:31.195207+00	\N
906	179	essay	اذكر الدليل من السنة على مشروعية تجنب الاسراف في كل شيء!	[]	أنَّ النَّبيَّ صلَّى اللَّهُ عليهِ وسلَّمَ مرَّ بسَعدٍ وَهوَ يتوضَّأُ، فقالَ : ما هذا السَّرَفُ يا سَعدُ ؟ قالَ : أفي الوضوءِ سَرفٌ قالَ : نعَم، وإن كنتَ على نَهْرٍ جارٍ	1.00	2026-10-26 07:03:31.195207+00	\N
907	179	essay	اكمل هذه الحديث: اذا مات ابن ادم انقطع عمله الا من ثلاث: .......	[]	اكمل هذه الحديث: اذا مات ابن ادم انقطع عمله الا من ثلاث: صدقة جارية، او علم ينتفع به، او ولد صالح يدعو له.	1.00	2026-10-26 07:03:31.195207+00	\N
908	179	essay	اكمل هذه الحديث: من سلك طريقا يبتغي فيه علما .......الي الجنة،	[]	اكمل هذه الحديث: من سلك طريقا يبتغي فيه علما سلك الله به طريقا الي الجنة،	1.00	2026-10-26 07:03:31.195207+00	\N
909	179	essay	اشرح معاني من " بلاء و صلبا"	[]	" بلاء: محنة و مصيبة. صلبا: قويا شديدا "	1.00	2026-10-26 07:03:31.195207+00	\N
910	180	mc	بدأت الدولة الأموية فى الأندلس فى عام ...........	["141 ه", "140 ه", "139 ه", "138 ه"]	B	1.00	2026-10-26 07:05:41.777614+00	\N
911	180	mc	كان الإمام ............ راجع العقل وراسخ الحلم وواسع العلم و كثير الحزم, وهو الخليفة الأولى للدولة الأموية في الأندلس	["عبد الرحمن الداخل", "هسام بن عبدالرحمن", "عبد الرحمن الناصر", "الحاجب المنصور"]	A	1.00	2026-10-26 07:05:41.777614+00	\N
912	180	mc	كان الجيش القوط ........... أكثرهم خيالة و يقودهم حاكم الأندلس "لذريق"	["مائة ألف", "ثلاثة عشر ألفاً", "سبعة ألاف", "ستة ألاف"]	A	1.00	2026-10-26 07:05:41.777614+00	\N
913	180	mc	توفي موسى بن نصير بالمدينة المنورة في أثناء مناسك الحج, وعمره .......	["67 سنة", "68 سنة", "76 سنة", "78 سنة"]	B	1.00	2026-10-26 07:05:41.777614+00	\N
914	180	mc	كان ............. رجلا تقياً قوياً إدارياً و عسكرياً, وتزوج أرملة (لذريق) التي قد أسلمت	["عبد الملك", "عبدالله", "عبد العزيز", "عبد الفتح"]	C	1.00	2026-10-26 07:05:41.777614+00	\N
915	180	mc	أنشأ جمال الدين الأفغاني المجلة لتدعوالمسلمين الى النهوض في دينهم ودنياهم, وسمي تلك المجلة باالمجلة .....	["العروة الوثقى", "نيل الأوطار", "المنار", "الأزهار"]	A	1.00	2026-10-26 07:05:41.777614+00	\N
917	180	mc	قام ............ بإدخال الإصلاح في الأزهار مصر, حيث إقتصر على إدخال العلوم الحديثة في الدراسة	["محمد علي باشا", "محمد عبده", "أحمد خان", "مدحت باشا"]	B	1.00	2026-10-26 07:05:41.777614+00	\N
918	180	mc	توفي الشيخ محمد مصطفى المراغي في السنة ..........	["1943 م", "1944م", "1945م", "1946م"]	C	1.00	2026-10-26 07:05:41.777614+00	\N
919	180	mc	مِنْ 3 نظريات عن دخول الإسلام إلى إندونيسيا كما قال محمد منصور سريا نغارا, إلا.....!	["دخل الإسلام إلى إندونيسيا من غجرات في القرن الثالث عشر الملادي", "دخل الإسلام إلى إندونيسيا من العربى في القرن السابع الملادي", "دخل الإسلام إلى إندونيسيا من فم الفرس في القرن الخامس عشر الملادي", "دخل الإسلام إلى إندونيسيا من الصين في القرن السابع الملادي"]	D	1.00	2026-10-26 07:05:41.777614+00	\N
920	180	mc	ماهي المملكة الإسلامية الأولى في إندونيسيا؟	["المملكة برلاك", "المملكة باساي", "المملكة سياك", "المملكة ديماك"]	A	1.00	2026-10-26 07:05:41.777614+00	\N
921	180	mc	من أعضاء العلماء التسعة الذي يكون الملك في المملكة سيربون هو ...	["سونن غيري", "سونن كونونج جاتي", "سونن قدوس", "سونن كاليجاكا"]	B	1.00	2026-10-26 07:05:41.777614+00	\N
922	180	mc	متى دخل الإسلام إلى جزيرة مالوكوا ؟	["فى القرن الثالث عشر", "فى القرن الرابع عشر", "فى القرن السادس عشر", "فى القرن السابع عشر"]	C	1.00	2026-10-26 07:05:41.777614+00	\N
923	180	mc	كانت الجمعية المحمدية قامت فى إصلاح إندونيسياومجتمعها. ومن مجال الإجتماعية هو....	["المدارس للأولاد", "المركز لصحة المجتمع", "المستشفيات", "المعاهد لرعاية الأيتام"]	D	1.00	2026-10-26 07:05:41.777614+00	\N
924	180	mc	جعل الحاج أحمد دحلان المحمدية حركة تجديدة و تخليصة فى الإسلام, إذ كانوا قد تخلطت ب ........	["التحيل والبداع والحرفات", "العبادة والقراة القرآن", "القرآن و السنة", "التحيل و الصلاة و الصيام"]	A	1.00	2026-10-26 07:05:41.777614+00	\N
925	180	essay	لماذ يلقب عبدالرحمن ب "الداخل" !	[]	لأنه أول من دخل الأندلس حاكما من الأمويين	1.00	2026-10-26 07:05:41.777614+00	\N
926	180	essay	أذكر أسباب سقوط الدولة الأموية في المشرق (2)!	[]	ظهور الثوريات, إنتشار الفساد المال, ظهور الدعوة العباسية	1.00	2026-10-26 07:05:41.777614+00	\N
927	180	essay	ما هو التجديد لغة وإصطلاحا ؟	[]	لغة : إعادة الشيء إلى سيرته الأولى, إصطلاحا : اجتهاد في فروع الدين المتغيرة, مقيد (محدود ) بالأصول الثابتة	1.00	2026-10-26 07:05:41.777614+00	\N
928	180	essay	بيِّنْ عن الحركة المحمدية في إندونيسيا !	[]	كانت حركة رسمية تجري بها على مصالح التربوية والإجتماعية والدينية في بلدة إندونيسياو و كان مؤسسها الحاج أحمد دحلان.	1.00	2026-10-26 07:05:41.777614+00	\N
929	180	essay	كانت حالة التعليم في إندونيسيا القديمة نوعين.بيِّنْ !	[]	المدرسة الهولندية, تستخدم على منهج التعليم الحديث 2). المدرسة الدينية السلفية (معهد), تستخدم منهج التعليم القديم	1.00	2026-10-26 07:05:41.777614+00	\N
930	181	mc	لكن الاربعة كانوا فقط قادرين علي الحكم لمدة .....	["ثلاث سنوات", "اربع سنوات", "خمسة سنوات", "سبع سنوات"]	D	1.00	2026-10-26 07:10:24.315277+00	\N
931	181	mc	حكم الوليد لمدة سنة..... ثم استبدل بيزيد الثا لث	["واربع اشهر", "وخمسة اشهر", "وثلا ثة اشهر", "وسبع اشهر"]	C	1.00	2026-10-26 07:10:24.315277+00	\N
932	181	mc	وخلال فترة الخلا فة كان مروان مشخولا.....	["الضعفاء", "بالتغلب علي ثورات", "مختلفة", "البلاد"]	B	1.00	2026-10-26 07:10:24.315277+00	\N
933	181	mc	شخصية الخلفاء الضعفاء بعد وفاة هشام بن عبد الملك ولم يعد هناك.....	["خليفة صبي", "خليفة قوي", "خليفة رجال", "خليفة ضعيف"]	B	1.00	2026-10-26 07:10:24.315277+00	\N
934	181	mc	ابو العباس السفاح هو.....	["علي بن محمد بن عبد الله", "محمد بن عبد الله بن علي", "عبد الله بن محمد بن علي بن عبد الله بن العباس", "عبد الله بن العباس"]	C	1.00	2026-10-26 07:10:24.315277+00	\N
935	181	mc	ابو جعفر المنصور وهارون الراشيد والمامون وكان عهدهم هو ما يسمى.....	["بالفترة الذهبية للحضارة الاسلا مية", "من خلفاء الدولة العباسية", "من خلفاء الدولة الاموية", "المشهورين منهم"]	A	1.00	2026-10-26 07:10:24.315277+00	\N
936	181	mc	وكانوا يعرفون بالخلفاء.....	["الكبار", "الكبار وبالحكام العاقلين والحاكمين", "العاقلين", "والحاكمين"]	B	1.00	2026-10-26 07:10:24.315277+00	\N
937	181	mc	الخليفة هارون الرشيد.....	["155-175", "154-157", "153-156", "145-193"]	D	1.00	2026-10-26 07:10:24.315277+00	\N
938	181	mc	الخليفة المامون هو.....	["هارون الراشيد بن المامون", "هارون الرشيد بن عبد اللة", "عبداللة بن هارون الراشيد", "جعفر بن هارون الرشيد"]	C	1.00	2026-10-26 07:10:24.315277+00	\N
939	181	mc	اسس الرشيد بيت الحكمة ليكون خزانة.....	["الحركة العلمية", "لطالب العلم", "للتاليف والترجمة", "الحضارة الاسلا مية"]	C	1.00	2026-10-26 07:10:24.315277+00	\N
940	181	mc	ما معنى وجهة العلم؟	["ilmu pengetahuan", "pusat ilmu", "para pencari ilmu", "ilmu agama"]	B	1.00	2026-10-26 07:10:24.315277+00	\N
941	181	mc	ولد الامام البخاري ليلةالجمعة الثالث عشر من شوال سنة.....	["194 h", "205 h", "350 h", "189 h"]	A	1.00	2026-10-26 07:10:24.315277+00	\N
942	181	mc	الامام مسلم هو.....	["مسلم بن البخاري بن الحجاج", "مسلم بن محمد بن الحجاج", "مسلم بن الحجاج النيسابوري", "مسلم بن محمد النيسابوري"]	C	1.00	2026-10-26 07:10:24.315277+00	\N
943	181	mc	علماء المذاهب الاربعة هو.....	["ابن كثير", "ابو حنيفة", "البخلري", "التر ميذي"]	B	1.00	2026-10-26 07:10:24.315277+00	\N
944	181	mc	ولد الشافعي بغزة عام.....	["200 h", "180 h", "170 h", "150 h"]	D	1.00	2026-10-26 07:10:24.315277+00	\N
945	181	essay	كم خليفة للخلافة العباسية ؟ واذكر المشهورين منهم ؟	[]	37 ( ابو جعفر المنصور , هارون الراشيد , الماءمون )	1.00	2026-10-26 07:10:24.315277+00	\N
946	181	essay	ابو العباس السفاح هو ؟	[]	عبد الله بن محمد بن علي بن عبد الله بن العباس	1.00	2026-10-26 07:10:24.315277+00	\N
947	181	essay	لماذ سميت الخلافة العبا سية بالعصر الذهبى للحضا رة الاسلا مية ؟	[]	وكانو يعرفون بالخلفاء الكبار وبالحكام العاقلين والحاكمين	1.00	2026-10-26 07:10:24.315277+00	\N
948	181	essay	كيف كا نت الحركة العلمية في التاء ليف والترجمة ؟	[]	حركة الترجمة بثلاث مراحل متميزة تختلف كل منها عن الاخرى	1.00	2026-10-26 07:10:24.315277+00	\N
949	181	essay	كيف اثاربيت الحكمة في الحضا رة الاسلا مية والغربية ؟	[]	وفي عصر الماءمون ازدهرة الحركة العلمية بفضل عنايته بالعلم , مركزا رءيسيا للتعليم علي مستوى العالم	1.00	2026-10-26 07:10:24.315277+00	\N
950	182	mc	ما المراد من قوله صلى الله عليه وسلم ( لايظلمه )	["لَا يَنْبَغِي أَنْ يَظْلِمَهُ بِأَيِّ نَوْعٍ مِنَ الظُّلْمِ", "لَا يَنْبَغِي أَنْ يُسَاعِدَهُ فِي أُمُورِهِ.", "لَا يَنْبَغِي أَنْ يَكْشِفَ أَسْرَارَهُ أَمَامَ النَّاسِ.", "لَا يَنْبَغِي أَنْ يَتْرُكَهُ عِنْدَ الْحَاجَةِ."]	A	1.00	2026-10-26 07:10:35.1937+00	\N
951	182	mc	ما المراد من قوله صلى الله عليه وسلم ( لايسلمه )	["لَا يَتْرُكُهُ مَعَ مَا يُؤْذِيهِ، بَلْ يَنْصُرُهُ.", "لَا يَتْرُكُهُ إِذَا احْتَاجَ إِلَى الْمُسَاعَدَةِ الْمَالِيَّةِ فَقَطْ.", "لَا يَمْنَعُهُ مِنْ مُشَارَكَةِ النَّاسِ فِي أَعْمَالِهِمْ", "لَا يَتْرُكُهُ إِذَا أَخْطَأَ، بَلْ يَنْصَحُهُ وَيُعَلِّمُهُ"]	A	1.00	2026-10-26 07:10:35.1937+00	\N
952	182	mc	ما جزاء من اجتهد قي طلب العلم الشرعى ؟	["لهم المنزلة الرفيعة عند الله", "لَهُمُ الْأَمْوَالُ الْكَثِيرَةُ فِي الدُّنْيَا.", "لَهُمُ الشُّهْرَةُ الْوَاسِعَةُ بَيْنَ النَّاسِ", "لَهُمُ الْمَنْصِبُ الْعَالِي فِي الْمُجْتَمَعِ"]	A	1.00	2026-10-26 07:10:35.1937+00	\N
953	182	mc	الجزاء من جنس .......	["المال", "العمل", "النسب", "العلم"]	B	1.00	2026-10-26 07:10:35.1937+00	\N
954	182	mc	اِخْتَرْ مِنَ الْخِيَارَاتِ الْآتِيَةِ مِنْ حُقُوقِ الْمُسْلِمِ عَلَى الْمُسْلِمِ؟	["أَنْ يُعِينَهُ عَلَى قَضَاءِ حَاجَتِهِ.", "أَنْ يَتَكَبَّرَ عَلَيْهِ فِي الْمُعَامَلَةِ.", "أَنْ يَتَجَاهَلَهُ عِنْدَ لِقَائِهِ.", "أَنْ يَكْشِفَ أَسْرَارَهُ أَمَامَ النَّاسِ."]	A	1.00	2026-10-26 07:10:35.1937+00	\N
955	182	mc	مالحقيقة النسب للعبد ؟	["نسبة الإيمان والعمل الصالح", "نِسْبَةُ الْمَالِ وَالثَّرْوَةِ.", "نِسْبَةُ الْحَسَبِ وَالنَّسَبِ.", "نِسْبَةُ الْقُوَّةِ وَالْجَاهِ"]	A	1.00	2026-10-26 07:10:35.1937+00	\N
956	182	mc	ما المراد ب ( كافل اليتيم ) ؟	["القائم بتربيته ومصالحه والإحسان إليه", "الْقَائِمُ بِتَعْلِيمِهِ الْعُلُومَ الشَّرْعِيَّةَ فَقَطْ.", "الْقَائِمُ بِجَمْعِ الْأَمْوَالِ وَحِفْظِهَا لَهُ.", "الْقَائِمُ بِتَوْجِيهِهِ إِلَى الْعَمَلِ وَكَسْبِ الْمَالِ"]	A	1.00	2026-10-26 07:10:35.1937+00	\N
957	182	mc	كافل اليتيم له منزلة عالية في الآخرة. ما هي ؟	["منزلته يوم القيامة قريبة من النبي صلى الله عليه وسلم", "مَنْزِلَتُهُ يَوْمَ الْقِيَامَةِ قَرِيبَةٌ مِنَ الشُّهَدَاءِ.", "مَنْزِلَتُهُ يَوْمَ الْقِيَامَةِ قَرِيبَةٌ مِنَ الْعُلَمَاءِ.", "مَنْزِلَتُهُ يَوْمَ الْقِيَامَةِ قَرِيبَةٌ مِنَ الصَّالِحِينَ."]	A	1.00	2026-10-26 07:10:35.1937+00	\N
958	182	mc	ما الذي يجب على من ولي شأن اليتيم إذا ترك والده أموالا له؟	["رعاية المال وتنميته وعدم الاعتداء عليه", "تَقْسِيمُ الْمَالِ بَيْنَ الْيَتِيمِ وَأَقَارِبِهِ.", "تَرْكُ الْمَالِ دُونَ حِفْظٍ أَوْ رِعَايَةٍ.", "إِنْفَاقُ الْمَالِ عَلَى حَاجَاتِ الْوَلِيِّ الشَّخْصِيَّةِ."]	A	1.00	2026-10-26 07:10:35.1937+00	\N
959	182	mc	وأشار بالسبابة والوسطى و..........	["ضَمَّ بَيْنَهُمَا تَمَامًا.", "فَرَّجَ بَيْنَهُمَا شَيْئًا.", "رَفَعَ أَصَابِعَهُ كُلَّهَا.", "قَبَضَ يَدَهُ بِشِدَّةٍ."]	B	1.00	2026-10-26 07:10:35.1937+00	\N
960	182	mc	من فضائل كفالة اليتيم ............	["لِينُ الْقَلْبِ وَشِفَاؤُهُ مِنَ الْقَسْوَةِ.", "الْحُصُولُ عَلَى الْمَنْصِبِ الْعَالِي.", "نَيْلُ الشُّهْرَةِ بَيْنَ النَّاسِ.", "زِيَادَةُ الْمَالِ وَالثَّرْوَةِ."]	A	1.00	2026-10-26 07:10:35.1937+00	\N
961	182	mc	نهى الإسلام عن أكل أموال اليتيم ظلما لأنه من.........	["الْمُبَاحَاتِ", "الْكَبَائِرِ", "الْمَكْرُوهَاتِ", "الْمَنْدُوبَات"]	B	1.00	2026-10-26 07:10:35.1937+00	\N
962	182	mc	خير بيت في المسلمين بيت فيه يتيم .......	["يُحْسِنُ إِلَيْهِ.", "يُسِيءُ إِلَيْهِ.", "يَتَجَاهَلُهُ.", "يَظْلِمُهُ."]	A	1.00	2026-10-26 07:10:35.1937+00	\N
963	182	mc	إتقوا الظلم فإن الظلم .........	["ظُلُمَاتٌ يَوْمَ الْقِيَامَةِ.", "سَبَبٌ لِلرَّاحَةِ فِي الدُّنْيَا.", "دَلِيلٌ عَلَى قُوَّةِ الْإِنْسَانِ.", "سَبَبٌ لِمَحَبَّةِ النَّاسِ."]	A	1.00	2026-10-26 07:10:35.1937+00	\N
964	182	mc	إتقوا الشحّ فإن الشحّ............	["يُسَاعِدُ عَلَى نَشْرِ الْمَحَبَّةِ بَيْنَ النَّاسِ.", "أَهْلَكَ مَنْ كَانَ قَبْلَكُمْ.", "يُؤَدِّي إِلَى زِيَادَةِ الْبَرَكَةِ فِي الْمَالِ.", "يُسَاعِدُ عَلَى تَحْقِيقِ التَّكَافُلِ الِاجْتِمَاعِيِّ."]	B	1.00	2026-10-26 07:10:35.1937+00	\N
965	182	essay	الجزاء من جنس العمل. اذكر مثالا نموذجيا ذكر في الحديث يوضح هذه العبارة !	[]	مَنْ سَتَرَ مُسْلِمًا سَتَرَهُ اللهُ، وَمَنْ فَرَّجَ عَنْ مُسْلِمٍ كُرْبَةً فَرَّجَ اللهُ عَنْهُ كُرْبَةً مِنْ كُرَبِ يَوْمِ الْقِيَامَةِ	1.00	2026-10-26 07:10:35.1937+00	\N
966	182	essay	ماجزاء ستر عورات المسلمين ؟	[]	ستره الله عنه في يوم القيامة	1.00	2026-10-26 07:10:35.1937+00	\N
967	182	essay	من كان في ............ أخيه ................في حاجته	[]	مَنْ كَانَ فِي حَاجَةِ أَخِيهِ كَانَ اللهُ فِي حَاجَتِهِ.	1.00	2026-10-26 07:10:35.1937+00	\N
968	182	essay	ومن ستر ..........ستره الله ............القيامة	[]	وَمَنْ سَتَرَ مُسْلِمًا سَتَرَهُ اللهُ يَوْمَ الْقِيَامَةِ.	1.00	2026-10-26 07:10:35.1937+00	\N
969	182	essay	من سلك طريقا...................سهل الله ................إلى الجنة	[]	مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا، سَهَّلَ اللهُ لَهُ طَرِيقًا إِلَى الْجَنَّةِ.	1.00	2026-10-26 07:10:35.1937+00	\N
970	183	mc	١. دخل الاسلام الي اندونيسيا بطرق عدة، بما في ذلك ؟...	["التجارة", "الحرب", "صداقة", "عداء"]	A	1.00	2026-10-26 07:11:58.871077+00	\N
971	183	mc	٢. دخل الاسلام الي اندو نيسيا من خلا ل قناتين، هما؟....	["ا. خطوط الشمال و الجنوب", "الخطوط الغربية و الشرقية", "طرق البحر والبر", "طرق الزواج و التجارة"]	A	1.00	2026-10-26 07:11:58.871077+00	\N
972	183	mc	٣. اول مملكة اسلا مية تاسست في اندو نيسيا هي ؟ ....	["مملكة ساموديرا باسي", "مملكة ديماك بنتورو", "مملكة جوا تالو", "مملكة سيريبون"]	A	1.00	2026-10-26 07:11:58.871077+00	\N
973	183	mc	٤. نظرية دخول الاسلام الي اندونيسيا التي تنص علي ان الاسلام ينشا من تجار غوجارات ( الهند) هي نظرية ؟	["مكة", "فارس", "الهند", "غوجارات"]	D	1.00	2026-10-26 07:11:58.871077+00	\N
974	183	mc	٥. نظرية دخول الاسلام الي اندونيسيا التي تنس علي ان الاسلام نشا من التجار الفار سيين الذي توقفو في غوجارات ( الهند ) قبل دخول اندونيسا هي؟ ....	["مكة", "فارس", "الهند", "غوجارات"]	B	1.00	2026-10-26 07:11:58.871077+00	\N
975	183	mc	٦. نظرية دخول الاسلام الي اندو نيسيا التي تنص علي ان الاسلام وصل الي اندونيسيا من التجار المسلمين من مكة مباشرة هي نظرية ؟....	["مكة", "فارس", "الهند", "غوجاراة"]	A	1.00	2026-10-26 07:11:58.871077+00	\N
976	183	mc	٧. وفقا لنظرية غوجارات، دخل الاسلام الي اندو نيسيا في القرن ؟...	["٧ م", "٩ م", "١١ م", "١٣ م"]	D	1.00	2026-10-26 07:11:58.871077+00	\N
977	183	mc	٨. وفقا لنظرية مكة المكرمة، دخل الاسلاد الي اندو نيسيا في ؟...	["٧ م", "٩ م", "١١ م", "١٣ م"]	A	1.00	2026-10-26 07:11:58.871077+00	\N
978	183	mc	٩ اقدم دليل علي دخول الاسلا مية في لندو نيسيا هو اكتشاف قبر فا طمة بنت ميمون، اين يقع هذا القبر ؟....	["قرية ليران جريسيك", "قرية كيران جريسيك", "قرية كيران جريسيك", "قرية كليران جريسيك"]	A	1.00	2026-10-26 07:11:58.871077+00	\N
979	183	mc	١٠. علي قبر فا طمة بنت ميمون، ما العدد المكتوب ؟....	["١٠٨٠ م", "١٠٨١ م", "١٠٨٢ م", "١٠٨٣ م"]	C	1.00	2026-10-26 07:11:58.871077+00	\N
980	183	mc	١. من الممالك الاسلا مية في جاوة ؟...	["سينجا سا ري", "ما جا با هيت", "سريويجايا", "ديماك"]	D	1.00	2026-10-26 07:11:58.871077+00	\N
981	183	mc	٢. المملكة الاسلامية الاطول عمرا في جاوة هي ؟....	["ديماك", "العرض", "ماتارام", "بانتين"]	A	1.00	2026-10-26 07:11:58.871077+00	\N
982	183	mc	٣. المملكة الاسلامية في جاوة الاكثر بروزا و تقدما هي ؟ ....	["بانتين", "ماتارام", "عرض", "ديماك"]	B	1.00	2026-10-26 07:11:58.871077+00	\N
983	183	mc	٤. من المملكة الاسلامية في سومطرة عي ؟....	["سا موديرا با يا ي", "ديماك", "بوتون", "تير نيت و تيدور"]	A	1.00	2026-10-26 07:11:58.871077+00	\N
984	183	mc	٥. تعد اطول مملكة اسلامية عهدا في سومطرة ؟....	["اتشيه دار السلام", "تحتاج", "ساموديرا با ساي", "جوهور"]	C	1.00	2026-10-26 07:11:58.871077+00	\N
985	183	essay	١. لماذا نحتاج الي فهم تاريخ الارخبيل الاسلامية ؟.....	[]	لان لنا فكر و قلب	1.00	2026-10-26 07:11:58.871077+00	\N
986	183	essay	٢. متي دخل الاسلام في الارخبيل ؟....	[]	٧ / ١٣ م	1.00	2026-10-26 07:11:58.871077+00	\N
987	183	essay	٣. ما هو دليل دخول الاسلام في الارخبيل ؟...	[]	مكبرت فاطمة بنت ميمون في ليرا جريسيك	1.00	2026-10-26 07:11:58.871077+00	\N
988	183	essay	٤. ما هو الاهداف والفوايد في دراسة تاريخ الارخبيل لاسلامية ؟....	[]	نعرف ان الاسلام واسع	1.00	2026-10-26 07:11:58.871077+00	\N
989	183	essay	٥. اذكر اسباب سهولة دخول اللسلام في الارخبيل ؟	[]	التجارة، الزواخ، التعليم.	1.00	2026-10-26 07:11:58.871077+00	\N
990	184	mc	مَا هُوَ فِعْلُ الْمُضَارِعِ لِلْفِعْلِ الْمُضَعَّفِ "مَدَّ"؟	["يَمِدُّ", "يَمُدُّ", "يَمَدُّ", "يُمْدِدُ"]	B	1.00	2026-10-26 07:36:18.446895+00	\N
991	184	mc	مَا هُوَ فِعْلُ الْمُضَارِعِ لِلْفِعْلِ "وَضَعَ"؟	["يَضَعُ", "يُضَعُ", "يَوْضِعُ", "يَضِعُ"]	A	1.00	2026-10-26 07:36:18.446895+00	\N
992	184	mc	مَا هُوَ فِعْلُ الْمُضَارِعِ لِلْفِعْلِ "يَبِسَ"؟	["يَيْبِسُ", "يَيْبَسُ", "يَيْبُسُ", "يُوبِسُ"]	B	1.00	2026-10-26 07:36:18.446895+00	\N
993	184	mc	مَا هُوَ فِعْلُ الْمَاضِي لِلْفِعْلِ "يَمِقُ"؟	["مَوَقَ", "مَقَوَ", "وَمَقَ", "وَمِقَ"]	D	1.00	2026-10-26 07:36:18.446895+00	\N
994	184	mc	مَا هُوَ فِعْلُ النَّهْيِ مِنَ الْفِعْلِ "نَصَرَ"؟	["لَا تَنْصُرْ", "لَا تَنْصِرْ", "لَا تَنْصَرْ", "لَا يُنْصَرْ"]	A	1.00	2026-10-26 07:36:18.446895+00	\N
995	184	mc	مَا هُوَ اسْمُ الْمَكَانِ/الزَّمَانِ مِنَ الْفِعْلِ "ضَرَبَ"؟	["مَضْرُوبٌ", "ضَارِبٌ", "مَضْرَبٌ", "مَضْرِبٌ"]	D	1.00	2026-10-26 07:36:18.446895+00	\N
996	184	mc	مَا هُوَ اسْمُ الْآلَةِ مِنَ الْفِعْلِ "فَتَحَ"؟	["مَفْتُوحٌ", "مِفْتَاحٌ", "مَفْتَحٌ", "فَاتِحٌ"]	B	1.00	2026-10-26 07:36:18.446895+00	\N
997	184	mc	مَا هُوَ فِعْلُ الْأَمْرِ مِنَ الْفِعْلِ "رَضِيَ"؟	["اِرْضِ", "اِرْضُو", "اِرْضَ", "رَضِّ"]	C	1.00	2026-10-26 07:36:18.446895+00	\N
998	184	mc	مَا هِيَ الصِّفَةُ (بَدَلَ اسْمِ الْفَاعِلِ) مِنْ "شَجُعَ"؟	["شَاجِعٌ", "مَشْجُوعٌ", "شُجَاعٌ", "شَجَعٌ"]	C	1.00	2026-10-26 07:36:18.446895+00	\N
999	184	mc	مَا هُوَ الْمَصْدَرُ مِنَ الْمَهْمُوزِ الْفَاءِ "أَمَلَ"؟	["إِيمَالًا", "آمَالًا", "تَأْمِيلًا", "أَمَلًا / مَأْمَلًا"]	D	1.00	2026-10-26 07:36:18.446895+00	\N
1000	184	mc	مَا هُوَ فِعْلُ الْمُضَارِعِ مِنَ الْفِعْلِ "هَابَ"؟	["يَهَابُ", "يَهِيبُ", "يَهْوَبُ", "يُهَابُ"]	A	1.00	2026-10-26 07:36:18.446895+00	\N
1001	184	mc	مَا هُوَ فِعْلُ الْأَمْرِ مِنَ الْفِعْلِ "رَأَى"؟	["اِرْأَ", "رَأْ", "رَ", "اِرْأَي"]	C	1.00	2026-10-26 07:36:18.446895+00	\N
1002	184	mc	مَا هُوَ اسْمُ الْمَفْعُولِ مِنَ "قَوِيَ"؟	["مَقْوَى", "مَقْوِيٌّ", "مُقَوَّى", "قَاوٍ"]	B	1.00	2026-10-26 07:36:18.446895+00	\N
1003	184	mc	مَا هُوَ فِعْلُ الْأَمْرِ مِنَ الْفِعْلِ "وَمِقَ"؟	["اِيْمِقْ", "مُقْ", "مِقْ", "اِوْمِقْ"]	C	1.00	2026-10-26 07:36:18.446895+00	\N
1004	184	mc	مَا هُوَ الْمَصْدَرُ مِنَ الْفِعْلِ الرُّبَاعِيِّ "طَأْطَأَ"؟	["تَطْأِيطًا", "طَأْطَأَةً / طِئْطَاءً", "مِطْطَاءً", "طُؤْطُؤًا"]	B	1.00	2026-10-26 07:36:18.446895+00	\N
1005	184	essay	اُكْتُبْ فِعْلَ الْأَمْرِ وَفِعْلَ النَّهْيِ مِنَ الْفِعْلِ "ضَرَب"	[]	اِضْرِبْ (أَمْرٌ)، لَا تَضْرِبْ (نَهْيٌ)	1.00	2026-10-26 07:36:18.446895+00	\N
1006	184	essay	اُذْكُرْ فِعْلَ الْمُضَارِعِ لِلْفِعْلِ "عَلِمَ"	[]	يَعْلَمُ	1.00	2026-10-26 07:36:18.446895+00	\N
1007	184	essay	اُذْكُرْ فِعْلَ الْمُضَارِعِ وَفِعْلَ الْأَمْرِ لِلْفِعْلِ "يَبِسَ"	[]	يَيْبَسُ (مُضَارِعٌ)، اِيبَسْ (أَمْرٌ)	1.00	2026-10-26 07:36:18.446895+00	\N
1008	184	essay	كَيْفَ يُصَاغُ فِعْلُ الْأَمْرِ وَفِعْلُ النَّهْيِ مِنَ الْفِعْلِ "رَأَى"؟	[]	رَ (أَمْرٌ)، لَا تَرَ (نَهْيٌ)	1.00	2026-10-26 07:36:18.446895+00	\N
1009	184	essay	كَيْفَ صِيغَةُ اسْمِ الْفَاعِلِ مِنَ الْمِثَالِ الْوَاوِيِّ "وَضَعَ"؟	[]	وَاضِعٌ	1.00	2026-10-26 07:36:18.446895+00	\N
1010	185	mc	مَا هُوَ الصَّرْفُ لُغَةً	["أ. هُوَ التَّغْيِيْرِ", "ب. هُوَ التَّغْيِيْرُ", "ج. مُعَاذُ بْنُ مُسْلِمٍ الهَرَّاءُ", "د. هُوَ التَّغْيِيْرَ"]	B	1.00	2026-10-26 08:01:28.35676+00	\N
1011	185	mc	مَا هُوَ الصَّرْفُ اصْطِلَاحًا	["أ. هُوَ التَّغْيِيْرُ", "ب. هُوَ عِلمُ يَبْحَثُ عَنْ تَغْيِيْرِ الأَصْلِ إِلَى صِيَغٍ مُتَعَدِّدَةٍ لِيَدُلَّ عَلَى مَعَانٍ مُخْتَلِفَةٍ", "ج. هُوَ الكَلِمَةُ العَرَبِيَّةُ مِنَ الأَسْمَاءِ المُعْرَبَةِ والأَفْعَالِ المُتَصَرِّفَةِ فِي حَالِ إفْرَادِهَا", "د. هُوَ عِلمُ يَبْحَثُ عَنْ تَغْيِيْرِ الأَصْلِ الوَاحِدِ إِلَى صِيَغٍ مُتَعَدِّدَةٍ لِيَدُلَّ عَلَى مَعَانٍ مُخْتَلِفَةٍ"]	D	1.00	2026-10-26 08:01:28.35676+00	\N
1012	185	mc	. مَنْ وَاضِعُهٌ مِنْ عِلْمِ الصَّرْفُ	["أ. مُعَاذُ بْنُ مُسْلِمٍ الهَرَّاءُ", "ب. مُعَاذُ بْنُ مُسْلِمٍ الهَرَّاءَ", "ج. الشَّيْخُ الإِمَامُ النَّوَوِيُّ", "د. مُعَاذُ بْنُ مُسْلِمَ"]	A	1.00	2026-10-26 08:01:28.35676+00	\N
1013	185	mc	. مَا مَوْضُوْعُهُ مِنْ عِلْمِ الصَّرْفُ	["أ. هُوَ الكَلِمَةُ العَرَبِيَّةُ مِنَ الالأَفْعَالِ المُتَصَرِّفَةِ فِي حَالِ إفْرَادِهَا", "ب. هُوَ عِلمُ يَبْحَثُ عَنْ تَغْيِيْرِ الأَصْلِ إِلَى صِيَغٍ مُتَعَدِّدَةٍ لِيَدُلَّ عَلَى مَعَانٍ مُخْتَلِفَةٍ", "ج. هُوَ الكَلِمَةُ العَرَبِيَّةُ مِنَ الأَسْمَاءِ المُعْرَبَةِ والأَفْعَالِ المُتَصَرِّفَةِ فِي حَالِ إفْرَادِهَا", "د. هُوَ التَّغْيِيْرِ"]	C	1.00	2026-10-26 08:01:28.35676+00	\N
1014	185	mc	. مَا هُوَ فِعْلُ المَاضِي ؟	["أ. اِسْمٌ يَدُلُّ عَلَى حَصَلَ عَلَيْهِ فِعْلُ الفَاعِلِ", "ب. كُلُّ فِعْلٍ يَدُلُّ عَلَى حُصُوْلٍ عَمَلٍ فِي الزَّمَنِ المَضِيْ", "ج. كُلُّ فِعْلٍ يَدُلُّ عَلَى حُصُوْلٍ عَمَلٍ فِي الزَّمَنِ الحَاضِرِ أَو المُسْتقْبَلِ", "د. جَلَسَ"]	B	1.00	2026-10-26 08:01:28.35676+00	\N
1015	185	mc	. مَا مَصْدَرُ مِنْ «شَرِبَ»؟	["أ. شَارِبٌ", "ب. مَشْرُوبٌ", "ج. شُرْبٌ", "د. مَشْرَبٌ"]	C	1.00	2026-10-26 08:01:28.35676+00	\N
1016	185	mc	. أَيُّ جُمْلَةٍ تَحْتَوِي عَلَى اسْمِ آلَةٍ؟	["أ. كَتَبَ الطَّالِبُ الدَّرْسَ", "ب. فَتَحَ أَحْمَدُ الْبَابَ بِالْمِفْتَاحِ.", "ج. جَلَسَ الْمُعَلِّمُ فِي الْمَكْتَبِ.", "د. ذَهَبَ الطَّالِبُ صَبَاحًا"]	B	1.00	2026-10-26 08:01:28.35676+00	\N
1017	185	mc	. أُذْكُرْ أَنْوَاعُ مِنْ الفِعْلُ بِاِعْتِبَارِ مَعْنَى	["أ. فِعْلُ المَاضِي وَ الفِعْلُ اللَّازِمُ", "ب. الفِعْلُ المُتَعَدِّ وَ الفِعْلُ اللَّازِمُ", "ج. الفِعْلُ المُتَعَدِّ وَ فِعْلُ الأَمْر", "د. فِعْلُ المَاضِي, فِعْلُ المُضَارِعِ, فِعْلُ الأَمْر"]	B	1.00	2026-10-26 08:01:28.35676+00	\N
1018	185	mc	. مَا صِيغَةُ الْفِعْلِ «كَتَبَ» مَعَ الضَّمِيرِ «هِيَ»؟	["أ. كَتَبَتْ", "ب. كَتَبْتَ", "ج. كَتَبْتِ", "د. كَتَبَا"]	A	1.00	2026-10-26 08:01:28.35676+00	\N
1019	185	mc	. مَا صِيغَةُ «ضَرَبَ» مَعَ الضَّمِيرِ «أَنْتِ»؟	["أ. ضَرَبْتَ", "ب. ضَرَبْتِ", "ج. ضَرَبَتْ", "د. ضَرَبَا"]	B	1.00	2026-10-26 08:01:28.35676+00	\N
1020	185	mc	. مَا صِيغَةُ «فَتَحَ» مَعَ الضَّمِيرِ «أَنْتُمَا»؟	["أ. فَتَحْتَ", "ب. فَتَحْتِ", "ج. فَتَحْتُمَا", "د. فَتَحَا"]	C	1.00	2026-10-26 08:01:28.35676+00	\N
1021	185	mc	. مَا صِيغَةُ الْفِعْلِ «فَتَحَ» فِي الْفِعْلِ الْمُضَارِعِ مَعَ الضَّمِيرِ «نَحْنُ»؟	["أ. يَفْتَحُ", "ب. تَفْتَحُ", "ج. أَفْتَحُ", "د. نَفْتَحُ"]	D	1.00	2026-10-26 08:01:28.35676+00	\N
1022	185	mc	. أَيُّ خِيَارٍ صَحِيحٌ؟هُوَ ذَهَبَ إِلَى الْمَكْتَبِ وَحَمَلَ الْكِتَابَ فِي الصَّبَاحِ.	["أ. ذَهَبَ: فِعْلٌ مَاضٍ لِضَمِيرِ هُوَ، الْمَكْتَبِ: اسْمُ مَكَانٍ، حَمَلَ: فِعْلٌ مَاضٍ لِضَمِيرِ هُوَ، الْكِتَابَ: مَفْعُولٌ بِهِ، الصَّبَاحِ: اسْمُ زَمَانٍ.", "ب. ذَهَبَ: فِعْلٌ مُضَارِعٌ لِضَمِيرِ هُوَ، الْمَكْتَبِ: اسْمُ آلَةٍ، حَمَلَ: فِعْلُ أَمْرٍ.", "ج. ذَهَبَ: فِعْلٌ مَاضٍ لِضَمِيرِ هِيَ، الْكِتَابَ: فَاعِلٌ، الصَّبَاحِ: اسْمُ مَكَانٍ.", "د. ذَهَبَ: فِعْلُ أَمْرٍ لِضَمِيرِ أَنْتَ، الْمَكْتَبِ: اسْمُ زَمَانٍ، حَمَلَ: مَصْدَرٌ."]	A	1.00	2026-10-26 08:01:28.35676+00	\N
1023	185	mc	. أَيُّ خِيَارٍ صَحِيحٌ؟ كَتَبَتِ الطَّالِبَةُ الْوَاجِبَ بِالْقَلَمِ فِي الْفَصْلِ مَسَاءً.	["أ. كَتَبَتْ: فِعْلٌ مَاضٍ لِضَمِيرِ هُوَ، الطَّالِبَةُ: فَاعِلٌ، الْوَاجِبَ: اسْمُ فَاعِلٍ.", "ب. كَتَبَتْ: فِعْلٌ مَاضٍ لِضَمِيرِ هِيَ، الطَّالِبَةُ: فَاعِلٌ، الْوَاجِبَ: مَفْعُولٌ بِهِ، الْقَلَمِ: اسْمُ آلَةٍ، الْفَصْلِ: اسْمُ مَكَانٍ، مَسَاءً: اسْمُ زَمَانٍ.", "ج. كَتَبَتْ: فِعْلٌ مُضَارِعٌ لِضَمِيرِ هِيَ، الطَّالِبَةُ: مَفْعُولٌ بِهِ، الْوَاجِبَ: فَاعِلٌ.", "د. كَتَبَتْ: فِعْلُ أَمْرٍ لِضَمِيرِ أَنْتِ، الْقَلَمِ: اسْمُ مَكَانٍ، الْفَصْلِ: اسْمُ آلَةٍ."]	B	1.00	2026-10-26 08:01:28.35676+00	\N
1024	185	mc	. أَيُّ خِيَارٍ صَحِيحٌ؟ أَنْتَ تَقْرَأُ الْكِتَابَ فِي الْمَكْتَبَةِ مَسَاءً.	["أ. تَقْرَأُ: فِعْلٌ مَاضٍ لِضَمِيرِ هِيَ، الْكِتَابَ: فَاعِلٌ، الْمَكْتَبَةِ: اسْمُ آلَةٍ.", "ب. تَقْرَأُ: فِعْلُ أَمْرٍ لِضَمِيرِ أَنْتَ، الْكِتَابَ: فَاعِلٌ، مَسَاءً: اسْمُ مَكَانٍ.", "ج. تَقْرَأُ: فِعْلٌ مُضَارِعٌ لِضَمِيرِ أَنْتَ، الْكِتَابَ: مَفْعُولٌ بِهِ، الْمَكْتَبَةِ: اسْمُ مَكَانٍ، مَسَاءً: اسْمُ زَمَانٍ.", "د. تَقْرَأُ: فِعْلٌ مُضَارِعٌ لِضَمِيرِ هُوَ، الْكِتَابَ: فَاعِلٌ، الْمَكْتَبَةِ: اسْمُ زَمَانٍ."]	C	1.00	2026-10-26 08:01:28.35676+00	\N
1025	185	essay	. مَا هُوَ فِعْلُ المَاضِي ؟	[]	كُلُّ فِعْلٍ يَدُلُّ عَلَى حُصُوْلٍ عَمَلٍ فِي الزَّمَنِ المَضِيْ	1.00	2026-10-26 08:01:28.35676+00	\N
1026	185	essay	. مَا هُوَ فِعْلُ المُضَارِعْ ؟	[]	كُلُّ فِعْلٍ يَدُلُّ عَلَى حُصُوْلٍ عَمَلٍ فِي الزَّمَنِ الحَاضِرِ أَو المُسْتقْبَلِ	1.00	2026-10-26 08:01:28.35676+00	\N
1027	185	essay	١٠. هَاتِ مِثَالَيْنِ مِنْ فْعْلِ اللَّازِمُ !	[]	جَلَسَ الطَّالِبُ, ذَهَبَ مُحَمَّدٌ, نَامَ الطِّفْلُ, خَرَجَ الْوَلَدُ	1.00	2026-10-26 08:01:28.35676+00	\N
1028	185	essay	١٢. صَرِّفِ الْفِعْلَ «شَوَى» تَصْرِيفًا اصْطِلَاحِيًّا!	[]	شَوَى – يَشْوِى – شَيًّا – وَ مَشْوًى – فهو – شَاوٍ – وذاك – مَشْوِيٌّ – أشْوِ – لَا تَشْوِ – مَشْوًى 2 - مِشْوًى	1.00	2026-10-26 08:01:28.35676+00	\N
1029	185	essay	١٣. صَرِّفِ الْفِعْلَ «كَتَبَ» تَصْرِيفًا لُغَوِيًّا!	[]	كَتَبَ – كَتَبَا – كَتَبُوا – كَتَبَتْ – كَتَبَتَا – كَتَبْنَ – كَتَبْتَ – كَتَبْتُمَا – كَتَبْتُمْ – كَتَبْتِ – كَتَبْتُمَا – كَتَبْتُنَّ – كَتَبْتُ – كَتَبْنَا	1.00	2026-10-26 08:01:28.35676+00	\N
1030	186	mc	مَنْ جَدَّ ..........، وَمَنْ صَبَر ..........إكمال المحفوظة	["وَصَلَ – وَجَدَ", ". وَجَدَ – ظَفِرَ", "ظَفِرَ – وَجَدَ", "وَجَدَ – وَصَلَ"]	B	1.00	2026-10-26 08:02:34.513216+00	\N
1031	186	mc	طَالِبٌ يَضَعُ لِنَفْسِهِ هَدَفًا، ثُمَّ يَسِيرُ فِي الطَّرِيقِ الصَّحِيحِ وَلَا يَتْرُكُهُحَتَّى يَصِلَ إِلَى هَدَفِهِ أَيُّ مَحْفُوظَةٍ تُنَاسِبُ هَذَا الطَّالِبَ؟	["مَنْ قَلَّ صِدْقُهُ قَلَّ صَدِيقُهُ", "مَنْ سَارَ عَلَى الدَّرْبِ وَصَلَ", "مَوَدَّةُ الصَّدِيقِ تَظْهَرُ وَقْتَ الضِّيقِ", "وَمَا اللَّذَّةُ إِلَّا بَعْدَ التَّعَبِ"]	B	1.00	2026-10-26 08:02:34.513216+00	\N
1032	186	mc	مَنْ قَلَّ صِدْقُهُ ..........	["قَلَّ صَدِيقُه", "قَلَّ عِلْمُهُ", "كَثُرَ صَدِيقُهُ", "كَثُرَ مَالُهُ"]	A	1.00	2026-10-26 08:02:34.513216+00	\N
1033	186	mc	جَالِسْ أَهْلَ .......... وَ...........	["الْعِلْمِ وَالْجَهْل", "الصِّدْقِ وَالْوَفَاء", "الْمَالِ وَالْجَمَال", "الصَّبْرِ وَالضَّعْفِ"]	B	1.00	2026-10-26 08:02:34.513216+00	\N
1034	186	mc	قَالَ طَالِبٌ: «سَأَطْلُبُ الْعِلْمَ حَتَّى أَكْبَرَ، وَلَا أَحْتَاجُ إِلَى التَّعَلُّمِ بَعْدَ ذَلِك مَا الْجَوَابُ الْأَصَحُّ؟َ»	["صَحِيحٌ، لِأَنَّ الْعِلْمَ لِلصِّغَارِ فَقَط", ". خَطَأٌ، لِأَنَّ طَلَبَ الْعِلْمِ يَسْتَمِرُّ طُولَ الْحَيَاةِ", "صَحِيحٌ، لِأَنَّ الْكَبِيرَ لَا يَتَعَلَّمُ", "خَطَأٌ، لِأَنَّ الْعِلْمَ لِلشُّيُوخِ فَقَطْ"]	B	1.00	2026-10-26 08:02:34.513216+00	\N
1035	186	mc	الْعَالِمُ كَبِيرٌ وَإِنْ كَانَ ..........، وَالْجَاهِلُ صَغِيرٌ وَإِنْ كَانَ .........	["شَيْخًا – حَدَثًا", "حَدَثًا – شَيْخًا", "عَالِمًا – شَيْخًا", "حَدَثًا – عَالِمًا"]	B	1.00	2026-10-26 08:02:34.513216+00	\N
1036	186	mc	الشرح:  مَا الْمَقْصُودُ بِقَوْلِهِ: الْعَالِمُ كَبِيرٌ وَإِنْ كَانَ حَدَثًا؟	["قِيمَةُ الْإِنْسَانِ بِعُمْرِهِ فَقَطْ", "الْعِلْمُ يَرْفَعُ قَدْرَ الْإِنْسَانِ وَلَوْ كَانَ صَغِيرَ السِّنِّ", "الصَّغِيرُ أَفْضَلُ مِنَ الْكَبِيرِ دَائِمًا", "كُلُّ شَابٍّ عَالِمٌ"]	B	1.00	2026-10-26 08:02:34.513216+00	\N
1037	186	mc	وَإِنَّ كَبِيرَ الْقَوْمِ لَا عِلْمَ عِنْدَهُ .......... إِذَا الْتَفَّتْ عَلَيْهِ الْمَحَافِلُ	["كَبِيرٌ", "عَالِمٌ", "صَغِيرٌ", "مُؤَدَّبٌ"]	C	1.00	2026-10-26 08:02:34.513216+00	\N
1038	186	mc	الشرح: مَا الْمَقْصُودُ بِقَوْلِهِ وَاجْعَلْ حَدِيثَكَ إِنْ نَطَقْتَ مُهَذَّبًا؟	["أ تَكَلَّمْ بِكَلَامٍ حَسَنٍ مُنَاسِبٍ", ". تَكَلَّمْ كَثِيرًا", ". تَكَلَّمْ بِصَوْتٍ عَالٍ", "تَكَلَّمْ قَبْلَ النَّاسِ دَائِمًا"]	A	1.00	2026-10-26 08:02:34.513216+00	\N
1039	186	mc	الشرح: لَا تَنْظُرَنَّ لِأَثْوَابٍ عَلَى أَحَدٍ مَا الْمَقْصُودُ بِهَذَا الْبَيْتِ؟	["الْمَلَابِسُ لَا قِيمَةَ لَهَا أَبَدًا", "لَا تَجْعَلِ الْمَلَابِسَ مِيزَانًا لِقِيمَةِ الْإِنْسَانِ", ". يَجِبُ أَنْ نَلْبَسَ الثِّيَابَ الْقَدِيمَةَ", "الْفَقِيرُ أَفْضَلُ مِنَ الْغَنِيِّ دَائِمًا"]	B	1.00	2026-10-26 08:02:34.513216+00	\N
1040	186	mc	وَمَا الْحُسْنُ فِي وَجْهِ الْفَتَى شَرَفًا لَهُ إِنْ لَمْ يَكُنْ فِي فِعْلِهِ وَ...........	["مَالِهِ", "الْخَلَائِقِ", "ثَوْبِهِ", "نَسَبِهِ"]	B	1.00	2026-10-26 08:02:34.513216+00	\N
1041	186	mc	التطبيق طَالِبٌ جَمِيلُ الْمَظْهَرِ، وَكَثِيرُ الْمَالِ، وَلَكِنَّهُ يَكْذِبُ وَيَسُبُّ أَصْحَابَه مَا الْحُكْمُ الْمُنَاسِبُ لِلْمَحْفُوظَةِ؟ُ	["هُوَ شَرِيفٌ لِجَمَالِهِ", "هُوَ شَرِيفٌ لِمَالِهِ", "لَا يَكْفِي جَمَالُهُ وَمَالُهُ مَعَ سُوءِ خُلُقِهِ", "هُوَ أَفْضَلُ مِنْ غَيْرِهِ"]	C	1.00	2026-10-26 08:02:34.513216+00	\N
1042	186	mc	فَلْيَنْظُرَنَّ إِلَى مَنْ فَوْقَهُ ..........، وَلْيَنْظُرَنَّ إِلَى مَنْ دُونَهُ ..........	["مَالًا – أَدَبًا", "أَدَبًا – مَالًا", "عِلْمًا – جَمَالًا", "جَمَالًا – نَسَبًا"]	B	1.00	2026-10-26 08:02:34.513216+00	\N
1043	186	mc	الفهم الدقيق لِمَاذَا يَنْظُرُ الْإِنْسَانُ إِلَى مَنْ فَوْقَهُ أَدَبًا؟	["لِيَحْسُدَهُ", "لِيَتَعَلَّمَ مِنْهُ وَيُحَسِّنَ أَخْلَاقَهُ", "لِيَحْتَقِرَ نَفْسَهُ", "لِيَكْثُرَ مَالُهُ"]	B	1.00	2026-10-26 08:02:34.513216+00	\N
1044	186	mc	الفهم الدقيق وَلِمَاذَا يَنْظُرُ إِلَى مَنْ دُونَهُ مَالًا؟	["لِيَتَكَبَّرَ عَلَيْهِ", "لِيَشْكُرَ نِعْمَةَ اللهِ وَلَا يَحْقِرَ نَفْسَهُ", "لِيَأْخُذَ مَالَهُ", "لِيَفْخَرَ عَلَيْهِ"]	B	1.00	2026-10-26 08:02:34.513216+00	\N
1045	186	essay	شَرِّح: مَا وَهَبَ اللهُ لِامْرِئٍ هِبَةً أَشْرَفَ مِنْ عَقْلِهِ وَمِنْ أَدَبِه	[]	مَعْنَاهُ أَنَّ الْعَقْلَ وَالْأَدَبَ مِنْ أَشْرَفِ النِّعَمِ الَّتِي أَعْطَاهَا اللهُ لِلْإِنْسَان	1.00	2026-10-26 08:02:34.513216+00	\N
1046	186	essay	قَدْ يَشْرُفُ الْمَرْءُ بِآدَابِهِ فِينَا وَإِنْ كَانَ ..........	[]	وَضِيعَ النَّسَب	1.00	2026-10-26 08:02:34.513216+00	\N
1047	186	essay	فَإِنَّمَا فَخْرُنَا بِـ .......... وَ..........	[]	الْعِلْمِ — الْأَدَب	1.00	2026-10-26 08:02:34.513216+00	\N
1048	186	essay	تَرْجِمْ هَذَا الْبَيْتَ إِلَى اللُّغَةِ الْإِنْدُونِيسِيَّةِ! ادِرِ الْفُرْصَةَ وَاحْذَرْ فَوْتَهَا	[]	Segeralah memanfaatkan kesempatan dan berhati-hatilah agar tidak kehilangan kesempatan itu	1.00	2026-10-26 08:02:34.513216+00	\N
1049	186	essay	إِنَّ ذَا الْحَاجَةِ إِنْ لَمْ يَبْكُرْ ..........................................أَكْمِلِ الْبَيْتَ الْآتِيَ	[]	عَنْ حَمَاهُ مِثْلَ طَيْرٍ فِي قَفَصٍ	1.00	2026-10-26 08:02:34.513216+00	\N
1050	187	mc	مَا تَعْرِيفُ عِلْمِ الصَّرْفِ؟	["عِلْمٌ يُعْرَفُ بِهِ تَغْيِيرُ بِنْيَةِ الْكَلِمَةِ", "عِلْمٌ يُعْرَفُ بِهِ إِعْرَابُ أَوَاخِرِ الْكَلِمَاتِ", "عِلْمٌ يُعْرَفُ بِهِ أَحْكَامُ الْفِقْهِ", "عِلْمٌ يُعْرَفُ بِهِ تَجْوِيدُ الْقُرْآنِ"]	A	1.00	2026-10-26 08:03:37.047242+00	\N
1051	187	mc	مَا أَقْسَامُ الْكَلِمَةِ؟	["فَاعِلٌ وَمَفْعُولٌ وَمَصْدَرٌ", "مَاضٍ وَمُضَارِعٌ وَأَمْرٌ", "اسْمٌ وَفِعْلٌ وَحَرْفٌ", "رَفْعٌ وَنَصْبٌ وَجَرٌّ"]	C	1.00	2026-10-26 08:03:37.047242+00	\N
1052	187	mc	مَا تَعْرِيفُ الْفِعْلِ؟	["مَا دَلَّ عَلَى حَدَثٍ فِي زَمَنٍ", "مَا لَا يَدُلُّ عَلَى مَعْنًى", "مَا دَلَّ عَلَى حَرْفٍ فَقَطْ", "مَا دَلَّ عَلَى مَعْنًى فِي نَفْسِهِ وَلَمْ يَقْتَرِنْ بِزَمَنٍ"]	A	1.00	2026-10-26 08:03:37.047242+00	\N
1053	187	mc	مَا الْفِعْلُ الْمَاضِي؟	["مَا دَلَّ عَلَى حَدَثٍ فِي الزَّمَنِ الْمَاضِي", "مَا دَلَّ عَلَى حَدَثٍ فِي الْمُسْتَقْبَلِ فَقَطْ", "مَا دَلَّ عَلَى الطَّلَبِ", "مَا دَلَّ عَلَى الذَّاتِ"]	A	1.00	2026-10-26 08:03:37.047242+00	\N
1054	187	mc	مَا فِعْلُ الْأَمْرِ؟	["مَا دَلَّ عَلَى الْإِخْبَارِ", "مَا دَلَّ عَلَى الْمَاضِي", "مَا دَلَّ عَلَى طَلَبِ حُصُولِ الْفِعْلِ", "مَا دَلَّ عَلَى الذَّاتِ"]	C	1.00	2026-10-26 08:03:37.047242+00	\N
1081	188	mc	بادر.....واحذرفوته‍ا# فبلوغ العز في نيل......	["الفرص/الفرصة", "الفرصة/الفرص", "الفرس/الفرسة", "الفرسة/الفرس"]	B	1.00	2026-10-26 08:07:13.604031+00	\N
1082	188	mc	......عمر ك ابان الصبا# فهو ان زاد ....الشيب نقص.	["واغتنم/في", "في/واغتنم", "واغتنم/مع", "مع/واغتنم"]	C	1.00	2026-10-26 08:07:13.604031+00	\N
1055	187	mc	مَا التَّرْتِيبُ الصَّحِيحُ لِأَبْوَابِ التَّصْرِيفِ الِاصْطِلَاحِيِّ لِلْفِعْلِ الثُّلَاثِيِّ الْمُجَرَّدِ؟	["مَاضٍ، مُضَارِعٌ، أَمْرٌ، نَهْيٌ", "مَاضٍ، مُضَارِعٌ، مَصْدَرٌ، اسْمُ فَاعِلٍ، اسْمُ مَفْعُولٍ", "مَصْدَرٌ، أَمْرٌ، مَاضٍ، نَهْيٌ", "اسْمُ فَاعِلٍ، مَاضٍ، أَمْرٌ، مَكَانٌ"]	B	1.00	2026-10-26 08:03:37.047242+00	\N
1056	187	mc	مَا صِيغَةُ الْفِعْلِ الْمُضَارِعِ مِنْ ضَرَبَ لِلضَّمِيرِ أَنَا؟	["أَضْرِبُ", "يَضْرِبُ", "تَضْرِبُ", "نَضْرِبُ"]	A	1.00	2026-10-26 08:03:37.047242+00	\N
1057	187	mc	مَا صِيغَةُ النَّهْيِ لِلضَّمِيرِ أَنْتَ مِنَ الْفِعْلِ يَكْتُبُ؟	["لَا يَكْتُبُ", "لَا تَكْتُبْ", "لَمْ تَكْتُبْ", "لَنْ تَكْتُبَ"]	B	1.00	2026-10-26 08:03:37.047242+00	\N
1058	187	mc	أَيُّ الْأَمْثِلَةِ يَتَّبِعُ وَزْنَ فَعَلَ – يَفْعُلُ؟	["ضَرَبَ – يَضْرِبُ", "عَلِمَ – يَعْلَمُ", "حَسِبَ – يَحْسِبُ", "نَصَرَ – يَنْصُرُ"]	D	1.00	2026-10-26 08:03:37.047242+00	\N
1059	187	mc	أَيُّ الْأَمْثِلَةِ يَتَّبِعُ وَزْنَ فَعَلَ – يَفْعِلُ؟	["ضَرَبَ – يَضْرِبُ", "نَصَرَ – يَنْصُرُ", "كَرُمَ – يَكْرُمُ", "عَلِمَ – يَعْلَمُ"]	A	1.00	2026-10-26 08:03:37.047242+00	\N
1060	187	mc	أَيُّ الْأَفْعَالِ الْآتِيَةِ مِنَ الرُّبَاعِيِّ الْمُجَرَّدِ؟	["دَحْرَجَ", "كَتَبَ", "أَكْرَمَ", "اسْتَغْفَرَ"]	A	1.00	2026-10-26 08:03:37.047242+00	\N
1061	187	mc	الْفِعْلُ زَلْزَلَ مِنْ أَيِّ نَوْعٍ؟	["ثُلَاثِيٌّ مُجَرَّدٌ", "ثُلَاثِيٌّ مَزِيدٌ", "رُبَاعِيٌّ مَزِيدٌ", "رُبَاعِيٌّ مُجَرَّدٌ"]	D	1.00	2026-10-26 08:03:37.047242+00	\N
1062	187	mc	مَا وَزْنُ الْمُضَارِعِ مِنَ الْفِعْلِ رَبْرَبَ؟	["يَفْعُلُ", "يُفَعِّلُ", "يُفَعْلِلُ", "يَسْتَفْعِلُ"]	C	1.00	2026-10-26 08:03:37.047242+00	\N
1063	187	mc	كَمْ عَدَدُ الْحُرُوفِ الْأَصْلِيَّةِ فِي الْفِعْلِ رَفْرَفَ؟	["أَرْبَعَةٌ", "ثَلَاثَةٌ", "خَمْسَةٌ", "سِتَّةٌ"]	A	1.00	2026-10-26 08:03:37.047242+00	\N
1064	187	mc	مَا الْمَصْدَرُ الْمَشْهُورُ لِلْفِعْلِ دَحْرَجَ؟	["دَاحِرٌ", "مُدَحْرَجٌ", "دَحْرَجَةٌ", "تَدْحِيرٌ"]	C	1.00	2026-10-26 08:03:37.047242+00	\N
1065	187	essay	ما هو علم الصرف لغة و إصطلاحا ؟	[]	الصَّرْفُ هُوَ التَّغْيِيرُ و اصطلاحا : علم يبحث عن تغيير أصل الواحد إلى صبغ متعددّة ليدلّ على معان مختلفة.	1.00	2026-10-26 08:03:37.047242+00	\N
1066	187	essay	من واضعه و ما موضوعه؟	[]	وا ضعه : مَعَاذُ بْنُ مُسْلِمٍ الْهَرَّاءُ. موضوعه : الْكَلِمَاتُ الْعَرَبِيَّةُ مِنَ الْأَسْمَاءِ الْمُعْرَبَةِ وَالْأَفْعَالِ الْمُتَصَرِّفَةِ فِي حَالِ إِفْرَادِهَا.	1.00	2026-10-26 08:03:37.047242+00	\N
1067	187	essay	عَرِّفِ الْفِعْلَ الرُّبَاعِيَّ الْمُجَرَّدَ، وَاذْكُرْ وَزْنَهُ الْأَصْلِيَّ مَعَ ثَلَاثَةِ أَمْثِلَةٍ!	[]	الرُّبَاعِيُّ الْمُجَرَّدُ هُوَ مَا كَانَتْ حُرُوفُهُ الْأَصْلِيَّةُ أَرْبَعَةً مِنْ غَيْرِ زِيَادَةٍ، وَوَزْنُهُ الْأَصْلِيُّ فَعْلَلَ. دَحْرَجَ، زَلْزَلَ، بَعْثَرَ.	1.00	2026-10-26 08:03:37.047242+00	\N
1068	187	essay	عَيِّنِ الصِّيغَةَ وَنَوْعَ الْكَلِمَةِ فِي الْكَلِمَاتِ الْآتِيَةِ: نَاصِرٌ، مَنْصُورٌ، نَصْرٌ، يَنْصُرُ، اُنْصُرْ!	[]	نَاصِرٌ: اسم الفاعل، وزنه فَاعِلٌ. مَنْصُورٌ: اسم المفعول، وزنه مَفْعُولٌ. نَصْرٌ: مصدر. يَنْصُرُ: فعل مضارع. اُنْصُرْ: فعل أمر.	1.00	2026-10-26 08:03:37.047242+00	\N
1069	187	essay	حَدِّدِ الصِّيغَةَ وَالْوَزْنَ الصَّرْفِيَّ لِلْكَلِمَاتِ الْآتِيَةِ: مُكْرِمٌ، مُكْرَمٌ، إِكْرَامٌ، أَكْرَمَ، يُكْرِمُ!	[]	مُكْرِمٌ: اسم الفاعل، وزنه مُفْعِلٌ. مُكْرَمٌ: اسم المفعول، وزنه مُفْعَلٌ. إِكْرَامٌ: مصدر، وزنه إِفْعَالٌ. أَكْرَمَ: فعل ماضٍ، وزنه أَفْعَلَ. يُكْرِمُ: فعل مضارع، وزنه يُفْعِلُ.	1.00	2026-10-26 08:03:37.047242+00	\N
1070	188	mc	في أي سنة مات على بن أبي طالب......... ه؟	["30 ه", "40 ه", "50 ه", "60 ه"]	B	1.00	2026-10-26 08:07:13.604031+00	\N
1071	188	mc	أذكر 4 وصية من على بن أبي طالب لابنه الحسن؟	["اياك ومصادقة الاحمق", "اياك ومصادقة البخيل", "اياك ومصادقة الفاجر", "اياك ومصادقة الصدق"]	D	1.00	2026-10-26 08:07:13.604031+00	\N
1072	188	mc	أحفظ عني أربعا لا...... ما عملت معهن:	["أربعا", "واوحش", "يضرك", "الاحمق"]	C	1.00	2026-10-26 08:07:13.604031+00	\N
1073	188	mc	اياك و مصادقة الأحمق فإنه.....أن ينفعك فيضرك	["يريد", "يبعد", "يبيعك", "كا السراب"]	A	1.00	2026-10-26 08:07:13.604031+00	\N
1074	188	mc	واياك و مصادقة الفا جر فإنه..... باتا فه	["يريد", "يبعد", "يببعك", "كا السراب"]	C	1.00	2026-10-26 08:07:13.604031+00	\N
1075	188	mc	واياك و مصادقة الكذاب فإنه.....يقرب عليك البعيد ويبعد عليك القريب.	["يريد", "يبعد", "يبيعك", "كاسراب"]	D	1.00	2026-10-26 08:07:13.604031+00	\N
1076	188	mc	في أي سنة ما ت أبي العتا هية.....ه‍؟	["210 ه", "211 ه", "212 ه", "213 ه"]	B	1.00	2026-10-26 08:07:13.604031+00	\N
1077	188	mc	ما زينة المرء؟	["زينة العمل", "تمام لأدب", "اشرف من عقله", "ضيا ع"]	B	1.00	2026-10-26 08:07:13.604031+00	\N
1078	188	mc	......حياةالفتى لان عدما# فإن فقدان الحياة.....به	["أجمل/هما", "هما/أجمل", "هم/أجمل", "اجمل/هم"]	B	1.00	2026-10-26 08:07:13.604031+00	\N
1079	188	mc	في أي سنة مات محمود سامي باشا.....؟	["1364 ه", "1365 ه", "1366ه‍", "1367 ه"]	C	1.00	2026-10-26 08:07:13.604031+00	\N
1080	188	mc	فيم تنال العز والشرف؟	["في نيل الفرص", "في وقت المغرب", "في الفجر", "في المجلس"]	A	1.00	2026-10-26 08:07:13.604031+00	\N
1090	189	mc	وَالدَّهْرُ كَالْبَحْرِ لَا يَنْفَكُّ ذَا كَدَرٍ ، و,اَنَّمَا صَفْوُهُ بَيْنَ الْوَرَى ..........	["ثَبَاتٌ", "لَمْحٌ", "شَرَفٌ", "غُرُورٌ"]	B	1.00	2026-10-26 08:08:28.431608+00	\N
1091	189	mc	لَا تَقْطَعَنَّ ذَنَبَ الْأَفْعَى وَتُرْسِلَهَا ، ,إنْ كُنْتَ شَهْمًا فَأَتْبِبعْ ..........	["نَجدًْا", ". عَرَارًا", ". رَ˚أسَهَا الذَّنَبَا", "الشَّمْسَ"]	C	1.00	2026-10-26 08:08:28.431608+00	\N
1092	189	mc	تَمََتّعْ مِنْ شَمِيِم عَرَارِ نَج دٍْ ، فَمَا بَعْدَ .......... مِنْ عَرَارِ	["الصَّبَاحِ", "الْعَشِيَّةِ", ". الظُّهْرِ", "اللَّيْلِ"]	B	1.00	2026-10-26 08:08:28.431608+00	\N
1093	189	mc	مَا مَعْنَى كَلِمَةِ "الْوَرَى" فِي قَوْلِ الشَّاعِرِ: (و,اَنَّمَا صَفْوُهُ بَيْنَ الْوَرَى لَمْحٌ)؟	["الْلأمْوَالُ", ". الْبَشَرُ / النَّاسُ", "الْلأيَّامُ", "الْمَلَابِسُ"]	B	1.00	2026-10-26 08:08:28.431608+00	\N
1094	189	mc	مَنْ هُوَ الشَّاعِرُ الذَِّي قَالَ: "وَالدَّهْرُ كَالْبَحْرِ لَا يَنْفَكُّ ذَا كَدَرٍ"؟	["الْممَامُ الشَّافِعِيُّ", ". مَحْمُود سَامِي الْبَارُودِيُّ", "عَلِيُّ بنُْ ´أبِي طَالِبٍ", "´أحْمَدُ شَوْقِي"]	B	1.00	2026-10-26 08:08:28.431608+00	\N
1095	189	mc	مَا الْمَقْصُودُ بِكَلِمَةِ "عَرَارٌ" فِي الْمَحْفُوظَاتِ؟	["نَبَاتٌ طَيِّبُ الرَّاِ ح ةَِ فِي نَجدٍْ", "جَبَلٌ فِي مَكَّةَ", "سَيْفٌ حَادٌّ", ". نَهْرٌ فِي الْمَدِينَةِ"]	A	1.00	2026-10-26 08:08:28.431608+00	\N
1096	189	mc	. مَا مَعْنَى كَلِمَةِ "الْأَفْعَى"؟	["الْعَقْرَبُ", ". الْحيََّةُ / الثُّعْبَانُ", "الْلأسَدُ", "الذِّنْبُ"]	B	1.00	2026-10-26 08:08:28.431608+00	\N
1097	189	mc	. مَا مَعْنَى كَلِمَةِ "ذَنَبٌ"؟	["الرَأّسُ", ". الذَّيْلُ", "الْبَطْنُ", "الْعَينُْ"]	B	1.00	2026-10-26 08:08:28.431608+00	\N
1098	189	mc	مَا مَعْنَى كَلِمَةِ "الْمَغْرُورُ"؟	["الصَّادِقُ", "الْمُنْخَدِعُ بنَِفْسِهِ", "الصَّابِرُ", "الْعَالِمُ"]	B	1.00	2026-10-26 08:08:28.431608+00	\N
1099	189	mc	يُعْتَبَرُ بَيْتُ "تَمََتّعْ مِنْ شَمِيِم عَرَارِ نَجدٍْ" مِنْ:	["آثَارِ الصَّحَابَةِ", "´أمْثَالِ الْجاَهِلِيَّةِ النَّظْمِيَّةِ", "الْلأحَادِيثِ النَّبَوِ يَّةِ", "الْحكَِمِ الْمُعَاصِرَةِ"]	B	1.00	2026-10-26 08:08:28.431608+00	\N
1100	189	mc	مَا مَعْنَى كَلِمَةِ "مَهْلًا"؟	["´أسْرِعْ", "تَمَهَّلْ وَارْفُقْ", "اهْرُبْ", "اذْهَبْ"]	B	1.00	2026-10-26 08:08:28.431608+00	\N
1101	189	mc	كَلِمَةُ "صَلَفٍ" فِي الْبَيْتِ تَرْتَبِطُ بِصِفَةٍ مَذْمُومَةٍ هِيَ:	["التَّكَبُّرُ وَالِافْتِخَارُ الْبَاطِلُ", ". الْكَذِبُ", ". الْبُخْلُ", ". الْجَبنَُ"]	A	1.00	2026-10-26 08:08:28.431608+00	\N
1102	189	mc	مَا مَعْنَى كَلِمَةِ «أَحْيَيْتُ» فِي الْمَحْفُوظَةِ؟	[". تَجْدِيدُ الْآمَالِ وَالأَحْلَامِ", "طَالَ بِهِ الْوَقْتُ", "أُدَافِعُ عَنْ", "صَارَ فِي يُسْرٍ وَغِنًى"]	A	1.00	2026-10-26 08:08:28.431608+00	\N
1103	189	mc	مَا الْمَقْصُودُ بِقَوْلِ الشَّاعِرِ: «حَسْبِي مِنَ الدُّنْيَا صَدِيقٌ ثَابِتٌ»؟	["أَنَّ الشَّاعِرَ يَحْتَاجُ إِلَى أَمْوَالٍ كَثِيرَةٍ", "أَنَّ الصَّدِيقَ الصَّادِقَ الْوَفِيَّ يَكْفِي الْإِنْسَانَ فِي حَيَاتِهِ", "أَنَّ الصَّدِيقَ يَظْهَرُ فَقَطْ فِي أَوْقَاتِ الْفَرَحِ", "أَنَّ الْإِنْسَانَ يَحْتَاجُ إِلَى أِصْدِقَاءَ كَثِيرِينَ دُونَ شَرْطِ الصِّدْقِ"]	B	1.00	2026-10-26 08:08:28.431608+00	\N
1104	189	mc	حَسْبِي مِنَ الدُّنْيَا صَدِيقٌ ثَابِتٌ ... فَرْدٌ فَكُنْهُ وَلاَ .......... لِثَانِي	["اعْتِمَادَ", "احْتِيَاجَ", "انْتِظَارَ", "انْتِهَازَ"]	B	1.00	2026-10-26 08:08:28.431608+00	\N
1105	189	essay	أَكْمِلِ الْبَيْتَ الْآتِيَ:وَالدَّهْرُ كَالْبَحْرِ لَا يَنْفَكُّ ذَا كَدَرٍ ، وَإِنَّمَا صَفْوُهُ بَيْنَ الْوَرَى	[]	لَمْحٌ	1.00	2026-10-26 08:08:28.431608+00	\N
1106	189	essay	مَا مَعْنَى كَلِمَةِ "الْأَفْعَى"؟	[]	الْحَيَّةُ أَوْ الثُّعْبَانُ	1.00	2026-10-26 08:08:28.431608+00	\N
1107	189	essay	تَرْجِمْ أَوْ وَضِّحْ هَذِهِ الْعِبَارَةَ: "وَالدَّهْرُ كَالْبَحْرِ".	[]	وَالزَّمَانُ أَوْ الزَّمَنُ كَالْبَحْرِ	1.00	2026-10-26 08:08:28.431608+00	\N
1108	189	essay	اِذْكُرْ ضِدَّ (عَكْسَ) كَلِمَةِ "صَفْوُهُ".	[]	كَدَرُهُ	1.00	2026-10-26 08:08:28.431608+00	\N
1109	189	essay	مَا مَعْنَى كَلِمَةِ "رَأْسَهَا"؟	[]	أَعْلَاهَا أَوْ هَامَتُهَا	1.00	2026-10-26 08:08:28.431608+00	\N
1110	190	mc	مَا مَعْنَى الْفِقْهِ اصْطِلَاحًا؟	["مَعْرِفَةُ أُصُولِ الدِّينِ", "مَعْرِفَةُ الْأَحْكَامِ الشَّرْعِيَّةِ الْعَمَلِيَّةِ", "مَعْرِفَةُ تَارِيخِ الْإِسْلَامِ", "مَعْرِفَةُ اللُّغَةِ الْعَرَبِيَّةِ"]	B	1.00	2026-10-26 08:11:52.328014+00	\N
1111	190	mc	أَيُّ الْأَعْمَالِ الْآتِيَةِ مِنَ الْعِبَادَةِ الْخَاصَّةِ؟	["بِرُّ الْوَالِدَيْنِ", "مُسَاعَدَةُ الْجَارِ", "الصَّلَاةُ", "إِغَاثَةُ الْفَقِيرِ"]	C	1.00	2026-10-26 08:11:52.328014+00	\N
1112	190	mc	لِمَاذَا يَهْتَمُّ الْفُقَهَاءُ بِبَحْثِ الْعِبَادَاتِ؟	["لِأَنَّهَا مِنْ أَقَلِّ أُمُورِ الدِّينِ", "لِأَنَّهَا لَا تَحْتَاجُ إِلَى دَلِيلٍ", "لِأَنَّ الْعِبَادَةَ مِنْ أَهَمِّ أَغْرَاضِ خَلْقِ الْإِنْسَانِ", "لِأَنَّهَا تَتَعَلَّقُ بِالْمَالِ فَقَطْ"]	C	1.00	2026-10-26 08:11:52.328014+00	\N
1131	191	mc	أراد خالد ذبح دجاجة للأكل، فماذا يقول عند الذبح؟	["سبحان الله فقط", "بسم الله", "الحمد لله فقط", "الله أكبر فقط"]	B	1.00	2026-10-26 08:13:20.016219+00	\N
1113	190	mc	إِذَا اخْتَلَفَ الْفُقَهَاءُ فِي مَسْأَلَةٍ، فَمَاذَا يَنْبَغِي لِلْمُسْلِمِ أَنْ يَفْعَلَ؟	["أَنْ يَرْفُضَ جَمِيعَ الْأَقْوَالِ", "أَنْ يَخْتَارَ أَيَّ قَوْلٍ بِدُونِ نَظَرٍ", "أَنْ يَدْرُسَ الْأَدِلَّةَ وَيَحْتَرِمَ الْخِلَافَ الْمُعْتَبَرَ", "أَنْ يَتَّهِمَ كُلَّ مَنْ يُخَالِفُهُ"]	C	1.00	2026-10-26 08:11:52.328014+00	\N
1114	190	mc	مَا مَعْنَى التَّرْجِيحِ؟	["جَمْعُ الْأَحَادِيثِ فَقَطْ", "تَقْدِيمُ أَحَدِ الدَّلِيلَيْنِ عَلَى الْآخَرِ لِقُوَّةِ دَلِيلِهِ", "حِفْظُ الْقُرْآنِ الْكَرِيمِ", "دِرَاسَةُ تَارِيخِ الْإِسْلَامِ"]	B	1.00	2026-10-26 08:11:52.328014+00	\N
1115	190	mc	مَا الْحُكْمُ الشَّرْعِيُّ فِي تَغْسِيلِ الْمَيِّتِ الْمُسْلِمِ وَتَكْفِينِهِ وَالصَّلَاةِ عَلَيْهِ وَدَفْنِهِ؟	["فَرْضُ عَيْنٍ عَلَى كُلِّ مُسْلِمٍ", "فَرْضُ كِفَايَةٍ", "سُنَّةٌ مُؤَكَّدَةٌ فَقَطْ", "مُبَاحٌ"]	B	1.00	2026-10-26 08:11:52.328014+00	\N
1116	190	mc	بِأَيِّ شَيْءٍ يُسْتَحَبُّ أَنْ يُغْسَلَ الْمَيِّتُ فِي الْغَسْلَةِ الْأَخِيرَةِ؟	["بِالزَّيْتِ", "بِاللَّبَنِ", "بِالْكَافُورِ", "بِالْعَسَلِ"]	C	1.00	2026-10-26 08:11:52.328014+00	\N
1117	190	mc	مَا الْحِكْمَةُ مِنْ تَغْسِيلِ الْمَيِّتِ قَبْلَ تَكْفِينِهِ؟	["لِإِزَالَةِ الْأَوْسَاخِ وَتَنْظِيفِ الْجَسَدِ", "لِتَأْخِيرِ دَفْنِهِ بِلَا سَبَبٍ", "لِإِظْهَارِ الْمَالِ وَالثَّرْوَةِ", "لِتَغْيِيرِ هَيْئَةِ الْمَيِّتِ فَقَطْ"]	A	1.00	2026-10-26 08:11:52.328014+00	\N
1118	190	mc	مَا الْحُكْمُ فِي تَكْثِيرِ الْبَخُورِ لِلْكَفَنِ ثَلَاثَ مَرَّاتٍ؟	["يَجِبُ فِي كُلِّ حَالٍ", "لَا يَجُوزُ مُطْلَقًا", "يُسْتَحَبُّ تَثْلِيثُ الْإِجْمَارِ", "يَبْطُلُ الْكَفَنُ بِذَلِكَ"]	C	1.00	2026-10-26 08:11:52.328014+00	\N
1119	190	mc	ما الحكم الشرعي لمن امتنع عن أداء الزكاة بخلا مع اعترافه بوجوبها؟	["يكفر بمجرد امتناعه مطلقا", "يكون عاصيا ويجب إلزامه بأدائها", "تسقط عنه الزكاة", "تجب عليه زكاة الفطر فقط"]	B	1.00	2026-10-26 08:11:52.328014+00	\N
1120	190	mc	مَالِكٌ يَمْلِكُ مَالًا بَلَغَ النِّصَابَ، وَلَمْ يَمْضِ عَلَيْهِ حَوْلٌ كَامِلٌ. فَمَا الْحُكْمُ فِي زَكَاةِ هَذَا الْمَالِ؟	["تَجِبُ عَلَيْهِ الزَّكَاةُ فَوْرًا فِي جَمِيعِ الْأَمْوَالِ", "لَا تَجِبُ عَلَيْهِ الزَّكَاةُ بَعْدُ إِذَا كَانَ الْحَوْلُ شَرْطًا فِي هَذَا الْمَالِ", "تجب عليه زكاة بمقدار 10%", "يجب عليه إخراج نصف ماله"]	B	1.00	2026-10-26 08:11:52.328014+00	\N
1121	190	mc	إذا كان مقدار المال الذي تجب فيه الزكاة 80,000,000 روبية، فكم مقدار الزكاة بنسبة 2.5%؟	["800,000 روبية", "1,600,000 روبية", ". 2,000,000 روبية", ". 8,000,000 روبية"]	C	1.00	2026-10-26 08:11:52.328014+00	\N
1122	190	mc	ما حكم العقيقة؟	["فرض", "سنة مؤكدة", "مباح", "واجب"]	B	1.00	2026-10-26 08:11:52.328014+00	\N
1123	190	mc	ما حكم الأضحية في الإسلام؟	["فرض عين", "فرض كفاية", "سنة مؤكدة", "مباح"]	C	1.00	2026-10-26 08:11:52.328014+00	\N
1124	190	mc	في أي يوم يستحب ذبح العقيقة؟	["اليوم الثالث", "اليوم السابع", "اليوم العاشر", "اليوم الرابع عشر"]	B	1.00	2026-10-26 08:11:52.328014+00	\N
1125	190	essay	مَا مَعْنَى الْفِقْهِ لُغَةً وَاصْطِلَاحًا؟	[]	الفقه لغة الفهم , والفقه اصطلاحا العلم بالأحكام الشرعية العملية المكتسب من أدلتها التفصيلية	1.00	2026-10-26 08:11:52.328014+00	\N
1126	190	essay	مامعنى الترجيح اصطلاحا ....	[]	وَالتَّرْجِيحُ اصْطِلَاحًا، كَمَا عَرَّفَهُ عُلَمَاءُ أُصُولِ الْفِقْهِ، هُوَ تَقْدِيمُ أَحَدِ الْآرَاءِ الْمُتَعَارِضَةِ لِاخْتِصَاصِهِ بِقُوَّةِ الْأَدِلَّةِ	1.00	2026-10-26 08:11:52.328014+00	\N
1127	190	essay	اكتب الدعاء للميت !	[]	اللَّهُمَّ اغْفِرْ لَهُ، وَارْحَمْهُ، وَعَافِهِ، وَاعْفُ عَنْهُ، وَأَكْرِمْ نُزُلَهُ، وَوَسِّعْ مُدْخَلَهُ، وَاغْسِلْهُ بِالْمَاءِ وَالثَّلْجِ وَالْبَرَدِ، وَنَقِّهِ مِنْ خَطَايَاهُ كَمَا نَقَّيْتَ ـ وَفِي رِوَايَةٍ: كَمَا يُنَقَّى ـ الثَّوْبَ الْأَبْيَضَ مِنَ الدَّنَسِ، وَأَبْدِلْهُ دَارًا خَيْرًا مِنْ دَارِهِ، وَأَهْلًا خَيْرًا مِنْ أَهْلِهِ، وَزَوْجًا خَيْرًا مِنْ زَوْجِهِ، وَقِهِ الْقَبْرَ وَعَذَابَهُ.» \nإِلَّا إِذَا كَانَ الْمَيِّتُ طِفْلًا، فَالدُّعَاءُ كَمَا يَلِي: \n«اللَّهُمَّ اجْعَلْهُ لَنَا سَلَفًا، وَفَرَطًا، وَأَجْرًا	1.00	2026-10-26 08:11:52.328014+00	\N
1128	190	essay	اذْكُرِ الْأَصْنَافَ الثَّمَانِيَةَ الَّتِي ذَكَرَهَا اللهُ تَعَالَى فِي مَصَارِفِ الزَّكَاةِ.	[]	الْفُقَرَاءُ - الْمَسَاكِينُ - الْعَامِلُونَ عَلَيْهَا - الْمُؤَلَّفَةُ قُلُوبُهُمْ - فِي الرِّقَابِ - الْغَارِمُونَ - فِي سَبِيلِ اللهِ - ابْنُ السَّبِيلِ	1.00	2026-10-26 08:11:52.328014+00	\N
1129	190	essay	اذكر شروط صحة الأضحية.	[]	أَنْ تَكُونَ مِنَ الْأَنْعَامِ، كَالْإِبِلِ وَالْبَقَرِ وَالْغَنَمِ - أَنْ تَبْلُغَ السِّنَّ الْمُعْتَبَرَ شَرْعًا.- أَنْ تَكُونَ سَلِيمَةً مِنَ الْعُيُوبِ الْمَانِعَةِ مِنَ الْإِجْزَاءِ.- أَنْ تُذْبَحَ فِي الْوَقْتِ الْمَشْرُوعِ لِلْأُضْحِيَّةِ	1.00	2026-10-26 08:11:52.328014+00	\N
1130	191	mc	ما المقصود بالذبح الشرعي؟	["قطع الحلقوم والمريء مع استيفاء شروط الذبح", "قتل الحيوان بأي وسيلة", "ضرب الحيوان حتى يموت", "ترك الحيوان بلا طعام"]	A	1.00	2026-10-26 08:13:20.016219+00	\N
1132	191	mc	ما المقصود بالعقيقة؟	["ذبيحة تُذبح عند بناء البيت", "ذبيحة تُذبح شكرًا لله بمناسبة المولود", "ذبيحة تُذبح في عيد الأضحى فقط", "ذبيحة تُذبح عند السفر"]	B	1.00	2026-10-26 08:13:20.016219+00	\N
1133	191	mc	وُلد طفل يوم الاثنين، فما اليوم المستحب للعقيقة إذا تيسر؟	["اليوم الثالث", "اليوم الخامس", "اليوم السابع", "اليوم العاشر"]	C	1.00	2026-10-26 08:13:20.016219+00	\N
1134	191	mc	ما المقصود بالأضحية؟	["ذبحٌ يُتقرب به إلى الله في أيام النحر", "ذبحٌ عند ولادة الطفل", "ذبحٌ في كل يوم جمعة", "ذبحٌ عند السفر"]	A	1.00	2026-10-26 08:13:20.016219+00	\N
1135	191	mc	متى يبدأ وقت ذبح الأضحية؟	["قبل صلاة العيد", "بعد صلاة عيد الأضحى", "في ليلة العيد", "في شهر رمضان"]	B	1.00	2026-10-26 08:13:20.016219+00	\N
1136	191	mc	ما المقصود بالبيع في الفقه الإسلامي؟	["مبادلة مال بمال على وجه مخصوص", "إعطاء المال بلا مقابل", "اقتراض المال فقط", "التبرع بالطعام"]	A	1.00	2026-10-26 08:13:20.016219+00	\N
1137	191	mc	ما حكم البيع في الأصل إذا استوفى شروطه؟	["حرام دائمًا", "مكروه دائمًا", "مباح", "واجب في كل حال"]	C	1.00	2026-10-26 08:13:20.016219+00	\N
1138	191	mc	ما المقصود بالقِراض أو المضاربة؟	["شراكة يقدم فيها طرف المال والآخر العمل", "بيع سلعة بثمن مؤجل فقط", "إعارة بيت بلا أجرة", "قرض بزيادة مشروطة"]	A	1.00	2026-10-26 08:13:20.016219+00	\N
1139	191	mc	اتفق شريكان على أن يكون الربح نصفين إذا تحقق. ما حكم هذا الاتفاق؟	["لا يجوز مطلقًا", "يجوز إذا كانت النسبة معلومة ومتفقًا عليها", "يجب أن يأخذ صاحب المال كل الربح", "يجب أن يكون الربح مبلغًا ثابتًا"]	B	1.00	2026-10-26 08:13:20.016219+00	\N
1140	191	mc	ما حكم الربا في الإسلام؟	["مباح", "مستحب", "مكروه فقط", "حرام"]	D	1.00	2026-10-26 08:13:20.016219+00	\N
1141	191	mc	ما الدليل القرآني على تحريم الربا؟	["﴿وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا﴾", "﴿فَصَلِّ لِرَبِّكَ وَانْحَرْ﴾", "﴿إِنَّ مَعَ الْعُسْرِ يُسْرًا﴾", "﴿اقْرَأْ بِاسْمِ رَبِّكَ﴾"]	A	1.00	2026-10-26 08:13:20.016219+00	\N
1142	191	mc	أيُّ حديث يذكر بعض الأصناف التي يجري فيها ربا الفضل؟	["«الذَّهَبُ بِالذَّهَبِ، وَالْفِضَّةُ بِالْفِضَّةِ...»", "«إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ»", "«الدِّينُ النَّصِيحَةُ»", "«يَسِّرُوا وَلَا تُعَسِّرُوا»"]	A	1.00	2026-10-26 08:13:20.016219+00	\N
1143	191	mc	مَا حُكْمُ الْعَارِيَّةِ؟	["وَاجِبَةٌ فِي كُلِّ حَالٍ", "مُحَرَّمَةٌ", "مَنْدُوبَةٌ وَمَشْرُوعَةٌ", "مَكْرُوهَةٌ مُطْلَقًا"]	C	1.00	2026-10-26 08:13:20.016219+00	\N
1144	191	mc	مَا الشَّرْطُ فِي الشَّيْءِ الْمُعَارِ؟	["أَنْ يَكُونَ مَمْنُوعَ الِانْتِفَاعِ بِهِ", "أَنْ يَفْنَى بِمُجَرَّدِ اسْتِعْمَالِهِ", "أَنْ يَكُونَ مِمَّا يُنْتَفَعُ بِهِ مَعَ بَقَاءِ عَيْنِهِ", "أَنْ يَكُونَ مَمْلُوكًا لِلْمُسْتَعِيرِ"]	C	1.00	2026-10-26 08:13:20.016219+00	\N
1145	191	essay	لماذا يجب أن يكون الذبح بطريقة حسنة؟	[]	لأن الإسلام يأمر بالإحسان إلى كل شيء، ومن الإحسان إراحة الحيوان وتقليل ألمه عند الذبح.	1.00	2026-10-26 08:13:20.016219+00	\N
1146	191	essay	كم شاة تُذبح عن المولود الذكر والأنثى؟	[]	بحسب الحديث المذكور في المادة، يُذبح عن الغلام شاتان متكافئتان، وعن الجارية شاة واحدة.	1.00	2026-10-26 08:13:20.016219+00	\N
1147	191	essay	ما تعريف الأضحية اصطلاحًا؟	[]	الأضحية هي ذبح حيوان من الأنعام في يوم النحر وأيام التشريق بنية التقرب إلى الله تعالى وشكره على نعمه.	1.00	2026-10-26 08:13:20.016219+00	\N
1148	191	essay	متى يبدأ وقت ذبح الأضحية ومتى ينتهي بحسب المادة؟	[]	يبدأ بعد صلاة عيد الأضحى، ويستمر إلى عصر اليوم الثالث من أيام التشريق بحسب ما ورد في المادة.	1.00	2026-10-26 08:13:20.016219+00	\N
1149	191	essay	عَرِّفِ الْقِرَاضَ الْمُطْلَقَ وا الْقِرَاضَ الْمُقَيَّدَ،؟	[]	الْقِرَاضُ الْمُطْلَقُ هُوَ أَنْ يُسَلِّمَ صَاحِبُ الْمَالِ مَالَهُ إِلَى الْعَامِلِ مِنْ غَيْرِ تَحْدِيدٍ لِنَوْعِ الْعَمَلِ أَوْ مَكَانِهِ أَوْ زَمَانِهِ أَوْ صِفَتِهِ. وا الْقِرَاضُ الْمُقَيَّدُ هُوَ الَّذِي يَشْتَرِطُ فِيهِ صَاحِبُ الْمَالِ عَلَى الْعَامِلِ شُرُوطًا مُعَيَّنَةً.	1.00	2026-10-26 08:13:20.016219+00	\N
1150	192	mc	ما تعريف الجناية في الاصطلاح الشرعي؟	["التعدّي على النفس أو المال أو العرض", "عبادة مالية", "عقد بين طرفين", "بيع وشراء"]	A	1.00	2026-10-26 08:13:28.787718+00	\N
1151	192	mc	يُشترط في قتل العمد وجود…	["القصد والآلة المميتة", "الخطأ في الفعل", "الجهل بالحكم", "شاهد واحد"]	A	1.00	2026-10-26 08:13:28.787718+00	\N
1152	192	mc	حدّ السرقة هو…	["الجلد", "الرجم", "التعزير", "قطع اليد"]	D	1.00	2026-10-26 08:13:28.787718+00	\N
1153	192	mc	حدّ الزنا لغير المحصن هو…	["الرجم", "الجلد مئة جلدة", "السجن", "الغرامة"]	B	1.00	2026-10-26 08:13:28.787718+00	\N
1154	192	mc	القتل خطأً تجب فيه…	["التعزير", "الجلد", "القصاص", "الدية والكفارة"]	D	1.00	2026-10-26 08:13:28.787718+00	\N
1155	192	mc	أيٌّ مما يلي يعكس حكمة تشريع القصاص؟	["الإيذاء", "زيادة العقوبة", "تحقيق العدل وردع الجاني", "الانتقام"]	C	1.00	2026-10-26 08:13:28.787718+00	\N
1156	192	mc	حدّ الزنا للمحصن هو…	["السجن", "الجلد", "الرجم حتى الموت", "التعزير"]	C	1.00	2026-10-26 08:13:28.787718+00	\N
1157	192	mc	قُتل شخصٌ على يد رجلٍ ضربه بعصا دون قصد القتل. ما الحكم؟	["القصاص", "الدية والكفارة", "الرجم", "الجلد"]	B	1.00	2026-10-26 08:13:28.787718+00	\N
1158	192	mc	تُوُفيَ رجلٌ بعد شجارٍ، وأثبتَ القاضي أنّ القاتل تعمّد الضرب بسلاح قاتل. ما الحكم الشرعي؟	["الدية", "القصاص", "الكفارة", "التعزير"]	B	1.00	2026-10-26 08:13:28.787718+00	\N
1159	192	mc	امرأةٌ اعترفت بالزِّنا مرةً واحدة فقط، فماذا يفعل القاضي؟	["يقيم الحدّ عليها", "يطلب منها تكرار الاعتراف أربع مرات", "يطردها من المحكمة", "يعاقبها بالسجن فقط"]	B	1.00	2026-10-26 08:13:28.787718+00	\N
1160	192	mc	قذف رجلٌ امرأةً صالحةً، ثم تاب وطلب العفو، فما الواجب؟	["يُسجن بدل الحدّ", "يُغرّم مالاً", "يسقط الحدّ بالتوبة", "يجب عليه الحدّ ثمانون جلدة"]	D	1.00	2026-10-26 08:13:28.787718+00	\N
1161	192	mc	شاهد رأى رجلاً وامرأة في خلوة، فاتهمهما بالزِّنا، فهل يعدُّ ذلك بيّنة؟	["يُجلد الشاهد", "يقام الحدّ على المرأة فقط", "نعم، هو زنا ثابت", "لا، لأن الخلوة ليست دليلاً"]	D	1.00	2026-10-26 08:13:28.787718+00	\N
1162	192	mc	مَا الْمُرَادُ بِالْحُدُودِ فِي الْفِقْهِ الْإِسْلَامِيِّ	["الْعُقُوبَاتُ الَّتِي يَخْتَارُهَا الْمُجْرِمُ", "الْعِبَادَاتُ الْمَسْنُونَةُ", ". الْمُعَامَلَاتُ الْمَالِيَّةُ", "عُقُوبَاتٌ شَرْعِيَّةٌ مُحَدَّدَةٌ لِجَرَائِمَ مُعَيَّنَةٍ"]	D	1.00	2026-10-26 08:13:28.787718+00	\N
1163	192	mc	مَا الْمُرَادُ بِالْقَذْفِ فِي أَحْكَامِ الْحُدُودِ	["أَدَاءُ الزَّكَاةِ", "اتِّهَامُ شَخْصٍ بِالزِّنَا مِنْ غَيْرِ بَيِّنَةٍ مُعْتَبَرَةٍ", "بَيْعُ السِّلْعَةِ فِي السُّوقِ", "السَّفَرُ لِطَلَبِ الْعِلْمِ"]	B	1.00	2026-10-26 08:13:28.787718+00	\N
1164	192	mc	مَتَى يُنْظَرُ فِي إِقَامَةِ حَدِّ السَّرِقَةِ فِي الْفِقْهِ الْإِسْلَامِيِّ	["عِنْدَ كُلِّ أَخْذٍ لِلْمَالِ، وَلَوْ كَانَ مَزْحًا", "عِنْدَ وُجُودِ الشُّبْهَةِ دُونَ تَحَقُّقٍ", "عِنْدَ تَحَقُّقِ الشُّرُوطِ الشَّرْعِيَّةِ وَثُبُوتِ الْجَرِيمَةِ بِالطُّرُقِ الْمُعْتَبَرَةِ", "عِنْدَ اتِّهَامِ الشَّخْصِ فَقَطْ"]	C	1.00	2026-10-26 08:13:28.787718+00	\N
1165	192	essay	تكلم عن أقسام الجناية!	[]	جنايات الحدود, جنايات القصاص والدية, جنايات التعزير	1.00	2026-10-26 08:13:28.787718+00	\N
1166	192	essay	متى يجوز القتل للحاكم	[]	الثيب الزاني (المحصن)، والنفس بالنفس (القصاص من القاتل العمد)، والتارك لدينه المفارق للجماعة (المرتد)، بالإضافة إلى المحاربين (قطاع الطرق) والبغاة إذا لم يندفع شرهم إلا بالقتل.	1.00	2026-10-26 08:13:28.787718+00	\N
1167	192	essay	زهيرة امرأة متزوجة بعد مرور السنة مات عنها زَوْجَهَا. ذَاتِ يَوْمَ لَقَيْتُ رَجُلًا وَرَاوَدُهَا ثُمَّ زَنَا بِها. هل يجوز للحاكم أن يقتل زهيرة؟ وما الدليل على ذلك؟	[]	يجوز للحاكم (بل يجب عليه بعد ثبوت الجريمة شرعاً) أن يقتل زهيرة رجماً حتى الموت؛ لأنها "ثيب" (امرأة سبق لها الزواج الصحيح)، وعقوبة الزاني المحصن في الإسلام هي الرجم.	1.00	2026-10-26 08:13:28.787718+00	\N
1168	192	essay	اذكر الحدود!	[]	الحدود السبعة المشهورة هي: حد الزنا، حد القذف، حد الشرب (المسكر)، حد السرقة، حد الحرابة (قطع الطريق)، حد الردة، وحد البغي.	1.00	2026-10-26 08:13:28.787718+00	\N
1169	192	essay	زهيرة؟ وما الدليل على ذلك؟	[]	يجوز للحاكم قتُلها رجماً لأنها زنت بعد أن أصبحت "ثيباً" (امرأة متزوجة أو سبق لها الزواج).	1.00	2026-10-26 08:13:28.787718+00	\N
1190	194	mc	سجود الشكر يُشرع غالبًا عند:	["حصول نعمة جديدة أو اندفاع نقمة", "قراءة كل صفحة من القرآن", "نسيان التشهد", "دخول وقت الصلاة"]	A	1.00	2026-10-26 08:15:49.081214+00	\N
1191	194	mc	عاد أحد الطلاب من المستشفى بعد شفائه من مرض شديد، فسجد شكرًا لله تعالى. هذا السجود يسمى:	["سجود السهو", "سجود الشكر", "سجود التلاوة", "سجود الصلاة"]	B	1.00	2026-10-26 08:15:49.081214+00	\N
1192	194	mc	ما الفرق الأساسي بين سجود التلاوة وسجود الشكر؟	["سجود التلاوة بسبب آية السجدة، وسجود الشكر بسبب نعمة أو اندفاع نقمة", "كلاهما بسبب نسيان الصلاة", "سجود الشكر لا علاقة له بالنعمة", "سجود التلاوة يكون عند حدوث المصيبة فقط"]	A	1.00	2026-10-26 08:15:49.081214+00	\N
1193	194	mc	قال المعلم لطلابه: «نجاحكم في الامتحان نعمة من الله». أراد أحد الطلاب أن يسجد لله شكرًا. فما النية المناسبة؟	["نية سجود التلاوة", "نية سجود السهو", "نية سجود الشكر", "نية صلاة الجنازة"]	C	1.00	2026-10-26 08:15:49.081214+00	\N
1194	194	mc	حصلت سارة على خبر نجاحها في مسابقة علمية، ففرحت وسجدت لله تعالى شكرًا. ما السبب الصحيح لهذا السجود؟	["لأنها قرأت آية سجدة", "لأنها نسيت ركعة", "لأنها حصلت على نعمة تسرها", "لأنها تريد زيادة عدد ركعات الصلاة"]	C	1.00	2026-10-26 08:15:49.081214+00	\N
1195	194	mc	قرأ أحمد آيةً فيها سجدة تلاوة، فماذا يُشرع له أن يفعل بعد قراءة آية السجدة؟	["يركع مباشرةً", "يسجد سجود التلاوة", "يجلس للاستراحة", "يقطع القراءة ولا يفعل شيئًا"]	B	1.00	2026-10-26 08:15:49.081214+00	\N
1196	194	mc	سجود التلاوة هو السجود الذي يُشرع للمسلم عند:	["سماع خبرٍ سارّ", "قراءة أو سماع آيةٍ من آيات السجدة", "الانتهاء من الصلاة", "نسيان التشهد"]	B	1.00	2026-10-26 08:15:49.081214+00	\N
1197	194	mc	أثناء قراءة القرآن في المسجد، سمع خالد الإمام يقرأ آية سجدة فسجد الإمام. ماذا ينبغي لخالد أن يفعل إذا كان مقتديًا بالإمام؟	["يبقى واقفًا", "يسجد مع الإمام", "يخرج من المسجد", "يركع بدل السجود"]	B	1.00	2026-10-26 08:15:49.081214+00	\N
1198	194	mc	قرأت فاطمة آية السجدة وهي جالسة خارج الصلاة. أرادت أن تؤدي سجود التلاوة، فماذا تفعل؟	["تقوم ثم تصلي ركعتين", "تسجد سجدةً واحدةً بنية سجود التلاوة", "تصلي أربع ركعات", "لا يجوز لها السجود إلا داخل الصلاة"]	B	1.00	2026-10-26 08:15:49.081214+00	\N
1199	194	mc	أيُّ العبارات الآتية تصف سجود التلاوة وصفًا صحيحًا؟	["هو أربع سجدات متتابعة", "هو سجود واحد عند آية السجدة", "هو سجود واجب بعد كل سورة", "هو سجود خاص بصلاة الجمعة"]	B	1.00	2026-10-26 08:15:49.081214+00	\N
1200	194	mc	مَا مَعْنَى الصِّيَامِ لُغَةً؟	["الْإِمْسَاكُ عَنِ الشَّيْءِ", "الْأَكْلُ وَالشُّرْبُ", "الصَّلَاةُ فِي الْمَسْجِدِ", "السَّفَرُ"]	A	1.00	2026-10-26 08:15:49.081214+00	\N
1201	194	mc	أَيُّ صِيَامٍ مِنَ الْآتِي فَرْضٌ عَلَى الْمُسْلِمِينَ؟	["صِيَامُ يَوْمِ الْجُمُعَةِ", "صِيَامُ عَاشُورَاءَ", "صِيَامُ رَمَضَانَ", "صِيَامُ دَاوُدَ"]	C	1.00	2026-10-26 08:15:49.081214+00	\N
1202	194	mc	مَا حُكْمُ صِيَامِ النَّذْرِ إِذَا نَذَرَ الشَّخْصُ الطَّاعَةَ؟	["مُبَاحٌ فَقَطْ", "مَكْرُوهٌ", "مَنْدُوبٌ فَقَطْ", "وَاجِبٌ"]	D	1.00	2026-10-26 08:15:49.081214+00	\N
1203	194	mc	فِي أَيِّ يَوْمٍ مِنْ ذِي الْحِجَّةِ يَكُونُ صِيَامُ عَرَفَةَ؟	["السَّابِعِ", "الثَّامِنِ", "التَّاسِعِ", "الْعَاشِرِ"]	C	1.00	2026-10-26 08:15:49.081214+00	\N
1204	194	mc	كَيْفَ يَكُونُ صِيَامُ دَاوُدَ عَلَيْهِ السَّلَامُ؟	["صِيَامُ كُلِّ يَوْمٍ", "صِيَامُ يَوْمٍ وَإِفْطَارُ يَوْمٍ", "صِيَامُ يَوْمَيِ الِاثْنَيْنِ وَالْخَمِيسِ فَقَطْ", "صِيَامُ ثَلَاثَةِ أَيَّامٍ كُلَّ شَهْرٍ"]	B	1.00	2026-10-26 08:15:49.081214+00	\N
1205	194	essay	كم موضعًا لآيات السجدة في القرآن حسب المادة؟	[]	في القرآن خمسة عشر موضعًا لآيات السجدة.	1.00	2026-10-26 08:15:49.081214+00	\N
1206	194	essay	متى يُشرع سجود التلاوة؟	[]	عند قراءة آية من آيات السجدة أو سماعها.	1.00	2026-10-26 08:15:49.081214+00	\N
1207	194	essay	اذكر ثلاثة أمثلة للصيام الواجب.	[]	صيام رمضان، وصيام النذر، وصيام الكفارة.	1.00	2026-10-26 08:15:49.081214+00	\N
1208	194	essay	اذكر ثلاثًا من السنن في شهر رمضان.	[]	صلاة التراويح، وقراءة القرآن، والاعتكاف في المسجد.	1.00	2026-10-26 08:15:49.081214+00	\N
1209	194	essay	ماذا نفعل إذا تعذرت رؤية الهلال بسبب الغيوم؟	[]	نُكمل شهر شعبان ثلاثين يومًا.	1.00	2026-10-26 08:15:49.081214+00	\N
1250	197	mc	إختر من الخيارات الآتية مايدل على الصفات الحديث النبوي !	["ينسب إلى الله معنى", "لفظه من النبي", "من كلام الله لعباده", "أكثر موضوعه يتعلق بالأمل والرجاء"]	B	1.00	2026-10-26 08:22:18.96254+00	\N
1251	197	mc	إختر الذي أكثر إستخداما لقول صحابة النبي صلى الله عليه وسلم	["الأثر", "الخبر", "الحديث القدسي", "الحديث"]	A	1.00	2026-10-26 08:22:18.96254+00	\N
1252	197	mc	ما معنى السنة لغة	["الجديد", "السيرة والطريقة", "النبأ", "بقية الشيء"]	B	1.00	2026-10-26 08:22:18.96254+00	\N
1253	197	mc	من هو الراوي ؟	["من يشرح معنى الحديث", "من يروى أو يخبر حديثا", "من يحفظ الحديث دون أن يرويه", "من يكتب الحديث فقط"]	B	1.00	2026-10-26 08:22:18.96254+00	\N
1254	197	mc	ما المراد ب" أخرجه الجماعة "	["رواه راوٍ واحد من رواة الحديث", "رواه اثنان من رواة الحديث.", "رواه كثير من رواة الحديث", "رواه أحد الصحابة فقط."]	C	1.00	2026-10-26 08:22:18.96254+00	\N
1255	197	mc	ما المراد ب" مخرج الحديث "	["من أخرج الحديث من جهة الصحابي", "من شرح الحديث وبيّن معناه.", "من حفظ الحديث دون أن يرويه", "من جمع الأحاديث ورتبها حسب موضوعاتها."]	A	1.00	2026-10-26 08:22:18.96254+00	\N
1256	197	mc	ما المراد ب " متفق عليه "	["رواه البخاري والمسلم", "رواه الإمام الترمذي والإمام النسائي.", "رواه الإمام أبو داود والإمام ابن ماجه.", "رواه الإمام أحمد والإمام مالك"]	A	1.00	2026-10-26 08:22:18.96254+00	\N
1257	197	mc	ما هي السنة القولية	["عبارة عن الأحاديث المحكية بالقول عن رسول الله ص.م", "عِبَارَةٌ عَنْ أَفْعَالِ الرَّسُولِ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ.", "عِبَارَةٌ عَنْ صِفَاتِ الرَّسُولِ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ الْخَلْقِيَّةِ وَالْخُلُقِيَّةِ.", "عِبَارَةٌ عَمَّا أَقَرَّهُ الرَّسُولُ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ مِنْ أَقْوَالِ الصَّحَابَةِ وَأَفْعَالِهِمْ."]	A	1.00	2026-10-26 08:22:18.96254+00	\N
1258	197	mc	من علامة السنة الفعلية هي.....	["سَمِعْتُهُ يَقُولُ أَوْ حَدَّثَنِي.", "كَانَ أَوْ يَكُونُ، وَرَأَيْتُ أَوْ رَأَيْنَا.", "أَقَرَّهُ النَّبِيُّ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ وَلَمْ يُنْكِرْهُ.", "قَالَ رَسُولُ اللهِ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ."]	B	1.00	2026-10-26 08:22:18.96254+00	\N
1259	197	mc	عن عبد الله بن مسعود عن النبى ص.م قال : لا يدخل الجنة من كان في قلبه مثقال ذرة من كِبْرٍ، ما نوع هذه السنة ؟	["السُّنَّةُ الْفِعْلِيَّةُ.", "السُّنَّةُ التَّقْرِيرِيَّةُ.", "السنة القولية", "السنة الهمية"]	C	1.00	2026-10-26 08:22:18.96254+00	\N
1260	197	mc	ينقسم السنة حسب صدورها عن النبي إلى.......	["5", "4", "3", "2"]	B	1.00	2026-10-26 08:22:18.96254+00	\N
1261	197	mc	ما المراد بالحديث المتواتر ؟	["مارواه عدد كثير تحيل العادة تواطؤهم على الكذب", "مَا رَوَاهُ عَدَدٌ قَلِيلٌ مِنَ الرُّوَاةِ فِي كُلِّ طَبَقَةٍ.", "مَا انْفَرَدَ بِرِوَايَتِهِ رَاوٍ وَاحِدٌ فِي طَبَقَةٍ مِنَ الطَّبَقَاتِ.", "مَا كَانَ فِي سَنَدِهِ رَاوٍ ضَعِيفُ الْحِفْظِ وَالضَّبْطِ."]	A	1.00	2026-10-26 08:22:18.96254+00	\N
1262	197	mc	الضعيف والموضوع من تقسيم الحديث ...........	["الْمَرْدُودِ.", "الْمَقْبُولِ.", "الْمُتَوَاتِرِ.", "الْحَسَنِ."]	A	1.00	2026-10-26 08:22:18.96254+00	\N
1263	197	mc	مايرويه شخص واحد يسمى ب......	["الْحَدِيثِ الْمُتَوَاتِرِ.", "الْحَدِيثِ الْآحَادِ.", "الْحَدِيثِ الْمَشْهُورِ.", "لْحَدِيثِ الْمَوْضُوعِ"]	B	1.00	2026-10-26 08:22:18.96254+00	\N
1264	197	mc	ما معنى حديث الحسن ؟	["مَا اتَّصَلَ سَنَدُهُ بِنَقْلِ الْعَدْلِ التَّامِّ الضَّبْطِ عَنْ مِثْلِهِ إِلَى مُنْتَهَاهُ مِنْ غَيْرِ شُذُوذٍ وَلَا عِلَّةٍ.", "مَا اتَّصَلَ سَنَدُهُ بِنَقْلِ الْعَدْلِ الَّذِي خَفَّ ضَبْطُهُ عَنْ مِثْلِهِ إِلَى مُنْتَهَاهُ مِنْ غَيْرِ شُذُوذٍ وَلَا عِلَّةٍ.", "مَا انْقَطَعَ سَنَدُهُ وَفَقَدَ شَرْطًا مِنْ شُرُوطِ الْحَدِيثِ الْمَقْبُولِ.", "مَا نُسِبَ إِلَى رَسُولِ اللهِ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ كَذِبًا وَاخْتِلَاقًا."]	B	1.00	2026-10-26 08:22:18.96254+00	\N
1265	197	essay	ما معنى من حديث القدسي !	[]	الحديث الذي يضيفه النبي صلى الله عليه وسلم إلى ربه جل وعلى	1.00	2026-10-26 08:22:18.96254+00	\N
1266	197	essay	ما معنى السند إصطلاحا	[]	سلسلة الرجال الموصلة للمتن	1.00	2026-10-26 08:22:18.96254+00	\N
1267	197	essay	أذكر شروط الراوي 1	[]	عادلا, مسلما، بالغا أي مميزا ، سالما من أسباب الفسق وخوارم المروءة	1.00	2026-10-26 08:22:18.96254+00	\N
1268	197	essay	ما هي السنة الهمسة ؟	[]	ما أراد النبي بفعله ولم يعمله	1.00	2026-10-26 08:22:18.96254+00	\N
1269	197	essay	قوله صلى الله عليه وسلم : إنما الأعمال بالنيات ( متفق عليه ), ما نوع هذه السنة ؟	[]	السنة القولية	1.00	2026-10-26 08:22:18.96254+00	\N
1270	198	mc	ما معنى العقيدة في اللغة؟	["العمل", "الربط والإحكام", "القراءة", "الكتابة"]	B	1.00	2026-10-26 08:24:03.621863+00	\N
1271	198	mc	ما معنى العقيدة في الاصطلاح؟	["الْأَحْكَامُ الْمُتَعَلِّقَةُ بِأَفْعَالِ الْمُكَلَّفِينَ", "اعتقاد جازم مطابق للواقع لا يقبل الشك أو الظن.", "الْأَخْلَاقُ الْحَسَنَةُ فِي التَّعَامُلِ مَعَ النَّاسِ", "الْعِبَادَاتُ الْبَدَنِيَّةُ وَالْمَالِيَّةُ"]	C	1.00	2026-10-26 08:24:03.621863+00	\N
1272	198	mc	ما المصدران الأساسيان للعقيدة الإسلامية؟	["القرآن الكريم والسنة النبوي", "العادات والتقال", "العقل والتجربة فقط", "الشعر والأدب"]	A	1.00	2026-10-26 08:24:03.621863+00	\N
1283	198	mc	أَيُّ مَا يَأْتِي مِنْ شُرُوطِ كَلِمَةِ التَّوْحِيدِ «لَا إِلَهَ إِلَّا اللهُ»؟	["الْجَهْلُ بِمَعْنَاهَا", "الشَّكُّ فِي مَعْنَاهَا", "الْإِخْلَاصُ فِي قَوْلِهَا وَالْعَمَلِ بِمُقْتَضَاهَا", "قَوْلُهَا بِاللِّسَانِ مَعَ رَفْضِ مَعْنَاهَا"]	C	1.00	2026-10-26 08:24:03.621863+00	\N
1284	198	mc	الْمَوْقِفُ الصَّحِيحُ مِنْ أَسْمَاءِ اللهِ وَصِفَاتِهِ	["تَشْبِيهُ صِفَاتِ اللهِ بِصِفَاتِ الْمَخْلُوقِينَ", "إِثْبَاتُ مَا أَثْبَتَهُ اللهُ لِنَفْسِهِ وَمَا أَثْبَتَهُ لَهُ رَسُولُهُ، مِنْ غَيْرِ تَحْرِيفٍ وَلَا تَعْطِيلٍ وَلَا تَكْيِيفٍ وَلَا تَمْثِيلٍ", "إِنْكَارُ جَمِيعِ صِفَاتِ اللهِ", "اخْتِرَاعُ أَسْمَاءٍ جَدِيدَةٍ لِلَّهِ بِدُونِ دَلِيلٍ"]	B	1.00	2026-10-26 08:24:03.621863+00	\N
1285	198	essay	اُذْكُرْ أَسْبَابَ زِيَادَةِ اْلإِيْمَانِ وَنُقْصَانه!	[]	أسباب زيادة الإيمان : العلم، العبادة، الذكر، التفكر، المشاركة في الأعمال الخيرية الجماعية. وأسباب نقص أنه هي: الجهل، الغفلة، المعصية، الشيطان، الدنيا، ببناء السوء.	1.00	2026-10-26 08:24:03.621863+00	\N
1286	198	essay	مَا مَعْنَى اْلإِيْمَانِ بِاللهِ؟	[]	الإيمان بالله هو الاعتقاد الجازم بوجود الله سبحانه وتعالى زربوبيته وألوهيته وأسمائه وصفاته.	1.00	2026-10-26 08:24:03.621863+00	\N
1287	198	essay	ما المراد بالإيمان بتوحيد الله؟	[]	هو اعتراف أن الله واحد في ذاته ليس له مثيل ولا نظير.	1.00	2026-10-26 08:24:03.621863+00	\N
1288	198	essay	مَا مَعْنَى كَلِمَةِ التَّوْحِيْدِ لُغَةً وَاصْطِلَاحًا؟	[]	لغة جعله واحدا. واصطلاحا هو إفراز الله تعالى بما يختص به من الربوبية والألوهية والأسماء والصفات.	1.00	2026-10-26 08:24:03.621863+00	\N
1289	198	essay	من الأدلة على وجود الله دليل الفطرة، اذكر دليلا منها!	[]	ما من مولود إلا يولد على الفطرة، فأبوه يهود أنه أو يمجسانه أو ينصرانه.	1.00	2026-10-26 08:24:03.621863+00	\N
1290	199	mc	تعريف علم الكلام عند الإيجي هو	["عِلْمٌ يَبْحَثُ فِي أَخْبَارِ الْأَنْبِيَاءِ فَقَطْ", ". عِلْمٌ يُقْتَدَرُ مَعَهُ عَلَى إِثْبَاتِ الْعَقَائِدِ الدِّينِيَّةِ بِإِيرَادِ الْحُجَجِ وَدَفْعِ الشُّبَهِ", "عِلْمٌ يَبْحَثُ فِي أَحْكَامِ الْعِبَادَاتِ", "عِلْمٌ يَبْحَثُ فِي قَوَاعِدِ اللُّغَةِ الْعَرَبِيَّةِ"]	B	1.00	2026-10-26 08:27:07.343269+00	\N
1291	199	mc	فائدة معرفة علم الكلام هي	["مَعْرِفَةُ قَوَاعِدِ اللُّغَةِ الْعَرَبِيَّةِ وَفَهْمُ أَسَالِيبِهَا وَتَرَاكِيبِهَا.", "مَعْرِفَةُ الْأَحْكَامِ الشَّرْعِيَّةِ الْعَمَلِيَّةِ الْمُكْتَسَبَةِ مِنْ أَدِلَّتِهَا التَّفْصِيلِيَّةِ.", "الْقُدْرَةُ عَلَى فَهْمِ الْأَحْكَامِ الْفِقْهِيَّةِ وَتَطْبِيقِهَا فِي الْحَيَاةِ الْيَوْمِيَّةِ.", "تَقْوِيَةُ الْعَقِيدَةِ الْإِسْلَامِيَّةِ وَإِثْبَاتُ الْعَقَائِدِ الدِّينِيَّةِ بِالْأَدِلَّةِ الْعَقْلِيَّةِ وَالنَّقْلِيَّةِ."]	D	1.00	2026-10-26 08:27:07.343269+00	\N
1292	199	mc	كلمة "المرجئة" من الناحية اللغوية اسم الفاعل من الإرجاء. و الإرجاء له معنيان هما	["التَّأْخِيرُ وَإِعْطَاءُ الرَّجَاءِ", ".\\r\\nج. الْإِثْبَاتُ وَالْإِنْكَارُ.", "الْإِيمَانُ وَالْكُفْرُ", ". التَّقْدِيمُ وَالتَّعْجِيلُ"]	A	1.00	2026-10-26 08:27:07.343269+00	\N
1293	199	mc	نشأة فرقة الخوارج بسبب	["وَفَاةِ الْإِمَامِ الْبُخَارِيِّ", "التَّحْكِيمِ بَيْنَ عَلِيِّ بْنِ أَبِي طَالِبٍ وَمُعَاوِيَةَ بْنِ أَبِي سُفْيَانَ", "فَتْحِ مَكَّةَ", "هِجْرَةِ النَّبِيِّ إِلَى الْمَدِينَةِ"]	B	1.00	2026-10-26 08:27:07.343269+00	\N
1294	199	mc	من معتقدات الخوارج	["كفر مرتكب الكبيرة", "الإيمان لايز يد ولا ينقص", "أن الله يخلق أفعال العباد", "أن الله لا ويخلق أفعال العباد"]	A	1.00	2026-10-26 08:27:07.343269+00	\N
1295	199	mc	تَرَى الْقَدَرِيَّةُ أَنَّ الْإِنْسَانَ ...	["مَجْبُورٌ عَلَى جَمِيعِ أَفْعَالِهِ", "لَا مَسْؤُولِيَّةَ عَلَيْهِ عَنْ أَعْمَالِهِ", "لَا يَمْلِكُ أَيَّ إِرَادَةٍ", "لَهُ قُدْرَةٌ وَاخْتِيَارٌ فِي أَفْعَالِهِ"]	D	1.00	2026-10-26 08:27:07.343269+00	\N
1296	199	mc	مِنْ أَشْهَرِ أَئِمَّةِ أَهْلِ السُّنَّةِ وَالْجَمَاعَةِ فِي عِلْمِ الْكَلَامِ ...	["الْجَاحِظُ وَابْنُ الْمُقَفَّعِ", "الْفَرَابِيُّ وَابْنُ سِينَا", "أَبُو الْحَسَنِ الْأَشْعَرِيُّ وَأَبُو مَنْصُورٍ الْمَاتُرِيدِيُّ", "وَاصِلُ بْنُ عَطَاءٍ وَعَمْرُو بْنُ عُبَيْدٍ"]	C	1.00	2026-10-26 08:27:07.343269+00	\N
1297	199	mc	الْفِكْرَةُ الْأَسَاسِيَّةُ لِلْمُرْجِئَةِ فِي مَسْأَلَةِ الْإِيمَانِ وَالْعَمَلِ	["الْعَمَلُ هُوَ الْإِيمَانُ وَحْدَهُ", "كُلُّ عَاصٍ كَافِرٌ", "الْإِيمَانُ لَا يَحْتَاجُ إِلَى التَّصْدِيقِ", "تَأْخِيرُ الْحُكْمِ عَلَى مُرْتَكِبِ الْكَبِيرَةِ إِلَى اللهِ، مَعَ اخْتِلَافِ فِرَقِ الْمُرْجِئَةِ فِي تَعْرِيفِ الْإِيمَانِ"]	D	1.00	2026-10-26 08:27:07.343269+00	\N
1298	199	mc	الْمَوْقِفُ الَّذِي تَتَمَيَّزُ بِهِ الشِّيعَةُ الْإِمَامِيَّةُ الِاثْنَا عَشَرِيَّةُ	["الْقَوْلُ بِإِمَامَةِ اثْنَيْ عَشَرَ إِمَامًا", "إِنْكَارُ وُجُودِ الْأَئِمَّةِ", "الْقَوْلُ بِأَنَّ الْخِلَافَةَ لِأَبِي جَهْلٍ", "إِنْكَارُ الْقُرْآنِ الْكَرِيمِ"]	A	1.00	2026-10-26 08:27:07.343269+00	\N
1299	199	mc	الْمَقْصُودُ بِالْوَعْدِ وَالْوَعِيدِ عِنْدَ الْمُعْتَزِلَةِ	["وَعْدُ الْإِنْسَانِ بِالْمَالِ فَقَطْ", "وَعْدُ اللهِ بِالثَّوَابِ لِلْمُطِيعِينَ وَوَعِيدُهُ بِالْعِقَابِ لِلْعُصَاةِ", "إِنْكَارُ الْجَنَّةِ وَالنَّارِ", "إِنْكَارُ الْحِسَابِ يَوْمَ الْقِيَامَةِ"]	B	1.00	2026-10-26 08:27:07.343269+00	\N
1300	199	mc	السَّبَبُ الْأَبْرَزُ لِظُهُورِ فِرَقِ عِلْمِ الْكَلَامِ فِي التَّارِيخِ الْإِسْلَامِيِّ	["اخْتِفَاءُ الْقُرْآنِ الْكَرِيمِ", "الْخِلَافَاتُ السِّيَاسِيَّةُ وَالْفِكْرِيَّةُ وَالْجَدَلُ فِي الْمَسَائِلِ الْعَقَدِيَّةِ", "تَوَقُّفُ التَّعْلِيمِ فِي الْمُسْلِمِينَ", "انْتِشَارُ التِّجَارَةِ فَقَطْ"]	B	1.00	2026-10-26 08:27:07.343269+00	\N
1301	199	mc	اخْتَلَفَ مُسْلِمُونَ فِي مَسْأَلَةِ التَّحْكِيمِ بَيْنَ عَلِيٍّ وَمُعَاوِيَةَ، وَرَفَضَتْ جَمَاعَةٌ مِنْهُمْ التَّحْكِيمَ. إِلَى أَيِّ فِرْقَةٍ يُنْسَبُ هَذَا الْمَوْقِفُ تَارِيخِيًّا؟	["الْمُرْجِئَةُ", "الْمُعْتَزِلَةُ", "الْخَوَارِجُ", "الْمَاتُرِيدِيَّةُ"]	C	1.00	2026-10-26 08:27:07.343269+00	\N
1302	199	mc	أَيُّ عِبَارَةٍ تُعَبِّرُ بِدِقَّةٍ عَنْ مَوْقِفِ الشِّيعَةِ الْإِمَامِيَّةِ الِاثْنَا عَشَرِيَّةِ مِنَ الْإِمَامَةِ؟	["الْإِمَامَةُ لَيْسَتْ لَهَا أَيُّ أَهَمِّيَّةٍ عِنْدَهُمْ", "يَعْتَقِدُونَ بِإِمَامَةِ اثْنَيْ عَشَرَ إِمَامًا، وَيَرَوْنَ لِلْإِمَامَةِ مَكَانَةً عَقَدِيَّةً مُمَيَّزَةً", "يَعْتَقِدُونَ بِأَنَّ كُلَّ مُسْلِمٍ نَبِيٌّ", "يُنْكِرُونَ وُجُودَ أَهْلِ الْبَيْتِ"]	B	1.00	2026-10-26 08:27:07.343269+00	\N
1303	199	mc	يَدْعُو أَحَدُ الطُّلَّابِ إِلَى فَهْمِ الْمَسَائِلِ الْعَقَدِيَّةِ بِالْأَدِلَّةِ، مَعَ تَجَنُّبِ التَّكْفِيرِ وَالتَّعَصُّبِ. أَيُّ مَنْهَجٍ تَعْلِيمِيٍّ هُوَ الْأَنْسَبُ؟	["رَفْضُ جَمِيعِ الْآرَاءِ الْمُخَالِفَةِ دُونَ دَلِيلٍ", "اتِّهَامُ كُلِّ مُخَالِفٍ بِالْكُفْرِ", "دِرَاسَةُ الْأَدِلَّةِ وَفَهْمُ الْخِلَافَاتِ بِعِلْمٍ وَإِنْصَافٍ وَأَدَبٍ", "تَرْكُ دِرَاسَةِ الْعَقِيدَةِ كُلِّيًّا"]	C	1.00	2026-10-26 08:27:07.343269+00	\N
1304	199	mc	الْخُلَاصَةُ الْأَدَقُّ عِنْدَ مُقَارَنَةِ الْخَوَارِجِ وَالْمُرْجِئَةِ وَالْمُعْتَزِلَةِ فِي حُكْمِ مُرْتَكِبِ الْكَبِيرَةِ	["لِكُلِّ فِرْقَةٍ تَصَوُّرُهَا الْخَاصُّ؛ فَالْخَوَارِجُ اشْتُهِرُوا بِالتَّشَدُّدِ، وَالْمُرْجِئَةُ بِالْإِرْجَاءِ، وَالْمُعْتَزِلَةُ بِمَبْدَإِ الْمَنْزِلَةِ بَيْنَ الْمَنْزِلَتَيْنِ", "الْفِرَقُ الثَّلَاثُ لَا تَخْتَلِفُ فِي هَذِهِ الْمَسْأَلَةِ", "الْمُعْتَزِلَةُ تُنْكِرُ وُجُودَ الْعَمَلِ", "الْمُرْجِئَةُ تَقُولُ إِنَّ كُلَّ مُذْنِبٍ كَافِرٌ"]	A	1.00	2026-10-26 08:27:07.343269+00	\N
1305	199	essay	ما فائدة معرفة علم الكلام؟	[]	تقوية العقيدة الإسلامية ونصرة العقائد الدينية دون تمييز بين الفرق والمذاهب الإسلامية.	1.00	2026-10-26 08:27:07.343269+00	\N
1306	199	essay	اذكر ٥ فرق الخوارج!	[]	المحكمة الأولى، الأزارقة، الإباضية، النجدات، والخوارج المعاصرون.	1.00	2026-10-26 08:27:07.343269+00	\N
1307	199	essay	ما هو تعريف علم الكلام عند الإيجي؟	[]	. عِلْمٌ يُقْتَدَرُ مَعَهُ عَلَى إِثْبَاتِ الْعَقَائِدِ الدِّينِيَّةِ بِإِيرَادِ الْحُجَجِ وَدَفْعِ الشُّبَهِ	1.00	2026-10-26 08:27:07.343269+00	\N
1308	199	essay	ما مفهوم الإمامة عند مذهب الشيعة؟	[]	هي وصاية من النبي ومحصورة بالوصي وإذا تولاها سواه يجب البراءة منه وتكفيره.	1.00	2026-10-26 08:27:07.343269+00	\N
1309	199	essay	كيف رأي المعتزلة عن الشفاعة في اليوم الآخر؟	[]	أنهم ينكرون الشفاعة يوم القيامة لأن الشفاعة حسب اعتقادهم تتعارض مع الوعد والوعيد. فلا يستطيع أحد أن يشفع عن د الله لأحد ويجعله ينجو من العقاب، بل كل نفس تجد من الواجب والجزاء بقدر عمله.	1.00	2026-10-26 08:27:07.343269+00	\N
1310	200	mc	ما معنى بر الوالدين ؟	["الْتِزَامُ الِابْنِ بِرِعَايَةِ وَالِدَيْهِ، خَاصَّةً عِنْدَ بُلُوغِهِمَا سِنَّ الشَّيْخُوخَةِ", "طَاعَةُ الْوَالِدَيْنِ فِي جَمِيعِ الْأُمُورِ دُونَ اسْتِثْنَاءٍ", "مُسَاعَدَةُ الْأَصْدِقَاءِ وَالْجِيرَانِ عِنْدَ الْحَاجَةِ", "تَعْلِيمُ الْأَوْلَادِ آدَابَ الْحَيَاةِ وَأَخْلَاقَهَا"]	A	1.00	2026-10-26 08:30:34.56309+00	\N
1311	200	mc	عقوق الوالدين هو .................	["الْتِزَامُ الْوَلَدِ بِرِعَايَةِ وَالِدَيْهِ", "كُلُّ فِعْلٍ يَتَأَذَّى مِنْهُ الْوَالِدَانِ", "طَاعَةُ الْوَالِدَيْنِ وَاحْتِرَامُهُمَا", "مُسَاعَدَةُ الْوَالِدَيْنِ فِي أَعْمَالِ الْبَيْتِ"]	B	1.00	2026-10-26 08:30:34.56309+00	\N
1312	200	mc	إختر من الخيارات التالية مايعد من بر الوالدين !	["إِهَانَةُ الْوَالِدَيْنِ", "طَاعَةُ الْوَالِدَيْنِ فِي الْخَيْرِ", "رَفْعُ الصَّوْتِ عَلَى الْوَالِدَيْنِ", "عَدَمُ الاِهْتِمَامِ بِالْوَالِدَيْنِ"]	B	1.00	2026-10-26 08:30:34.56309+00	\N
1313	200	mc	إن بر الوالدين يُعادل ......	["الحج والعمرة", "الجهاد في سبيل الله", "الصوم في رمضان", "إيتاء الزكاة"]	B	1.00	2026-10-26 08:30:34.56309+00	\N
1314	200	mc	عقوق الوالدين من ........	["الْمُبَاحَاتِ", "الصَّغَائِرِ", "لْكَبَائِرِ", "الْمَكْرُوهَاتِ"]	C	1.00	2026-10-26 08:30:34.56309+00	\N
1315	200	mc	ما معنى النفس المطمئنة ؟	["النَّفْسُ الَّتِي تَأْمُرُ صَاحِبَهَا بِالسُّوءِ", "النَّفْسُ الَّتِي تَلُومُ صَاحِبَهَا عَلَى التَّقْصِيرِ", "النَّفْسُ السَّاكِنَةُ لِلَّهِ تَعَالَى، وَالْمُطْمَئِنَّةُ بِذِكْرِهِ", "النَّفْسُ الَّتِي تَتَّبِعُ الشَّهَوَاتِ وَالْهَوَى"]	C	1.00	2026-10-26 08:30:34.56309+00	\N
1316	200	mc	ما معنى النفس اللوامة ؟	["النَّفْسُ الَّتِي تَأْمُرُ صَاحِبَهَا بِالسُّوءِ وَالْمَعَاصِي", "النَّفْسُ الَّتِي تَنْدَمُ وَتَلُومُ صَاحِبَهَا عَلَى ارْتِكَابِ الْمَعَاصِي", "النَّفْسُ السَّاكِنَةُ لِلَّهِ تَعَالَى، وَالْمُطْمَئِنَّةُ بِذِكْرِهِ", "النَّفْسُ الَّتِي تَتَّبِعُ الشَّهَوَاتِ وَلَا تَنْدَمُ عَلَى أَفْعَالِهَا"]	B	1.00	2026-10-26 08:30:34.56309+00	\N
1317	200	mc	إن الطاعة تحتاج إلى ..........	["اتِّبَاعِ الشَّهَوَاتِ", "مُجَاهَدَةِ النَّفْسِ", "تَرْكِ الْعَمَلِ", "حُبِّ الدُّنْيَا"]	B	1.00	2026-10-26 08:30:34.56309+00	\N
1318	200	mc	إن لسوء الظن آثار سلبية، منها ..........	["تَقْوِيَةُ الْعَلَاقَاتِ بَيْنَ أَفْرَادِ الْمُجْتَمَعِ", "نَشْرُ الْمَحَبَّةِ وَالثِّقَةِ بَيْنَ النَّاسِ", "آثَارٌ ضَارَّةٌ وَعَوَاقِبُ خَطِيرَةٌ عَلَى الْفَرْدِ وَالْمُجْتَمَعِ", "زِيَادَةُ التَّعَاوُنِ وَالتَّرَاحُمِ بَيْنَ النَّاسِ"]	C	1.00	2026-10-26 08:30:34.56309+00	\N
1319	200	mc	وكونوا عباد الله ..........	["أَعْدَاءً", "مُتَفَرِّقِينَ", "إِخْوَانًا", "مُتَبَاغِضِينَ"]	C	1.00	2026-10-26 08:30:34.56309+00	\N
1320	200	mc	نور الإيمان له أثر كبير في ............	["فَسَادِ الْمُجْتَمَعِ", "سَلَامَةِ النَّفْسِ", "اتِّبَاعِ الشَّهَوَاتِ", "نَشْرِ الْعَدَاوَةِ"]	B	1.00	2026-10-26 08:30:34.56309+00	\N
1321	200	mc	لا يجد طعم الإيمان من .......	["يُطِيعُ اللهَ وَرَسُولَهُ", "يَذْكُرُ اللهَ كَثِيرًا", "يُعْصِي اللهَ", "يَتُوبُ إِلَى اللهِ"]	C	1.00	2026-10-26 08:30:34.56309+00	\N
1322	200	mc	لَا يَزْنِي ...........حِينَ يَزْنِي وَهُوَ مُؤْمِنٌ.	["الْكَاذِبُ", "السَّارِقُ", "الزَّانِي", "الْخَائِنُ"]	C	1.00	2026-10-26 08:30:34.56309+00	\N
1323	200	mc	وَلَا يَشْرَبُ .......... حِينَ يَشْرَبُ وَهُوَ مُؤْمِنٌ	["الْمَاءَ", "الْخَمْرَ", "اللَّبَنَ", "الْعَصِيرَ"]	B	1.00	2026-10-26 08:30:34.56309+00	\N
1324	200	mc	مَنْ لَا يَرْحَمْ .........	["لَا يُحْتَرَمْ", "لَا يُغْفَرْ لَهُ", "لَا يُرْزَقْ", "لَا يُرْحَمْ"]	D	1.00	2026-10-26 08:30:34.56309+00	\N
1325	200	essay	ما نتيجة عقوق الوالدين	[]	لايدخل الجنة	1.00	2026-10-26 08:30:34.56309+00	\N
1326	200	essay	مانتيجة بر الوالدين	[]	ينجيه الله سبحانه وتعالى من الويلات والكرب ويخلصه من الشدائد	1.00	2026-10-26 08:30:34.56309+00	\N
1327	200	essay	إِيَّاكُمْ وَالظَّنَّ؛ فَإِنَّ الظَّنَّ.........	[]	أَكْذَبُ الْحَدِيثِ	1.00	2026-10-26 08:30:34.56309+00	\N
1328	200	essay	يزيد الإيمان ب............وينقص ب........	[]	يزيد الإيمان بالطاعة وينقص بالمعصية	1.00	2026-10-26 08:30:34.56309+00	\N
1329	200	essay	لَيْسَ مِنَّا مَنْ لَمْ .............، وَيَرْحَمِ ...................	[]	لَيْسَ مِنَّا مَنْ لَمْ يُوَقِّرِ الْكَبِيرَ، وَيَرْحَمِ الصَّغِيرَ،	1.00	2026-10-26 08:30:34.56309+00	\N
1330	201	mc	ما المراد من قوله صلى الله عليه وسلم ( إن الله طيب )	["كَثِيرُ الْعَطَاءِ وَالْإِحْسَانِ.", "غَفُورٌ لِذُنُوبِ عِبَادِهِ.", "رَحِيمٌ بِالْمُؤْمِنِينَ.", "مُنَزَّهٌ عَنِ النَّقَائِصِ وَالْعُيُوبِ."]	D	1.00	2026-10-26 08:31:55.236044+00	\N
1331	201	mc	مَا الْمُرَادُ بِهَذَا الْحَدِيثِ: «إِنَّ اللهَ طَيِّبٌ وَلَا يَقْبَلُ إِلَّا طَيِّبًا»؟	["أنه تعالى لايقبل من الصدقات إلا ما كان طيبا حلالا", "أَنَّهُ تَعَالَى يَقْبَلُ جَمِيعَ الصَّدَقَاتِ سَوَاءٌ كَانَتْ حَلَالًا أَمْ حَرَامًا.", "أَنَّهُ تَعَالَى يَأْمُرُ عِبَادَهُ بِكَثْرَةِ الْمَالِ وَجَمْعِهِ.", "أَنَّهُ تَعَالَى يُحِبُّ الْأَغْنِيَاءَ لِكَثْرَةِ أَمْوَالِهِمْ."]	A	1.00	2026-10-26 08:31:55.236044+00	\N
1332	201	mc	مالمقصود من هذه الجملة ( يرحمكم من في السماء )	["اللهُ تَعَالَى، وَقِيلَ: هُمُ الْمَلَائِكَةُ.", "الْمُؤْمِنُونَ الصَّالِحُونَ.", "أَهْلُ الْعِلْمِ وَالْحِكْمَةِ.", "أَهْلُ الْأَرْضِ جَمِيعًا."]	A	1.00	2026-10-26 08:31:55.236044+00	\N
1333	201	mc	الرَّحم ........من الرّحمن	["صِلَةٌ", "شَجْنَةٌ", "رَحْمَةٌ", "نِعْمَةٌ"]	B	1.00	2026-10-26 08:31:55.236044+00	\N
1334	201	mc	ومن وصلها ...........ومن قطعها ............	["وَصَلَهُ اللهُ، وَقَطَعَهُ اللهُ.", "أَكْرَمَهُ اللهُ، وَأَهَانَهُ اللهُ.", "غَفَرَ اللهُ لَهُ، وَعَذَّبَهُ اللهُ.", "رَزَقَهُ اللهُ، وَمَنَعَهُ اللهُ."]	A	1.00	2026-10-26 08:31:55.236044+00	\N
1335	201	mc	مامعنى كلمة "جواد "	["كَثِيرُ الْعِلْمِ وَالْمَعْرِفَةِ.", "كَثِيرُ الْجُودِ وَالْعَطَاءِ.", "كَثِيرُ الصَّبْرِ وَالتَّحَمُّلِ.", "كَثِيرُ الْعِبَادَةِ وَالطَّاعَةِ."]	B	1.00	2026-10-26 08:31:55.236044+00	\N
1336	201	mc	نهي رسول الله صلى الله عليه وسلم المسلمين عن مشابهة الكفار في ..............	["أَعْمَالِهِمْ وَعَادَاتِهِمُ الْخَاصَّةِ بِهِمْ.", "أَخْلَاقِهِمُ الْحَسَنَةِ وَصِفَاتِهِمُ الْكَرِيمَةِ.", "طَلَبِ الْعِلْمِ وَالْمَعْرِفَةِ النَّافِعَةِ.", "مُسَاعَدَةِ الْفُقَرَاءِ وَالْمَسَاكِينِ."]	A	1.00	2026-10-26 08:31:55.236044+00	\N
1337	201	mc	.......... الأمانة إلى من ائتمنك	["خُذْ", "أَدِّ", "احْفَظْ", "اطْلُبْ"]	B	1.00	2026-10-26 08:31:55.236044+00	\N
1338	201	mc	كل المسلم على المسلم حرام ................	["دَمُهُ، وَمَالُهُ، وَعِرْضُهُ.", "بَيْتُهُ، وَعِلْمُهُ، وَعَمَلُهُ.", "طَعَامُهُ، وَشَرَابُهُ، وَلِبَاسُهُ.", "وَقْتُهُ، وَجُهْدُهُ، وَمَالُهُ."]	A	1.00	2026-10-26 08:31:55.236044+00	\N
1339	201	mc	أَيُّ الْأَمْثِلَةِ التَّالِيَةِ يَدُلُّ عَلَى تَحْرِيمِ الْبَيْعِ عَلَى بَيْعِ الْمُسْلِمِ؟	["الشراء على شرائه", "أَنْ يَبِيعَ رَجُلٌ سِلْعَتَهُ فِي السُّوقِ بِسِعْرٍ مُنَاسِبٍ", "أَنْ يَشْتَرِيَ رَجُلٌ سِلْعَةً مِنَ السُّوقِ بِرِضَا الْبَائِعِ", "أَنْ يَبِيعَ رَجُلٌ سِلْعَةً لِشَخْصٍ، ثُمَّ يُسَلِّمَهَا إِلَيْهِ"]	A	1.00	2026-10-26 08:31:55.236044+00	\N
1340	201	mc	أن محل التقوى هو ...........	["القلب", "اللِّسَانُ.", "الْعَقْلُ.", "الْجَسَدُ."]	A	1.00	2026-10-26 08:31:55.236044+00	\N
1341	201	mc	ما المراد بتحريم التدابر ؟	["أن يولى أخاه ظهره ولايأخذ منه ولايستمع إليه", "أَنْ يُسَاعِدَ أَخَاهُ فِي أَوْقَاتِ الْحَاجَةِ.", "أَنْ يَعْفُوَ عَنْ أَخِيهِ عِنْدَ الْخُصُومَةِ.", "أَنْ يَتَفَقَّدَ أَحْوَالَ أَخِيهِ وَيَسْأَلَ عَنْهُ."]	A	1.00	2026-10-26 08:31:55.236044+00	\N
1342	201	mc	كل ما أعطانا الله من نعمة فهي .........	["أمانة", "صَدَقَةٌ", "هِبَةٌ", "مَكْسَبٌ"]	A	1.00	2026-10-26 08:31:55.236044+00	\N
1343	201	mc	إذا أسند الأمر إلى غير أهله ........	["فَانْتَظِرِ النَّجَاحَ", "فَانْتَظِرِ الْخَيْرَ", "فَانْتَظِرِ السَّاعَةَ", "فَانْتَظِرِ الرَّاحَةَ"]	C	1.00	2026-10-26 08:31:55.236044+00	\N
1344	201	mc	ما طريقة الحصل على حقوقنا من الرجل الذي قام خاننا	["بِمُعَامَلَتِهِ بِالْمِثْلِ وَخِيَانَتِهِ كَمَا خَانَنَا.", "بِأَدَاءِ الْأَمَانَةِ وَعَدَمِ خِيَانَةِ مَنْ خَانَنَا.", "بِقَطْعِ الْعَلَاقَةِ مَعَهُ وَعَدَمِ مُسَامَحَتِهِ أَبَدًا.", "بِأَخْذِ أَمْوَالِهِ دُونَ إِذْنِهِ."]	B	1.00	2026-10-26 08:31:55.236044+00	\N
1345	201	essay	إِنَّ اللهَ طَيِّبٌ .........	[]	نَّ اللهَ طَيِّبٌ لَا يَقْبَلُ إِلَّا طَيِّبًا./ إِنَّ اللهَ طَيِّبٌ يُحِبُّ الطَّيِّبَ	1.00	2026-10-26 08:31:55.236044+00	\N
1346	201	essay	ما المراد من قول ( لا يقبل إلا طيبا )	[]	أَنَّ اللهَ تَعَالَى لَا يَقْبَلُ إِلَّا الْعَمَلَ الصَّالِحَ وَالْمَالَ الْحَلَالَ	1.00	2026-10-26 08:31:55.236044+00	\N
1347	201	essay	لا تحاسدوا............ولاتباغضوا	[]	لا تحاسدوا، ولا تناجشوا، ولاتباغضوا	1.00	2026-10-26 08:31:55.236044+00	\N
1348	201	essay	ولا ...............على بيع بعض	[]	ولا يبع بعضكم على بيع بعض	1.00	2026-10-26 08:31:55.236044+00	\N
1349	201	essay	اذكر خمسة أمور في حياتك أو جسمك التي هي أكبر أمانة من عند الله سبحانه لك ؟	[]	البصر، واليد، والرجل، واللسان، والمال أيضا لاينفق إلا فيما يرضي الله	1.00	2026-10-26 08:31:55.236044+00	\N
1350	202	mc	من أسباب نشأت الدولة الأموية, إلا .......	["وقعة الصفين", "وقعة ألزاب", "وقعة الجمل", "التحكيم دومة الجندل"]	B	1.00	2026-10-26 08:32:28.929168+00	\N
1351	202	mc	بدأت وقعة الجمل بعد الظهر وانتهت قبل المغرب من يوم نفسه, في السنة ......	["خمس وثلاثين هجرية", "ست وثلاثين هجرية", "سبع وثلاثين هجرية", "ثماني وثلاثين هجرية"]	B	1.00	2026-10-26 08:32:28.929168+00	\N
1352	202	mc	الرسول من علي في التحكيم الدومة الجندل هو ..........	["أبو موسى الأشعري", "عبد الله بن عباس", "عمرو بن العاص", "عقبة بن زياد"]	A	1.00	2026-10-26 08:32:28.929168+00	\N
1353	202	mc	طعن ............. خليفةَ علي بن أب طالب في الكوفة	["البرك التميمي", "عمرو بن بكر", "إبن ملجم", "حسن بن علي"]	C	1.00	2026-10-26 08:32:28.929168+00	\N
1354	202	mc	........ هي الجند الذي يعتمد عليه الخليفة أو الوالي في استباب الأمن وحفظ النظام	["البريد", "الدواوين", "الوزارة", "الشرطة"]	D	1.00	2026-10-26 08:32:28.929168+00	\N
1355	202	mc	إنتقل عاصمة الدولة الإسلامية من المدينة إلى ...........	["الكوفة", "بغداد", "دمشق", "البصرة"]	C	1.00	2026-10-26 08:32:28.929168+00	\N
1356	202	mc	حوّل معاوية بن أبي سفيان النظام الحكمي الإسلامي الديمقراطي إلى ........	["المشاورة", "الخلافة", "العمارة", "الوراثة"]	D	1.00	2026-10-26 08:32:28.929168+00	\N
1357	202	mc	من العلماء التفسير, إلا ............	["إبن عباس", "حماد بن أبي سليمان", "سعيد بن جبير", "مجاهد بن جبر"]	B	1.00	2026-10-26 08:32:28.929168+00	\N
1358	202	mc	مِن آخر الخلفاء الأمويين هو .........	["عمر بن عبدالعزيز", "سليمان بن ملك", "مروان بن محمد", "معاوية بن أبي سفيان"]	C	1.00	2026-10-26 08:32:28.929168+00	\N
1359	202	mc	من الحركات والثورات في عهد مروان, إلا ...........	["ثورة أهل حمص", "ثورة أهل غوطة", "ثورة أهل الشام", "ثورة أهل فلسطين"]	C	1.00	2026-10-26 08:32:28.929168+00	\N
1360	202	mc	واحد المسجد في فلسطين حيث أول القبلتين في الإسلام وواحد من أكثر المعالم القدسية السلمين, وإسم هذا المسجد ...........	["قبة الصخرة", "الأموي", "الأقصى", "الحرام"]	C	1.00	2026-10-26 08:32:28.929168+00	\N
1361	202	mc	دخل مروان وتبعه العباسيون حتى قتلوه في كنيسة في العام ..........	["7 ذي الحجة 132ه", "6 ذي الحجة 132ه", "7 ذي الحجة 135ه", "6 ذي الحجة 135ه"]	B	1.00	2026-10-26 08:32:28.929168+00	\N
1362	202	mc	........ هو أوّل مَن عن العرب (المسلم) بنقل الطب والكمياء إلى اللغة العربية	["جبلة بن سالم", "إبن أثال النصراني", "يحيي الدمشقي", "خالد بن يزيد"]	D	1.00	2026-10-26 08:32:28.929168+00	\N
1363	202	mc	المُؤَلّف الكتاب " الملوك وأخبار الماضيين" هو ......	["عبيد بن شرية", "أبو بكر بن حزم", "فضيل الزهري", "الضحاك بن مزاحم"]	A	1.00	2026-10-26 08:32:28.929168+00	\N
1364	202	mc	من الولايات في عهد معاوية بن أبي سفيان هي ............	["بصرة, مصر, إفريقية", "الشام, الكوفة, البصرة", "الشام, الحجاز, العراق", "مكة, مصر, العراق"]	B	1.00	2026-10-26 08:32:28.929168+00	\N
1365	202	essay	ما هي الخليفة إصطلاحاً ؟	[]	رئاسة عامة في أمور الدين والدنيا نيابة عن النبي ص.م	1.00	2026-10-26 08:32:28.929168+00	\N
1366	202	essay	ما رأيك عن النظام الملك الوارثي ؟	[]	الخلافة الذي يقوم على أساس التوريث	1.00	2026-10-26 08:32:28.929168+00	\N
1367	202	essay	أذكر الولايات في عهد عمر بن عبد العزيز !	[]	الحجاز, الشام, العراق, خرسان, مصر, إفريقية	1.00	2026-10-26 08:32:28.929168+00	\N
1368	202	essay	من الذي يدون حديث رسول الله ص.م في عهد الخليفة عمر بن عبد العزيز ؟	[]	أبو بكر بن حزم الأنصاري	1.00	2026-10-26 08:32:28.929168+00	\N
1369	202	essay	أذكر الثورات التي ظهرت في عهد خليفة مروان بن محمد بن الحكم !	[]	ثورة أهل حمص, ثورة أهل غوطة, ثورة أهل فلسطين	1.00	2026-10-26 08:32:28.929168+00	\N
1372	203	mc	كا نت العرب المستعربة الجالية... النازلون اولا في مكة المكرمة.	["الاولي", "الثانية", "ا لثالثة", "الرابعة"]	C	1.00	2026-10-26 08:33:25.557553+00	\N
1373	203	mc	يعبد المجوس ....و الجن و الملا ءكة	["الشمس", "القمر", "الاشجار", "النار"]	D	1.00	2026-10-26 08:33:25.557553+00	\N
1374	203	mc	العرب قبل الاسلام يقتلون اولادهم خوفا من ؟....	["الفقر", "العيب", "الحرب", "المرض"]	B	1.00	2026-10-26 08:33:25.557553+00	\N
1375	203	mc	١. والد رسول الله محمد صلي ا لله عليه و سلم هو .... بن عبد المطلب	["عبدالله", "حمزة", "ابو لهب", "عباس"]	A	1.00	2026-10-26 08:33:25.557553+00	\N
1376	203	mc	٢. تجتمع امه مع والده في جده الخامس و هو؟....	["هاشم", "كلاب", "قصي", "عبد مناف"]	B	1.00	2026-10-26 08:33:25.557553+00	\N
1377	203	mc	٣. من السابقين الاولين ....	["معاوية", "عمر بن خطاب", "ابو بكر", "عا ءشة"]	C	1.00	2026-10-26 08:33:25.557553+00	\N
1378	203	mc	٤. كان ملك .... ارسل عام ولا دته جيشا الي مكة، لهدم الكعبة	["الفيل", "الحبشه", "الفارس", "الروم"]	B	1.00	2026-10-26 08:33:25.557553+00	\N
1379	203	mc	٥. حينما قارب الاربعين من عمره، احب رسول الله صلي الله عليه وسلم الابتعاد عن الناس و العبادة، و قد اختار لعبا دته؟....	["غار ثور", "مسجد", "غار حراء", "البيت الحرام"]	C	1.00	2026-10-26 08:33:25.557553+00	\N
1380	203	mc	١. في السنة.... اكرمه الله بالاسراء و المعراج.	["الثانية عشرة", "العاشرة", "الحادية عشرة", "الخامسة"]	C	1.00	2026-10-26 08:33:25.557553+00	\N
1381	203	mc	٢. حينما قارب الاربعين من عمره، احب رسو ل الله الابتعاد عن الناس والعبادة، و قد اختار لعبادته.؟....	["غار ثور", "مسجد", "غار حراء", "بيت الخرام"]	C	1.00	2026-10-26 08:33:25.557553+00	\N
1382	203	mc	٣. بدا النبي بالدعوة..... لما نزل عليه سورة المدثر	["سرا", "جهرا", "خاص", "عام"]	A	1.00	2026-10-26 08:33:25.557553+00	\N
1383	203	mc	٤. المراج هو صعوده صلي اللله عليه وسلم الي العالم العلوي و فيه فرضة ؟.....	["الصوم", "الزكات", "الحج", "الصلاة"]	D	1.00	2026-10-26 08:33:25.557553+00	\N
1384	203	mc	٥. لما راي الرسول صلي الله عليه و سلم استهانة قريش هاجر في السنة العاشرة الي ؟....	["الخبشة", "المدينة", "الروم", "الطا ءف"]	D	1.00	2026-10-26 08:33:25.557553+00	\N
1385	203	essay	١. لماذا نحتاج الي فهم تاريخ الارخبيل الاسلامية ؟.....	[]	لان لنا فكر و قلب	1.00	2026-10-26 08:33:25.557553+00	\N
1386	203	essay	٢. متي دخل الاسلام في الارخبيل ؟....	[]	٧ / ١٣ م	1.00	2026-10-26 08:33:25.557553+00	\N
1387	203	essay	١. ادكر ثلاث ادلة علي تطور الاسلام في الممالك الاسلامية في جاوت ؟....	[]	ديماك، تشيريبون، بنتين.	1.00	2026-10-26 08:33:25.557553+00	\N
1388	203	essay	٢. ادلة علي تطور الاسلام في الممالك الاسلامية في سومطرة ؟...	[]	ساموديرا باساي، اتشيه،	1.00	2026-10-26 08:33:25.557553+00	\N
1389	203	essay	١. ما هي الاولياء التسعة ؟	[]	الاول دعوة الاسلام في اندونيسيا	1.00	2026-10-26 08:33:25.557553+00	\N
1370	203	mc	كانت العرب قبل الاسلام لا يعبدون ؟.....	["الاصنام", "الله", "الاحجار", "الملاءكة"]	B	1.00	2026-10-26 08:33:25.557553+00	2
1371	203	mc	ان.... هي مركز الارض..	["الروم", "الشام", "مكة", "المدينة"]	C	1.00	2026-10-26 08:33:25.557553+00	2
1415	205	mc	نحن الآن في اليوم الأول من محرم، دخلنا في......	["عام قديم", "عام جديد", "عام كريم", "عام شريف"]	B	1.00	2026-10-28 05:45:18.206926+00	6
1416	205	mc	تحتفل بذكرى هجرة الرسول صلى الله عليه وسلم، أليس كذلك؟	["بلى، تحتفل اليوم بهذه الحادثة الصغيرة.", "بلى، تحتفل اليوم بهذه الحادثة العظيمة", "بلى، نحتفل اليوم بهذه الحادثة القصيرة.", "بلى، نحتفل اليوم بهذه الحادثة السريعة."]	B	1.00	2026-10-28 05:45:18.206926+00	6
1417	205	mc	استمرت هجرة من يدخل في الإسلام إلى المدينة المنورة حتى فتح مكة عام .....	["٦ هـ", "٧ هـ", "٨ هـ", "٩ هـ"]	B	1.00	2026-10-28 05:45:18.206926+00	6
1418	205	mc	مَاذَا عَرَفْت عَنْ بِدَايَةِ رَأْسِ السَّنَةِ الهِجْرِيَّةِ؟	["بَدَأَتِ السَّنَةُ الهِجْرِيَّةُ عِنْدَمَا هَاجَرَ الرَّسُوْلُ مِنْ مَكَّةَ إِلَى يَثْرِبَ.", "بَدَأَتِ السَّنَةُ الهِجْرِيَّةُ عِنْدَمَا وُلِدَ الرَّسُوْلُ فِيْ مَكَّةَ.", "بَدَأَتِ السَّنَةُ الهِجْرِيَّةُ عِنْدَمَا تُوُفِّيَ الرَّسُوْلُ فِيْ المَدِيْنَةِ", "بَدَأَتِ السَّنَةُ الهِجْرِيَّةُ عِنْدَمَا نَامَ عَلِيٌّ فِيْ فِرَاشِ الرَّسُوْلِ"]	A	1.00	2026-10-28 05:45:18.206926+00	6
1419	205	mc	مَا هُوَ الِاسْمُ الآخَرُ لِمَدِيْنَةِ يَثْرِبَ بَعْدَ هِجْرَةِ الرَّسُوْلِ؟	["مَكَّةُ المُكَرَّمَةُ", "المَدِيْنَةُ المُنَوَّرَةُ", "جِدَّةُ", "القَاهِرَةُ"]	B	1.00	2026-10-28 05:45:18.206926+00	6
1420	205	mc	فِيْ أَيِّ عَامٍ مِيْلَادِيٍّ كَانَتْ هِجْرَةُ الرَّسُوْلِ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ؟	["فِيْ عَامِ ٥٧١ مِيْلَادِيِّ", "فِيْ عَامِ ٦٣٢ مِيْلَادِيِّ", "فِيْ عَامِ ٦٢٢ مِيْلَادِيِّ", "فِيْ عَامِ ٦١٠ مِيْلَادِيِّ"]	C	1.00	2026-10-28 05:45:18.206926+00	6
1421	205	mc	هِجْرَتُهُ بِسَبَبِ مَا كَانُوا يُلَاقُوْنَهُ مِنْ ....	["إِكْرَامٍ مِنْ زُعَمَاءِ قُرَيْشٍ", "إِيْذَاءٍ مِنْ فُقَرَاءِ قُرَيْشٍ", "إِحْسَانٍ مِنْ زُعَمَاءِ قُرَيْشٍ", "يْذَاءٍ مِنْ زُعَمَاءِ قُرَيْشٍ"]	D	1.00	2026-10-28 05:45:18.206926+00	6
1422	205	mc	اِثْنَا عَشَرَ رَبِيْعَ الأَوَّلِ، مَاذَا يُذَكِّرُكُمْ هَذَا التَّارِيْخُ ...	["نُزُوْلُ القُرْآنِ", "وُلِدَ مُحَمَّدٌ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ", "رَأْسُ السَّنَةِ الهِجْرِيَّةِ", "عِيْدُ الفِطْرِ"]	B	1.00	2026-10-28 05:45:18.206926+00	7
1423	205	mc	مَنْ هُوَ مُحَمَّدٌ؟	["هُوَ مُحَمَّدُ بْنُ عَبْدِ اللهِ خَاتَمُ النَّبِيِّيْنَ.", "هُوَ مُحَمَّدُ بْنُ عَبْدِ اللهِ أَوَّلُ الرَّسُوْلِ.", "هُوَ مُحَمَّدُ بْنُ عَبْدِ المُطَّلِبِ خَاتَمُ النَّبِيِّيْنَ.", "هُوَ مُحَمَّدُ بْنُ عَبْدِ الرَّحْمَنِ خَاتَمُ الرُّسُلِ."]	A	1.00	2026-10-28 05:45:18.206926+00	7
1424	205	mc	كَيْفَ كَانَ خُلُقُهُ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ؟	["كَانَ خُلُقُهُ الأَنَامَ.", "بِخَيْرٍ، كَانَ خُلُقُهُ الإِحْسَانَ.", "كَانَ خُلُقُهُ الإِنْسَانَ.", "كَانَ خُلُقُهُ القُرْآنَ."]	D	1.00	2026-10-28 05:45:18.206926+00	7
1425	205	mc	كَيْفَ نُحْيِي ذِكْرَى مَوْلِدِ رَسُوْلِ اللهِ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ؟	["بِاتِّبَاعِ سُنَّتِهِ.", "بِزِيَارَةِ بَيْتِهِ.", "بِإِكْرَامِ مَدِيْنَتِهِ.", "بِتَرْكِ سُنَّتِهِ."]	A	1.00	2026-10-28 05:45:18.206926+00	7
1426	205	mc	مَا اسْمُ أُمِّهِ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ؟	["آمِنَة", "خَدِيْجَة", "حَلِيْمَة", "أَمِيْنَة"]	A	1.00	2026-10-28 05:45:18.206926+00	7
1427	205	mc	وَمَا اسْمُ أَبِيْهِ وَجَدِّهِ وَعَمِّهِ؟	["اِسْمُ أَبِيْهِ عَبْدُ المُطَّلِبِ، وَجَدِّهُ عَبْدُ اللهِ وَعَمِّهُ أَبِيْ طَالِبٍ.", "اِسْمُ أَبِيْهِ أَبِيْ طَالِبٍ، وَجَدِّهُ عَبْدُ المُطَّلِبِ وَعَمِّهُ عَبْدُ اللهِ.", "اِسْمُ أَبِيْهِ عَبْدُ اللهِ، وَجَدِّهُ عَبْدُ المُطَّلِبِ وَعَمِّهُ أَبِيْ طَالِبٍ.", "سْمُ أَبِيْهِ عَبْدُ اللهِ، وَجَدِّهُ أَبِيْ طَالِبٍ وَعَمِّهُ عَبْدُ المُطَّلِبِ."]	C	1.00	2026-10-28 05:45:18.206926+00	7
1428	205	mc	هل ينزل القرآن دفعة واحدة؟	["نعم، ينزل القرآن دفعة واحدة.", "لا، إنما ينزل منجما.", "لا، ينزل القرآن مرتبا", "لا، إنما ينزل مدخرا."]	B	1.00	2026-10-28 05:45:18.206926+00	8
1429	205	mc	ما أول ما نزل من القرآن؟	["الآيات الخمس الأولى من سورة العلق", "الآيات الخمس الأولى من سورة الفلق.", ". الآيات الخمس الأولى من سورة المدثر.", ". الآيات الخمس الأولى من سورة المائدة."]	A	1.00	2026-10-28 05:45:18.206926+00	8
1431	205	essay	في أي سنة ميلادية كانت هجرة الرسول صلى الله عليه وسلم؟	[]	في عام ٦٢٢ ميلادي.	1.00	2026-10-28 05:45:18.206926+00	6
1432	205	essay	صَرِّفِ الفِعْلَ (كَتَبَ) مَعَ الضَّمِيْرِ "هُمْ"!	[]	كَتَبُوا	1.00	2026-10-28 05:45:18.206926+00	\N
1433	205	essay	صَرِّفِ الفِعْلَ (جَلَسَ) مَعَ الضَّمِيْرِ "أَنْتُمْ"!	[]	جَلَسْتُمْ	1.00	2026-10-28 05:45:18.206926+00	\N
1430	205	essay	nomor 1ماذا كانت تسمية المدينة المنورة قبل هجرة الرسول إليها؟	[]	يثرب	1.00	2026-10-28 05:45:18.206926+00	6
349	152	mc	مَنْ هُوَ الطَّالِبُ الجَدِيْدُ فِي الحِوَارِ؟	["بودي", "يوسف", "أحمد", "الأستاذ"]	B	1.00	2026-10-20 07:02:18.807679+00	9
\.


--
-- Data for Name: responses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.responses (session_id, question_id, answer, updated_at, points_awarded, graded_by, graded_at, essay_score) FROM stdin;
2264	273	B	2026-10-29 06:27:28.484841+00	\N	\N	\N	\N
2261	281	B	2026-10-29 06:30:06.163257+00	\N	\N	\N	\N
2264	279	C	2026-10-29 06:30:07.059872+00	\N	\N	\N	\N
2252	1197	B	2026-10-29 06:27:57.612284+00	\N	\N	\N	\N
2224	259	A	2026-10-29 06:28:03.729341+00	\N	\N	\N	\N
2261	283	D	2026-10-29 06:28:06.666505+00	\N	\N	\N	\N
2224	257	B	2026-10-29 06:28:08.069056+00	\N	\N	\N	\N
2233	1204	B	2026-10-29 06:28:08.992972+00	\N	\N	\N	\N
2254	272	D	2026-10-29 06:28:10.285114+00	\N	\N	\N	\N
2252	1190	C	2026-10-29 06:28:10.574029+00	\N	\N	\N	\N
2224	253	C	2026-10-29 06:28:10.705305+00	\N	\N	\N	\N
2224	250	B	2026-10-29 06:28:12.597799+00	\N	\N	\N	\N
2241	1204	C	2026-10-29 06:28:14.722411+00	\N	\N	\N	\N
2224	252	C	2026-10-29 06:28:15.221365+00	\N	\N	\N	\N
2264	282	C	2026-10-29 06:28:16.569336+00	\N	\N	\N	\N
2224	262	A	2026-10-29 06:28:17.407044+00	\N	\N	\N	\N
2233	1190	D	2026-10-29 06:28:20.5717+00	\N	\N	\N	\N
2264	272	C	2026-10-29 06:28:20.941692+00	\N	\N	\N	\N
2261	276	C	2026-10-29 06:28:21.493857+00	\N	\N	\N	\N
2253	1197	B	2026-10-29 06:28:22.506088+00	\N	\N	\N	\N
2252	1192	C	2026-10-29 06:28:24.274665+00	\N	\N	\N	\N
2230	255	D	2026-10-29 06:28:24.4471+00	\N	\N	\N	\N
2264	271	D	2026-10-29 06:28:25.080189+00	\N	\N	\N	\N
2224	256	C	2026-10-29 06:28:26.463503+00	\N	\N	\N	\N
2243	1199	A	2026-10-29 06:28:28.226034+00	\N	\N	\N	\N
2264	269	A	2026-10-29 06:28:29.493229+00	\N	\N	\N	\N
2224	261	B	2026-10-29 06:28:29.609168+00	\N	\N	\N	\N
2233	1196	B	2026-10-29 06:28:29.966752+00	\N	\N	\N	\N
2224	255	C	2026-10-29 06:28:35.081503+00	\N	\N	\N	\N
2263	277	A	2026-10-29 06:28:35.980251+00	\N	\N	\N	\N
2233	1199	C	2026-10-29 06:28:39.288095+00	\N	\N	\N	\N
2241	1195	A	2026-10-29 06:28:39.319604+00	\N	\N	\N	\N
2263	271	C	2026-10-29 06:28:41.354618+00	\N	\N	\N	\N
2222	263	A	2026-10-29 06:28:44.911505+00	\N	\N	\N	\N
2263	272	A	2026-10-29 06:28:45.291249+00	\N	\N	\N	\N
2241	1202	D	2026-10-29 06:28:45.607293+00	\N	\N	\N	\N
2233	1202	C	2026-10-29 06:28:45.995001+00	\N	\N	\N	\N
2243	1200	B	2026-10-29 06:28:46.004793+00	\N	\N	\N	\N
2247	1195	C	2026-10-29 06:28:48.624147+00	\N	\N	\N	\N
2263	276	D	2026-10-29 06:28:48.70825+00	\N	\N	\N	\N
2230	253	C	2026-10-29 06:28:49.916708+00	\N	\N	\N	\N
2263	273	A	2026-10-29 06:28:52.75618+00	\N	\N	\N	\N
2252	1191	B	2026-10-29 06:28:53.61076+00	\N	\N	\N	\N
2233	1198	A	2026-10-29 06:28:55.634013+00	\N	\N	\N	\N
2263	281	B	2026-10-29 06:28:56.384787+00	\N	\N	\N	\N
2233	1200	C	2026-10-29 06:28:58.019645+00	\N	\N	\N	\N
2263	280	B	2026-10-29 06:28:59.252556+00	\N	\N	\N	\N
2224	260	C	2026-10-29 06:28:59.827298+00	\N	\N	\N	\N
2228	256	B	2026-10-29 06:29:00.207764+00	\N	\N	\N	\N
2233	1201	A	2026-10-29 06:29:01.120275+00	\N	\N	\N	\N
2243	1203	A	2026-10-29 06:29:01.329106+00	\N	\N	\N	\N
2263	282	D	2026-10-29 06:29:03.021759+00	\N	\N	\N	\N
2233	1195	C	2026-10-29 06:29:03.751311+00	\N	\N	\N	\N
2252	1202	A	2026-10-29 06:29:04.289676+00	\N	\N	\N	\N
2263	274	A	2026-10-29 06:29:06.756595+00	\N	\N	\N	\N
2261	279	D	2026-10-29 06:29:07.114826+00	\N	\N	\N	\N
2229	251	C	2026-10-29 06:29:07.949912+00	\N	\N	\N	\N
2253	1195	A	2026-10-29 06:29:09.011635+00	\N	\N	\N	\N
2233	1203	B	2026-10-29 06:29:09.402091+00	\N	\N	\N	\N
2263	278	B	2026-10-29 06:29:11.423309+00	\N	\N	\N	\N
2247	1198	A	2026-10-29 06:29:11.752309+00	\N	\N	\N	\N
2261	273	B	2026-10-29 06:29:12.959433+00	\N	\N	\N	\N
2254	273	A	2026-10-29 06:29:12.996274+00	\N	\N	\N	\N
2228	249	C	2026-10-29 06:29:14.035214+00	\N	\N	\N	\N
2222	253	C	2026-10-29 06:29:14.489705+00	\N	\N	\N	\N
2234	1194	A	2026-10-29 06:29:16.807039+00	\N	\N	\N	\N
2251	1199	B	2026-10-29 06:29:17.288512+00	\N	\N	\N	\N
2243	1196	B	2026-10-29 06:29:19.132882+00	\N	\N	\N	\N
2241	1199	D	2026-10-29 06:29:19.169206+00	\N	\N	\N	\N
2252	1204	A	2026-10-29 06:29:20.221343+00	\N	\N	\N	\N
2228	263	C	2026-10-29 06:29:20.657857+00	\N	\N	\N	\N
2261	282	B	2026-10-29 06:29:23.10423+00	\N	\N	\N	\N
2222	255	D	2026-10-29 06:29:25.051083+00	\N	\N	\N	\N
2264	275	B	2026-10-29 06:29:25.965416+00	\N	\N	\N	\N
2233	1206	لا	2026-10-29 06:30:08.644731+00	\N	\N	\N	\N
2241	1201	A	2026-10-29 06:30:10.86175+00	\N	\N	\N	\N
2234	1195	A	2026-10-29 06:30:11.333039+00	\N	\N	\N	\N
2243	1190	C	2026-10-29 06:30:11.422804+00	\N	\N	\N	\N
2254	283	D	2026-10-29 06:30:13.045721+00	\N	\N	\N	\N
2233	1207	لا	2026-10-29 06:30:13.098352+00	\N	\N	\N	\N
2254	271	B	2026-10-29 06:29:33.457589+00	\N	\N	\N	\N
2261	277	A	2026-10-29 06:29:33.758338+00	\N	\N	\N	\N
2247	1192	B	2026-10-29 06:29:33.834063+00	\N	\N	\N	\N
2230	259	A	2026-10-29 06:29:34.554572+00	\N	\N	\N	\N
2262	272	A	2026-10-29 06:30:13.354498+00	\N	\N	\N	\N
2253	1201	D	2026-10-29 06:30:14.459207+00	\N	\N	\N	\N
2224	264	BVVNNBVB VBVBCCV	2026-10-29 06:29:39.038333+00	\N	\N	\N	\N
2229	255	B	2026-10-29 06:30:16.530203+00	\N	\N	\N	\N
2229	261	A	2026-10-29 06:29:40.234118+00	\N	\N	\N	\N
2261	278	C	2026-10-29 06:30:17.206422+00	\N	\N	\N	\N
2228	262	A	2026-10-29 06:29:41.960144+00	\N	\N	\N	\N
2254	270	B	2026-10-29 06:29:42.278438+00	\N	\N	\N	\N
2230	254	B	2026-10-29 06:30:18.476704+00	\N	\N	\N	\N
2234	1197	B	2026-10-29 06:29:43.903021+00	\N	\N	\N	\N
2226	249	B	2026-10-29 06:29:47.028403+00	\N	\N	\N	\N
2261	272	D	2026-10-29 06:29:47.700637+00	\N	\N	\N	\N
2241	1194	A	2026-10-29 06:29:48.146292+00	\N	\N	\N	\N
2238	1190	D	2026-10-29 06:29:48.189552+00	\N	\N	\N	\N
2252	1198	C	2026-10-29 06:29:51.174086+00	\N	\N	\N	\N
2253	1199	A	2026-10-29 06:29:52.593226+00	\N	\N	\N	\N
2261	269	A	2026-10-29 06:29:54.029402+00	\N	\N	\N	\N
2228	253	C	2026-10-29 06:29:54.47192+00	\N	\N	\N	\N
2263	285	HJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ	2026-10-29 06:29:55.390725+00	\N	\N	\N	\N
2234	1198	C	2026-10-29 06:29:56.784007+00	\N	\N	\N	\N
2243	1191	C	2026-10-29 06:29:57.110529+00	\N	\N	\N	\N
2229	252	B	2026-10-29 06:29:59.143194+00	\N	\N	\N	\N
2233	1205	لا ا إ	2026-10-29 06:30:03.249445+00	\N	\N	\N	\N
2247	1200	B	2026-10-29 06:30:04.092421+00	\N	\N	\N	\N
2234	1192	D	2026-10-29 06:30:05.050362+00	\N	\N	\N	\N
2263	286	ASDDDDDDDDDDDDDDDDDDDDDDDD	2026-10-29 06:30:05.387264+00	\N	\N	\N	\N
2234	1199	C	2026-10-29 06:30:20.243189+00	\N	\N	\N	\N
2251	1190	D	2026-10-29 06:30:20.379488+00	\N	\N	\N	\N
2222	250	A	2026-10-29 06:30:20.573726+00	\N	\N	\N	\N
2226	258	D	2026-10-29 06:30:20.665596+00	\N	\N	\N	\N
2229	260	D	2026-10-29 06:30:24.713773+00	\N	\N	\N	\N
2241	1193	B	2026-10-29 06:30:29.871107+00	\N	\N	\N	\N
2222	260	A	2026-10-29 06:30:31.668556+00	\N	\N	\N	\N
2253	1200	B	2026-10-29 06:30:31.847659+00	\N	\N	\N	\N
2243	1204	A	2026-10-29 06:30:32.551209+00	\N	\N	\N	\N
2228	255	C	2026-10-29 06:30:35.436333+00	\N	\N	\N	\N
2264	280	C	2026-10-29 06:30:35.85912+00	\N	\N	\N	\N
2222	252	A	2026-10-29 06:30:39.69676+00	\N	\N	\N	\N
2234	1193	D	2026-10-29 06:30:40.258907+00	\N	\N	\N	\N
2252	1193	B	2026-10-29 06:30:41.130173+00	\N	\N	\N	\N
2222	256	D	2026-10-29 06:30:42.316179+00	\N	\N	\N	\N
2241	1203	D	2026-10-29 06:30:45.087398+00	\N	\N	\N	\N
2222	249	D	2026-10-29 06:30:45.199093+00	\N	\N	\N	\N
2254	274	B	2026-10-29 06:32:15.967102+00	\N	\N	\N	\N
2222	259	C	2026-10-29 06:30:47.396227+00	\N	\N	\N	\N
2261	284	هل هذه مكنسة؟	2026-10-29 06:31:26.073034+00	\N	\N	\N	\N
2251	1196	B	2026-10-29 06:30:47.741647+00	\N	\N	\N	\N
2252	1200	C	2026-10-29 06:30:47.996742+00	\N	\N	\N	\N
2229	256	C	2026-10-29 06:30:48.08514+00	\N	\N	\N	\N
2238	1195	B	2026-10-29 06:30:49.527954+00	\N	\N	\N	\N
2263	284	WWWWWWWWWWWWWWWWWWWWWWWWWW	2026-10-29 06:30:50.121542+00	\N	\N	\N	\N
2222	254	A	2026-10-29 06:30:50.581157+00	\N	\N	\N	\N
2234	1191	A	2026-10-29 06:30:51.917797+00	\N	\N	\N	\N
2226	254	D	2026-10-29 06:30:52.624092+00	\N	\N	\N	\N
2254	281	A	2026-10-29 06:30:57.007714+00	\N	\N	\N	\N
2252	1201	C	2026-10-29 06:31:00.379666+00	\N	\N	\N	\N
2253	1202	D	2026-10-29 06:31:05.463463+00	\N	\N	\N	\N
2234	1203	B	2026-10-29 06:31:08.020013+00	\N	\N	\N	\N
2247	1196	D	2026-10-29 06:33:41.927093+00	\N	\N	\N	\N
2241	1198	B	2026-10-29 06:31:13.156903+00	\N	\N	\N	\N
2261	285	هل هذه كراسة؟	2026-10-29 06:32:54.807524+00	\N	\N	\N	\N
2230	249	C	2026-10-29 06:31:15.323891+00	\N	\N	\N	\N
2247	1191	C	2026-10-29 06:31:15.887593+00	\N	\N	\N	\N
2228	252	C	2026-10-29 06:31:17.88688+00	\N	\N	\N	\N
2222	264	ALHAMDULILLAH	2026-10-29 06:31:18.311823+00	\N	\N	\N	\N
2264	274	B	2026-10-29 06:31:18.412123+00	\N	\N	\N	\N
2234	1204	A	2026-10-29 06:31:21.681482+00	\N	\N	\N	\N
2238	1196	D	2026-10-29 06:31:23.054967+00	\N	\N	\N	\N
2254	276	D	2026-10-29 06:31:24.409349+00	\N	\N	\N	\N
2251	1194	C	2026-10-29 06:31:25.465091+00	\N	\N	\N	\N
2243	1194	B	2026-10-29 06:31:28.310764+00	\N	\N	\N	\N
2262	269	C	2026-10-29 06:31:30.663607+00	\N	\N	\N	\N
2226	251	D	2026-10-29 06:31:33.07743+00	\N	\N	\N	\N
2229	253	C	2026-10-29 06:31:34.10307+00	\N	\N	\N	\N
2241	1197	B	2026-10-29 06:31:36.061448+00	\N	\N	\N	\N
2222	265	MASYA ALLAH	2026-10-29 06:31:36.964021+00	\N	\N	\N	\N
2243	1202	B	2026-10-29 06:31:38.569331+00	\N	\N	\N	\N
2228	251	C	2026-10-29 06:31:41.613692+00	\N	\N	\N	\N
2228	254	A	2026-10-29 06:31:47.141281+00	\N	\N	\N	\N
2253	1191	C	2026-10-29 06:32:55.599857+00	\N	\N	\N	\N
2251	1204	B	2026-10-29 06:31:50.941212+00	\N	\N	\N	\N
2264	276	B	2026-10-29 06:31:53.150084+00	\N	\N	\N	\N
2247	1203	C	2026-10-29 06:31:53.639792+00	\N	\N	\N	\N
2238	1199	A	2026-10-29 06:31:57.37617+00	\N	\N	\N	\N
2229	263	D	2026-10-29 06:31:59.196648+00	\N	\N	\N	\N
2253	1193	A	2026-10-29 06:32:02.040432+00	\N	\N	\N	\N
2238	1202	B	2026-10-29 06:32:04.390251+00	\N	\N	\N	\N
2251	1203	D	2026-10-29 06:33:01.343515+00	\N	\N	\N	\N
2226	262	C	2026-10-29 06:32:05.518096+00	\N	\N	\N	\N
2228	265	نعم	2026-10-29 06:33:02.864847+00	\N	\N	\N	\N
2230	261	B	2026-10-29 06:32:09.356867+00	\N	\N	\N	\N
2228	258	C	2026-10-29 06:32:09.690595+00	\N	\N	\N	\N
2229	265	نعم	2026-10-29 06:33:46.351465+00	\N	\N	\N	\N
2251	1195	C	2026-10-29 06:32:10.110012+00	\N	\N	\N	\N
2234	1207	نعم	2026-10-29 06:33:47.941671+00	\N	\N	\N	\N
2238	1200	B	2026-10-29 06:33:06.490453+00	\N	\N	\N	\N
2230	262	A	2026-10-29 06:33:07.424189+00	\N	\N	\N	\N
2230	256	C	2026-10-29 06:33:49.958409+00	\N	\N	\N	\N
2229	254	D	2026-10-29 06:32:20.003113+00	\N	\N	\N	\N
2230	251	B	2026-10-29 06:32:22.891833+00	\N	\N	\N	\N
2251	1201	C	2026-10-29 06:32:23.786993+00	\N	\N	\N	\N
2238	1193	A	2026-10-29 06:34:56.918642+00	\N	\N	\N	\N
2228	266	نعم	2026-10-29 06:33:10.845538+00	\N	\N	\N	\N
2247	1201	C	2026-10-29 06:35:26.87118+00	\N	\N	\N	\N
2241	1206	عند قزة قزعن	2026-10-29 06:34:03.094703+00	\N	2014	2026-10-29 06:44:10.874515+00	50.00
2222	266	LAA HAULAA WALAA QUWWATA ILLA BILLAH	2026-10-29 06:32:28.48743+00	\N	\N	\N	\N
2224	266	قححااتممكتتلإوت	2026-10-29 06:34:58.269437+00	\N	\N	\N	\N
2251	1206	حينما سو3ت سجةت	2026-10-29 06:36:47.592358+00	\N	\N	\N	\N
2243	1205	جكللمططك	2026-10-29 06:33:57.047128+00	\N	\N	\N	\N
2238	1192	B	2026-10-29 06:32:29.890048+00	\N	\N	\N	\N
2226	263	B	2026-10-29 06:33:57.504724+00	\N	\N	\N	\N
2243	1206	فهلث	2026-10-29 06:34:00.172272+00	\N	\N	\N	\N
2229	262	C	2026-10-29 06:32:31.502994+00	\N	\N	\N	\N
2226	250	A	2026-10-29 06:33:19.301486+00	\N	\N	\N	\N
2247	1197	A	2026-10-29 06:36:26.832854+00	\N	\N	\N	\N
2264	286	جميل	2026-10-29 06:46:46.432659+00	\N	\N	\N	\N
2229	264	نعم	2026-10-29 06:33:23.053066+00	\N	\N	\N	\N
2247	1190	D	2026-10-29 06:34:04.422654+00	\N	\N	\N	\N
2226	259	A	2026-10-29 06:32:36.037377+00	\N	\N	\N	\N
2262	282	A	2026-10-29 06:32:37.05916+00	\N	\N	\N	\N
2243	1207	غماس	2026-10-29 06:34:04.989298+00	\N	\N	\N	\N
2230	264		2026-10-29 06:34:09.310406+00	\N	\N	\N	\N
2252	1205	۱۵ موضعا	2026-10-29 06:32:39.594299+00	\N	\N	\N	\N
2253	1192	B	2026-10-29 06:33:25.888673+00	\N	\N	\N	\N
2251	1197	A	2026-10-29 06:32:44.086995+00	\N	\N	\N	\N
2262	283	C	2026-10-29 06:33:26.273412+00	\N	\N	\N	\N
2234	1205	نعم	2026-10-29 06:33:26.674788+00	\N	\N	\N	\N
2229	266	نعم	2026-10-29 06:35:02.437741+00	\N	\N	\N	\N
2243	1195	A	2026-10-29 06:32:47.988362+00	\N	\N	\N	\N
2228	264	نعم	2026-10-29 06:32:49.656423+00	\N	\N	\N	\N
2264	285	هل هد	2026-10-29 06:37:32.117775+00	\N	\N	\N	\N
2254	279	D	2026-10-29 06:32:52.319488+00	\N	\N	\N	\N
2251	1198	D	2026-10-29 06:33:29.822977+00	\N	\N	\N	\N
2261	286	حميد تلميذ	2026-10-29 06:36:18.653464+00	\N	\N	\N	\N
2254	278	D	2026-10-29 06:33:35.236461+00	\N	\N	\N	\N
2253	1207	SUBUH. DUHUR, ISYA	2026-10-29 06:37:29.244803+00	\N	\N	\N	\N
2226	253	A	2026-10-29 06:36:29.287185+00	\N	\N	\N	\N
2251	1205	الثاني	2026-10-29 06:34:21.722476+00	\N	\N	\N	\N
2230	258	D	2026-10-29 06:33:37.545163+00	\N	\N	\N	\N
2238	1206	نعمه	2026-10-29 06:38:35.356931+00	\N	\N	\N	\N
2234	1206	نعم	2026-10-29 06:33:39.345483+00	\N	\N	\N	\N
2226	252	A	2026-10-29 06:35:53.992905+00	\N	\N	\N	\N
2238	1201	B	2026-10-29 06:34:49.827041+00	\N	\N	\N	\N
2253	1205	۱۴	2026-10-29 06:35:17.27528+00	\N	\N	\N	\N
2253	1198	D	2026-10-29 06:34:28.874066+00	\N	\N	\N	\N
2264	284	هل 	2026-10-29 06:36:06.979855+00	\N	\N	\N	\N
2224	265	التحبنكووإألنن	2026-10-29 06:34:52.121933+00	\N	\N	\N	\N
2252	1206	بعد قزاءة آية السددة	2026-10-29 06:35:19.00899+00	\N	\N	\N	\N
2252	1207	صيام زمضان ، صيام الندز،صيام القضاء	2026-10-29 06:37:24.488445+00	\N	\N	\N	\N
2262	279	C	2026-10-29 06:36:55.00588+00	\N	\N	\N	\N
2253	1206	بعد ق س	2026-10-29 06:36:57.727562+00	\N	\N	\N	\N
2254	284	هله عفتنم۲خمتتقث\n \n	2026-10-29 06:38:31.96267+00	\N	\N	\N	\N
2247	1205	۵	2026-10-29 06:37:25.497255+00	\N	\N	\N	\N
2238	1197	A	2026-10-29 06:36:00.062639+00	\N	\N	\N	\N
2226	264		2026-10-29 06:37:05.795343+00	\N	\N	\N	\N
2262	277	B	2026-10-29 06:37:06.533734+00	\N	\N	\N	\N
2238	1205	نعم	2026-10-29 06:37:19.379757+00	\N	\N	\N	\N
2254	285	اعهح۷۵۴3طعفففققعتمب	2026-10-29 06:39:08.878595+00	\N	\N	\N	\N
2238	1207	نعم	2026-10-29 06:37:36.933285+00	\N	\N	\N	\N
2262	278	D	2026-10-29 06:37:31.979251+00	\N	\N	\N	\N
2247	1206	۷	2026-10-29 06:37:38.200433+00	\N	\N	\N	\N
2247	1207	۴	2026-10-29 06:37:57.457422+00	\N	\N	\N	\N
2262	273	D	2026-10-29 06:38:53.921758+00	\N	\N	\N	\N
2262	270	B	2026-10-29 06:39:03.020159+00	\N	\N	\N	\N
2262	281	B	2026-10-29 06:39:36.887453+00	\N	\N	\N	\N
2254	286	بصطكنغقثثنمح	2026-10-29 06:39:18.78139+00	\N	\N	\N	\N
2241	1205	خمسة عشي	2026-10-29 06:33:11.419153+00	\N	2014	2026-10-29 06:43:57.535676+00	90.00
2262	284	نعم	2026-10-29 06:40:37.707772+00	\N	\N	\N	\N
2262	285	نعم	2026-10-29 06:40:49.024881+00	\N	\N	\N	\N
2262	286	نعم	2026-10-29 06:40:56.094371+00	\N	\N	\N	\N
2241	1207	مضن، ندز، كفزة	2026-10-29 06:34:56.312912+00	\N	2014	2026-10-29 06:44:19.118987+00	100.00
2265	292	D	2026-10-29 07:06:45.275733+00	\N	\N	\N	\N
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.schema_migrations (version, name, applied_at) FROM stdin;
1	subject-presentation-and-question-media	2026-10-09 06:14:28.38666+00
2	platform-owner-role	2026-10-12 11:09:54.355399+00
3	question-stimuli	2026-10-27 01:05:23.724777+00
4	complex-mc	2026-10-28 03:00:11.165462+00
5	pengawas-role	2026-11-02 04:36:38.046215+00
\.


--
-- Data for Name: school_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.school_settings (id, school_name, academic_year, semester, classes, grades, default_exam_duration_minutes, violation_threshold, updated_by, updated_at, mc_weight_percentage, essay_weight_percentage) FROM stdin;
1	IMBS Miftahul Ulum	2026/2027	Ganjil	["KELAS 1 RUANG 1", "KELAS 2 RUANG 2", "KELAS 1 RUANG 2", "KELAS 2 RUANG 1", "KELAS 3 RUANG 1", "KELAS 3 RUANG 2", "KELAS 4 RUANG 1", "KELAS 4 RUANG 2", "KELAS 5 RUANG 1", "KELAS 5 RUANG 2", "KELAS 6 RUANG 1", "KELAS 6 RUANG 2", "KELAS 1 RUANG 3", "KELAS 1 RUANG 4", "KELAS 2 RUANG 3", "KELAS 2 RUANG 4", "KELAS 3 RUANG 3", "KELAS 3 RUANG 4", "KELAS 4 RUANG 3", "KELAS 4 RUANG 4'", "KELAS 5 RUANG 3", "KELAS 5 RUANG 4", "KELAS 6 RUANG 3", "KELAS 6 RUANG 4"]	["1", "2", "3", "4", "5", "6"]	20	2	1	2026-10-29 03:58:59.085194+00	60	40
\.


--
-- Data for Name: subjects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subjects (id, name, created_by, created_at, language_code, text_direction) FROM stdin;
471	TAMRIN LUGHOH	1	2026-10-13 06:05:41.155035+00	ar	rtl
472	MUTHOLAAH	1	2026-10-13 06:05:56.088872+00	ar	rtl
473	NAHWU	1	2026-10-13 06:06:17.585124+00	ar	rtl
474	SHOROF	1	2026-10-13 06:06:26.120923+00	ar	rtl
475	MAHFUDZOT	1	2026-10-13 06:06:43.923109+00	ar	rtl
476	FIQH	1	2026-10-13 06:06:57.06285+00	ar	rtl
477	AQIDAH AKHLAK	1	2026-10-13 06:07:49.675721+00	ar	rtl
478	HADIST	1	2026-10-13 06:08:36.125926+00	ar	rtl
479	SEJARAH KEBUDAYAAN ISLAM	1	2026-10-13 06:10:34.169533+00	ar	rtl
470	Al-QURAN	1	2026-10-13 05:27:16.7901+00	ar	rtl
482	SIMULASI	1	2026-10-28 05:28:35.766822+00	ar	rtl
\.


--
-- Data for Name: teacher_access; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.teacher_access (teacher_id, subject_id, class_name) FROM stdin;
1874	473	KELAS 1 RUANG 1
1874	473	KELAS 2 RUANG 1
1874	473	KELAS 3 RUANG 1
1874	473	KELAS 4 RUANG 1
1874	473	KELAS 5 RUANG 1
2014	476	KELAS 1 RUANG 1
2014	476	KELAS 3 RUANG 1
2014	476	KELAS 2 RUANG 1
2014	477	KELAS 1 RUANG 1
2014	477	KELAS 3 RUANG 1
2014	477	KELAS 2 RUANG 1
2014	475	KELAS 1 RUANG 1
2014	475	KELAS 3 RUANG 1
2014	475	KELAS 2 RUANG 1
2014	473	KELAS 1 RUANG 1
2014	473	KELAS 3 RUANG 1
2014	473	KELAS 2 RUANG 1
2014	474	KELAS 1 RUANG 1
2014	474	KELAS 3 RUANG 1
2014	474	KELAS 2 RUANG 1
2014	470	KELAS 1 RUANG 1
2014	470	KELAS 3 RUANG 1
2014	470	KELAS 2 RUANG 1
2014	478	KELAS 1 RUANG 1
2014	478	KELAS 3 RUANG 1
2014	478	KELAS 2 RUANG 1
2014	472	KELAS 1 RUANG 1
2014	472	KELAS 3 RUANG 1
2014	472	KELAS 2 RUANG 1
2014	479	KELAS 1 RUANG 1
2014	479	KELAS 3 RUANG 1
2014	479	KELAS 2 RUANG 1
2014	482	KELAS 1 RUANG 1
2014	482	KELAS 3 RUANG 1
2014	482	KELAS 2 RUANG 1
2014	471	KELAS 1 RUANG 1
2014	471	KELAS 3 RUANG 1
2014	471	KELAS 2 RUANG 1
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_sessions (sid, sess, expire) FROM stdin;
DhCGGDtKDjiKr3VZPJ2pqx3bSH4haMie	{"cookie":{"originalMaxAge":28800000,"expires":"2026-10-12T16:55:19.932Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"user":{"id":"1","username":"admin","email":null,"name":"Admin IMBS","role":"admin","className":null}}	2026-10-12 16:55:21
IG0GpVWIIlwnhYshbvtKmpw5bOxAXcBt	{"cookie":{"originalMaxAge":28800000,"expires":"2026-10-12T17:49:17.243Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"user":{"id":"1","username":"admin","email":null,"name":"Admin IMBS","role":"admin","className":null}}	2026-10-12 17:49:18
YwHOAcB7cB67BJXRbPazOgm2TMnrlOEp	{"cookie":{"originalMaxAge":28800000,"expires":"2026-10-12T18:03:40.723Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"user":{"id":"1","username":"admin","email":null,"name":"Admin IMBS","role":"admin","className":null}}	2026-10-12 18:03:41
mLqB57oIRGRlTZlR3zJ5i9F_HfhCrhR0	{"cookie":{"originalMaxAge":28800000,"expires":"2026-10-12T19:27:15.760Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"user":{"id":"1944","username":"platform_owner","email":null,"name":"Pemilik Platform","role":"platform_owner","className":null}}	2026-10-12 19:48:56
JqtGZartj0xWQ5lBZLDgHvr5zZXAba20	{"cookie":{"originalMaxAge":28800000,"expires":"2026-10-12T12:42:05.627Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"user":{"id":"1","username":"admin","name":"Admin IMBS","role":"admin","className":null}}	2026-10-12 12:44:09
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, full_name, role, password_hash, class_name, active, created_at) FROM stdin;
1972	IMBS-6D2C1	AIMANUN SALIM, S.Pd	student	$2b$10$5S5LyBosIM.gGL21iWZ6v.qEnkn7ayUMDk/rLMDXBG7SbnFlJeACW	KELAS 3 RUANG 1	t	2026-10-29 04:41:51.822252+00
1973	IMBS-859D3	ARIEF BUDIMAN, M.Pd.I	student	$2b$10$k90Ph6fDUXbKAe.lHe4MGOsAnZQpL6izO977AA8QgIt/kSlaA9v/m	KELAS 3 RUANG 1	t	2026-10-29 04:41:51.822252+00
1974	IMBS-143E4	ASMAH EKA NURJANNAH, S.Pd	student	$2b$10$GIskS7dP5Zyg3xhaRi1Lm.CYZTWdIXwhXx2qAEqX/OWsVaCkg0ZCm	KELAS 3 RUANG 1	t	2026-10-29 04:41:51.822252+00
1975	IMBS-6A82E	ASRISA WIRANSA, S.Pd	student	$2b$10$3yV1Jlz.J2V7tZJCw1KpJuifWYRqh/hpRJlfh8Co87Z87pgdA1kD.	KELAS 3 RUANG 1	t	2026-10-29 04:41:51.822252+00
1976	IMBS-BC12B	BIMO BAGUS WIDYAWAN, S.Pd	student	$2b$10$IWhsW4Y.4V/8jbLHPxNlLu2F/Nq936Ry1eN8jHqkXQxGpc7Qibbpq	KELAS 3 RUANG 1	t	2026-10-29 04:41:51.822252+00
1977	IMBS-2A78C	DINA KAMILIA SARI, S.Pd	student	$2b$10$i4aUIPxCrETsEFIDCTIH2eALcWkZDWD.v/1B/9yw6hrZsSqCgBvg2	KELAS 3 RUANG 1	t	2026-10-29 04:41:51.822252+00
1978	IMBS-AA9E1	Dra. Hj. EVA FARIDA	student	$2b$10$rE6fC2fszL3Pw8dfEuNwC.M3rQwtHE6lSlj.T3gF9uPABZtgO/WwG	KELAS 3 RUANG 1	t	2026-10-29 04:41:51.822252+00
1979	IMBS-E1923	ANI FITHRAINI, S.T	student	$2b$10$5GGO7dP4Nk0famS5B1VhRulprUxpklnqlvlix/lGAOwR4y.zJrTbi	KELAS 3 RUANG 1	t	2026-10-29 04:41:51.822252+00
1980	IMBS-49AE3	FARAH LEA MAGDALENA, M.Pd.I	student	$2b$10$rmDiFyzjAHjQ.UfCJxX8nusQeUcM7gmdQ5TiZ2cYbHTS.53pGVcju	KELAS 3 RUANG 1	t	2026-10-29 04:41:51.822252+00
1874	alif	Alif Rilo Pambudi, S.E	teacher	$2b$12$7osu66KIaPU779mD7ScfjeQ6oA.CNpwaRKFgcxdNE5HkbLx9uqkei	\N	t	2026-10-10 06:19:30.513468+00
1944	platform_owner	Pemilik Platform	platform_owner	$2b$12$FEkAEUCZ5CqHBcU75Ip60ebBGH7/8kRmfQgY6rMicRjE9XUs.PMpq	\N	t	2026-10-12 11:11:19.168859+00
1981	IMBS-A929E	FIFI PRAPITA LIANA, S.Pd	student	$2b$10$bBwszQw5F8cKFoCir2NpvezsFI2uR0mGlRMKc60nnM4sKD8.ezm12	KELAS 3 RUANG 1	t	2026-10-29 04:41:51.822252+00
1	admin	Admin IMBS Miftahul Ulum	admin	$2b$12$4aBoVeyjz4unomHyeL.coe37s5ISYP2DV/Ut766ub6JaXhU/XwCzO	\N	t	2026-09-29 06:53:14.269052+00
1970	IMBS-F1A10	Alif	student	$2b$10$2J1.jeUCkbGQtI5dhQWDPuzlFFEHjbsIG3FjR/kzEfgaDEQ5OOY5e	KELAS 2 RUANG 1	t	2026-10-26 03:55:44.691451+00
1971	IMBS-094A2	AGUS DWI PRAMONO S.Pd	student	$2b$10$KXZQP7lM7nmUivyp3M8qgOKFiByfiyUjnmQ1UqJyHDzh1Hj...F76	KELAS 3 RUANG 1	t	2026-10-29 04:41:51.822252+00
1982	IMBS-32B0F	FITRI MILADINA, S.Pd	student	$2b$10$X6q2LLUiwS3dhakD2FL3EuTU6X5xanSm1UpnL.EMopO7rixvhSUKO	KELAS 2 RUANG 1	t	2026-10-29 04:41:51.822252+00
1983	IMBS-37904	HARNINGSIH, S.Pd	student	$2b$10$kQSZhs9EjyGa5XyHRyLJBuepm4NPJCfTBMWFcSqqtLMP53JPZjgAi	KELAS 2 RUANG 1	t	2026-10-29 04:41:51.822252+00
1984	IMBS-97212	HARTONO S.Pd.I	student	$2b$10$YBLmN/WV4nEv27/R2nlE2OUYjMs2D5dZmWPunbjzyAzQhGw0Z9dWG	KELAS 2 RUANG 1	t	2026-10-29 04:41:51.822252+00
1985	IMBS-89BB3	HERU IRAWAN, S.Pd	student	$2b$10$0qYu0LJQscScsIU2UxMrLOjGLuL1vGGflqZUc6g8fnqe/y4U34Yh.	KELAS 2 RUANG 1	t	2026-10-29 04:41:51.822252+00
1986	IMBS-47F32	IDLALIYAH FAIQOH, S.Pd.I	student	$2b$10$otvrV/ELLwecDfVpO7hFou4jf6jtP0IrpmayhoimB4QoqgjsXBQBS	KELAS 2 RUANG 1	t	2026-10-29 04:41:51.822252+00
1987	IMBS-3ED26	IKA BUDIARTI S.Pd	student	$2b$10$HkJcfu7dBlBHd43FRQBOReLjHodbXvQc4ckdE9VAB/Sn45ecKHRN2	KELAS 2 RUANG 1	t	2026-10-29 04:41:51.822252+00
1988	IMBS-D9E23	KHOERUNISA, S.Pd	student	$2b$10$ioG1AXVHm50nkJA..kBuU.YguH5nsZdHSRILGedhXjR4mMwvGjC0q	KELAS 2 RUANG 1	t	2026-10-29 04:41:51.822252+00
1989	IMBS-E6088	KUSUMA NATA LAKSANA, S.Pd	student	$2b$10$1U1CTx9oSdLOJxEuO8qUlOoktQUQJp7sq9LJsEnrbod4rFlf.I652	KELAS 2 RUANG 1	t	2026-10-29 04:41:51.822252+00
1990	IMBS-A1CD6	M. AGUS KURNIAWAN, S.HI	student	$2b$10$0yMxQ2cQKSr8JIJ9y6vfNO11kaSoKHhEw1yITwjwbhtEH8lbrEdGC	KELAS 2 RUANG 1	t	2026-10-29 04:41:51.822252+00
1991	IMBS-50B88	M. ARIEL RAMADHAN LOUIS, M.Pd	student	$2b$10$Pb4P55szPmoNYlqXn2GPAuztjbkgNG2PkVZoeLtIDYIFWkQqxmPI6	KELAS 2 RUANG 1	t	2026-10-29 04:41:51.822252+00
1992	IMBS-36D92	M. ARIF MAULANA, S.Pd	student	$2b$10$wtr9O7O68DnAmdGhehghlesL1vxLTfb7IYX4/OTdHwEJwcSEQ0Hxy	KELAS 2 RUANG 1	t	2026-10-29 04:41:51.822252+00
1993	IMBS-21D5C	M. FATKHUROHMAN S.Pd	student	$2b$10$DG9BLPWiOyGzB/Scr5TPgOHKX.yNz9ObLHzwOYnogtMozSGJnpaWC	KELAS 2 RUANG 1	t	2026-10-29 04:41:51.822252+00
1994	IMBS-EB61D	M. GHUFRON IQBAL, M.Pd.	student	$2b$10$x5roZT1ITCMy1GtQj3w/0ug37aM78rQWhO9V5ixT8YUvMoGIe9you	KELAS 2 RUANG 1	t	2026-10-29 04:41:51.822252+00
1995	IMBS-A4BD3	M. HANIF WIBISANA, S.Si	student	$2b$10$x0sEJbr1nA6kPhg/r/.ehewJ0WnrmWXAosWxJ/.T2H..xvpJIi64O	KELAS 2 RUANG 1	t	2026-10-29 04:41:51.822252+00
1996	IMBS-1667F	M. KHAIRUDDIN, S.Pd	student	$2b$10$voavxiE0UHLKUwj8pkVoZ.0sMv5qcAwD4X8nB3BOkeAuqnsypJg.e	KELAS 2 RUANG 1	t	2026-10-29 04:41:51.822252+00
1997	IMBS-2F481	M. SUKRON, S.Pd.I	student	$2b$10$XQC99fqH1f8yKKrM3Xj5O.MuvU4ccI9QVjBbSy04ZUiZyS5fD/24a	KELAS 2 RUANG 1	t	2026-10-29 04:41:51.822252+00
1998	IMBS-04FB4	MAUIDHATUL KHASANAH, S.Pd	student	$2b$10$d1LuH59IJh3Wf3kHNSIvFudfnezqKXaw9KAE4n1i7HofEwONfhU3.	KELAS 2 RUANG 1	t	2026-10-29 04:41:51.822252+00
1999	IMBS-7FFED	MEDIANA, S.Ag	student	$2b$10$hBJzkoG.DgDVSglAKg49ZeqjuWVQcezEm17cDGhDctdhizMXsV3uK	KELAS 2 RUANG 1	t	2026-10-29 04:41:51.822252+00
2000	IMBS-5491E	MUFTI HIDAYAT, S.H	student	$2b$10$pwk.51lod5DK2sXMYJvPoeo75eKGMsQslm/a9CcQxSoIiSZ7xAF2y	KELAS 2 RUANG 1	t	2026-10-29 04:41:51.822252+00
2001	IMBS-F5D3B	NASY'IAH AISYIYAH,S.Fil.I	student	$2b$10$6xEMPQKDa5giGa.jtTzX2e8nvPds43.DDkdaCUQtZM1SoGCzXDGSS	KELAS 2 RUANG 1	t	2026-10-29 04:41:51.822252+00
2002	IMBS-9E9BE	NISA' AFIYATUS SHADIQOH, S.Pd	student	$2b$10$w.GRrMfFzte/Kc/kVtpzt.8WMGSrK4OE3JPUmjJaYYzHg3Ai5.CZK	KELAS 2 RUANG 1	t	2026-10-29 04:41:51.822252+00
2003	IMBS-F18BD	NOVIA KUSUMA DEWI, S.Pd	student	$2b$10$H7IHn5OtJNC2IhYURT7iker6zs.bztrBXcVNzg1rJr143lUPV8w0S	KELAS 1 RUANG 1	t	2026-10-29 04:41:51.822252+00
2004	IMBS-0A6DB	RINA MARDIKA WATI, S.Pd	student	$2b$10$YDm7w3oE2A/AIqyXqBAwjuH17D0K2bhW/GLZ6lcQhg9d6wUTe1kii	KELAS 1 RUANG 1	t	2026-10-29 04:41:51.822252+00
2005	IMBS-877B8	RIO ARDIAN FAJAR PRATAMA, S.Pd	student	$2b$10$UyvJxK9fIjSQms4n7gkptuQjAPFMswBv89YpHBKvCQXBeAhHJsPaq	KELAS 1 RUANG 1	t	2026-10-29 04:41:51.822252+00
2006	IMBS-6799B	ROHMATUL IZZAH, S.Pd	student	$2b$10$9TkaDLx2JBR.K3Wc9wMMqOgwHgRvPz4G2nvXtH7ukBAqwvjYDGttu	KELAS 1 RUANG 1	t	2026-10-29 04:41:51.822252+00
2007	IMBS-B1348	ROKHMANIA FATMAWATI, S.E.Sy	student	$2b$10$MYpITBawSSlb8.PkdZv4YO.xCuxKbV7V.89O8H3saWKsL2z3We1we	KELAS 1 RUANG 1	t	2026-10-29 04:41:51.822252+00
2008	IMBS-8D496	SODIK SAMIARSO S.Pd	student	$2b$10$yr.t9p7euuPVBwG/oKIT6.R1GC4eeMR71q3mSL3MiL.DvQttoRBae	KELAS 1 RUANG 1	t	2026-10-29 04:41:51.822252+00
2009	IMBS-49E3C	SRI PRIHANTINI KRISTANTINA, S.Si	student	$2b$10$pVHtpsUNC0TvOCq2HI4Bn.NbA/ITOYb8p.EQFYIUu3GUGxoNHvh1.	KELAS 1 RUANG 1	t	2026-10-29 04:41:51.822252+00
2010	IMBS-95B66	SUMARNINGSIH, SE	student	$2b$10$C.VSPXna7hQfo6pl/7Z1rO0P0ux/DkfOQ4o1Qvo6.4jIPHK1UCOYm	KELAS 1 RUANG 1	t	2026-10-29 04:41:51.822252+00
2011	IMBS-9F3A0	TRI MAYA SARI, S.Pd.	student	$2b$10$n5fWcoSWk42XL/jxgafEZu9krnIOBRwPycrgIrK1B46UAVDRnYUii	KELAS 1 RUANG 1	t	2026-10-29 04:41:51.822252+00
2012	IMBS-1AE8F	ZULI ASTUTIK, S.E	student	$2b$10$36cOYy.NMQLM.qio1TSZsuh7zZZXb/aT5f98w/.id.lksXv0TekA6	KELAS 1 RUANG 1	t	2026-10-29 04:41:51.822252+00
2013	IMBS-D5991	NAILIS SHOFITA, S.Pd, M.A	student	$2b$10$UNN1F61MdZNL2aiMnKdAPOqa4n1U0qTq.uG16WxYCgTmiunXMyjYm	KELAS 1 RUANG 1	t	2026-10-29 04:41:51.822252+00
2014	pengawas	PENGAWAS RUANG 1	teacher	$2b$12$AuMgGjX.RbJSN1Ll/w00mu8U3Cn239cWdjDOUxYEVG/hj5Zkn6rp2	\N	t	2026-10-29 04:45:07.992351+00
2015	IMBS-A49AC	fulaan	student	$2b$10$1mAo8tJZ7hhA.vfN9uenJuPdc4qBFJ6Y1IIup8aLEuymyHhjz9jf6	KELAS 6 RUANG 1	t	2026-10-29 07:03:09.414124+00
2016	pengawas_imbs	pengawas	pengawas	$2b$12$ksJFKcZHT7kUYtIBofSHx.hPSkMMafuChr105tFByHNQgOt9aW.qq	\N	t	2026-11-02 04:39:05.725468+00
\.


--
-- Data for Name: violation_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.violation_events (id, session_id, code, detail, created_at, review_status, reviewed_by, review_reason, reviewed_at) FROM stdin;
53	2222	context_menu	Menu konteks diblokir di halaman ujian.	2026-10-29 06:29:45.295368+00	dismissed	1	teledor	2026-10-29 06:30:07.840175+00
54	2222	fullscreen_exit	Mode layar penuh berakhir.	2026-10-29 06:29:49.821118+00	dismissed	1	teledor	2026-10-29 06:30:07.840175+00
55	2224	fullscreen_exit	Mode layar penuh berakhir.	2026-10-29 06:30:01.216525+00	dismissed	1	ga sengaja	2026-10-29 06:30:20.910051+00
56	2224	window_blur	Jendela ujian kehilangan fokus.	2026-10-29 06:30:05.424797+00	dismissed	1	ga sengaja	2026-10-29 06:30:20.910051+00
57	2230	clipboard	Percobaan salin atau tempel di halaman ujian.	2026-10-29 06:30:30.931575+00	dismissed	1	kepencet	2026-10-29 06:30:53.35725+00
58	2230	clipboard	Percobaan salin atau tempel di halaman ujian.	2026-10-29 06:30:37.39281+00	dismissed	1	kepencet	2026-10-29 06:30:53.35725+00
59	2226	clipboard	Percobaan salin atau tempel di halaman ujian.	2026-10-29 06:37:13.905282+00	confirmed	2014	SENGAJA	2026-10-29 06:39:23.084241+00
60	2226	window_blur	Jendela ujian kehilangan fokus.	2026-10-29 06:37:16.098958+00	confirmed	2014	SENGAJA	2026-10-29 06:39:23.084241+00
61	2265	window_blur	Jendela ujian kehilangan fokus.	2026-10-29 07:07:10.084115+00	dismissed	1	ok	2026-10-29 07:07:44.482345+00
62	2265	clipboard	Percobaan salin atau tempel di halaman ujian.	2026-10-29 07:07:32.513881+00	dismissed	1	ok	2026-10-29 07:07:44.482345+00
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 3133, true);


--
-- Name: exam_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.exam_sessions_id_seq', 2265, true);


--
-- Name: exams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.exams_id_seq', 72, true);


--
-- Name: question_banks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.question_banks_id_seq', 205, true);


--
-- Name: question_media_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.question_media_id_seq', 105, true);


--
-- Name: question_stimuli_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.question_stimuli_id_seq', 9, true);


--
-- Name: questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.questions_id_seq', 1434, true);


--
-- Name: subjects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.subjects_id_seq', 482, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 2016, true);


--
-- Name: violation_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.violation_events_id_seq', 62, true);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: exam_questions exam_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_pkey PRIMARY KEY (session_id, question_id);


--
-- Name: exam_questions exam_questions_session_id_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_session_id_position_key UNIQUE (session_id, "position");


--
-- Name: exam_sessions exam_sessions_exam_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_sessions
    ADD CONSTRAINT exam_sessions_exam_id_student_id_key UNIQUE (exam_id, student_id);


--
-- Name: exam_sessions exam_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_sessions
    ADD CONSTRAINT exam_sessions_pkey PRIMARY KEY (id);


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);


--
-- Name: question_banks question_banks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_banks
    ADD CONSTRAINT question_banks_pkey PRIMARY KEY (id);


--
-- Name: question_banks question_banks_subject_id_grade_topic_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_banks
    ADD CONSTRAINT question_banks_subject_id_grade_topic_key UNIQUE (subject_id, grade, topic);


--
-- Name: question_media question_media_file_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_media
    ADD CONSTRAINT question_media_file_key_key UNIQUE (file_key);


--
-- Name: question_media question_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_media
    ADD CONSTRAINT question_media_pkey PRIMARY KEY (id);


--
-- Name: question_media question_media_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_media
    ADD CONSTRAINT question_media_question_id_key UNIQUE (question_id);


--
-- Name: question_stimuli question_stimuli_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_stimuli
    ADD CONSTRAINT question_stimuli_pkey PRIMARY KEY (id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: responses responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responses
    ADD CONSTRAINT responses_pkey PRIMARY KEY (session_id, question_id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: school_settings school_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_settings
    ADD CONSTRAINT school_settings_pkey PRIMARY KEY (id);


--
-- Name: user_sessions session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: subjects subjects_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_name_key UNIQUE (name);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: teacher_access teacher_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_access
    ADD CONSTRAINT teacher_access_pkey PRIMARY KEY (teacher_id, subject_id, class_name);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: violation_events violation_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.violation_events
    ADD CONSTRAINT violation_events_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.user_sessions USING btree (expire);


--
-- Name: idx_exam_sessions_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_sessions_student_id ON public.exam_sessions USING btree (student_id);


--
-- Name: idx_questions_bank_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_bank_type ON public.questions USING btree (bank_id, type);


--
-- Name: idx_questions_stimulus_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_stimulus_id ON public.questions USING btree (stimulus_id);


--
-- Name: idx_sessions_exam_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_exam_status ON public.exam_sessions USING btree (exam_id, status);


--
-- Name: idx_stimuli_bank_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stimuli_bank_id ON public.question_stimuli USING btree (bank_id);


--
-- Name: idx_teacher_access_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teacher_access_class ON public.teacher_access USING btree (teacher_id, class_name);


--
-- Name: idx_violations_session_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_violations_session_created ON public.violation_events USING btree (session_id, created_at);


--
-- Name: idx_violations_session_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_violations_session_pending ON public.violation_events USING btree (session_id) WHERE (review_status = 'pending'::text);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: exam_questions exam_questions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE RESTRICT;


--
-- Name: exam_questions exam_questions_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.exam_sessions(id) ON DELETE CASCADE;


--
-- Name: exam_sessions exam_sessions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_sessions
    ADD CONSTRAINT exam_sessions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: exam_sessions exam_sessions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_sessions
    ADD CONSTRAINT exam_sessions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: exams exams_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES public.question_banks(id);


--
-- Name: exams exams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: exams exams_entry_pin_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_entry_pin_issued_by_fkey FOREIGN KEY (entry_pin_issued_by) REFERENCES public.users(id);


--
-- Name: question_banks question_banks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_banks
    ADD CONSTRAINT question_banks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: question_banks question_banks_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_banks
    ADD CONSTRAINT question_banks_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE RESTRICT;


--
-- Name: question_media question_media_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_media
    ADD CONSTRAINT question_media_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: question_stimuli question_stimuli_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_stimuli
    ADD CONSTRAINT question_stimuli_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES public.question_banks(id) ON DELETE CASCADE;


--
-- Name: questions questions_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES public.question_banks(id) ON DELETE CASCADE;


--
-- Name: questions questions_stimulus_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_stimulus_id_fkey FOREIGN KEY (stimulus_id) REFERENCES public.question_stimuli(id) ON DELETE SET NULL;


--
-- Name: responses responses_graded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responses
    ADD CONSTRAINT responses_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.users(id);


--
-- Name: responses responses_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responses
    ADD CONSTRAINT responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE RESTRICT;


--
-- Name: responses responses_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responses
    ADD CONSTRAINT responses_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.exam_sessions(id) ON DELETE CASCADE;


--
-- Name: school_settings school_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_settings
    ADD CONSTRAINT school_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: subjects subjects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: teacher_access teacher_access_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_access
    ADD CONSTRAINT teacher_access_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: teacher_access teacher_access_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_access
    ADD CONSTRAINT teacher_access_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: violation_events violation_events_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.violation_events
    ADD CONSTRAINT violation_events_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: violation_events violation_events_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.violation_events
    ADD CONSTRAINT violation_events_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.exam_sessions(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict UhoZpE9t14Raz9UUs9KVxPmtP4s7N9WKqJyILCdvNKsqH4pAgS5Vp0fwDhBWfmh

