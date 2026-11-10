-- ==============================================================================
-- APPLIETY MVP — DADOS INICIAIS (SEED)
-- ==============================================================================

-- 1. Inserção de competências base padronizadas
INSERT INTO public.skills (name, normalized_name) VALUES
('React', 'react'),
('Node.js', 'nodejs'),
('TypeScript', 'typescript'),
('JavaScript', 'javascript'),
('HTML/CSS', 'htmlcss'),
('PostgreSQL', 'postgresql'),
('Python', 'python'),
('Docker', 'docker'),
('Git', 'git'),
('UI/UX Design', 'uiuxdesign'),
('Tailwind CSS', 'tailwindcss'),
('APIs REST', 'apisrest'),
('Next.js', 'nextjs'),
('GraphQL', 'graphql'),
('Figma', 'figma'),
('Flutter', 'flutter'),
('Java', 'java'),
('Arquitetura Web', 'arquiteturaweb')
ON CONFLICT (normalized_name) DO NOTHING;
