import DashboardIcon from '@mui/icons-material/Dashboard';
import ChatIcon from '@mui/icons-material/Chat';
import BoltIcon from '@mui/icons-material/Bolt';
import LinkIcon from '@mui/icons-material/Link';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import QueueIcon from '@mui/icons-material/Queue';
import QuickreplyIcon from '@mui/icons-material/Quickreply';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import StarIcon from '@mui/icons-material/Star';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import EventIcon from '@mui/icons-material/Event';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import GroupIcon from '@mui/icons-material/Group';

// Estructura agrupada para el sidebar; cada sección define su orden interno.
export const navigationSections = [
  {
    title: 'Operación',
    items: [
      { label: 'Dashboard', path: '/status', icon: DashboardIcon, roles: ['ADMIN', 'SUPERVISOR'], order: 1 },
      { label: 'Conversaciones', path: '/chat', icon: ChatIcon, roles: ['ADMIN', 'SUPERVISOR', 'AGENTE'], order: 2 },
      { label: 'Broadcast', path: '/broadcast', icon: BoltIcon, roles: ['ADMIN', 'SUPERVISOR'], order: 3 },
      { label: 'Respuestas rápidas', path: '/quick-replies', icon: QuickreplyIcon, roles: ['ADMIN', 'SUPERVISOR'], order: 4 },
      { label: 'Warmup', path: '/warmup', icon: LocalFireDepartmentIcon, roles: ['ADMIN', 'SUPERVISOR'], order: 5 },
      { label: 'Feedback & NPS', path: '/feedback', icon: StarIcon, roles: ['ADMIN', 'SUPERVISOR'], order: 6 },
      { label: 'Análise Pós-Venda', path: '/post-sales-analytics', icon: AnalyticsIcon, roles: ['ADMIN', 'SUPERVISOR'], order: 7 },
      { label: 'Agendamentos', path: '/appointments', icon: EventIcon, roles: ['ADMIN', 'SUPERVISOR'], order: 8 },
      { label: 'Follow-up Inteligente', path: '/followup', icon: AutoFixHighIcon, roles: ['ADMIN', 'SUPERVISOR'], order: 9 },
      { label: 'Retenção', path: '/retention', icon: GroupIcon, roles: ['ADMIN', 'SUPERVISOR'], order: 10 }
    ]
  },
  {
    title: 'Administración',
    items: [
      { label: 'Conexiones WhatsApp', path: '/whatsapp', icon: LinkIcon, roles: ['ADMIN', 'SUPERVISOR'], order: 1 },
      { label: 'Colas', path: '/queues', icon: QueueIcon, roles: ['ADMIN', 'SUPERVISOR'], order: 2 },
      { label: 'Usuarios', path: '/users', icon: PeopleIcon, roles: ['ADMIN'], order: 3 },
      { label: 'Configuración', path: '/settings', icon: SettingsIcon, roles: ['ADMIN'], order: 4 }
    ]
  }
];

export const filterSectionsByRole = (sections, role) =>
  sections
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => item.roles.includes(role))
        .sort((a, b) => (a.order || 0) - (b.order || 0))
    }))
    .filter((section) => section.items.length);
