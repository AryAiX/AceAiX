import PublicHeader from '../components/PublicHeader';
import { BookOpen, FileText, Video, BarChart3, ChevronRight, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCms } from '../api/content';

interface ResourcesCms {
  categories: { name: string; count: number }[];
  articles: { title: string; category: string; readTime: string; excerpt: string }[];
}

const CATEGORY_ICONS = [
  <BookOpen size={20} />,
  <Video size={20} />,
  <FileText size={20} />,
  <BarChart3 size={20} />,
];
const CATEGORY_PALETTE = ['blue', 'emerald', 'amber', 'blue'];

const ARTICLE_IMAGES = [
  'https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/274506/pexels-photo-274506.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/1618200/pexels-photo-1618200.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/3764537/pexels-photo-3764537.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/114296/pexels-photo-114296.jpeg?auto=compress&cs=tinysrgb&w=400',
];

const CATEGORY_COLOR: Record<string, string> = {
  Guides: 'badge-blue',
  Research: 'badge-amber',
  'Athlete Tips': 'badge-green',
  'Club Playbooks': 'badge-slate',
};
const badgeFor = (category: string) => CATEGORY_COLOR[category] ?? 'badge-slate';

export default function ResourcesPage() {
  const { data: cms, isLoading } = useQuery({ queryKey: ['cms', 'resources'], queryFn: () => getCms<ResourcesCms>('resources') });
  const categories = cms?.categories ?? [];
  const articles = cms?.articles ?? [];
  const featured = articles[0];

  return (
    <div className="min-h-screen bg-navy-800">
      <PublicHeader />

      <div className="border-b border-slate-700/50 bg-navy-900">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Knowledge Base</p>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">Resources & Guides</h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">Guides, research, and tutorials to help athletes grow their careers and scouts find elite talent faster.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Categories */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {categories.map((cat, i) => {
            const color = CATEGORY_PALETTE[i % CATEGORY_PALETTE.length];
            return (
              <div key={cat.name} className="card-hover text-center py-6">
                <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${color === 'emerald' ? 'bg-emerald-500/15 text-emerald-400' : color === 'amber' ? 'bg-amber-500/15 text-amber-400' : 'bg-blue-600/15 text-blue-400'}`}>
                  {CATEGORY_ICONS[i % CATEGORY_ICONS.length]}
                </div>
                <p className="text-sm font-semibold text-white">{cat.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{cat.count} articles</p>
              </div>
            );
          })}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="card-hover p-0 overflow-hidden animate-pulse">
                <div className="w-full h-40 bg-navy-700" />
                <div className="p-5">
                  <div className="h-4 w-40 bg-navy-700 rounded mb-2" />
                  <div className="h-3 w-full bg-navy-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400">No resources published yet.</p>
          </div>
        ) : (
          <>
            {/* Featured article */}
            {featured && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb size={16} className="text-blue-400" />
                  <p className="text-sm font-semibold text-white">Featured</p>
                </div>
                <div className="card-hover p-0 overflow-hidden flex flex-col md:flex-row">
                  <img src={ARTICLE_IMAGES[0]} alt={featured.title} className="w-full md:w-72 h-48 md:h-auto object-cover flex-shrink-0" />
                  <div className="p-6 flex flex-col justify-center">
                    <span className={`badge ${badgeFor(featured.category)} text-xs mb-3 self-start`}>{featured.category}</span>
                    <h2 className="text-xl font-bold text-white mb-2">{featured.title}</h2>
                    <p className="text-sm text-slate-400 mb-4 leading-relaxed">{featured.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{featured.readTime}</span>
                      <Link to="/auth/register" className="btn-primary text-sm py-1.5">
                        Read Article <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {articles.slice(1).map((article, i) => (
                <div key={article.title} className="card-hover group p-0 overflow-hidden flex flex-col">
                  <img src={ARTICLE_IMAGES[(i + 1) % ARTICLE_IMAGES.length]} alt={article.title} className="w-full h-40 object-cover" />
                  <div className="p-5 flex flex-col flex-1">
                    <span className={`badge ${badgeFor(article.category)} text-xs mb-3 self-start`}>{article.category}</span>
                    <h3 className="text-sm font-semibold text-white mb-2 leading-snug">{article.title}</h3>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed flex-1">{article.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{article.readTime}</span>
                      <Link to="/auth/register" className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1">
                        Read <ChevronRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
