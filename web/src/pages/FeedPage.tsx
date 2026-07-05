import AuroraBackground from '../components/ui/AuroraBackground';
import FeedLeftRail from '../components/feed/FeedLeftRail';
import FeedCenter from '../components/feed/FeedCenter';
import FeedRightRail from '../components/feed/FeedRightRail';
import PublicHeader from '../components/PublicHeader';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Briefcase, MessageSquare, Search, Bookmark, FileText, BarChart3 } from 'lucide-react';
import { useLenis } from '../hooks/useLenis';

type NavItem = { label: string; Icon: React.ElementType; path: string };

function getNavItems(role: string | null): NavItem[] {
  if (role === 'athlete') return [
    { label: 'Home',          Icon: Home,          path: '/feed'                  },
    { label: 'Network',       Icon: Users,         path: '/athlete/network'       },
    { label: 'Opportunities', Icon: Briefcase,     path: '/athlete/opportunities' },
    { label: 'Messages',      Icon: MessageSquare, path: '/athlete/messages'      },
  ];
  if (role === 'scout' || role === 'club') return [
    { label: 'Home',       Icon: Home,          path: '/feed'                 },
    { label: 'Search',     Icon: Search,        path: '/recruiter/search'     },
    { label: 'Watchlists', Icon: Bookmark,      path: '/recruiter/watchlists' },
    { label: 'Messages',   Icon: MessageSquare, path: '/recruiter/messages'   },
  ];
  if (role === 'medical_partner') return [
    { label: 'Home',     Icon: Home,     path: '/feed'             },
    { label: 'Requests', Icon: FileText, path: '/partner/requests' },
  ];
  if (role === 'admin' || role === 'super_admin') return [
    { label: 'Home',      Icon: Home,      path: '/feed'            },
    { label: 'Users',     Icon: Users,     path: '/admin/users'     },
    { label: 'Analytics', Icon: BarChart3, path: '/admin/analytics' },
  ];
  return [
    { label: 'Home',     Icon: Home,          path: '/feed'     },
    { label: 'Discover', Icon: Search,        path: '/discover' },
    { label: 'Athletes', Icon: Users,         path: '/athletes' },
    { label: 'Plans',    Icon: Briefcase,     path: '/plans'    },
  ];
}

function isActive(itemPath: string, currentPath: string) {
  if (itemPath === '/feed') return currentPath === '/feed';
  return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
}

function BottomTabBar() {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = getNavItems(role).slice(0, 4);

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden glass-dark border-t border-white/[0.07] flex items-stretch">
      {tabs.map(({ label, Icon, path }) => {
        const active = isActive(path, location.pathname);
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors"
            style={{ color: active ? '#B8F135' : '#7C8DA6' }}
          >
            <div
              className="absolute top-0 left-1/2 w-6 h-0.5 rounded-full"
              style={{
                background: '#B8F135',
                opacity: active ? 1 : 0,
                transform: `translateX(-50%) scaleX(${active ? 1 : 0})`,
                transition: 'opacity 0.2s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            />
            <Icon size={17} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function FeedPage() {
  useLenis();
  return (
    <div className="min-h-screen bg-page relative">
      <div className="fixed inset-0 pointer-events-none z-0">
        <AuroraBackground />
      </div>

      <PublicHeader />

      <div className="relative z-10 max-w-[1320px] mx-auto px-3 sm:px-4 pt-[68px] pb-20 lg:pb-8">
        <div className="flex gap-4 xl:gap-6 items-start pt-4">
          <aside className="hidden lg:block w-[240px] xl:w-[260px] flex-shrink-0">
            <FeedLeftRail />
          </aside>
          <main className="flex-1 min-w-0">
            <FeedCenter />
          </main>
          <aside className="hidden xl:block w-[272px] flex-shrink-0">
            <FeedRightRail />
          </aside>
        </div>
      </div>

      <BottomTabBar />
    </div>
  );
}
