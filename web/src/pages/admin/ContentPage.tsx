import { useQuery } from '@tanstack/react-query';
import { FileText, Newspaper, Rss } from 'lucide-react';
import { contentAdminStats, listCmsBlocks, listPostsAdmin, listSuccessStoriesAdmin } from '../../api/admin';
import { AdminCard, AdminPage, DataList, formatDate, formatNumber, StatCard, StatusBadge } from '../../components/admin/AdminPrimitives';

export default function AdminContentPage() {
  const { data: stats } = useQuery({ queryKey: ['admin-content-stats'], queryFn: contentAdminStats });
  const { data: stories = [] } = useQuery({ queryKey: ['admin-success-stories'], queryFn: listSuccessStoriesAdmin });
  const { data: posts = [] } = useQuery({ queryKey: ['admin-posts'], queryFn: () => listPostsAdmin(10) });
  const { data: cms = [] } = useQuery({ queryKey: ['admin-cms-blocks'], queryFn: listCmsBlocks });

  return (
    <AdminPage title="Content" subtitle="CMS blocks, success stories, and recent feed content from Supabase">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Posts" value={formatNumber(stats?.posts)} sub="feed content" icon={<Rss size={17} />} />
        <StatCard label="Stories" value={formatNumber(stats?.successStories)} sub="success story rows" color="#1FB57A" icon={<Newspaper size={17} />} />
        <StatCard label="Published Stories" value={formatNumber(stats?.publishedStories)} sub="publicly visible" color="#B8F135" />
        <StatCard label="CMS Blocks" value={formatNumber(stats?.cmsBlocks)} sub="site content keys" color="#F5A623" icon={<FileText size={17} />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AdminCard>
          <h2 className="text-base font-semibold text-white mb-4">Success Stories</h2>
          <DataList
            rows={stories}
            emptyTitle="No success stories"
            emptyBody="Published and draft success stories will appear here once they exist in Supabase."
            render={(story) => (
              <div key={story.id} className="py-3 border-b border-rim last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{story.title}</p>
                    <p className="text-xs text-slate-500">{story.sport ?? 'No sport'} · {formatDate(story.created_at)}</p>
                  </div>
                  <StatusBadge tone={story.is_published ? 'green' : 'slate'}>{story.is_published ? 'published' : 'draft'}</StatusBadge>
                </div>
              </div>
            )}
          />
        </AdminCard>

        <AdminCard>
          <h2 className="text-base font-semibold text-white mb-4">CMS Blocks</h2>
          <DataList
            rows={cms}
            emptyTitle="No CMS blocks"
            emptyBody="Marketing and static content keys will appear here after CMS content is stored."
            render={(block) => (
              <div key={block.key} className="py-3 border-b border-rim last:border-0">
                <p className="text-sm font-semibold text-white">{block.key}</p>
                <p className="text-xs text-slate-500">Updated {formatDate(block.updated_at)}</p>
              </div>
            )}
          />
        </AdminCard>
      </div>

      <AdminCard>
        <h2 className="text-base font-semibold text-white mb-4">Recent Posts</h2>
        <DataList
          rows={posts}
          emptyTitle="No posts"
          emptyBody="Feed content will appear here when users create posts."
          render={(post) => (
            <div key={post.id} className="py-3 border-b border-rim last:border-0">
              <p className="text-sm text-white">{post.text ?? `${post.type} post`}</p>
              <p className="text-xs text-slate-500">{post.type} · {formatDate(post.created_at)}</p>
            </div>
          )}
        />
      </AdminCard>
    </AdminPage>
  );
}
